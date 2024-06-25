//
//  MediaProvider.swift
//  HomebasePhotos
//
//  Created by Stef Coenen on 19/06/2024.
//

import Foundation

class MediaProvider {
  static let defaultPayloadKey = "dflt_key"
  static let encryptMedia = true
  static let photoDrive = TargetDrive(alias: "6483b7b1f71bd43eb6896c86148668cc", type: "2af68fe72fb84896f39f97c59d60813a")
  static let ownerOnlyACL = AccessControlList(type: .owner)
  static let tinyThumbInstruction = ImageResizer.ResizeInstruction(width: 20, height: 20, quality: 10, format: "jpeg")
  static let defaultImageSizes = [
    ImageResizer.ResizeInstruction(width: 300, height: 300, quality: 95, format: "jpeg"),
    ImageResizer.ResizeInstruction(width: 1200, height: 1200, quality: 95, format: "jpeg")
  ]

  static func uploadMedia(dotYouClient: DotYouClient, filePath: String, timestampInMs: Int64, mimeType: String, identifier: String?, width: Int, height: Int, forceLowerQuality: Bool) throws -> UploadResult {
    let instructions = UploadInstructionSet(storageOptions: StorageOptions(drive: photoDrive), transitOptions: nil, transferIv: nil, manifest: nil)

    let fileName = (filePath as NSString).lastPathComponent
    let uniqueId = try toGuidId(input: identifier ?? "\(fileName)_\(width)x\(height)")

    let tinyThumb = try ImageResizer.resizeImage(filePath: filePath, instruction: tinyThumbInstruction, key: defaultPayloadKey, keepDimensions: true)
    var previewThumbnail: EmbeddedThumb?
    if(tinyThumb != nil) {
      previewThumbnail = EmbeddedThumb(pixelHeight: tinyThumb!.pixelHeight, pixelWidth: tinyThumb!.pixelWidth, contentType: tinyThumb!.contentType, content: CryptoUtil.base64Encode(stream: tinyThumb!.inputStream.stream)!)
    }

    let metadata = UploadFileMetadata<String>(
      allowDistribution: false,
      isEncrypted: encryptMedia,
      acl: ownerOnlyACL,
      appData: UploadAppFileMetaData(uniqueId: uniqueId, tags: [], fileType: 0, dataType: 0, userDate: timestampInMs, groupId: nil, archivalStatus: 0, content: "", previewThumbnail: previewThumbnail),
      referencedFile: nil
    )

    let payload: PayloadBase
    if forceLowerQuality {
      let payloadStream = try ImageResizer.resizeImage(filePath: filePath, instruction: ImageResizer.ResizeInstruction(width: 1200, height: 1200, quality: 80, format: "jpeg"), key: defaultPayloadKey, keepDimensions: false)
      payload = PayloadStream(descriptorContent: nil, previewThumbnail: nil, contentType: payloadStream!.contentType, key: defaultPayloadKey, inputStream: payloadStream!.inputStream)
    } else {
      payload = PayloadFile(descriptorContent: nil, previewThumbnail: nil, contentType: mimeType, key: defaultPayloadKey, filePath: filePath)
    }

    let thumbnails = try ImageResizer.resizeImage(filePath: filePath, instructions: defaultImageSizes, key: defaultPayloadKey)

    return try DriveFileUploadProvider.uploadFile(dotYouClient: dotYouClient, instructions: instructions, metadata: metadata, payloads: [payload], thumbnails: thumbnails, encrypt: encryptMedia)
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
}

extension UUID {
  init(digest: [UInt8]) {
    precondition(digest.count == 16, "MD5 digest should be 16 bytes")
    self = digest.withUnsafeBytes {
      let bytes = $0.bindMemory(to: UInt8.self)
      return UUID(uuid: (bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7], bytes[8], bytes[9], bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]))
    }
  }
}
