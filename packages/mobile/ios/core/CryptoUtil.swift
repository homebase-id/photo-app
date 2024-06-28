//
//  CryptoUtil.swift
//  HomebasePhotos
//
//  Created by Stef Coenen on 21/06/2024.
//

import Foundation
import CryptoKit
import CommonCrypto

class CryptoUtil {
  static func encryptKeyHeader(dotYouClient: DotYouClient, keyHeader: KeyHeader, transferIv: Data) throws -> EncryptedKeyHeader {
      guard let sharedSecret = dotYouClient.sharedSecret else {
          throw NSError(domain: "MissingSharedSecret", code: -1, userInfo: [NSLocalizedDescriptionKey: "Attempting to encrypt but missing the shared secret"])
      }

      // Combine keyHeader.iv and keyHeader.aesKey
      var combined = Data()
      combined.append(keyHeader.iv)
      combined.append(keyHeader.aesKey)

      // Perform the encryption using cbcEncrypt
      let cipher = try cbcEncrypt(data: combined, iv: transferIv, key: sharedSecret)

      return EncryptedKeyHeader(
          iv: transferIv,
          encryptedAesKey: cipher,
          encryptionVersion: 1,
          type: 11
      )
  }


  static func encryptMetaData(metadata: UploadFileMetadata<String>, keyHeader: KeyHeader ) throws -> UploadFileMetadata<String> {
    if(metadata.appData.content == nil){
      return metadata;
    }
    var encryptedMetadata = metadata

    print("encryptMetaData", encryptedMetadata.appData.content)
    
    let encryptedContent = try innerEncrypt(iv:keyHeader.iv, key: keyHeader.aesKey, data: metadata.appData.content.data(using: .utf8)!)
    encryptedMetadata.appData.content = encryptedContent.base64EncodedString()

    return encryptedMetadata;
  }

  static func encryptWithKeyHeader(file: String, keyHeader: KeyHeader) throws -> (stream: InputStream, count: UInt64) {
    guard let inputStream = InputStream(fileAtPath: file) else {
      throw NSError(domain: "Invalid file as stream", code: -1, userInfo: nil)
    }

    return try encryptWithKeyHeader(stream: inputStream, keyHeader: keyHeader)
  }

  static func encryptWithKeyHeader(stream: InputStream, keyHeader: KeyHeader) throws -> (stream: InputStream, count: UInt64) {
    let keyData = keyHeader.aesKey
    var iv = keyHeader.iv

    let outputStream = OutputStream(toMemory: ())

    stream.open()
    outputStream.open()

    defer {
      stream.close()
      outputStream.close()
    }

    let blockSize = kCCBlockSizeAES128
    var buffer = [UInt8](repeating: 0, count: blockSize)

    var lastPadding = iv

    while stream.hasBytesAvailable {
      let bytesRead = stream.read(&buffer, maxLength: blockSize)
      if bytesRead == 0 { break }

      let inputData = Data(bytes: buffer, count: bytesRead)
      let bufferSize = inputData.count + blockSize
      var encryptedBuffer = [UInt8](repeating: 0, count: bufferSize)

      var numBytesEncrypted: size_t = 0
      let result = encryptedBuffer.withUnsafeMutableBytes { encryptedBytes in
        CCCrypt(CCOperation(kCCEncrypt),
                CCAlgorithm(kCCAlgorithmAES),
                CCOptions(kCCOptionPKCS7Padding),
                keyData.withUnsafeBytes { $0.baseAddress },
                keyData.count,
                iv.withUnsafeBytes { $0.baseAddress },
                inputData.withUnsafeBytes { $0.baseAddress },
                inputData.count,
                encryptedBytes.baseAddress,
                bufferSize,
                &numBytesEncrypted)
      }

      guard result == kCCSuccess else {
        throw NSError(domain: "Encryption failed", code: Int(result), userInfo: nil)
      }


      // Get the last 16 bytes (padding) of the encrypted data
      lastPadding = Data(encryptedBuffer[(numBytesEncrypted - blockSize)..<numBytesEncrypted])

      // Remove the padding from the encrypted data
      numBytesEncrypted -= blockSize

      if(numBytesEncrypted == 0) {
        // Appaerently this is expected at the end... :shrug:
        break;
      } else {
        // Copy the last block of the encrypted data into the iv (without padding)
        iv = Data(encryptedBuffer[(numBytesEncrypted - blockSize)..<numBytesEncrypted])
      }

      // Write the encrypted data to the output stream
      let encryptedData = Data(bytes: encryptedBuffer, count: numBytesEncrypted)
      encryptedData.withUnsafeBytes { outputStream.write($0.bindMemory(to: UInt8.self).baseAddress!, maxLength: numBytesEncrypted) }
    }

    // Write the last padding
    lastPadding.withUnsafeBytes {
      outputStream.write($0.bindMemory(to: UInt8.self).baseAddress!, maxLength: blockSize)
    }

    let encryptedData = outputStream.property(forKey: .dataWrittenToMemoryStreamKey) as! Data
    return (stream: InputStream(data: encryptedData), count: UInt64(encryptedData.count))
  }

  static func innerEncrypt(iv: Data, key: Data, data: Data) throws -> Data {
    let keyLength = kCCKeySizeAES128
    let ivLength = kCCBlockSizeAES128
    let options = CCOptions(kCCOptionPKCS7Padding)

    var encryptedData = Data(count: data.count + ivLength)
    var numBytesEncrypted = 0

    // Create a local copy of the buffer to avoid overlapping access issues
    var tempEncryptedData = encryptedData

    let cryptStatus = tempEncryptedData.withUnsafeMutableBytes { encryptedBytes in
        data.withUnsafeBytes { dataBytes in
            iv.withUnsafeBytes { ivBytes in
                key.withUnsafeBytes { keyBytes in
                    CCCrypt(CCOperation(kCCEncrypt),
                            CCAlgorithm(kCCAlgorithmAES),
                            options,
                            keyBytes.baseAddress, keyLength,
                            ivBytes.baseAddress,
                            dataBytes.baseAddress, data.count,
                            encryptedBytes.baseAddress, encryptedData.count,
                            &numBytesEncrypted)
                }
            }
        }
    }

    guard cryptStatus == kCCSuccess else {
        throw NSError(domain: "Error in encryption", code: Int(cryptStatus), userInfo: nil)
    }

    // Update the original encryptedData only after the crypt operation
    encryptedData = tempEncryptedData
    encryptedData.removeSubrange(numBytesEncrypted..<encryptedData.count)
    return encryptedData
}

  static func cbcEncrypt(data: Data, iv: Data, key: Data) throws -> Data {
      return try innerEncrypt(iv: iv, key: key, data: data)
  }

  static func getUpdatedKeyHeader(keyHeader: KeyHeader, manifest: UploadManifest, payloadKey: String) -> KeyHeader {
    let manifest = manifest;
    let payloadDescriptors = manifest.payloadDescriptors;

    for descriptor in payloadDescriptors {
        if descriptor.payloadKey == payloadKey {
          if(descriptor.iv != nil) {
            return KeyHeader(iv: descriptor.iv!, aesKey: keyHeader.aesKey)
          }
        }
    }

    return keyHeader
  }

  static func base64Encode(stream: InputStream) -> String? {
      stream.open()
      defer {
          stream.close()
      }

      let bufferSize = 1024
      var buffer = [UInt8](repeating: 0, count: bufferSize)
      var data = Data()

      while stream.hasBytesAvailable {
          let read = stream.read(&buffer, maxLength: bufferSize)
          if read < 0 {
              print("Error reading stream: \(stream.streamError?.localizedDescription ?? "Unknown error")")
              return nil
          } else if read == 0 {
              break
          }
          data.append(buffer, count: read)
      }

      return data.base64EncodedString()
  }

}
