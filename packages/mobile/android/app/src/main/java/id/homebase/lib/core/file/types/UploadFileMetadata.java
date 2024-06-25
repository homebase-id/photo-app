package id.homebase.lib.core.file.types;

public final class UploadFileMetadata<T> {
    private final boolean allowDistribution;
//    private final String senderOdinId;
    private boolean isEncrypted;
    private final AccessControlList accessControlList;
    private final UploadAppFileMetaData<T> appData;
    private final GlobalTransitIdFileIdentifier referencedFile;
    private final String versionTag;

    public UploadFileMetadata(
            boolean allowDistribution,
            boolean isEncrypted,
            AccessControlList accessControlList,
            UploadAppFileMetaData<T> appData,
            GlobalTransitIdFileIdentifier referencedFile,
            String versionTag
    ) {
        this.allowDistribution = allowDistribution;
        this.isEncrypted = isEncrypted;
        this.accessControlList = accessControlList;
        this.appData = appData;
        this.referencedFile = referencedFile;
        this.versionTag = versionTag;
    }

    public boolean allowDistribution() {
        return allowDistribution;
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

    public UploadAppFileMetaData<T> getAppData() {
        return appData;
    }
}