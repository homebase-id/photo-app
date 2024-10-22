package id.homebase.photos;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactMethod;

import id.homebase.lib.core.DotYouClient;
import id.homebase.lib.core.file.types.BadRequestUploadResult;
import id.homebase.lib.core.file.types.SuccessfullUploadResult;
import id.homebase.lib.core.file.types.UploadResult;
import id.homebase.photos.mediasync.ImageProvider;
import id.homebase.photos.mediasync.MediaSync;
import id.homebase.photos.mediasync.VideoProvider;

public class SyncTrigger extends ReactContextBaseJavaModule {

    public SyncTrigger(ReactApplicationContext context) {
        super(context);
    }


    @ReactMethod
    public void runSync() {
        MediaSync mediaSync = new MediaSync(getReactApplicationContext());
        mediaSync.syncMedia();
    }

    @ReactMethod
    public void runSingleSync(String filePath, double timestampInMillis, String mimeType, String identifier, double width, double height, Promise promise) {
        DotYouClient dotYouClient = DotYouClient.getDotYouClient(this.getReactApplicationContext());
        try {
            UploadResult result;
            if (mimeType.startsWith("video/")) {
                VideoProvider videoProvider = new VideoProvider(this.getReactApplicationContext());
                result = videoProvider.uploadMedia(dotYouClient, filePath, (long) timestampInMillis, mimeType, identifier, String.valueOf(width), String.valueOf(height), true);
            } else {
                result = ImageProvider.uploadMedia(dotYouClient, filePath, (long) timestampInMillis, mimeType, identifier, String.valueOf(width), String.valueOf(height), false);
            }

            if (result instanceof SuccessfullUploadResult) {
                promise.resolve("Upload success");
            } else if(result instanceof BadRequestUploadResult) {
                promise.reject("BAD_REQUEST", "Upload failed", new Exception("Upload failed"));
            } else {
                promise.reject("UNKNOWN_ERROR", "Upload failed", new Exception("Upload failed"));
            }
        } catch (Exception e) {
            promise.reject("SYNC_ERROR", "Upload failed", e);
        }
    }

    @NonNull
    @Override
    public String getName() {
        return "SyncTrigger";
    }
}
