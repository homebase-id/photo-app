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
  func runSync() async -> Void {
    print("[SyncTrigger]: runSync");
    let mediaSync = MediaSync();
    await mediaSync.syncMedia();
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
}
