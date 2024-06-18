package id.homebase.lib.core.file.types;

import com.fasterxml.jackson.annotation.JsonValue;

public enum ArchivalStatus {
    None(0),
    Archived(1),
    Removed(2);

    private int value = 0;

    ArchivalStatus(int value) {
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
        throw new IllegalArgumentException("Invalid ArchivalStatus value: " + value);
    }
}
