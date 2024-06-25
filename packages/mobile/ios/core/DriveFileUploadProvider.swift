//
//  DriveFileUploadProvider.swift
//  HomebasePhotos
//
//  Created by Stef Coenen on 19/06/2024.
//

import Foundation
import CryptoKit
import Alamofire

extension DriveFileUploadProvider {
  static func uploadFile(dotYouClient: DotYouClient, instructions: UploadInstructionSet, metadata: UploadFileMetadata<String>, payloads: [PayloadBase], thumbnails: [ThumbnailBase], encrypt: Bool, completion: @escaping UploadCompletionHandler) throws -> Void  {
    print("[SyncWorker] Upload");

    // Implement the uploadFile logic
    var mutableMetadata = metadata
    mutableMetadata.setIsEncrypted(encrypt)

    let keyHeader = encrypt ? generateKeyHeader() : nil
    let manifest = buildManifest(payloads: payloads, thumbnails: thumbnails, generateIv: encrypt)

    let updatedInstructions = UploadInstructionSet(storageOptions: instructions.storageOptions, transitOptions: instructions.transitOptions, transferIv: instructions.transferIv ?? getRandom16ByteArray(), manifest: manifest)

    let encryptedDescriptor = try buildDescriptor(dotYouClient: dotYouClient, keyHeader: keyHeader, instructions: updatedInstructions, metadata: mutableMetadata)
    let formData = try buildFormData(instructions: updatedInstructions, encryptedDescriptor: encryptedDescriptor, payloads: payloads, thumbnails: thumbnails, keyHeader: keyHeader, manifest: manifest)

    return try pureUpload(dotYouClient: dotYouClient, data: formData, completion: completion)
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

    let descriptorData = DescriptorData(encryptedKeyHeader: try CryptoUtil.encryptKeyHeader( dotYouClient: dotYouClient, keyHeader: keyHeader != nil ? keyHeader! : getEmptyKeyHeader(), transferIv: instructions.transferIv!), fileMetadata: metadata)
    let jsonString = descriptorData.toJsonString()
    let content = jsonString.data(using: .utf8)

    return try CryptoUtil.cbcEncrypt(data: content!, iv: transferIv, key: dotYouClient.sharedSecret!)
  }

  static func buildFormData(instructions: UploadInstructionSet, encryptedDescriptor: Data, payloads: [PayloadBase], thumbnails: [ThumbnailBase], keyHeader: KeyHeader?, manifest: UploadManifest) throws -> MultipartFormData {
    let formData = MultipartFormData()

    // Add instructions
    if let instructionsData = instructions.toJsonString().data(using: .utf8) {
      formData.append(instructionsData, withName: "instructions", fileName: "instructions.json", mimeType: "application/octet-stream")
    }

    // Add encrypted descriptor if available
    formData.append(encryptedDescriptor, withName: "metaData", fileName: "metadata.bin", mimeType: "application/octet-stream")

    // Add payloads and thumbnails as streams
    for payload in payloads {
      if let keyHeader = keyHeader {
        if let payloadFile = payload as? PayloadFile {
          let encryptedPayload = try CryptoUtil.encryptWithKeyHeader(file: payloadFile.filePath, keyHeader: CryptoUtil.getUpdatedKeyHeader(keyHeader: keyHeader, manifest: manifest, payloadKey: payload.key))
          formData.append(encryptedPayload.stream, withLength: encryptedPayload.count, name: "payload", fileName: payload.key, mimeType: payload.contentType)

        } else if let payloadStream = payload as? PayloadStream {
          let encryptedPayload = try CryptoUtil.encryptWithKeyHeader(stream: payloadStream.inputStream.stream, keyHeader: CryptoUtil.getUpdatedKeyHeader(keyHeader: keyHeader, manifest: manifest, payloadKey: payload.key))
          formData.append(encryptedPayload.stream, withLength: encryptedPayload.count, name: "payload", fileName: payload.key, mimeType: payload.contentType)
        } else {
          continue
        }
      } else {
        if let payloadFile = payload as? PayloadFile {
          if #available(iOS 16.0, *) {
            formData.append(InputStream(fileAtPath: payloadFile.filePath)!, withLength: try FileManager.default.attributesOfItem(atPath: payloadFile.filePath)[.size] as! UInt64, name: "payload", fileName: payload.key, mimeType: payload.contentType)
          } else {
            // Fallback on earlier versions
          }
        } else if let payloadStream = payload as? PayloadStream {
          formData.append(payloadStream.inputStream.stream, withLength: payloadStream.inputStream.count, name: "payload", fileName: payload.key, mimeType: payload.contentType)
        } else {
          continue
        }
      }
    }

    for thumb in thumbnails {
      if let keyHeader = keyHeader {
        if let thumbStream = thumb as? ThumbnailStream {
          let encryptedThumb = try CryptoUtil.encryptWithKeyHeader(stream: thumbStream.inputStream.stream, keyHeader: CryptoUtil.getUpdatedKeyHeader(keyHeader: keyHeader, manifest: manifest, payloadKey: thumb.key))
          formData.append(encryptedThumb.stream, withLength: encryptedThumb.count, name: "thumbnail", fileName: thumb.key + String(thumb.pixelWidth), mimeType: thumb.contentType);
        } else {
          continue
        }
      } else {
        if let thumbStream = thumb as? ThumbnailStream {
          formData.append(thumbStream.inputStream.stream, withLength: thumbStream.inputStream.count, name: "thumbnail", fileName: thumb.key + String(thumb.pixelWidth), mimeType: thumb.contentType);
        } else {
          continue
        }
      }
    }

    return formData
  }

  typealias UploadCompletionHandler = (Result<String?, Error>) -> Void
  static func pureUpload(dotYouClient: DotYouClient, data: MultipartFormData, completion: @escaping UploadCompletionHandler
) throws -> Void  {
    AF.upload(
      multipartFormData: data,
      to:dotYouClient.endpoint + "/drive/files/upload",
      usingThreshold: UInt64.init(),
      method: .post,
      headers: HTTPHeaders(dotYouClient.headers)
    )
    .validate(statusCode: 200..<401)
    .responseString { response in
      // Handle the response
      switch response.result {
      case .success(let data):
        let result = JsonParser.parseJson(jsonString: data);
        
        if(response.response?.statusCode == 200 ){
          completion(.success(data))
        } else if(result?["errorCode"] as! String == "existingFileWithUniqueId"){
          completion(.success(data))
        } else {
          completion(.failure(NSError(domain: "DriveFileUploadProvider", code: 1, userInfo: [NSLocalizedDescriptionKey: "Upload failed with a bad request"])))
        }
      case .failure(let error):
          completion(.failure(error))
      }
    }
  }

  static func generateKeyHeader() -> KeyHeader {
    // Generate key header
    return KeyHeader(iv: getRandom16ByteArray(), aesKey: getRandom16ByteArray())
  }

  static func getRandom16ByteArray() -> Data {
    // Generate random 16-byte array
    return SymmetricKey(size: .bits128).withUnsafeBytes { Data($0) }
  }
  
  static func getEmptyKeyHeader() -> KeyHeader {
    return KeyHeader(iv: Data(repeating: 0, count: 16), aesKey: Data(repeating: 0, count: 16) )
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
  let alias: String
  let type: String
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
  let drive: TargetDrive
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
  let fileType: Int
  let dataType: Int
  let userDate: Int64
  let groupId: String?
  let archivalStatus: Int
  var content:  String
  var previewThumbnail: EmbeddedThumb?
}

struct UploadFileMetadata<T: Codable>: Codable {
  let allowDistribution: Bool
  var isEncrypted: Bool
  let acl: AccessControlList
  var appData: UploadAppFileMetaData<T>
  let referencedFile: String?

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
  var aesKey: Data
}

struct EncryptedKeyHeader : Codable {
  var iv: Data
  var encryptedAesKey: Data
  var encryptionVersion: Int
  var type: Int
}

struct DescriptorData : Codable {
  var encryptedKeyHeader: EncryptedKeyHeader
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

class JsonParser {
  static func parseJson(jsonString: String) -> [String: Any]? {
    if let jsonData = jsonString.data(using: .utf8) {
      do {
        let jsonObject = try JSONSerialization.jsonObject(with: jsonData, options: [])
        if let dictionary = jsonObject as? [String: Any] {
            return dictionary
        }
      } catch {
        print("Failed to parse JSON: \(error.localizedDescription)")
      }
    }
    
    return nil
  }
  
 static func traverseJSON(_ json: Any, parentKey: String = "") {
      if let dictionary = json as? [String: Any] {
          for (key, value) in dictionary {
              let fullKey = parentKey.isEmpty ? key : "\(parentKey).\(key)"
              traverseJSON(value, parentKey: fullKey)
          }
      } else if let array = json as? [Any] {
          for (index, value) in array.enumerated() {
              let fullKey = "\(parentKey)[\(index)]"
              traverseJSON(value, parentKey: fullKey)
          }
      } else {
          print("\(parentKey): \(json)")
      }
  }

}
