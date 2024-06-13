package id.homebase.lib.core.file;

public record UploadThumbnailDescriptor(
        String thumbnailKey,
        int pixelHeight,
        int pixelWidth
) {}