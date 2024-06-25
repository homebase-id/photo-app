package id.homebase.photos.worker;

import android.app.Service;
import android.content.Intent;
import android.database.ContentObserver;
import android.os.Handler;
import android.os.IBinder;
import android.provider.MediaStore;

public class PhotoMonitoringService extends Service {

    private ContentObserver photoObserver;

    @Override
    public void onCreate() {
        super.onCreate();
        photoObserver = new ContentObserver(new Handler()) {
            @Override
            public void onChange(boolean selfChange) {
                super.onChange(selfChange);
                // New photo detected, schedule the worker
                WorkerScheduler.runWorker(PhotoMonitoringService.this);
            }
        };

        getContentResolver().registerContentObserver(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                true,
                photoObserver
        );
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        getContentResolver().unregisterContentObserver(photoObserver);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}