package id.homebase.lib.core.file.types;

import java.util.List;

public record UploadPayloadDescriptor(
        String payloadKey,
        String descriptorContent,
        List<UploadThumbnailDescriptor> thumbnails,
        EmbeddedThumb previewThumbnail,
        byte[] iv,
        String contentType
) {}