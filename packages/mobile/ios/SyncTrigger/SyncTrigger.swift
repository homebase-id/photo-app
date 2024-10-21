//
//  SyncTrigger.swift
//  HomebasePhotos
//
//  Created by Stef Coenen on 19/06/2024.
//

import Foundation
@objc(SyncTrigger)
class SyncTrigger: NSObject {
  @objc
  func runSync() -> Void {
    Task {
      print("[SyncTrigger]: runSync");
      let mediaSync = MediaSync();
      await mediaSync.syncMedia();
    }
  }


  @objc
  func runSingleSync(_ filePath: String,
                     timestampInMs: NSNumber,
                     mimeType: String,
                     identifier: String,
                     width: NSNumber,
                     height: NSNumber,
                     resolver: @escaping RCTPromiseResolveBlock,
                     rejecter: @escaping RCTPromiseRejectBlock) {
    Task {
      print("[SyncTrigger]: runSingleSync");

      do {

        let dotYouClient = try DotYouClient.getDotYouClient()

        let result = try await ImageProvider.uploadMedia(dotYouClient: dotYouClient, filePath: filePath, timestampInMs: Int64(truncating: timestampInMs), mimeType: mimeType, identifier: identifier, width: Int(truncating: width), height: Int(truncating: height), forceLowerQuality: false)

        if(result is SuccessfulUploadResult) {
          // Resolve promise on success
          resolver("Upload completed successfully")
        } else if result is BadRequestUploadResult, let badResult = result as? BadRequestUploadResult, badResult.errorCode == "existingFileWithUniqueId" {
          rejecter("SYNC_ERROR", "File already exists", NSError(domain: "", code: 0))
        } else {
          rejecter("SYNC_ERROR", "Something went wrong", NSError(domain: "", code: 0))
        }

      } catch {
        // Reject promise on error
        rejecter("SYNC_ERROR", "Upload failed with error", error)

        print("[SyncTrigger]: runSingleSync failed with error: \(error)")
      }

      print("[SyncTrigger]: finished");
    }
  }

  @objc
  static func runStaticSync(completion: @escaping (Bool) -> Void) {
    Task {
      print("[SyncTrigger]: runSync");
      let mediaSync = MediaSync();
      await mediaSync.syncMedia();
      completion(true)
    }
  }

  // https://stackoverflow.com/questions/41765634/reactnative-swift-component-how-to-set-the-constructor#answer-50294485
  @objc static func requiresMainQueueSetup() -> Bool {
      return false
  }
}
