#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <ReactAppDependencyProvider/RCTAppDependencyProvider.h>
// iOS 9.x or newer
#import <React/RCTLinkingManager.h>
#import <BackgroundTasks/BackgroundTasks.h>
#import "HomebasePhotos-Swift.h"

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"HomebasePhoto";
   // => https://reactnative.dev/blog/2025/01/21/version-0.77#rctappdependencyprovider
  self.dependencyProvider = [RCTAppDependencyProvider new];
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  // Register the background task
  [[BGTaskScheduler sharedScheduler] registerForTaskWithIdentifier:@"id.homebase.photos.SyncTrigger.runSync" usingQueue:nil launchHandler:^(__kindof BGTask * _Nonnull task) {
    [self handleMediaSync:task];
  }];

  [self scheduleMediaSync];

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

- (BOOL)application:(UIApplication *)application
            openURL:(NSURL *)url
            options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  return [RCTLinkingManager application:application openURL:url options:options];
}

- (void)applicationDidEnterBackground:(UIApplication *)application {
  [self scheduleMediaSync];
}

- (void)scheduleMediaSync {
  BGProcessingTaskRequest *request = [[BGProcessingTaskRequest alloc] initWithIdentifier:@"id.homebase.photos.SyncTrigger.runSync"];
  request.requiresNetworkConnectivity = true;
  request.earliestBeginDate = [NSDate dateWithTimeIntervalSinceNow:15 * 60]; // 15 minutes from now

  NSError *error = nil;
  BOOL success = [[BGTaskScheduler sharedScheduler] submitTaskRequest:request error:&error];
  if (!success) {
    NSLog(@"[SyncTrigger]: Could not schedule media sync: %@", error);
  } else {
    NSLog(@"[SyncTrigger]: Scheduled");
  }
}

- (void)handleMediaSync:(BGAppRefreshTask *)task {
  task.expirationHandler = ^{
    // Clean up any unfinished business before the task expires
  };

  NSLog(@"[SyncTrigger]: handleMediaSync");
  [SyncTrigger runStaticSyncWithCompletion:^(BOOL success) {
    [task setTaskCompletedWithSuccess:success];
    [self scheduleMediaSync]; // Schedule the next background task
  }];
}

@end
