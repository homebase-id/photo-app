package id.homebase.lib.core.file;

import static id.homebase.lib.core.file.CryptoUtil.cbcEncrypt;
import static id.homebase.lib.core.file.CryptoUtil.encryptKeyHeader;
import static id.homebase.lib.core.file.CryptoUtil.encryptMetaData;
import static id.homebase.lib.core.file.KeyHeaderGenerator.generateKeyHeader;
import static id.homebase.lib.core.file.KeyHeaderGenerator.getRandom16ByteArray;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

import id.homebase.lib.core.DotYouClient;
import id.homebase.lib.core.HttpClientOptions;
import kotlin.NotImplementedError;
import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.Request;
import okhttp3.RequestBody;

public class DriveFileUploadProvider {
    public static CompletableFuture<UploadResult> uploadFile(
            DotYouClient dotYouClient,
            UploadInstructionSet instructions,
            UploadFileMetadata<String> metadata,
            List<PayloadFile> payloads,
            List<ThumbnailFile> thumbnails,
            boolean encrypt
    ) throws Exception {
        // Debug information
        if (isDebug()) {
            System.out.println("request: " + dotYouClient.getEndpoint() + "/drive/files/upload" +
                    " instructions: " + instructions +
                    " metadata: " + metadata +
                    " payloads: " + payloads +
                    " thumbnails: " + thumbnails);
        }

        // Force isEncrypted on the metadata to match the encrypt flag
        metadata.setIsEncrypted(encrypt);

        KeyHeader keyHeader = encrypt ? generateKeyHeader() : null;

        UploadManifest manifest = buildManifest(payloads, thumbnails, encrypt);
        instructions.setManifest(manifest);
        instructions.setTransferIv(instructions.getTransferIv() != null ?
                instructions.getTransferIv() : getRandom16ByteArray());

        // Build package
        byte[] encryptedDescriptor = buildDescriptor(
                dotYouClient, keyHeader, instructions, metadata
        );

        // Upload
        MultipartBody data = buildFormData(
                    instructions, encryptedDescriptor, payloads, thumbnails, keyHeader, manifest
            );

        return pureUpload(dotYouClient, data);
    }

    private static boolean isDebug() {
        // Return your debug flag
        return true;
    }

    private static UploadManifest buildManifest(
            List<PayloadFile> payloads,
            List<ThumbnailFile> thumbnails,
            boolean generateIv
    ) {
        List<UploadPayloadDescriptor> payloadDescriptors = payloads.stream()
                .map(payload -> {
                    List<UploadThumbnailDescriptor> relatedThumbnails = thumbnails.stream()
                            .filter(thumb -> thumb.getKey().equals(payload.getKey()))
                            .map(thumb -> new UploadThumbnailDescriptor(
                                    thumb.getKey() + thumb.getPixelWidth(),
                                    thumb.getPixelHeight(),
                                    thumb.getPixelWidth()))
                            .collect(Collectors.toList());

                    return new UploadPayloadDescriptor(
                            payload.getKey(),
                            payload.getDescriptorContent(),
                            relatedThumbnails,
                            payload.getPreviewThumbnail(),
                            generateIv ? getRandom16ByteArray() : null
                    );
                })
                .collect(Collectors.toList());

        return new UploadManifest(payloadDescriptors);
    }

    private static byte[] buildDescriptor(
            DotYouClient dotYouClient,
            KeyHeader keyHeader,
            UploadInstructionSet instructions,
            UploadFileMetadata<String> metadata
    ) throws Exception {

        if (instructions.getTransferIv() == null) {
            throw new IllegalArgumentException("Transfer IV is required");
        }

        return encryptWithSharedSecret(dotYouClient,
                new DescriptorData(encryptKeyHeader(dotYouClient, keyHeader, instructions.getTransferIv()), encryptMetaData(metadata, keyHeader)),
                instructions.getTransferIv());
    }



    private static class DescriptorData {
        private final EncryptedKeyHeader encryptedKeyHeader;
        private final UploadFileMetadata fileMetadata;

        public DescriptorData(EncryptedKeyHeader encryptedKeyHeader, UploadFileMetadata fileMetadata) {
            this.encryptedKeyHeader = encryptedKeyHeader;
            this.fileMetadata = fileMetadata;
        }

        public String toJsonString() throws JsonProcessingException {
            ObjectMapper objectMapper = new ObjectMapper();
            return objectMapper.writeValueAsString(this);
        }
    }

    private static byte[] encryptWithSharedSecret(
            DotYouClient dotYouClient,
            DescriptorData data,
            byte[] iv) throws Exception {

        byte[] ss = dotYouClient.getSharedSecret();
        if (ss == null) {
            throw new IllegalStateException("Attempting to encrypt but missing the shared secret");
        }
        byte[] content = data.toJsonString().getBytes();

        return cbcEncrypt(content, iv, ss);
    }

    private static MultipartBody buildFormData(
            UploadInstructionSet instructions,
            byte[] encryptedDescriptor,
            List<PayloadFile> payloads,
            List<ThumbnailFile> thumbnails,
            KeyHeader keyHeader,
            UploadManifest manifest
    )
            throws Exception {
            MultipartBody.Builder builder = new MultipartBody.Builder()
                    .setType(MultipartBody.FORM);

            String instructionType = "instructions";
            builder.addFormDataPart(instructionType, instructions.toJsonString());

            if (encryptedDescriptor != null) {
                builder.addFormDataPart("metaData", null, RequestBody.create(encryptedDescriptor, MediaType.parse("application/octet-stream")));
            }

            if (payloads != null) {
                for (PayloadFile payload : payloads) {
                    byte[] encryptedPayload = (keyHeader != null) ?
                            CryptoUtil.encryptWithKeyheader(payload.getPayload(), getUpdatedKeyHeader(keyHeader, manifest, payload.getKey())) :
                            payload.getPayload();

                    builder.addFormDataPart("payload", payload.getKey(), RequestBody.create(encryptedPayload, MediaType.parse("application/octet-stream")));
                }
            }

            if (thumbnails != null) {
                for (ThumbnailFile thumb : thumbnails) {
                    byte[] encryptedThumb = (keyHeader != null) ?
                            CryptoUtil.encryptWithKeyheader(thumb.getPayload(), getUpdatedKeyHeader(keyHeader, manifest, thumb.getKey())) :
                            thumb.getPayload();

                    builder.addFormDataPart("thumbnail", thumb.getKey() + thumb.getPixelWidth(), RequestBody.create(encryptedThumb, MediaType.parse("application/octet-stream")));
                }
            }

            return builder.build();

        }

    private static KeyHeader getUpdatedKeyHeader(KeyHeader keyHeader, UploadManifest manifest, String payloadKey) {
        if (manifest != null && manifest.payloadDescriptors() != null) {
            for (UploadPayloadDescriptor descriptor : manifest.payloadDescriptors()) {
                if (descriptor.payloadKey().equals(payloadKey)) {
                    if (descriptor.iv() != null) {
                        return new KeyHeader(descriptor.iv(), keyHeader.aesKey());
                    }
                }
            }
        }
        return keyHeader;
    }

    private static CompletableFuture<UploadResult> pureUpload(
            DotYouClient dotYouClient,
            MultipartBody data

    ) {
        Request request = new Request.Builder()
                .url("https://your-api-endpoint.com/upload")
                .post(data)
                .build();

        dotYouClient.createHttpClient(new HttpClientOptions()).newCall(request);

        throw new NotImplementedError("Implement your upload logic here");
//        return new UploadResult();
    }


    private static String jsonStringify64(Object data) {
        // Implement your JSON stringify logic here
        // Example placeholder implementation:
        return ""; // Placeholder for JSON stringify
    }
}

