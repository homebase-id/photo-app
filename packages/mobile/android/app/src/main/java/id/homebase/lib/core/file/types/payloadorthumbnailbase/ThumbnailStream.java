package id.homebase.lib.core.file.types.payloadorthumbnailbase;

import java.io.ByteArrayOutputStream;

public class ThumbnailStream extends PayloadOrThumbnailStream implements ThumbnailBase {
    int pixelHeight = 0;
    int pixelWidth = 0;

    public ThumbnailStream(String payloadKey, ByteArrayOutputStream outputStream, int resizedHeight, int resizedWidth, String contentType) {
        super(payloadKey, outputStream, contentType);
        this.pixelHeight = resizedHeight;
        this.pixelWidth = resizedWidth;
    }

    @Override
    public int getPixelHeight() {
        return this.pixelHeight;
    }

    @Override
    public void setPixelHeight(int pixelHeight) {
        this.pixelHeight = pixelHeight;
    }

    @Override
    public int getPixelWidth() {
        return this.pixelWidth;
    }

    @Override
    public void setPixelWidth(int pixelWidth) {
        this.pixelWidth = pixelWidth;
    }
}
