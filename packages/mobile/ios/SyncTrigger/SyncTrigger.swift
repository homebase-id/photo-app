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
   print("[SyncTrigger]: runSync");
   let mediaSync = MediaSync();
   mediaSync.syncMedia();
 }
}
