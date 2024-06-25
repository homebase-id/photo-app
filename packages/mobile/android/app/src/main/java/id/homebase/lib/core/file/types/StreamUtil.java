package id.homebase.lib.core.file.types;

import android.util.Log;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.PipedInputStream;
import java.io.PipedOutputStream;

public class StreamUtil {
    public static InputStream convertOutputStreamToInputStream(ByteArrayOutputStream outputStream) throws IOException {
        try {
            PipedInputStream in = new PipedInputStream();
            final PipedOutputStream out = new PipedOutputStream(in);

            new Thread(() -> {
                try {
                    outputStream.writeTo(out);
                    out.close(); // Close the PipedOutputStream to signal end of data
                } catch (IOException e) {
                    Log.e(null, "Error writing output stream to input stream: " + e.getMessage());
                    throw new RuntimeException(e);
                }
            }).start();

            return in;
        } catch (Exception e) {
            Log.e(null, "Error converting output stream to input stream: " + e.getMessage());
            throw new IOException(e);
        }
    }
}
