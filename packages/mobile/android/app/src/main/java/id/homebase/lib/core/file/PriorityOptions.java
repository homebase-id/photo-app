package id.homebase.lib.core.file;

public enum PriorityOptions {
    HIGH(1),
    MEDIUM(2),
    LOW(3);

    private final int value;

    PriorityOptions(int value) {
        this.value = value;
    }

    public int getValue() {
        return value;
    }

    public static PriorityOptions fromValue(int value) {
        for (PriorityOptions option : PriorityOptions.values()) {
            if (option.value == value) {
                return option;
            }
        }
        throw new IllegalArgumentException("Unknown enum value: " + value);
    }
}
