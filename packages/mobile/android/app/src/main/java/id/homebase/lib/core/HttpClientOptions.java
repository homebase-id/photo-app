package id.homebase.lib.core;

import java.util.Map;

public class HttpClientOptions {
    private boolean overrideEncryption;
    private Map<String, String> headers;
    private String systemFileType;

    public boolean isOverrideEncryption() {
        return overrideEncryption;
    }

    public void setOverrideEncryption(boolean overrideEncryption) {
        this.overrideEncryption = overrideEncryption;
    }

    public Map<String, String> getHeaders() {
        return headers;
    }

    public void setHeaders(Map<String, String> headers) {
        this.headers = headers;
    }

    public String getSystemFileType() {
        return systemFileType;
    }

    public void setSystemFileType(String systemFileType) {
        this.systemFileType = systemFileType;
    }
}