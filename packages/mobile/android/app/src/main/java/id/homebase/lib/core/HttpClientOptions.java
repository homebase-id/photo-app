package id.homebase.lib.core;

import java.util.Map;

public class HttpClientOptions {
    private final boolean overrideEncryption;
    private Map<String, String> headers;
    private String systemFileType;

    public HttpClientOptions(boolean overrideEncryption) {
        this.overrideEncryption = overrideEncryption;
    }

    public boolean isOverrideEncryption() {
        return overrideEncryption;
    }


    public String systemFileType() {
        return systemFileType;
    }
}