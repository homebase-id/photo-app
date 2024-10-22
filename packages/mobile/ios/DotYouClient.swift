//
//  DotYouClient.swift
//  HomebasePhotos
//
//  Created by Stef Coenen on 19/06/2024.
//

import Foundation
import MMKV

class DotYouClient {
  let apiType: ApiType
  let identity: String
  let sharedSecret: Data?
  var headers: [String: String]
  let endpoint: String

  init(apiType: ApiType, sharedSecret: Data, identity: String, headers: [String: String]) {
    // Your implementation her
    self.apiType = apiType
    self.identity = identity
    self.sharedSecret = sharedSecret

    self.headers = headers
    self.headers["X-ODIN-FILE-SYSTEM-TYPE"] = headers["X-ODIN-FILE-SYSTEM-TYPE"] ?? "Standard"

    var endpoint = "https://" + identity

    switch (apiType) {
      //case .app:
      //    endpoint += "/api/owner/v1";
      //    break;
    case .app:
      endpoint += "/api/apps/v1";
      break;
      //case Guest:
      //    endpoint+ = "/api/guest/v1";
      //    break;
    }
    self.endpoint = endpoint
  }

  func createHttpClient() -> URLSession {
    return URLSession.shared
  }

  static func getDotYouClient() throws -> DotYouClient {
    let storage = getStorage()

    let identity: String = storage?.string(forKey: "identity") ?? ""
    let cat: String = storage?.string(forKey: "bx0900") ?? ""
    let sharedSecret: String = storage?.string(forKey: "APSS") ?? ""

    var headers = [String: String]()
    headers["bx0900"] = cat

    guard let sharedSecretBytes = Data(base64Encoded: sharedSecret) else {
      print("[DotYouClient] Failed to decode base64 string for sharedSecret")
      throw NSError(domain: "DotYouClient", code: 1, userInfo: nil)
    }
    return DotYouClient(apiType: .app, sharedSecret: sharedSecretBytes, identity: identity, headers: headers)
  }

  static func getStorage() -> MMKV? {
    let paths = NSSearchPathForDirectoriesInDomains(.libraryDirectory, .userDomainMask, true)
    guard let first = paths.first else { return nil }
    let path = (first as NSString).appendingPathComponent("mmkv")
    MMKV.initialize(rootDir: path as String)
    return MMKV.init(mmapID: "default")
  }
}

enum ApiType {
  case app
}
