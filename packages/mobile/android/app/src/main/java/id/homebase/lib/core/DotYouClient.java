package id.homebase.lib.core;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.TimeUnit;

public class DotYouClient {
    private final BaseProviderOptions options;

    public DotYouClient(ApiType api, byte[] sharedSecret, String identity, Map<String, String> headers) {
        this.options = new BaseProviderOptions(api, sharedSecret, identity, headers);
    }

    public byte[] getSharedSecret() {
        return options.getSharedSecret();
    }

    public ApiType getType() {
        return options.getApi();
    }

    public String getIdentity() {
        return options.getIdentity() != null ? options.getIdentity() : "";
    }

    public String getRoot() {
        return "https://" + getIdentity();
    }

    public String getEndpoint() {
        String endpoint = "";
        switch (options.getApi()) {
            case Owner:
                endpoint = "/api/owner/v1";
                break;
            case App:
                endpoint = "/api/apps/v1";
                break;
            case Guest:
                endpoint = "/api/guest/v1";
                break;
        }
        return getRoot() + endpoint;
    }

    public OkHttpClient createHttpClient(HttpClientOptions options) {
        OkHttpClient.Builder clientBuilder = new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS);

        if (options != null && options.isOverrideEncryption()) {
            return clientBuilder.build();
        }

        // Add interceptors for encryption/decryption
        clientBuilder.addInterceptor(chain -> {
            Request request = chain.request();
            // Encrypt the request
            Request encryptedRequest = encryptRequest(request, options);
            Response response = chain.proceed(encryptedRequest);
            // Decrypt the response
            return decryptResponse(response);
        });

        return clientBuilder.build();
    }

    private Request encryptRequest(Request request, HttpClientOptions options) {
        // Implement encryption logic here
        return request;
    }

    private Response decryptResponse(Response response) throws IOException {
        // Implement decryption logic here
        return response;
    }

    public void handleErrorResponse(IOException error) {
        throw new RuntimeException(error);
    }
}