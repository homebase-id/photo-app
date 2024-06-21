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
  
  func syncMedia	() -> Void {
    let isDebug: Bool = true
    let storage = getStorage()
    
    
    
    let syncEnabled: Bool = storage?.bool(forKey: "syncFromCameraRollAsBoolean") ?? false
    let identity: String = storage?.string(forKey: "identity") ?? ""
    let cat: String = storage?.string(forKey: "bx0900") ?? ""
    let sharedSecret: String = storage?.string(forKey: "APSS") ?? ""
    var lastSyncTimeInMiliseconds: Double = storage?.double(forKey: "lastSyncTimeAsNumber") ?? 0
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
    
    lastSyncTimeInMiliseconds = 1717664076909
    
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
    fetchOptions.predicate = NSPredicate(format: "creationDate > %@", NSDate(timeIntervalSince1970: lastSyncTimeSeconds))
    fetchOptions.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
    
    let fetchResult = PHAsset.fetchAssets(with: .image, options: fetchOptions)
    
    if isDebug {
      print("[SyncWorker] fetchResult count: \(fetchResult.count)")
    }
    
    if fetchResult.count == 0 {
      // No new photos to sync so we set current time as last sync time
      //storage.set(forKey: "lastSyncTimeAsNumber", Date().timeIntervalSince1970)
      storage?.set(Date().timeIntervalSince1970, forKey: "lastSyncTimeAsNumber")
    }
    
    fetchResult.enumerateObjects { (asset, index, stop) in
      let options = PHContentEditingInputRequestOptions()
      options.isNetworkAccessAllowed = true
      
      asset.requestContentEditingInput(with: options) { (input, info) in
        guard let input = input, let fileURL = input.fullSizeImageURL else { return }
        
        let filePath = fileURL.path
        let timestampInMillis = asset.creationDate?.timeIntervalSince1970 ?? 0 * 1000
        
        let resources = PHAssetResource.assetResources(for: asset)
        let uniformTypeIdentifier = resources.first?.uniformTypeIdentifier ?? "public.jpeg"
        var mimeType = "image/jpeg";
        if #available(iOS 14.0, *) {
          mimeType = UTType(uniformTypeIdentifier)?.preferredMIMEType ?? mimeType
        }
        
        let identifier = asset.localIdentifier
        let width = asset.pixelWidth
        let height = asset.pixelHeight
        
        if asset.mediaType == .video {
          // Skip videos for now
          print("[SyncWorker] Skipping video: \(filePath)")
          return
        }
        
        if isDebug {
          print("[SyncWorker] MediaItem filePath: \(filePath)")
        }
        
        do {
          let result = try MediaProvider.uploadMedia(dotYouClient: dotYouClient, filePath: filePath, timestampInMs: Int64(timestampInMillis), mimeType: mimeType, identifier: identifier, width: width, height: height, forceLowerQuality: forceLowerQuality)
          
          
          switch result {
          case is SuccessfulUploadResult:
            print("[SyncWorker] MediaItem uploaded: \(result)")
            //mmkv.set(timestampInMillis, forKey: "lastSyncTimeAsNumber") // We update the last sync time to the timestamp of the photo so we can continue where we left off if the task is interrupted
          case let badResult as BadRequestUploadResult:
            if badResult.errorCode != "existingFileWithUniqueId" {
              print("[SyncWorker] MediaItem failed to upload: \(result)")
            } else {
              print("[SyncWorker] MediaItem was already uploaded: \(result)")
              //mmkv.set(timestampInMillis, forKey: "lastSyncTimeAsNumber") // We update the last sync time to the timestamp of the photo so we can continue where we left off if the task is interrupted
            }
          default:
            break
          }
          
        } catch {
          print("[SyncWorker] Error uploading media: \(error.localizedDescription)")
          // Continue with the next iteration of the loop
        }
      }
    }
    
    // Everything is processed, so we set current time as last sync time
    //mmkv.set(Date().timeIntervalSince1970, forKey: "lastSyncTimeAsNumber")
  }
  
  // https://github.com/ammarahm-ed/react-native-mmkv-storage/pull/343#issuecomment-1908089428
  func getStorage() -> MMKV? {
    let paths = NSSearchPathForDirectoriesInDomains(.libraryDirectory, .userDomainMask, true)
    guard let first = paths.first else { return nil }
    let path = (first as NSString).appendingPathComponent("mmkv")
    MMKV.initialize(rootDir: path as String)
    return MMKV.init(mmapID: "default")
  }
}