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
  // Assuming you have the following methods and types:
  
  static func encryptWithKeyHeader(file: String, keyHeader: KeyHeader) throws -> InputStream {
    print("[SyncWorker] file: " + file);
    
    guard let inputStream = InputStream(fileAtPath: file) else {
      throw NSError(domain: "Invalid file as stream", code: -1, userInfo: nil)
    }
    
    return try encryptWithKeyHeader(stream: inputStream, keyHeader: keyHeader)
  }
  
  static func encryptWithKeyHeader(stream: InputStream, keyHeader: KeyHeader) throws -> InputStream {
    // Initialize the encryption operation
    let keyData = keyHeader.aesKey.withUnsafeBytes { Data($0) }
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
      
      var numBytesEncrypted: size_t = -1
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
      
      if(numBytesEncrypted < (blockSize * 2)) {
        // Appaerently this is expected at the end... :shrug:
      }else{
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
    return InputStream(data: encryptedData)
  }
  
  static func innerEncrypt(iv: Data, key: Data, data: Data) throws -> Data {
    let keyLength = kCCKeySizeAES256
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
        if descriptor.payloadKey == payloadKey, let descriptorIV = descriptor.iv {
            return KeyHeader(iv: descriptorIV, aesKey: keyHeader.aesKey)
        }
    }

    return keyHeader
  }

}
