package id.homebase.lib.core.file.types.payloadorthumbnailbase;

public class ThumbnailFile extends PayloadOrThumbnailFile implements ThumbnailBase {
    int pixelHeight = 0;
    int pixelWidth = 0;

    public ThumbnailFile(String payloadKey, String filePath, String contentType) {
        super(payloadKey, filePath, contentType);
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


