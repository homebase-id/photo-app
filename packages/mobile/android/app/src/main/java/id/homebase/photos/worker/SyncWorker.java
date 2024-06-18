package id.homebase.photos.worker;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import id.homebase.photos.mediasync.MediaSync;

public class SyncWorker extends Worker {

    public SyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        MediaSync mediaSync = new MediaSync(getApplicationContext());
        mediaSync.syncMedia();

        return Result.success();
    }
}
