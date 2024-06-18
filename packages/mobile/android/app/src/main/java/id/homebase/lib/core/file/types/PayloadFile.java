package id.homebase.lib.core.file.types;

import java.io.File;

public class PayloadFile {
    private String key;
    private String filePath; // Storing file path as a URI or local path
    private EmbeddedThumb previewThumbnail;
    private String contentType;
    private String descriptorContent;

    public PayloadFile(String key, String filePath, EmbeddedThumb previewThumbnail, String contentType, String descriptorContent) {
        this.key = key;
        this.filePath = filePath;
        this.previewThumbnail = previewThumbnail;
        this.contentType = contentType;
        this.descriptorContent = descriptorContent;
    }

    public String getKey() {
        return key;
    }

    public String getFilePath() {
        return filePath;
    }

    public EmbeddedThumb getPreviewThumbnail() {
        return previewThumbnail;
    }

    public String getDescriptorContent() {
        return descriptorContent;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public void setPreviewThumbnail(EmbeddedThumb previewThumbnail) {
        this.previewThumbnail = previewThumbnail;
    }

    public void setDescriptorContent(String descriptorContent) {
        this.descriptorContent = descriptorContent;
    }

    @Override
    public String toString() {
        return "PayloadFile{" +
                "key='" + key + '\'' +
                ", filePath='" + filePath + '\'' +
                ", previewThumbnail=" + previewThumbnail +
                ", descriptorContent='" + descriptorContent + '\'' +
                '}';
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
