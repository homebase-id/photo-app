//
//  DotYouClient.swift
//  HomebasePhotos
//
//  Created by Stef Coenen on 19/06/2024.
//

import Foundation

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
}

enum ApiType {
  case app
}
