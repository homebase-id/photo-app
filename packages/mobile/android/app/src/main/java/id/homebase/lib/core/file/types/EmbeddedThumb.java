package id.homebase.lib.core.file.types;

public record EmbeddedThumb(
        int pixelHeight,
        int pixelWidth,
        String contentType,
        String content
) {}