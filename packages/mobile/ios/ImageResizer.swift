//
//  ImageResizer.swift
//  HomebasePhotos
//
//  Created by Stef Coenen on 19/06/2024.
//

import Foundation
import CoreGraphics
import ImageIO
import MobileCoreServices

extension ImageResizer {
  static func resizeImage(filePath: String, instruction: ResizeInstruction, key: String) throws -> ThumbnailStream? {
    guard let imageSource = CGImageSourceCreateWithURL(URL(fileURLWithPath: filePath) as CFURL, nil) else {
      print("Failed to create image source.")
      return nil;
    }
    
    guard let resizedImage = resizeImageWithInstruction(imageSource: imageSource, instruction: instruction) else {
      return nil;
    }
    
    if let stream = createImageStream(from: resizedImage, format: instruction.format) {
      return ThumbnailStream(pixelHeight: resizedImage.height, pixelWidth: resizedImage.width, contentType: instruction.format, key: key, inputStream: stream)
    }
    
    return nil;
  }
  
  static func resizeImage(filePath: String, instructions: [ResizeInstruction], key: String) throws -> [ThumbnailBase] {
    var streams: [ThumbnailBase] = []
    
    guard let imageSource = CGImageSourceCreateWithURL(URL(fileURLWithPath: filePath) as CFURL, nil) else {
      print("Failed to create image source.")
      return streams
    }
    
    for instruction in instructions {
      guard let resizedImage = resizeImageWithInstruction(imageSource: imageSource, instruction: instruction) else {
        continue
      }
      
      if let stream = createImageStream(from: resizedImage, format: instruction.format) {
        streams.append(ThumbnailStream(pixelHeight: resizedImage.height, pixelWidth: resizedImage.width, contentType: instruction.format, key: key, inputStream: stream))
      }
    }
    
    return streams
  }
  
  static func resizeImageWithInstruction(imageSource: CGImageSource, instruction: ResizeInstruction) -> CGImage? {
    let options: [CFString: Any] = [
      kCGImageSourceThumbnailMaxPixelSize: max(instruction.width, instruction.height),
      kCGImageSourceCreateThumbnailFromImageAlways: true
    ]
    
    guard let thumbnail = CGImageSourceCreateThumbnailAtIndex(imageSource, 0, options as CFDictionary) else {
      print("Failed to create thumbnail.")
      return nil
    }
    
    let context = CGContext(data: nil, width: instruction.width, height: instruction.height, bitsPerComponent: thumbnail.bitsPerComponent, bytesPerRow: 0, space: thumbnail.colorSpace ?? CGColorSpaceCreateDeviceRGB(), bitmapInfo: thumbnail.bitmapInfo.rawValue)
    
    context?.interpolationQuality = .high
    context?.draw(thumbnail, in: CGRect(x: 0, y: 0, width: instruction.width, height: instruction.height))
    
    return context?.makeImage()
  }
  
  static func createImageStream(from image: CGImage, format: String) -> InputStream? {
    let data = NSMutableData()
    guard let destination = CGImageDestinationCreateWithData(data as CFMutableData, formatUTI(for: format) as CFString, 1, nil) else {
      print("Failed to create image destination.")
      return nil
    }
    
    CGImageDestinationAddImage(destination, image, nil)
    guard CGImageDestinationFinalize(destination) else {
      print("Failed to finalize image destination.")
      return nil
    }
    
    return InputStream(data: data as Data)
  }
  
  static func formatUTI(for format: String) -> String {
    switch format.lowercased() {
    case "jpg", "jpeg":
      return kUTTypeJPEG as String
    case "png":
      return kUTTypePNG as String
    case "gif":
      return kUTTypeGIF as String
    default:
      return kUTTypeJPEG as String
    }
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

struct ImageResizer {
  struct ResizeInstruction {
    let width: Int
    let height: Int
    let quality: Int
    let format: String
  }
}

protocol ThumbnailBase {
  var pixelHeight: Int { get }
  var pixelWidth: Int { get }
  var contentType: String { get }
  var key: String { get }
}

struct ThumbnailStream: ThumbnailBase {
  let pixelHeight: Int
  let pixelWidth: Int
  let contentType: String
  let key: String
  
  let inputStream: InputStream
}

protocol PayloadBase {
  var metadata: String? { get }
  var contentType: String { get }
  var descriptorContent: String? {get}
  var previewThumbnail: EmbeddedThumb? {get}
  var key: String { get }
}

struct PayloadStream: PayloadBase {
  let descriptorContent: String?
  let previewThumbnail: EmbeddedThumb?
  
  let metadata: String?
  let contentType: String
  let key: String
  
  let inputStream: InputStream
}

struct PayloadFile: PayloadBase {
  let descriptorContent: String?
  let previewThumbnail: EmbeddedThumb?
  
  let metadata: String?
  let contentType: String
  let key: String
  
  let filePath: String
}

struct EmbeddedThumb :Codable {
  let pixelHeight: Int
  let pixelWidth: Int
  let contentType: String
  let base64: String
}
