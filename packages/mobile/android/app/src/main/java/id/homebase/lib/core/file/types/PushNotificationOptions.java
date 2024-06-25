package id.homebase.lib.core.file.types;

public class PushNotificationOptions {
    private String appId;
    private String typeId;
    private String tagId;
    private boolean silent;
    private String unEncryptedMessage;

    public String getAppId() {
        return appId;
    }

    public void setAppId(String appId) {
        this.appId = appId;
    }

    public String getTypeId() {
        return typeId;
    }

    public void setTypeId(String typeId) {
        this.typeId = typeId;
    }

    public String getTagId() {
        return tagId;
    }

    public void setTagId(String tagId) {
        this.tagId = tagId;
    }

    public boolean isSilent() {
        return silent;
    }

    public void setSilent(boolean silent) {
        this.silent = silent;
    }

    public String getUnEncryptedMessage() {
        return unEncryptedMessage;
    }

    public void setUnEncryptedMessage(String unEncryptedMessage) {
        this.unEncryptedMessage = unEncryptedMessage;
    }
}
