package id.homebase.photos.worker;

import static id.homebase.photos.MediaProvider.uploadMedia;

import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.MediaStore;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import com.ammarahmed.mmkv.MMKV;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

import id.homebase.lib.core.ApiType;
import id.homebase.lib.core.DotYouClient;
import id.homebase.lib.core.file.CryptoUtil;

public class RNSyncTrigger extends ReactContextBaseJavaModule {

    public RNSyncTrigger(ReactApplicationContext context) {
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
        return "RNSyncTrigger";
    }
}
