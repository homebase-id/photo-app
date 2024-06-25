package id.homebase.photos.worker;

import android.content.Context;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.util.concurrent.TimeUnit;

import androidx.annotation.NonNull;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

public class WorkerScheduler extends ReactContextBaseJavaModule {

    public WorkerScheduler(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @NonNull
    @Override
    public String getName() {
        return "WorkerScheduler";
    }

    @ReactMethod
    public static void scheduleWorker(Context context) {
        PeriodicWorkRequest workRequest = new PeriodicWorkRequest.Builder(SyncWorker.class, 15, TimeUnit.MINUTES)
                .build();

        Log.v(null, "[SyncWorker] Scheduled every 15min");

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
           "SyncWorker",
           ExistingPeriodicWorkPolicy.KEEP,
           workRequest);
    }

    @ReactMethod
    public static void runWorker(Context context) {
        OneTimeWorkRequest workRequest = new OneTimeWorkRequest.Builder(SyncWorker.class).build();

        Log.v(null, "[SyncWorker] Run now");

        WorkManager.getInstance(context).enqueueUniqueWork("SyncWorker", ExistingWorkPolicy.KEEP, workRequest);
    }
}
