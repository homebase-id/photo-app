package id.homebase.lib.core.file;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

public class UploadInstructionSet {
    private StorageOptions storageOptions;
    private TransitOptions transitOptions;
    private byte[] transferIv;
    private UploadManifest manifest;

    public UploadInstructionSet(StorageOptions storageOptions, TransitOptions transitOptions) {
        this.storageOptions = storageOptions;
        this.transitOptions = transitOptions;
    }

    public void setTransferIv(byte[] transferIv) {
        this.transferIv = transferIv;
    }

    public void setManifest(UploadManifest manifest) {
        this.manifest = manifest;
    }

    public byte[] getTransferIv() {
        return transferIv;
    }

    public String toJsonString() throws JsonProcessingException {
        ObjectMapper objectMapper = new ObjectMapper();
        return objectMapper.writeValueAsString(this);
    }
}

