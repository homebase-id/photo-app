package id.homebase.lib.core.file;

import java.util.List;

public record UploadPayloadDescriptor(
        String payloadKey,
        String descriptorContent,
        List<UploadThumbnailDescriptor> thumbnails,
        EmbeddedThumb previewThumbnail,
        byte[] iv
) {}