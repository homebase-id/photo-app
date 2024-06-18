package id.homebase.lib.core.file.types.payloadorthumbnailbase;

import java.io.ByteArrayOutputStream;

import id.homebase.lib.core.file.types.EmbeddedThumb;

public class PayloadStream extends PayloadOrThumbnailStream implements PayloadBase {
    String descriptorContent = null;
    EmbeddedThumb previewThumbnail = null;

    public PayloadStream(String payloadKey, ByteArrayOutputStream outputStream, String contentType) {
        super(payloadKey, outputStream, contentType);
    }

    public PayloadStream(String defaultPayloadKey, ByteArrayOutputStream outputStream, EmbeddedThumb previewThumbnail, String mimeType, String descriptorContent) {
        super(defaultPayloadKey, outputStream, mimeType);
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
