package id.homebase.lib.core.file;

public enum SendContents {
    HEADER_ONLY(0),
    THUMBNAILS(1),
    PAYLOAD(2),
    ALL(3);

    private final int value;

    SendContents(int value) {
        this.value = value;
    }

    public int getValue() {
        return value;
    }

    public static SendContents fromValue(int value) {
        for (SendContents option : SendContents.values()) {
            if (option.value == value) {
                return option;
            }
        }
        throw new IllegalArgumentException("Unknown enum value: " + value);
    }
}
