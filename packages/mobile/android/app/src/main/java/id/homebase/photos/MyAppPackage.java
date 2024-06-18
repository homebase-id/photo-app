package id.homebase.photos;
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import id.homebase.photos.worker.PhotoInfoModule;
import id.homebase.photos.worker.RNSyncTrigger;

public class MyAppPackage implements ReactPackage {

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }

    @Override
    public List<NativeModule> createNativeModules(
            ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();

        modules.add(new OdinBlobModule(reactContext));
        modules.add(new PhotoInfoModule(reactContext));
        modules.add(new RNSyncTrigger(reactContext));

        return modules;
    }

}