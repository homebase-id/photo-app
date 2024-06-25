package id.homebase.lib.core.file.types;

import java.util.List;
import java.util.Objects;

import com.fasterxml.jackson.annotation.JsonAutoDetect;

@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY)
public class TransitOptions {
    private List<String> recipients;
    private final Boolean isTransient;
    private final Boolean useAppNotification;

    private ScheduleOptions schedule;
    private PriorityOptions priority;
    private SendContents sendContents;
    private TargetDrive remoteTargetDrive;

    public TransitOptions() {
        isTransient = false;
        useAppNotification = false;
    }

    public Boolean getIsTransient() {
        return Objects.requireNonNullElse(isTransient, false);
    }

    public Boolean getUseAppNotification() {
        return Objects.requireNonNullElse(useAppNotification, false);
    }
}


