package id.homebase.photos.mediasync;

import static id.homebase.lib.core.file.DriveFileUploadProvider.isDebug;

import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.MediaStore;
import android.util.Log;

import com.ammarahmed.mmkv.MMKV;

import java.math.BigDecimal;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

import id.homebase.lib.core.ApiType;
import id.homebase.lib.core.DotYouClient;
import id.homebase.lib.core.crypto.CryptoUtil;
import id.homebase.lib.core.file.types.BadRequestUploadResult;
import id.homebase.lib.core.file.types.SuccessfullUploadResult;
import id.homebase.lib.core.file.types.UploadResult;

public class MediaSync {
    private final Context context;

    public MediaSync(Context context) {
        this.context = context;
    }

    public void syncMedia() {
        Log.v(null, "[SyncWorker] doWork");

        System.loadLibrary("rnmmkv");
        MMKV.initialize(this.context);
        MMKV mmkv = MMKV.mmkvWithID("default");

        assert mmkv != null;
        // Loading key-value pairs from MMKV
        boolean syncEnabled = mmkv.decodeInt("syncFromCameraRollAsBoolean", 0) == 1;
        String identity = mmkv.decodeString("identity", "");
        String CAT = mmkv.decodeString("bx0900", "");
        String sharedSecret = mmkv.decodeString("APSS", "");
        double lastSyncTime = mmkv.decodeDouble("lastSyncTimeAsNumber", new Date().getTime() - 1000 * 60 * 60 * 24 * 7);
        boolean forceLowerQuality = mmkv.decodeInt("forceLowerQualityAsBoolean", 0) == 1;

        assert sharedSecret != null;
        assert identity != null;
        assert CAT != null;

        if (isDebug()) {
            Log.v(null, "[SyncWorker] syncEnabled: " + syncEnabled);
            Log.v(null, "[SyncWorker] identity: " + identity);
            Log.v(null, "[SyncWorker] CAT: " + CAT);
            Log.v(null, "[SyncWorker] sharedSecret: " + sharedSecret);
            Log.v(null, "[SyncWorker] lastSyncTime: " + BigDecimal.valueOf(lastSyncTime).toPlainString());
            //lastSyncTime = 1726131813610L;
        }

        if (!syncEnabled) {
            return;
        }

        Map<String, String> headers = new HashMap<>();
        headers.put("bx0900", CAT);

        DotYouClient dotYouClient = new DotYouClient(ApiType.App, CryptoUtil.base64ToByteArray(sharedSecret), identity, headers);

        double lastSyncTimeSeconds = lastSyncTime / 1000 - (60 * 30); // 30 minutes buffer
        String lastSyncTimeString = String.valueOf(lastSyncTimeSeconds);
        int maxBatchSize = 100;

        // Find all photos that have been added since the last sync
        Uri uri = MediaStore.Files.getContentUri("external");
        String[] projection = {MediaStore.Images.Media.DATA, MediaStore.Images.Media.DATE_ADDED, MediaStore.Images.Media.MIME_TYPE, MediaStore.Images.Media._ID, MediaStore.Images.Media.WIDTH, MediaStore.Images.Media.HEIGHT};
        String selection = MediaStore.Images.Media.DATE_ADDED + " > ?";
        String[] selectionArgs = {lastSyncTimeString};
        String sortOrder = MediaStore.Images.Media.DATE_ADDED + " DESC";
        String limit = " LIMIT " + maxBatchSize;

        Cursor cursor = this.context.getContentResolver().query(
                uri.buildUpon().encodedQuery(limit).build(),
                projection,
                selection,
                selectionArgs,
                sortOrder);

        // For each photo, upload it to the server
        if (cursor != null) {
            if (isDebug()) {
                Log.v(null, "[SyncWorker] cursor: " + cursor.getCount());
            }

            if (cursor.getCount() == 0) {
                // No new photos to sync so we set current time as last sync time
                mmkv.encode("lastSyncTimeAsNumber", new Date().getTime());
            }

            while (cursor.moveToNext()) {
                try {
                    String filePath = cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATA));
                    String timestampInSeconds = cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED));
                    // parse timestamp in seconds to double in milliseconds
                    long timestampInMillis = Long.parseLong(timestampInSeconds) * 1000L;

                    String mimeType = cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.MIME_TYPE));
                    String identifier = cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID));
                    String width = cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.WIDTH));
                    String height = cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.HEIGHT));

                    if (isDebug()) {
                        Log.v(null, "[SyncWorker] MediaItem filePath: " + filePath);
                    }

                    UploadResult result;
                    if (mimeType.startsWith("video/")) {
                        VideoProvider videoProvider = new VideoProvider(context);
                        result = videoProvider.uploadMedia(dotYouClient, filePath, timestampInMillis, mimeType, identifier, width, height, true);
                    } else {
                        result = ImageProvider.uploadMedia(dotYouClient, filePath, timestampInMillis, mimeType, identifier, width, height, forceLowerQuality);
                    }

                    if (result instanceof SuccessfullUploadResult) {
                        Log.v(null, "[SyncWorker] MediaItem uploaded: " + result.toString());
                        mmkv.encode("lastSyncTimeAsNumber", timestampInMillis); // We update the last sync time to the timestamp of the photo so we can continue where we left of if the task is interrupted
                    } else if (result instanceof BadRequestUploadResult) {
                        if (!Objects.equals(((BadRequestUploadResult) result).getErrorCode(), "existingFileWithUniqueId")) {
                            Log.v(null, "[SyncWorker] MediaItem failed to upload: " + result.toString());
                        } else {
                            Log.v(null, "[SyncWorker] MediaItem was already uploaded: " + result.toString());
                            mmkv.encode("lastSyncTimeAsNumber", timestampInMillis); // We update the last sync time to the timestamp of the photo so we can continue where we left of if the task is interrupted
                        }
                    }
                } catch (Exception e) {
                    // Ignore any errors and continue with the next media item
                    Log.e(null, "[SyncWorker] Error uploading photo: " + e.getMessage());
                }
            }

            if (cursor.getCount() < maxBatchSize) {
                // Everything is processed and the batch was smaller than max, so we set current time as last sync time
                mmkv.encode("lastSyncTimeAsNumber", new Date().getTime());
            }

            cursor.close();
        }


    }
}
