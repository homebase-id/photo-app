//
//  Bridge.m
//  HomebasePhotos
//
//  Created by Stef Coenen on 19/06/2024.
//

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SyncTrigger, NSObject)

RCT_EXTERN_METHOD(runSync)
RCT_EXTERN_METHOD(runSingleSync:(NSString *)filePath
                  timestampInMs:(nonnull NSNumber *)timestampInMs
                  mimeType:(NSString *)mimeType
                  identifier:(NSString *)identifier
                  width:(nonnull NSNumber *)width
                  height:(nonnull NSNumber *)height
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
