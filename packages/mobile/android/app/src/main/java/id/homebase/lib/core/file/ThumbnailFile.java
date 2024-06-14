package id.homebase.lib.core.file;

import java.io.File;

import kotlin.NotImplementedError;

public class ThumbnailFile {
    private String key;
    private String filePath; // Storing file path as a URI or local path

    private int pixelHeight;
    private int pixelWidth;
    private String contentType;

    public ThumbnailFile(String key, String filePath, int pixelHeight, int pixelWidth) {
        this.key = key;
        this.filePath = filePath;
        this.pixelHeight = pixelHeight;
        this.pixelWidth = pixelWidth;
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

    public String getFilePath() {
        return filePath;
    }

    public File getPayload() {
        return new File(filePath);
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }
}
