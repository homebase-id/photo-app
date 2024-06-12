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

        // Retrieve the latest photo information
        Uri uri = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
        String[] projection = {MediaStore.Images.Media.DATA, MediaStore.Images.Media.DATE_ADDED};
        String sortOrder = MediaStore.Images.Media.DATE_ADDED + " DESC";

        Cursor cursor = getApplicationContext().getContentResolver().query(uri, projection, null, null, sortOrder);

        Log.v(null, "[SyncWorker] trigger HeadlessJsService");
        if (cursor != null && cursor.moveToFirst()) {
            String filePath = cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATA));
            String timestamp = cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED));
            cursor.close();

            // Start the headless JS task
            Intent serviceIntent = new Intent(getApplicationContext(), HeadlessJsService.class);
            serviceIntent.putExtra("uri", filePath);
            serviceIntent.putExtra("timestamp", timestamp);
            // getApplicationContext().startForegroundService(serviceIntent);
            getApplicationContext().startService(serviceIntent);
        } else {
            // Start the headless JS task
            Intent serviceIntent = new Intent(getApplicationContext(), HeadlessJsService.class);
            // getApplicationContext().startForegroundService(serviceIntent);
            getApplicationContext().startService(serviceIntent);
        }

        return Result.success();
    }

}
