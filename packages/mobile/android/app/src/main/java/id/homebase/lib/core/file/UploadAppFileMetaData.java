package id.homebase.lib.core.file;

import java.util.Objects;

public final class UploadAppFileMetaData<T> {
    private final String uniqueId;
    private final String[] tags;
    private final Integer fileType;
    private final Integer dataType;
    private final Long userDate;
    private final String groupId;
    private final ArchivalStatus archivalStatus;
    private T content;
    private final EmbeddedThumb previewThumbnail;

    public UploadAppFileMetaData(
            String uniqueId,
            String[] tags,
            Integer fileType,
            Integer dataType,
            Long userDate,
            String groupId,
            ArchivalStatus archivalStatus,
            T content,
            EmbeddedThumb previewThumbnail
    ) {
        this.uniqueId = uniqueId;
        this.tags = tags;
        this.fileType = fileType;
        this.dataType = dataType;
        this.userDate = userDate;
        this.groupId = groupId;
        this.archivalStatus = archivalStatus;
        this.content = content;
        this.previewThumbnail = previewThumbnail;
    }


    public String uniqueId() {
        return uniqueId;
    }

    public String[] tags() {
        return tags;
    }

    public Integer fileType() {
        return fileType;
    }

    public Integer dataType() {
        return dataType;
    }

    public Long userDate() {
        return userDate;
    }

    public String groupId() {
        return groupId;
    }

    public ArchivalStatus archivalStatus() {
        return archivalStatus;
    }

    public T content() {
        return content;
    }

    public EmbeddedThumb previewThumbnail() {
        return previewThumbnail;
    }

    public void content(T encryptedContent) {
        content = encryptedContent;
    }
}