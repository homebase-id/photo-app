package id.homebase.lib.core.file.types.payloadorthumbnailbase;

import static id.homebase.lib.core.crypto.CryptoUtil.byteArrayToBase64;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;


public class PayloadOrThumbnailFile implements PayloadOrThumbnailBase {
    protected String filePath; // Storing file path as a URI or local path
    private String key;
    private String contentType;

    public PayloadOrThumbnailFile(String payloadKey, String filePath, String contentType) {
        this.filePath = filePath;
        this.key = payloadKey;
        this.contentType = contentType;
    }

    public File getPayload() {
        return new File(filePath);
    }

    public String getBase64() throws IOException {
        try (FileInputStream fis = new FileInputStream(getPayload())) {
            byte[] data = new byte[(int) getPayload().length()];
            fis.read(data);
            fis.close();
            return byteArrayToBase64(data);
        }
    }

    @Override
    public String getKey() {
        return this.key;
    }

    @Override
    public void setKey(String key) {
        this.key = key;
    }

    @Override
    public String getContentType() {
        return this.contentType;
    }

    @Override
    public void setContentType(String contentType) {
        this.contentType = contentType;
    }
}

