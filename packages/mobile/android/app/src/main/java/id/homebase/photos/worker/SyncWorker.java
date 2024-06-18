package id.homebase.photos.worker;

import static id.homebase.photos.MediaProvider.uploadMedia;

import android.content.Context;
import android.util.Log;
import android.database.Cursor;
import android.net.Uri;
import android.provider.MediaStore;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import com.ammarahmed.mmkv.MMKV;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

import id.homebase.lib.core.ApiType;
import id.homebase.lib.core.DotYouClient;
import id.homebase.lib.core.file.CryptoUtil;

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
