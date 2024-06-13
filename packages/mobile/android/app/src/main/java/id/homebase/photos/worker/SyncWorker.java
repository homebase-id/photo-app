package id.homebase.photos.worker;

import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.database.Cursor;
import android.net.Uri;
import android.provider.MediaStore;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import com.ammarahmed.mmkv.MMKV;

import java.math.BigDecimal;

public class SyncWorker extends Worker {

    public SyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Log.v(null, "[SyncWorker] doWork");
        // Perform your background task here
        // Example: upload new photos to a server

        System.loadLibrary("rnmmkv");
        MMKV.initialize(this.getApplicationContext());
        MMKV mmkv = MMKV.mmkvWithID("default");

        assert mmkv != null;
        // Loading key-value pairs from MMKV
        String identity = mmkv.decodeString("identity","");
        String CAT = mmkv.decodeString("bx0900","");
        String SharedSecret = mmkv.decodeString("APSS","");
        double lastSyncTime = 1717664076909L;//mmkv.decodeDouble("lastSyncTimeAsNumber");

        Log.v(null, "[SyncWorker] identity: " + identity);
        Log.v(null, "[SyncWorker] CAT: " + CAT);
        Log.v(null, "[SyncWorker] SharedSecret: " + SharedSecret);
        Log.v(null, "[SyncWorker] lastSync (plain double): " + new BigDecimal(lastSyncTime).toPlainString());

        // Find all photos that have been added since the last sync
        Uri uri = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
        String[] projection = {MediaStore.Images.Media.DATA, MediaStore.Images.Media.DATE_ADDED};
        String selection = MediaStore.Images.Media.DATE_ADDED + " > ?";
        double lastSyncTimeSeconds = lastSyncTime / 1000;
        String lastSyncTimeString = String.valueOf(lastSyncTimeSeconds);
        String[] selectionArgs = { lastSyncTimeString };
        String sortOrder = MediaStore.Images.Media.DATE_ADDED + " DESC";

        Cursor cursor = getApplicationContext().getContentResolver().query(uri, projection, selection,
                selectionArgs, sortOrder);


        // For each photo, upload it to the server
        if (cursor != null) {
            Log.v(null, "[SyncWorker] cursor: " + cursor.getCount());

            while (cursor.moveToNext()) {
                String filePath = cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATA));
                String timestamp = cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED));
                // Do something with the filePath and timestamp
                Log.v(null, "[SyncWorker] MediaItem filePath: " + filePath);


                // Retrieve the latest photo information

                // Upload the photo to the server
                // Example: uploadPhoto(filePath, timestamp, identity, CAT, SharedSecret);
            }

            cursor.close();
        }

        return Result.success();
    }

}
