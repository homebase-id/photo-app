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
  static func resizeImage(filePath: String, instruction: ResizeInstruction, key: String, keepDimensions: Bool) throws -> ThumbnailStream? {
    guard let imageSource = CGImageSourceCreateWithURL(URL(fileURLWithPath: filePath) as CFURL, nil) else {
      print("Failed to create image source.")
      return nil;
    }

    guard let resizedImage = resizeImageWithInstruction(imageSource: imageSource, instruction: instruction) else {
      return nil;
    }

    let imageProperties = CGImageSourceCopyPropertiesAtIndex(imageSource, 0, nil) as Dictionary?
    let originalWidth = imageProperties?[kCGImagePropertyPixelWidth] as? Int
    let originalHeight = imageProperties?[kCGImagePropertyPixelHeight] as? Int

    if let stream = createImageStream(from: resizedImage, format: instruction.format) {
      return ThumbnailStream(pixelHeight: (keepDimensions ? originalHeight : resizedImage.height)!, pixelWidth: (keepDimensions ? originalWidth : resizedImage.width)!, contentType: "image/" + instruction.format, key: key, inputStream: stream)
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
        streams.append(ThumbnailStream(pixelHeight: resizedImage.height, pixelWidth: resizedImage.width, contentType: "image/" + instruction.format, key: key, inputStream: stream))
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

    let imageProperties = CGImageSourceCopyPropertiesAtIndex(imageSource, 0, nil) as Dictionary?
    let originalWidth = imageProperties?[kCGImagePropertyPixelWidth] as? Int ?? 0
    let originalHeight = imageProperties?[kCGImagePropertyPixelHeight] as? Int ?? 0

    let scaledSize = calculateScaledSize(originalWidth: originalWidth, originalHeight: originalHeight, targetWidth: instruction.width, targetHeight: instruction.height)

    let context = CGContext(data: nil, width: scaledSize.width, height: scaledSize.height, bitsPerComponent: thumbnail.bitsPerComponent, bytesPerRow: 0, space: thumbnail.colorSpace ?? CGColorSpaceCreateDeviceRGB(), bitmapInfo: thumbnail.bitmapInfo.rawValue)

    context?.interpolationQuality = .high
    context?.draw(thumbnail, in: CGRect(x: 0, y: 0, width: scaledSize.width, height: scaledSize.height))

    return context?.makeImage()
  }

  static func calculateScaledSize(originalWidth: Int, originalHeight: Int, targetWidth: Int, targetHeight: Int) -> (width: Int, height: Int) {
      let widthScale = CGFloat(targetWidth) / CGFloat(originalWidth)
      let heightScale = CGFloat(targetHeight) / CGFloat(originalHeight)
      let scale = min(widthScale, heightScale)

      // Calculate the new dimensions
      let width = Int(round(CGFloat(originalWidth) * scale))
      let height = Int(round(CGFloat(originalHeight) * scale))

      return (width, height)
  }

  static func createImageStream(from image: CGImage, format: String) -> (stream: InputStream, count:UInt64)? {
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

    return (stream: InputStream(data: data as Data), count: UInt64(data.count))
  }

  static func formatUTI(for format: String) -> String {
    switch format.lowercased() {
    case "jpeg":
      return kUTTypeJPEG as String
    case "png":
      return kUTTypePNG as String
    case "gif":
      return kUTTypeGIF as String
    default:
      return kUTTypeJPEG as String
    }
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

  let inputStream: (stream: InputStream, count: UInt64)
}

protocol PayloadBase {
  var contentType: String { get }
  var descriptorContent: String? {get}
  var previewThumbnail: EmbeddedThumb? {get}
  var key: String { get }
}

struct PayloadStream: PayloadBase {
  let descriptorContent: String?
  let previewThumbnail: EmbeddedThumb?

  let contentType: String
  let key: String

  let inputStream: (stream: InputStream, count: UInt64)
}

struct PayloadFile: PayloadBase {
  let descriptorContent: String?
  let previewThumbnail: EmbeddedThumb?

  let contentType: String
  let key: String

  let filePath: String
}

struct EmbeddedThumb :Codable {
  let pixelHeight: Int
  let pixelWidth: Int
  let contentType: String
  let content: String
}
