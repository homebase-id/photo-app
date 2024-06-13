package id.homebase.lib.core.file;

import kotlin.NotImplementedError;

public class PayloadFile {
    private String key;
    private String filePath; // Storing file path as a URI or local path
    private EmbeddedThumb previewThumbnail;
    private String descriptorContent;

    public PayloadFile(String key, String filePath, EmbeddedThumb previewThumbnail, String descriptorContent) {
        this.key = key;
        this.filePath = filePath;
        this.previewThumbnail = previewThumbnail;
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

    public byte[] getPayload() {
        throw new NotImplementedError("Method not implemented");
        return new byte[0];
    }
}
