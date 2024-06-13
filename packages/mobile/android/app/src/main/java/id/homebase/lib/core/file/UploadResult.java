package id.homebase.lib.core.file;

import java.util.Map;

public class UploadResult {
    private KeyHeader keyHeader;
    private ExternalFileIdentifier file;
    private GlobalTransitIdFileIdentifier globalTransitIdFileIdentifier;
    private Map<String, TransferUploadStatus> recipientStatus;
    private String newVersionTag;

    public UploadResult(KeyHeader keyHeader, ExternalFileIdentifier file, GlobalTransitIdFileIdentifier globalTransitIdFileIdentifier, Map<String, TransferUploadStatus> recipientStatus, String newVersionTag) {
        this.keyHeader = keyHeader;
        this.file = file;
        this.globalTransitIdFileIdentifier = globalTransitIdFileIdentifier;
        this.recipientStatus = recipientStatus;
        this.newVersionTag = newVersionTag;
    }
}

