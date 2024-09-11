//
//  VideoProvider.swift
//  HomebasePhotos
//
//  Created by Stef Coenen on 11/09/2024.
//

import Foundation
import AVFoundation // for video handling
import ImageIO
import MobileCoreServices
import ffmpegkit

class VideoProvider {
  static let defaultPayloadKey = "dflt_key"
  static let encryptMedia = true
  static let photoDrive = TargetDrive(alias: "6483b7b1f71bd43eb6896c86148668cc", type: "2af68fe72fb84896f39f97c59d60813a")
  static let ownerOnlyACL = AccessControlList(requiredSecurityGroup: .owner)
  static let tinyThumbInstruction = ImageResizer.ResizeInstruction(width: 20, height: 20, quality: 10, format: "jpeg")
  static let defaultImageSizes = [
    ImageResizer.ResizeInstruction(width: 300, height: 300, quality: 95, format: "jpeg"),
    ImageResizer.ResizeInstruction(width: 1200, height: 1200, quality: 95, format: "jpeg")
  ]

  static func uploadMedia(dotYouClient: DotYouClient, filePath: String, timestampInMs: Int64, mimeType: String, identifier: String?, width: Int, height: Int, forceLowerQuality: Bool) async throws -> UploadResult {
    let instructions = UploadInstructionSet(storageOptions: StorageOptions(drive: photoDrive), transitOptions: nil, transferIv: nil, manifest: nil)

    let fileName = (filePath as NSString).lastPathComponent
    let uniqueId = try toGuidId(input: identifier ?? "\(fileName)_\(width)x\(height)")

    // Grab thumbnail
    let videoThumbnail = try await grabVideoThumbnail(filePath: filePath)


    let tinyThumb = try ImageResizer.resizeImage(imageSource: videoThumbnail!, instruction: tinyThumbInstruction, key: defaultPayloadKey, keepDimensions: true)
    var previewThumbnail: EmbeddedThumb?
    if(tinyThumb != nil) {
      previewThumbnail = EmbeddedThumb(pixelHeight: tinyThumb!.pixelHeight, pixelWidth: tinyThumb!.pixelWidth, contentType: tinyThumb!.contentType, content: CryptoUtil.base64Encode(stream: tinyThumb!.inputStream.stream)!)
    }

    let thumbnails = try ImageResizer.resizeImage(imageSource: videoThumbnail!, instructions: defaultImageSizes, key: defaultPayloadKey)

    let metadata = UploadFileMetadata<String>(
      allowDistribution: false,
      isEncrypted: encryptMedia,
      accessControlList: ownerOnlyACL,
      appData: UploadAppFileMetaData(uniqueId: uniqueId, tags: [], fileType: 0, dataType: 0, userDate: timestampInMs, groupId: nil, archivalStatus: 0, content: "{\"originalFileName\":\"" + fileName + "\"}", previewThumbnail: previewThumbnail),
      referencedFile: nil
    )

    // Compress and segment video
    let keyHeader = encryptMedia ? DriveFileUploadProvider.generateKeyHeader() : nil
    let videoData = try await compressAndSegmentVideo(filePath: filePath, compress: forceLowerQuality, keyHeader: keyHeader)
    let payloads: [PayloadBase]
    if let segments = videoData.segments {
      let playlistContent = try String(contentsOfFile: videoData.video!.filepath, encoding: .utf8)

      // Handle HLS segments
      let metadata: [String: Any] = [
              "isSegmented": true,
              "mimeType": "application/vnd.apple.mpegurl",
              "hlsPlaylist": playlistContent
      ];

      // Convert dictionary to JSON data
      let jsonMetadata = try JSONSerialization.data(withJSONObject: metadata, options: .prettyPrinted)

      let payloadStream = PayloadFile(descriptorContent: String(data: jsonMetadata, encoding: .utf8), previewThumbnail: nil, contentType: "video/mp2t", key: defaultPayloadKey, filePath: segments.filepath, skipEncryption: true, iv: keyHeader?.iv)
      payloads = [payloadStream]
    } else {
      // Single video file
      let metadata: String = "{ mimeType: 'video/mp4', isSegmented: false, }";

      let payloadFile = PayloadFile(descriptorContent: metadata, previewThumbnail: nil, contentType: mimeType, key: defaultPayloadKey, filePath: videoData.video!.filepath, skipEncryption: false)
      payloads = [payloadFile]
    }

    return try await DriveFileUploadProvider.uploadFile(dotYouClient: dotYouClient, instructions: instructions, metadata: metadata, payloads: payloads, thumbnails: thumbnails, aesKey: keyHeader?.aesKey)
  }

  static func toGuidId(input: String) throws -> String {
    var digest = [UInt8](repeating: 0, count: Int(CC_MD5_DIGEST_LENGTH))
    if let data = input.data(using: .utf8) {
      _ = data.withUnsafeBytes {
        CC_MD5($0.baseAddress, CC_LONG(data.count), &digest)
      }
    }

    let uuid = UUID(digest: digest)
    return uuid.uuidString
  }

  static func grabVideoThumbnail(filePath: String) async throws -> CGImageSource? {
    // Use AVFoundation to extract a thumbnail from the video
    let asset = AVAsset(url: URL(fileURLWithPath: filePath))
    let imageGenerator = AVAssetImageGenerator(asset: asset)
    imageGenerator.appliesPreferredTrackTransform = true // Ensure correct orientation
    let time = CMTime(seconds: 1, preferredTimescale: 60) // Grab a frame from 1 second in

    do {
      let cgImage = try imageGenerator.copyCGImage(at: time, actualTime: nil)

      // Convert CGImage to Data
      let imageData = NSMutableData()
      if let destination = CGImageDestinationCreateWithData(imageData as CFMutableData, kUTTypeJPEG, 1, nil) {
        CGImageDestinationAddImage(destination, cgImage, nil)
        CGImageDestinationFinalize(destination)
      } else {
        throw NSError(domain: "com.yourdomain.app", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to create image destination"])
      }

      // Create CGImageSource from Data
      if let imageSource = CGImageSourceCreateWithData(imageData as CFData, nil) {
        return imageSource
      } else {
        throw NSError(domain: "com.yourdomain.app", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to create CGImageSource from image data"])
      }
    } catch {
      throw error
    }
  }

  static func compressAndSegmentVideo(filePath: String, compress: Bool, keyHeader: KeyHeader?) async throws -> VideoData {
    let outputDir = FileManager.default.temporaryDirectory
    let inputVideoUrl = URL(fileURLWithPath: filePath)

    let compressedVideoUrl = compress ? try await compressVideo(inputUrl: inputVideoUrl, outputUrl: outputDir.appendingPathComponent("compressed.mp4")) : inputVideoUrl;
    let (playlistUrl, segmentsUrl) = try await segmentVideoToHLS(inputUrl: compressedVideoUrl, outputDirectory: outputDir, keyHeader: keyHeader)

    print("playlist: \(playlistUrl.path) & segments \(segmentsUrl.path)")
    return VideoData(video: VideoFile(filepath: playlistUrl.path), segments: VideoSegments(filepath: segmentsUrl.path))
  }


  static func compressVideo(inputUrl: URL, outputUrl: URL) async throws -> URL {
    let asset = AVAsset(url: inputUrl)

    guard let exportSession = AVAssetExportSession(asset: asset, presetName: AVAssetExportPreset1280x720) else {
      throw NSError(domain: "com.yourdomain.app", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to create export session"])
    }

    exportSession.outputFileType = .mp4
    exportSession.outputURL = outputUrl
    exportSession.shouldOptimizeForNetworkUse = true

    return try await withCheckedThrowingContinuation { continuation in
      exportSession.exportAsynchronously {
        switch exportSession.status {
        case .completed:
          continuation.resume(returning: outputUrl)
        case .failed, .cancelled:
          continuation.resume(throwing: exportSession.error ?? NSError(domain: "com.yourdomain.app", code: -1, userInfo: [NSLocalizedDescriptionKey: "Video compression failed"]))
        default:
          break
        }
      }
    }
  }

  static func segmentVideoToHLS(inputUrl: URL, outputDirectory: URL, keyHeader: KeyHeader?) async throws -> (playlistUrl: URL, segmentsUrl: URL) {
    let id = UUID().uuidString
    let playlistFileName = "output-\(id).m3u8"
    let segmentsFileName = "output-\(id).ts"
    let playlistUrl = outputDirectory.appendingPathComponent(playlistFileName)
    let segmentsUrl = outputDirectory.appendingPathComponent(segmentsFileName)

    var encryptionCommand = ""

    // If encryption is enabled, create a key file and use it in the ffmpeg command
    if let keyHeader = keyHeader {
      let keyInfoFile = try await createKeyInfoFile(directory: outputDirectory, keyHeader: keyHeader)
      encryptionCommand = "-hls_key_info_file \(keyInfoFile.path)"
    }

    // ffmpeg command to segment the video into HLS
    let command = "-i \(inputUrl.path) -codec copy \(encryptionCommand) -hls_time 6 -hls_list_size 0 -f hls -hls_flags single_file \(playlistUrl.path)"
    print("ffmpeg command: \(command)")

    return try await withCheckedThrowingContinuation { continuation in
      FFmpegKit.executeAsync(command) { session in
        let state = session!.getState()
        let returnCode = session!.getReturnCode()

        if state == .failed || !(returnCode?.isValueSuccess())! {
          let error = NSError(domain: "com.yourdomain.app", code: -1, userInfo: [NSLocalizedDescriptionKey: "ffmpeg process failed with state: \(state) and returnCode: \(String(describing: returnCode))"])
          continuation.resume(throwing: error)
        } else {
          continuation.resume(returning: (playlistUrl, segmentsUrl))
        }
      }
    }
  }

  // Helper function to create a key info file for encryption (if required)
  static func createKeyInfoFile(directory: URL, keyHeader: KeyHeader) async throws -> URL {
    let id = UUID().uuidString
    let keyFileUrl = directory.appendingPathComponent("hls-encryption\(id).key")
    let keyInfoFileUrl = directory.appendingPathComponent("hls-key-info\(id).txt")

    // Convert aesKey and iv (Data) to base64 or hex strings
    let ivHexString = keyHeader.iv.map { String(format: "%02hhx", $0) }.joined()  // Convert to hex string

    // Write aesKey to the key file in base64 format
    try keyHeader.aesKey.write(to: keyFileUrl)

    // Create the key info content
    let keyInfo = "http://example.com/path/to/encryption.key\n\(keyFileUrl.path)\n\(ivHexString)"

    // Write keyInfo to the key-info file
    try keyInfo.write(to: keyInfoFileUrl, atomically: true, encoding: .utf8)

    return keyInfoFileUrl
  }

  // Helper Structures
  struct VideoData {
    var video: VideoFile?
    var segments: VideoSegments?
  }

  struct VideoFile {
    var filepath: String
  }

  struct VideoSegments {
    var filepath: String
  }
}
