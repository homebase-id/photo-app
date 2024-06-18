package id.homebase.photos.worker;

import static id.homebase.photos.MediaProvider.uploadMedia;

import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.MediaStore;
import android.util.Log;

import com.ammarahmed.mmkv.MMKV;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

import id.homebase.lib.core.ApiType;
import id.homebase.lib.core.DotYouClient;
import id.homebase.lib.core.file.CryptoUtil;

public class MediaSync {
    private Context context;

    public MediaSync(Context context) {
        this.context = context;
    }

    public void syncMedia() {
        Log.v(null, "[SyncWorker] doWork");
        // Perform your background task here
        // Example: upload new photos to a server

        System.loadLibrary("rnmmkv");
        MMKV.initialize(this.context);
        MMKV mmkv = MMKV.mmkvWithID("default");

        assert mmkv != null;
        // Loading key-value pairs from MMKV
        String identity = mmkv.decodeString("identity","");
        String CAT = mmkv.decodeString("bx0900","");
        String SharedSecret = mmkv.decodeString("APSS","");
        double lastSyncTime = 1717664076909L;//mmkv.decodeDouble("lastSyncTimeAsNumber");

        assert SharedSecret != null;
        assert identity != null;
        assert CAT != null;

        Log.v(null, "[SyncWorker] identity: " + identity);
        Log.v(null, "[SyncWorker] CAT: " + CAT);
        Log.v(null, "[SyncWorker] SharedSecret: " + SharedSecret);
        Log.v(null, "[SyncWorker] lastSync (plain double): " + new BigDecimal(lastSyncTime).toPlainString());


        Map<String, String> headers = new HashMap<>();
        headers.put("bx0900", CAT);

        DotYouClient dotYouClient = new DotYouClient(ApiType.App, CryptoUtil.base64ToByteArray(SharedSecret), identity, headers);

        // Find all photos that have been added since the last sync
        Uri uri = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
        String[] projection = {MediaStore.Images.Media.DATA, MediaStore.Images.Media.DATE_ADDED, MediaStore.Images.Media.MIME_TYPE, MediaStore.Images.Media._ID, MediaStore.Images.Media.WIDTH, MediaStore.Images.Media.HEIGHT};
        String selection = MediaStore.Images.Media.DATE_ADDED + " > ?";
        double lastSyncTimeSeconds = lastSyncTime / 1000;
        String lastSyncTimeString = String.valueOf(lastSyncTimeSeconds);
        String[] selectionArgs = { lastSyncTimeString };
        String sortOrder = MediaStore.Images.Media.DATE_ADDED + " DESC";

        Cursor cursor = this.context.getContentResolver().query(uri, projection, selection,
                selectionArgs, sortOrder);

        // For each photo, upload it to the server
        if (cursor != null) {
            Log.v(null, "[SyncWorker] cursor: " + cursor.getCount());

            while (cursor.moveToNext()) {
                try {
                    String filePath = cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATA));
                    String timestamp = cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED));

                    String mimeType = cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.MIME_TYPE));
                    String identifier = cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID));
                    String width = cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.WIDTH));
                    String height = cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.HEIGHT));


                    // Do something with the filePath and timestamp
                    Log.v(null, "[SyncWorker] MediaItem filePath: " + filePath);


                    uploadMedia(dotYouClient,filePath, timestamp, mimeType,
                            identifier,
                            width,height
                    );


                    // Upload the photo to the server
                    // Example: uploadPhoto(filePath, timestamp, identity, CAT, SharedSecret);
                } catch (Exception e) {
                    Log.e(null, "[SyncWorker] Error uploading photo: " + e.getMessage());
                    // Ignore any errors and continue with the next photo
                }
            }

            cursor.close();
        }
    }
}
