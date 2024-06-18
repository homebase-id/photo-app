package id.homebase.lib.core.file.types;

public record UploadThumbnailDescriptor(
        String thumbnailKey,
        int pixelHeight,
        int pixelWidth
) {}