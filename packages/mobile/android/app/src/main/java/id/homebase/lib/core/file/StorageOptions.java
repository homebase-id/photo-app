package id.homebase.lib.core.file;

public class StorageOptions {
    private TargetDrive drive;
    private String overwriteFileId;
    private Long expiresTimestamp;
    private String storageIntent;

    public StorageOptions(TargetDrive drive, String overwriteFileId, Long expiresTimestamp, String storageIntent) {
        this.drive = drive;
        this.overwriteFileId = overwriteFileId;
        this.expiresTimestamp = expiresTimestamp;
        this.storageIntent = storageIntent;
    }

}