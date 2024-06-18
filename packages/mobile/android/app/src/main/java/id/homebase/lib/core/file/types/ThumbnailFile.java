package id.homebase.lib.core.file.types;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

import id.homebase.lib.core.crypto.CryptoUtil;

public class ThumbnailFile {
    private String key;
    private ByteArrayOutputStream outputStream;
    private int pixelHeight;
    private int pixelWidth;
    private String contentType;

    public ThumbnailFile(String key, String filePath, int pixelHeight, int pixelWidth, String contentType) {
        this.key = key;
        this.pixelHeight = pixelHeight;
        this.pixelWidth = pixelWidth;
        this.contentType = contentType;
    }

    public ThumbnailFile(String key, ByteArrayOutputStream outputStream, int pixelHeight, int pixelWidth, String contentType) {
        this.key = key;
        this.outputStream = outputStream;
        this.pixelHeight = pixelHeight;
        this.pixelWidth = pixelWidth;
        this.contentType = contentType;
    }
    
    public int getPixelHeight() {
        return pixelHeight;
    }

    public int getPixelWidth() {
        return pixelWidth;
    }

    public String getKey() {
        return key;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public ByteArrayOutputStream getOutputStream() {
        return outputStream;
    }

    public InputStream getInputStream() throws IOException {
            return StreamUtil.convertOutputStreamToInputStream(outputStream);
    }

    public String getBase64() {
        return CryptoUtil.byteArrayToBase64(outputStream.toByteArray());
    }
}
