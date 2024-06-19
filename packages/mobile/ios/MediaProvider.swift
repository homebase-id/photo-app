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
  static let photoDrive = TargetDrive(id: "6483b7b1f71bd43eb6896c86148668cc", key: "2af68fe72fb84896f39f97c59d60813a")
  static let ownerOnlyACL = AccessControlList(type: .owner)
  static let tinyThumbInstruction = ImageResizer.ResizeInstruction(width: 20, height: 20, quality: 10, format: "jpg")
  static let defaultImageSizes = [
    ImageResizer.ResizeInstruction(width: 300, height: 300, quality: 95, format: "jpg"),
    ImageResizer.ResizeInstruction(width: 1200, height: 1200, quality: 95, format: "jpg")
  ]
  
  static func uploadMedia(dotYouClient: DotYouClient, filePath: String, timestampInMs: Int64, mimeType: String, identifier: String?, width: String, height: String, forceLowerQuality: Bool) throws -> UploadResult {
    let instructions = UploadInstructionSet(storageOptions: StorageOptions(targetDrive: photoDrive))
    
    let fileName = (filePath as NSString).lastPathComponent
    let uniqueId = try toGuidId(input: identifier ?? "\(fileName)_\(width)x\(height)")
    
    let tinyThumb = try ImageResizer.resizeImage(filePath: filePath, instruction: tinyThumbInstruction, key: defaultPayloadKey, encrypt: true)
    let previewThumbnail = EmbeddedThumb(pixelHeight: tinyThumb.pixelHeight, pixelWidth: tinyThumb.pixelWidth, format: tinyThumb.format, base64: tinyThumb.base64)
    
    let metadata = UploadFileMetadata<String>(
      isPublic: false,
      encryptMedia: encryptMedia,
      acl: ownerOnlyACL,
      metaData: UploadAppFileMetaData(uniqueId: uniqueId, tags: [], fileSize: 0, resolution: 0, timestamp: timestampInMs, additionalMetaData: nil, archivalStatus: .none, comments: "", embeddedThumb: previewThumbnail),
      extra: nil,
      thumbnail: nil
    )
    
    let payload: PayloadBase
    if forceLowerQuality {
      let payloadStream = try ImageResizer.resizeImage(filePath: filePath, instruction: ImageResizer.ResizeInstruction(width: 1200, height: 1200, quality: 80, format: "jpg"), key: defaultPayloadKey, encrypt: false)
      payload = PayloadStream(key: defaultPayloadKey, outputStream: payloadStream.outputStream, metadata: nil, mimeType: mimeType, fileName: fileName)
    } else {
      payload = PayloadFile(key: defaultPayloadKey, filePath: filePath, metadata: nil, mimeType: mimeType, fileName: fileName)
    }
    
    let thumbnails = try ImageResizer.resizeImage(filePath: filePath, instructions: defaultImageSizes, key: defaultPayloadKey)
    
    return uploadFile(dotYouClient: dotYouClient, instructions: instructions, metadata: metadata, payloads: [payload], thumbnails: thumbnails, encryptMedia: encryptMedia)
  }
  
  static func toGuidId(input: String) throws -> String {
    var digest = [UInt8](repeating: 0, count: Int(CC_MD5_DIGEST_LENGTH))
    if let data = input.data(using: .utf8) {
      _ = data.withUnsafeBytes {
        CC_MD5($0.baseAddress, CC_LONG(data.count), &digest)
      }
    }
    
    let msb = digest[0..<8].reduce(0) { ($0 << 8) | UInt64($1) }
    let lsb = digest[8..<16].reduce(0) { ($0 << 8) | UInt64($1) }
    
    return UUID(uuid: (msb: msb, lsb: lsb)).uuidString
  }
}

