package id.homebase.lib.core.file.types;

import com.fasterxml.jackson.annotation.JsonAutoDetect;

@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY)
public enum ScheduleOptions {
    SEND_NOW_AWAIT_RESPONSE("sendNowAwaitResponse"),
    SEND_LATER("sendAsync");

    private final String value;

    ScheduleOptions(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static ScheduleOptions fromValue(String value) {
        for (ScheduleOptions option : ScheduleOptions.values()) {
            if (option.value.equals(value)) {
                return option;
            }
        }
        throw new IllegalArgumentException("Unknown enum value: " + value);
    }
}
