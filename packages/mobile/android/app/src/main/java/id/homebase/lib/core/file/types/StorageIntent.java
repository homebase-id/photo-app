package id.homebase.lib.core.file.types;

import com.fasterxml.jackson.annotation.JsonValue;

public enum StorageIntent {
    NewFileOrOverwrite(0),
    MetadataOnly(1);

    private int value = 0;

    StorageIntent(int value) {
        this.value = value;
    }

    @JsonValue
    public int getValue() {
        return value;
    }

    public static ArchivalStatus fromValue(int value) {
        for (ArchivalStatus status : ArchivalStatus.values()) {
            if (status.getValue() == value) {
                return status;
            }
        }
        throw new IllegalArgumentException("Invalid StorageIntent value: " + value);
    }
}
