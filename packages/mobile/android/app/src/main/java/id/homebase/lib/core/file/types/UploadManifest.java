package id.homebase.lib.core.file.types;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonAutoDetect;

@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY)
public record UploadManifest(List<UploadPayloadDescriptor> payloadDescriptors) {}
