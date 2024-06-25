package id.homebase.lib.core.file.types.payloadorthumbnailbase;

import id.homebase.lib.core.file.types.EmbeddedThumb;

public interface PayloadBase extends PayloadOrThumbnailBase {

    public String getDescriptorContent();

    public EmbeddedThumb getPreviewThumbnail();
}
