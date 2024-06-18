package id.homebase.lib.core.file.types;

import com.fasterxml.jackson.annotation.JsonAutoDetect;

@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY)
public class StorageOptions {
    private TargetDrive drive;
    private String overwriteFileId;
    private Long expiresTimestamp;
    private StorageIntent storageIntent;

    public StorageOptions(TargetDrive drive) {
        this.drive = drive;
    }

    public StorageOptions(TargetDrive drive, String overwriteFileId, Long expiresTimestamp) {
        this.drive = drive;
        this.overwriteFileId = overwriteFileId;
        this.expiresTimestamp = expiresTimestamp;
        this.storageIntent = StorageIntent.NewFileOrOverwrite;
    }


    public StorageIntent getStorageIntent() {
        if(storageIntent == null) {
            return StorageIntent.NewFileOrOverwrite;
        }
        return storageIntent;
    }
}
