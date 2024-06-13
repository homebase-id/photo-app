package id.homebase.lib.core.file;

import androidx.annotation.NonNull;

import java.net.ContentHandler;
import java.util.Objects;

public final class UploadFileMetadata<T> {
    private final boolean allowDistribution;
    private final String senderOdinId;
    private boolean isEncrypted;
    private final AccessControlList accessControlList;
    private final UploadAppFileMetaData<T> appData;
    private final GlobalTransitIdFileIdentifier referencedFile;
    private final String versionTag;

    public UploadFileMetadata(
            boolean allowDistribution,
            String senderOdinId,
            boolean isEncrypted,
            AccessControlList accessControlList,
            UploadAppFileMetaData<T> appData,
            GlobalTransitIdFileIdentifier referencedFile,
            String versionTag
    ) {
        this.allowDistribution = allowDistribution;
        this.senderOdinId = senderOdinId;
        this.isEncrypted = isEncrypted;
        this.accessControlList = accessControlList;
        this.appData = appData;
        this.referencedFile = referencedFile;
        this.versionTag = versionTag;
    }

    public boolean allowDistribution() {
        return allowDistribution;
    }

    public String senderOdinId() {
        return senderOdinId;
    }

    public boolean isEncrypted() {
        return isEncrypted;
    }

    public AccessControlList accessControlList() {
        return accessControlList;
    }

    public UploadAppFileMetaData<T> appData() {
        return appData;
    }

    public GlobalTransitIdFileIdentifier referencedFile() {
        return referencedFile;
    }

    public String versionTag() {
        return versionTag;
    }

    public void setIsEncrypted(boolean encrypt) {
        isEncrypted = encrypt;
    }

    @Override
    public int hashCode() {
        return Objects.hash(allowDistribution, senderOdinId, isEncrypted, accessControlList, appData, referencedFile, versionTag);
    }

    @NonNull
    @Override
    public String toString() {
        return "UploadFileMetadata[" +
                "allowDistribution=" + allowDistribution + ", " +
                "senderOdinId=" + senderOdinId + ", " +
                "isEncrypted=" + isEncrypted + ", " +
                "accessControlList=" + accessControlList + ", " +
                "appData=" + appData + ", " +
                "referencedFile=" + referencedFile + ", " +
                "versionTag=" + versionTag + ']';
    }

    public UploadAppFileMetaData<T> getAppData() {
        return appData;
    }
}