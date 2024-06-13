package id.homebase.lib.core.file;

import java.util.List;

public class TransitOptions {
    private List<String> recipients;
    private Boolean isTransient;
    private Boolean useAppNotification;

    private ScheduleOptions schedule;
    private PriorityOptions priority;
    private SendContents sendContents;
    private TargetDrive remoteTargetDrive;

}


