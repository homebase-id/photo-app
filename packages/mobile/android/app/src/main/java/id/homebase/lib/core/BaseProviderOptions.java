package id.homebase.lib.core;

import java.util.Map;

public class BaseProviderOptions {
    private ApiType api;
    private byte[] sharedSecret;
    private String identity;
    private Map<String, String> headers;

    public BaseProviderOptions(ApiType api, byte[] sharedSecret, String identity, Map<String, String> headers) {
        this.api = api;
        this.sharedSecret = sharedSecret;
        this.identity = identity;
        this.headers = headers;
    }

    public ApiType getApi() {
        return api;
    }

    public byte[] getSharedSecret() {
        return sharedSecret;
    }


    public String getIdentity() {
        return identity;
    }


    public Map<String, String> getHeaders() {
        return headers;
    }

}