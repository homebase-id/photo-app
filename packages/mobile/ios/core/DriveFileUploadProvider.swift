//
//  DriveFileUploadProvider.swift
//  HomebasePhotos
//
//  Created by Stef Coenen on 19/06/2024.
//

import Foundation

extension DriveFileUploadProvider {
  static func uploadFile(dotYouClient: DotYouClient, instructions: UploadInstructionSet, metadata: UploadFileMetadata<String>, payloads: [PayloadBase], thumbnails: [ThumbnailBase], encryptMedia: Bool) -> UploadResult {
      // Implement the uploadFile logic
    
    
  }
}

struct TargetDrive {
    let id: String
    let key: String
}

struct AccessControlList {
    let type: SecurityGroupType
}

enum SecurityGroupType {
    case owner
}

struct DriveFileUploadProvider {
}

struct ImageResizer {
    struct ResizeInstruction {
        let width: Int
        let height: Int
        let quality: Int
        let format: String
    }
}

protocol ThumbnailBase {}

struct ThumbnailStream: ThumbnailBase {
    let pixelHeight: Int
    let pixelWidth: Int
    let format: String
    let base64: String
    let outputStream: OutputStream
}

struct EmbeddedThumb {
    let pixelHeight: Int
    let pixelWidth: Int
    let format: String
    let base64: String
}

struct StorageOptions {
    let targetDrive: TargetDrive
}

struct UploadManifest {
    let payloadDescriptors: [UploadPayloadDescriptor]
}

struct UploadPayloadDescriptor {
    let payloadKey: String
    let descriptorContent: String
    let thumbnails: [UploadThumbnailDescriptor]
    let previewThumbnail: EmbeddedThumb
    let iv: [UInt8]
}

struct UploadThumbnailDescriptor {
    // Define the properties of UploadThumbnailDescriptor
    let someProperty: String  // Replace with actual properties
}

struct EmbeddedThumb {
    let pixelHeight: Int
    let pixelWidth: Int
    let format: String
    let base64: String
}

struct UploadInstructionSet {
  let storageOptions: StorageOptions
  let transitOptions: TransitOptions?
  let transferIf: Data
  let manifest: UploadManifest
}

struct TransitOptions {
  // Not used ATM
}

struct UploadAppFileMetaData<T> {
    let uniqueId: T
    let tags: [String]
    let fileSize: Int
    let resolution: Int
    let timestamp: Int64
    let additionalMetaData: String?
    let archivalStatus: ArchivalStatus
    let comments: String
    let embeddedThumb: EmbeddedThumb
}

enum ArchivalStatus {
    case none
}

struct UploadFileMetadata<T> {
    let isPublic: Bool
    let encryptMedia: Bool
    let acl: AccessControlList
    let metaData: UploadAppFileMetaData<T>
    let extra: String?
    let thumbnail: String?
}

protocol PayloadBase {}

struct PayloadStream: PayloadBase {
    let key: String
    let outputStream: OutputStream
    let metadata: String?
    let mimeType: String
    let fileName: String
}

struct PayloadFile: PayloadBase {
    let key: String
    let filePath: String
    let metadata: String?
    let mimeType: String
    let fileName: String
}

class UploadResult {}
class SuccessfulUploadResult: UploadResult {}
class BadRequestUploadResult: UploadResult {
    var errorCode: String? = nil
}
