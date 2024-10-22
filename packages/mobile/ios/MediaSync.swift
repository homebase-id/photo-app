//
//  MediaSync.swift
//  HomebasePhotos
//
//  Created by Stef Coenen on 19/06/2024.
//

import Foundation
import MMKV
import Photos
import UniformTypeIdentifiers

class MediaSync {
  func syncMedia () async -> Void {
    let isDebug: Bool = true
    let storage = getStorage()

    let syncEnabled: Bool = storage?.bool(forKey: "syncFromCameraRollAsBoolean") ?? false
    let identity: String = storage?.string(forKey: "identity") ?? ""
    let cat: String = storage?.string(forKey: "bx0900") ?? ""
    let sharedSecret: String = storage?.string(forKey: "APSS") ?? ""
    var lastSyncTimeInMiliseconds: Double = storage?.double(forKey: "lastSyncTimeAsNumber") ?? (Date().timeIntervalSince1970 * 1000) - (1000 * 60 * 60 * 24 * 7)
    let forceLowerQuality: Bool = storage?.bool(forKey: "forceLowerQualityAsBoolean") ?? false

    print("[SyncWorker] syncEnabled: " + (syncEnabled ? "True" : "False"));
    print("[SyncWorker] identity: " + identity);
    print("[SyncWorker] CAT: " + cat);
    print("[SyncWorker] SharedSecret: " + sharedSecret);
    print("[SyncWorker] lastSyncTime: " + String(format: "%f", lastSyncTimeInMiliseconds))
    print("[SyncWorker] forceLowerQuality: " + (forceLowerQuality ? "True" : "False"));

    if(!syncEnabled) {
      return
    }

    // Usefull during debug
    // lastSyncTimeInMiliseconds = 946684800000

    var headers = [String: String]()
    headers["bx0900"] = cat

    guard let sharedSecretBytes = Data(base64Encoded: sharedSecret) else {
      print("[SyncWorker] Failed to decode base64 string for sharedSecret")
      return
    }
    let dotYouClient = DotYouClient(apiType: .app, sharedSecret: sharedSecretBytes, identity: identity, headers: headers)

    // Find all photos that have been added since the last sync
    let fetchOptions = PHFetchOptions()
    let lastSyncTimeSeconds = lastSyncTimeInMiliseconds / 1000 - (60 * 30) // 30 minutes buffer
    let maxBatchSize = 100
    fetchOptions.predicate = NSPredicate(format: "creationDate > %@", NSDate(timeIntervalSince1970: lastSyncTimeSeconds))
    fetchOptions.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
    fetchOptions.fetchLimit = maxBatchSize

    let fetchResult = PHAsset.fetchAssets(with: fetchOptions)
    // let fetchResult = PHAsset.fetchAssets(with: .video, options: fetchOptions)

    if isDebug {
      print("[SyncWorker] fetchResult count: \(fetchResult.count)")
    }

    if fetchResult.count == 0 {
      // No new photos to sync so we set current time as last sync time
      storage?.set(Date().timeIntervalSince1970 * 1000, forKey: "lastSyncTimeAsNumber")
    }


    await withTaskGroup(of: Void.self) { taskGroup in
      for index in 0..<fetchResult.count {
        taskGroup.addTask {
          let asset = fetchResult.object(at: index)
          let options = PHContentEditingInputRequestOptions()
          options.isNetworkAccessAllowed = true

          var filePath: String?
          var mimeType: String = ""
          let width: Int = asset.pixelWidth
          let height: Int = asset.pixelHeight
          let timestampInMillis = (asset.creationDate?.timeIntervalSince1970 ?? 0) * 1000
          let identifier = asset.localIdentifier

          if asset.mediaType == .video {
            // Fetch and set video filePath and mimeType

              if let videoURL = await self.getVideoURL(from: asset) {
                filePath = videoURL.path
                mimeType = "video/mp4"
              } else {
                print("[SyncWorker] Error fetching video URL for asset: \(asset.localIdentifier)")
                return;
              }

          } else {
            // Fetch image filePath and mimeType
            let (input, _) = await self.requestContentEditingInput(asset: asset)
            guard let input = input, let fileURL = input.fullSizeImageURL else { return }

            filePath = fileURL.path
            let resources = PHAssetResource.assetResources(for: asset)
            let uniformTypeIdentifier = resources.first?.uniformTypeIdentifier ?? "public.jpeg"

            if #available(iOS 14.0, *) {
              mimeType = UTType(uniformTypeIdentifier)?.preferredMIMEType ?? "image/jpeg"
            } else {
              mimeType = "image/jpeg"
            }
          }

          // Check if we have a valid file path and continue with the upload process
          guard let validFilePath = filePath else {
            print("[SyncWorker] Error: Could not retrieve file path for asset")
            return
          }

          do {
            let result: UploadResult
            if asset.mediaType == .video {
              // Upload video
              result = try await VideoProvider.uploadMedia(dotYouClient: dotYouClient, filePath: validFilePath, timestampInMs: Int64(timestampInMillis), mimeType: mimeType, identifier: identifier, width: width, height: height, forceLowerQuality: true)
            } else {
              // Upload image
              result = try await ImageProvider.uploadMedia(dotYouClient: dotYouClient, filePath: validFilePath, timestampInMs: Int64(timestampInMillis), mimeType: mimeType, identifier: identifier, width: width, height: height, forceLowerQuality: forceLowerQuality)
            }

            // Common error handling and last sync update logic
            if result is SuccessfulUploadResult {
              print("Upload successful!")
              storage?.set(timestampInMillis, forKey: "lastSyncTimeAsNumber")
            } else if result is BadRequestUploadResult, let badResult = result as? BadRequestUploadResult, badResult.errorCode == "existingFileWithUniqueId" {
              print("Upload failed! Media already exists")
              storage?.set(timestampInMillis, forKey: "lastSyncTimeAsNumber")
            } else {
              print("Upload failed! :shrug:")
            }
          } catch {
            print("[SyncWorker] Error uploading media: \(error.localizedDescription)")
          }
        }
        // Wait for the current task to complete before starting the next one
        await taskGroup.waitForAll()
      }


      print("[SyncWorker] MediaSync finished")
      if(fetchResult.count < maxBatchSize) {
        // Everything is processed and the batch was smaller than max, so we set current time as last sync time
        storage?.set(Date().timeIntervalSince1970 * 1000, forKey: "lastSyncTimeAsNumber")
      }
    }
  }

  // https://github.com/ammarahm-ed/react-native-mmkv-storage/pull/343#issuecomment-1908089428
  func getStorage() -> MMKV? {
    let paths = NSSearchPathForDirectoriesInDomains(.libraryDirectory, .userDomainMask, true)
    guard let first = paths.first else { return nil }
    let path = (first as NSString).appendingPathComponent("mmkv")
    MMKV.initialize(rootDir: path as String)
    return MMKV.init(mmapID: "default")
  }

  func requestContentEditingInput(asset: PHAsset) async -> (input: PHContentEditingInput?, info: [AnyHashable : Any]?) {
    await withCheckedContinuation { continuation in
      let options = PHContentEditingInputRequestOptions()
      options.isNetworkAccessAllowed = true
      asset.requestContentEditingInput(with: options) { input, info in
        continuation.resume(returning: (input, info))
      }
    }
  }

  // Function to request AVAsset asynchronously
  func requestVideoAVAsset(_ asset: PHAsset) async -> AVAsset? {
    await withCheckedContinuation { continuation in
      let options = PHVideoRequestOptions()
      options.isNetworkAccessAllowed = true // Allow download from iCloud if needed

      PHImageManager.default().requestAVAsset(forVideo: asset, options: options) { avAsset, _, _ in
        continuation.resume(returning: avAsset)
      }
    }
  }

  // Function to request AVAsset and get video URL
  func getVideoURL(from asset: PHAsset) async -> URL? {
    if let avAsset = await requestVideoAVAsset(asset) as? AVURLAsset {
      return avAsset.url
    }
    return nil
  }
}
