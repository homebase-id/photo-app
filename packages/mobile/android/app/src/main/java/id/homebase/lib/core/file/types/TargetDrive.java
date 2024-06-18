package id.homebase.lib.core.file.types;

import com.fasterxml.jackson.annotation.JsonAutoDetect;

@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY)
public record TargetDrive(String alias, String type) {}
