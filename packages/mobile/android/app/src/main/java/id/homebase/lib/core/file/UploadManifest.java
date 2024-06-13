package id.homebase.lib.core.file;

import java.util.List;

public record UploadManifest(List<UploadPayloadDescriptor> payloadDescriptors) {}
