package id.homebase.lib.core.file;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.PipedInputStream;
import java.io.PipedOutputStream;

import okhttp3.MediaType;
import okhttp3.RequestBody;
import okio.BufferedSink;
import okio.Okio;

// Custom RequestBody implementation
public class StreamRequestBody extends RequestBody {
    private final ByteArrayOutputStream inputStream;
    private final MediaType mediaType;

    public StreamRequestBody(ByteArrayOutputStream inputStream, MediaType mediaType) {
        this.inputStream = inputStream;
        this.mediaType = mediaType;
    }

    @Override
    public MediaType contentType() {
        return mediaType;
    }

    @Override
    public void writeTo(BufferedSink sink) throws IOException {
        try (inputStream) { // Use try-with-resources to ensure the stream is closed
            sink.writeAll(Okio.source(convertOutputStreamToInputStream()));
        }
    }

    private InputStream convertOutputStreamToInputStream() throws IOException {
        PipedInputStream in = new PipedInputStream();
        final PipedOutputStream out = new PipedOutputStream(in);

        new Thread(() -> {
            try {
                inputStream.writeTo(out);
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        }).start();

        return in;
    }
}
