package id.homebase.photos.worker;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.os.Bundle;

import androidx.core.app.NotificationCompat;

import com.facebook.react.HeadlessJsTaskService;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.jstasks.HeadlessJsTaskConfig;

import javax.annotation.Nullable;

public class HeadlessJsService extends HeadlessJsTaskService {

    @Nullable
    @Override
    protected HeadlessJsTaskConfig getTaskConfig(Intent intent) {
        // createChannel();

        // Notification notification = new NotificationCompat.Builder(getApplicationContext(), "demo")
        //      .setContentTitle("Headless Work")
        //      .setTicker("runn")
        //      .setOngoing(true)
        //      .build();

        // startForeground(1, notification);

        if (intent != null) {
            String uri = intent.getStringExtra("uri");
            String timestamp = intent.getStringExtra("timestamp");

            // Pass the data to the JS task
            Bundle extras = new Bundle();
            extras.putString("uri", uri);
            extras.putString("timestamp", timestamp);

            return new HeadlessJsTaskConfig(
                    "HeadlessSyncTask", // The name of the task defined in JS
                    Arguments.fromBundle(extras),
                    60000, // Timeout for the task in milliseconds
                    true // Allow the task to run in foreground mode
            );
        }
        return null;
    }

    private void createChannel() {
        String description = "test channel";
        int importance = NotificationManager.IMPORTANCE_DEFAULT;
        NotificationChannel channel = new NotificationChannel("demo", "test", importance);
        channel.setDescription(description);
        NotificationManager notificationManager =
                (NotificationManager) getApplicationContext().getSystemService(NOTIFICATION_SERVICE);

        notificationManager.createNotificationChannel(channel);

    }
}
