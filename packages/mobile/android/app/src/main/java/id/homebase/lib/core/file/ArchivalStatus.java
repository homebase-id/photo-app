package id.homebase.lib.core.file;

public enum ArchivalStatus {
    None(0),
    Archived(1),
    Removed(2);

    private final int value;

    ArchivalStatus(int value) {
        this.value = value;
    }

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
