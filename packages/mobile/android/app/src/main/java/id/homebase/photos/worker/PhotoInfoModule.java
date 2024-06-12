package id.homebase.photos.worker;


import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.HashMap;
import java.util.Map;

import javax.annotation.Nullable;

public class PhotoInfoModule extends ReactContextBaseJavaModule {

    private static ReactApplicationContext reactContext;

    public PhotoInfoModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    @Override
    public String getName() {
        return "PhotoInfo";
    }

    public static void sendEvent(String eventName, @Nullable Map<String, Object> params) {
        reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
    }

    @ReactMethod
    public void sendPhotoInfo(String uri, String timestamp) {
        Map<String, Object> params = new HashMap<>();
        params.put("uri", uri);
        params.put("timestamp", timestamp);
        sendEvent("PhotoInfo", params);
    }
}