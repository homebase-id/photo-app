package id.homebase.lib.core.file.types.payloadorthumbnailbase;

import static id.homebase.lib.core.crypto.CryptoUtil.byteArrayToBase64;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

import id.homebase.lib.core.file.types.StreamUtil;

public class PayloadOrThumbnailStream implements PayloadOrThumbnailBase {
    private final ByteArrayOutputStream outputStream;
    String key;
    String contentType;

    public PayloadOrThumbnailStream(String payloadKey, ByteArrayOutputStream outputStream, String contentType) {
        this.outputStream = outputStream;
        this.key = payloadKey;
        this.contentType = contentType;
    }

    public ByteArrayOutputStream getOutputStream() {
        return outputStream;
    }

    public InputStream getInputStream() throws IOException {
        return StreamUtil.convertOutputStreamToInputStream(outputStream);
    }

    public String getBase64() {
        return byteArrayToBase64(outputStream.toByteArray());
    }

    @Override
    public String getKey() {
        return key;
    }

    @Override
    public void setKey(String key) {
        this.key = key;
    }

    @Override
    public String getContentType() {
        return contentType;
    }

    @Override
    public void setContentType(String contentType) {
        this.contentType = contentType;
    }
}
