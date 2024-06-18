package id.homebase.lib.core.file.types.payloadorthumbnailbase;


import id.homebase.lib.core.file.types.EmbeddedThumb;

public class PayloadFile extends PayloadOrThumbnailFile implements PayloadBase {
    String descriptorContent = null;
    EmbeddedThumb previewThumbnail = null;

    public PayloadFile(String payloadKey, String filePath, String contentType) {
        super(payloadKey, filePath, contentType);
    }

    public PayloadFile(String defaultPayloadKey, String filePath, EmbeddedThumb previewThumbnail, String mimeType, String descriptorContent) {
        super(defaultPayloadKey, filePath, mimeType);
        this.previewThumbnail = previewThumbnail;
        this.descriptorContent = descriptorContent;
    }

    @Override
    public String getDescriptorContent() {
        return this.descriptorContent;
    }

    @Override
    public EmbeddedThumb getPreviewThumbnail() {
        return this.previewThumbnail;
    }
}

