package id.homebase.photos;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import id.homebase.photos.mediasync.MediaSync;

public class SyncTrigger extends ReactContextBaseJavaModule {

    public SyncTrigger(ReactApplicationContext context) {
        super(context);
    }


    @ReactMethod
    public void runSync() {
        MediaSync mediaSync = new MediaSync(getReactApplicationContext());
        mediaSync.syncMedia();
    }

    @NonNull
    @Override
    public String getName() {
        return "SyncTrigger";
    }
}
