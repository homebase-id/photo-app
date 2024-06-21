//
//  DriveFileUploadProvider.swift
//  HomebasePhotos
//
//  Created by Stef Coenen on 19/06/2024.
//

import Foundation
import CryptoKit

extension DriveFileUploadProvider {
  static func uploadFile(dotYouClient: DotYouClient, instructions: UploadInstructionSet, metadata: UploadFileMetadata<String>, payloads: [PayloadBase], thumbnails: [ThumbnailBase], encrypt: Bool) throws -> UploadResult  {
    // Implement the uploadFile logic
    var mutableMetadata = metadata
    mutableMetadata.setIsEncrypted(encrypt)
    
    let keyHeader = encrypt ? generateKeyHeader() : nil
    let manifest = buildManifest(payloads: payloads, thumbnails: thumbnails, generateIv: encrypt)
    let updatedInstructions = UploadInstructionSet(storageOptions: instructions.storageOptions, transitOptions: instructions.transitOptions, transferIv: instructions.transferIv ?? getRandom16ByteArray(), manifest: manifest)
    
    let encryptedDescriptor = try buildDescriptor(dotYouClient: dotYouClient, keyHeader: keyHeader, instructions: instructions, metadata: mutableMetadata)
    let data = try buildFormData(instructions: instructions, encryptedDescriptor: encryptedDescriptor, payloads: payloads, thumbnails: thumbnails, keyHeader: keyHeader, manifest: manifest)
    
    return try pureUpload(dotYouClient: dotYouClient, data: data)
  }
  
  static func buildManifest(payloads: [PayloadBase], thumbnails: [ThumbnailBase], generateIv: Bool) -> UploadManifest {
    let payloadDescriptors: [UploadPayloadDescriptor] = payloads.map { payload in
      let relatedThumbnails: [UploadThumbnailDescriptor] = thumbnails.filter { thumb in
        thumb.key == payload.key
      }.map { thumb in
        UploadThumbnailDescriptor(
          thumbnailKey: thumb.key + String(thumb.pixelWidth),
          pixelHeight: thumb.pixelHeight,
          pixelWidth: thumb.pixelWidth
        )
      }
      
      return UploadPayloadDescriptor(
        payloadKey: payload.key,
        descriptorContent: payload.descriptorContent ?? nil,
        thumbnails: relatedThumbnails,
        previewThumbnail: payload.previewThumbnail,
        iv: generateIv ? getRandom16ByteArray() : nil
      )
    }
    
    return UploadManifest(payloadDescriptors: payloadDescriptors)
  }
  
  static func buildDescriptor(dotYouClient: DotYouClient, keyHeader: KeyHeader?, instructions: UploadInstructionSet, metadata: UploadFileMetadata<String>) throws -> Data {
    guard let transferIv = instructions.transferIv else {
      throw NSError(domain: "DriveFileUploadProvider", code: 1, userInfo: [NSLocalizedDescriptionKey: "Transfer IV is required"])
    }
    
    let descriptorData = DescriptorData(encryptedKeyHeader: Data(), fileMetadata: metadata)
    let jsonString = descriptorData.toJsonString()
    let content = jsonString.data(using: .utf8)
    
    return try cbcEncrypt(content: content!, iv: transferIv, key: dotYouClient.sharedSecret!)
  }
  
  static func cbcEncrypt(content: Data, iv: Data, key: Data) throws -> Data {
    // Implement CBC encryption
    return Data()
  }
  
  static func buildFormData(instructions: UploadInstructionSet, encryptedDescriptor: Data, payloads: [PayloadBase], thumbnails: [ThumbnailBase], keyHeader: KeyHeader?, manifest: UploadManifest) throws -> Data {
    var formData = Data()
    
    let boundary = "Boundary-\(UUID().uuidString)"
    
    let addFormField = { (name: String, value: String) -> Data in
      var data = Data()
      data.append("--\(boundary)\r\n")
      data.append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n")
      data.append("\(value)\r\n")
      return data
    }
    
    let addFormDataPart = { (name: String, data: Data, filename: String, contentType: String) -> Data in
      var partData = Data()
      partData.append("--\(boundary)\r\n")
      partData.append("Content-Disposition: form-data; name=\"\(name)\"; filename=\"\(filename)\"\r\n")
      partData.append("Content-Type: \(contentType)\r\n\r\n")
      partData.append(data)
      partData.append("\r\n")
      return partData
    }
    
    var body = Data()
    
    // Add instructions
    if let instructionsData = instructions.toJsonString().data(using: .utf8) {
      body.append(addFormDataPart("instructions", instructionsData, "instructions.json", "application/octet-stream"))
    }
    
    // Add encrypted descriptor if available
    body.append(addFormDataPart("metaData", encryptedDescriptor, "metadata.bin", "application/octet-stream"))
    
    // Create a pipe to stream the data
    let pipe = Pipe()
    
    // Add payloads and thumbnails as streams
    for payload in payloads {
      var payloadStreamOutput: InputStream
      if let keyHeader = keyHeader {
        if let payloadFile = payload as? PayloadFile {
          let encryptedPayload = try CryptoUtil.encryptWithKeyHeader(file: payloadFile.filePath, keyHeader: CryptoUtil.getUpdatedKeyHeader(keyHeader: keyHeader, manifest: manifest, payloadKey: payload.key))
          payloadStreamOutput = InputStream(data: encryptedPayload)
        } else if let payloadStream = payload as? PayloadStream {
          let encryptedPayload = try CryptoUtil.encryptWithKeyHeader(stream: payloadStream.inputStream, keyHeader: CryptoUtil.getUpdatedKeyHeader(keyHeader: keyHeader, manifest: manifest, payloadKey: payload.key))
          payloadStreamOutput = InputStream(data: encryptedPayload)
        } else {
          continue
        }
      } else {
        if let payloadFile = payload as? PayloadFile {
          if #available(iOS 16.0, *) {
            payloadStreamOutput = InputStream(url: URL.init(filePath: payloadFile.filePath))!
          } else {
            // Fallback on earlier versions
          }
        } else if let payloadStream = payload as? PayloadStream {
          payloadStreamOutput = payloadStream.inputStream
        } else {
          continue
        }
      }
      
      let filename = payload.key
      let contentType = payload.contentType
      body.append("--\(boundary)\r\n".data(using: .utf8)!)
      body.append("Content-Disposition: form-data; name=\"payload\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
      body.append("Content-Type: \(contentType)\r\n\r\n".data(using: .utf8)!)
      
      body.append("\r\n".data(using: .utf8)!)
    }
    
    for thumb in thumbnails {
      let thumbStreamOutput: InputStream
      if let keyHeader = keyHeader {
        if let thumbStream = thumb as? ThumbnailStream {
          let encryptedThumb = try CryptoUtil.encryptWithKeyHeader(stream: thumbStream.inputStream, keyHeader: CryptoUtil.getUpdatedKeyHeader(keyHeader: keyHeader, manifest: manifest, payloadKey: thumb.key))
          thumbStreamOutput = InputStream(data: encryptedThumb)
        } else {
          continue
        }
      } else {
        if let thumbStream = thumb as? ThumbnailStream {
          thumbStreamOutput = thumbStream.inputStream
        } else {
          continue
        }
      }
      
      let filename = thumb.key + String(thumb.pixelWidth)
      let contentType = thumb.contentType
      body.append("--\(boundary)\r\n".data(using: .utf8)!)
      body.append("Content-Disposition: form-data; name=\"thumbnail\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
      body.append("Content-Type: \(contentType)\r\n\r\n".data(using: .utf8)!)
      
      body.append("\r\n".data(using: .utf8)!)
    }
    
    body.append("--\(boundary)--\r\n".data(using: .utf8)!)
    
    return body
  }
  
  // Helper function to stream data
  static func streamData(from input: InputStream, to output: OutputStream) throws {
      input.open()
      defer { input.close() }
      
      output.open()
      defer { output.close() }
      
      let bufferSize = 1024
      var buffer = [UInt8](repeating: 0, count: bufferSize)
      
      while input.hasBytesAvailable {
          let bytesRead = input.read(&buffer, maxLength: bufferSize)
          if bytesRead < 0, let error = input.streamError {
              throw error
          }
          if bytesRead == 0 {
              break
          }
          var bytesWritten = 0
          while bytesWritten < bytesRead {
              let bytes = output.write(&buffer + bytesWritten, maxLength: bytesRead - bytesWritten)
              if bytes < 0, let error = output.streamError {
                  throw error
              }
              bytesWritten += bytes
          }
      }
  }
  
  static func pureUpload(dotYouClient: DotYouClient, data: Data) throws -> UploadResult  {
    var request = URLRequest(url: URL(string: dotYouClient.endpoint + "/drive/files/upload")!)
    request.httpMethod = "POST"
    request.httpBody = data
    request.setValue("multipart/form-data", forHTTPHeaderField: "Content-Type")
    
    let (responseData, response, error) = URLSession.shared.synchronousDataTask(with: request)
    guard let responseData = responseData, error == nil else {
      throw NSError(domain: "DriveFileUploadProvider", code: 3, userInfo: [NSLocalizedDescriptionKey: "Upload failed"])
    }
    
    // Process response
    
    return BadRequestUploadResult()
  }
  
  static func generateKeyHeader() -> KeyHeader {
    // Generate key header
    return KeyHeader(iv: Data(), aesKey: SymmetricKey(size: .bits256))
  }
  
  static func getRandom16ByteArray() -> Data {
    // Generate random 16-byte array
    return Data()
  }
}

extension Data {
  mutating func append(_ string: String) {
    if let data = string.data(using: .utf8) {
      append(data)
    }
  }
  
  init(reading input: InputStream) throws {
    self.init()
    input.open()
    defer { input.close() }
    
    let bufferSize = 1024
    var buffer = [UInt8](repeating: 0, count: bufferSize)
    
    while input.hasBytesAvailable {
      let read = input.read(&buffer, maxLength: bufferSize)
      if read > 0 {
        append(buffer, count: read)
      } else if read < 0 {
        throw input.streamError ?? NSError(domain: NSPOSIXErrorDomain, code: Int(errno), userInfo: nil)
      } else {
        break
      }
    }
  }
}


// URLSession synchronous data task extension
extension URLSession {
  func synchronousDataTask(with request: URLRequest) -> (Data?, URLResponse?, Error?) {
    var data: Data?
    var response: URLResponse?
    var error: Error?
    
    let semaphore = DispatchSemaphore(value: 0)
    
    let dataTask = self.dataTask(with: request) {
      data = $0
      response = $1
      error = $2
      semaphore.signal()
    }
    
    dataTask.resume()
    semaphore.wait()
    
    return (data, response, error)
  }
}

struct TargetDrive  :Codable {
  let id: String
  let key: String
}

struct AccessControlList : Codable {
  let type: SecurityGroupType
}

enum SecurityGroupType :Codable {
  case owner
}

struct DriveFileUploadProvider {
}


struct StorageOptions  :Codable {
  let targetDrive: TargetDrive
}

struct UploadManifest  :Codable {
  let payloadDescriptors: [UploadPayloadDescriptor]
}

struct UploadPayloadDescriptor  :Codable {
  let payloadKey: String
  let descriptorContent: String?
  let thumbnails: [UploadThumbnailDescriptor]
  let previewThumbnail: EmbeddedThumb?
  let iv: Data?
}

struct UploadThumbnailDescriptor  :Codable {
  let thumbnailKey: String
  let pixelHeight: Int
  let pixelWidth: Int
}


struct UploadInstructionSet :Codable {
  let storageOptions: StorageOptions
  var transitOptions: TransitOptions?
  var transferIv: Data?
  var manifest: UploadManifest?
  
  func toJsonString() -> String {
      let encoder = JSONEncoder()
      encoder.outputFormatting = .prettyPrinted
      
      // Custom data encoding strategy for `Data`
      encoder.dataEncodingStrategy = .base64
      
      do {
          let jsonData = try encoder.encode(self)
          if let jsonString = String(data: jsonData, encoding: .utf8) {
              return jsonString
          }
      } catch {
          print("Failed to convert to JSON string: \(error)")
      }
      return "{}"
  }
}

struct TransitOptions  :Codable {
  // Not used ATM
}

struct UploadAppFileMetaData<T: Codable> :Codable {
  let uniqueId: String
  let tags: [String]
  let fileSize: Int
  let resolution: Int
  let timestamp: Int64
  let additionalMetaData: String?
  let archivalStatus: ArchivalStatus
  let comments: String
  let embeddedThumb: EmbeddedThumb?
  let content:  String
}

enum ArchivalStatus :Codable {
  case none
}

struct UploadFileMetadata<T: Codable>: Codable {
  let isPublic: Bool
  var isEncrypted: Bool
  let acl: AccessControlList
  let metaData: UploadAppFileMetaData<T>
  let extra: String?
  let thumbnail: String?
  
  mutating func setIsEncrypted(_ encrypt: Bool) {
    self.isEncrypted = encrypt
  }
}


class UploadResult {}
class SuccessfulUploadResult: UploadResult {}
class BadRequestUploadResult: UploadResult {
  var errorCode: String? = nil
}


struct KeyHeader {
  var iv: Data
  var aesKey: SymmetricKey
}

struct DescriptorData : Codable {
  var encryptedKeyHeader: Data
  var fileMetadata: UploadFileMetadata<String>
  
  func toJsonString() -> String {
      let encoder = JSONEncoder()
      encoder.outputFormatting = .prettyPrinted
      
      // Custom data encoding strategy for `Data`
      encoder.dataEncodingStrategy = .base64
      
      do {
          let jsonData = try encoder.encode(self)
          if let jsonString = String(data: jsonData, encoding: .utf8) {
              return jsonString
          }
      } catch {
          print("Failed to convert to JSON string: \(error)")
      }
      return "{}"
  }
}
