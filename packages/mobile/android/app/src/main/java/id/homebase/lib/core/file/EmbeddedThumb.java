package id.homebase.lib.core.file;

public record EmbeddedThumb(
        int pixelHeight,
        int pixelWidth,
        String contentType,
        String content
) {}