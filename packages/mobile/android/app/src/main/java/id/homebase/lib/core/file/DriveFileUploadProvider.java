package id.homebase.lib.core.file;

import static id.homebase.lib.core.file.CryptoUtil.byteArrayToBase64;
import static id.homebase.lib.core.file.CryptoUtil.cbcDecrypt;
import static id.homebase.lib.core.file.CryptoUtil.cbcEncrypt;
import static id.homebase.lib.core.file.CryptoUtil.encryptKeyHeader;
import static id.homebase.lib.core.file.CryptoUtil.encryptMetaData;
import static id.homebase.lib.core.file.CryptoUtil.stringToByteArray;
import static id.homebase.lib.core.file.KeyHeaderGenerator.generateKeyHeader;
import static id.homebase.lib.core.file.KeyHeaderGenerator.getRandom16ByteArray;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import id.homebase.lib.core.DotYouClient;
import id.homebase.lib.core.HttpClientOptions;
import kotlin.NotImplementedError;
import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;

public class DriveFileUploadProvider {
    public static UploadResult uploadFile(
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

        if (isDebug()) {
            System.out.println("instructions (JSON): " + instructions.toJsonString());
//            System.out.println("keyHeader iv " + Arrays.toString(keyHeader.iv()) + " keyHeader aesKey " + Arrays.toString(keyHeader.aesKey()));
//            System.out.println("Transfer IV: " + Arrays.toString(instructions.getTransferIv()));
//            System.out.println("DotYouClient SS: " + Arrays.toString(dotYouClient.getSharedSecret()));
        }

        // Build package
        byte[] encryptedDescriptor = buildDescriptor(
                dotYouClient, keyHeader, instructions, metadata
        );

        if (isDebug()) {
            System.out.println("EncryptedDescriptor (base64): " + byteArrayToBase64(encryptedDescriptor));
        }

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
            objectMapper.setVisibility(PropertyAccessor.FIELD, JsonAutoDetect.Visibility.ANY);

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

//        if(isDebug()) {
//        System.out.println("DescriptorData (JSON): " + data.toJsonString());
//        System.out.println("DescriptorData (IV): " + Arrays.toString(iv));
//        System.out.println("DescriptorData (SS): " + Arrays.toString(ss));
//        System.out.println("Dummy encrypted" + Arrays.toString(cbcEncrypt("Hello".getBytes(), iv, ss)));
//        System.out.println("Dummy decrypted" + Arrays.toString(cbcDecrypt(cbcEncrypt("Hello".getBytes(), iv, ss), iv, ss)));
//        }
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

            builder.addFormDataPart("instructions", null, RequestBody.create(stringToByteArray(instructions.toJsonString()), MediaType.parse("application/octet-stream")));

            if (encryptedDescriptor != null) {
                builder.addFormDataPart("metaData", null, RequestBody.create(encryptedDescriptor, MediaType.parse("application/octet-stream")));
            }

            if (payloads != null) {
                for (PayloadFile payload : payloads) {
                    RequestBody payloadBody;

                    if(keyHeader == null) {
                        payloadBody = RequestBody.create(payload.getPayload(), MediaType.parse(payload.getContentType()));
                    } else {
                        ByteArrayOutputStream encryptedPayload = CryptoUtil.encryptWithKeyheader(payload.getPayload(), getUpdatedKeyHeader(keyHeader, manifest, payload.getKey()));
                        payloadBody = new StreamRequestBody(encryptedPayload, MediaType.parse(payload.getContentType()));
                    }

                    builder.addFormDataPart("payload", payload.getKey(), payloadBody);
                }
            }

            if (thumbnails != null) {
                for (ThumbnailFile thumb : thumbnails) {
                    RequestBody payloadBody;

                    if(keyHeader == null) {
                        payloadBody = new StreamRequestBody(thumb.getOutputStream(), MediaType.parse(thumb.getContentType()));
                    } else {
                        ByteArrayOutputStream encryptedPayload = CryptoUtil.encryptWithKeyheader(thumb.getInputStream(), getUpdatedKeyHeader(keyHeader, manifest, thumb.getKey()));
                        payloadBody = new StreamRequestBody(encryptedPayload, MediaType.parse(thumb.getContentType()));
                    }

                    builder.addFormDataPart("thumbnail", thumb.getKey() + thumb.getPixelWidth(), payloadBody);
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

    private static UploadResult pureUpload(
            DotYouClient dotYouClient,
            MultipartBody data

    ) {
        Request request = new Request.Builder()
                .url(dotYouClient.getEndpoint() + "/drive/files/upload")
                .post(data)
                .build();


        try (
                Response response = dotYouClient.createHttpClient(new HttpClientOptions(true)).newCall(request).execute();
                ResponseBody body = response.body()) {

            if (body != null) {
                String jsonData = body.string();
                System.out.println("Response: " + jsonData);

                if (response.isSuccessful()) {
                    JSONObject uploadResultObject = new JSONObject(jsonData);

//                    keyHeader: KeyHeader | undefined;
//                    file: ExternalFileIdentifier;
//                    globalTransitIdFileIdentifier: GlobalTransitIdFileIdentifier;
//                    recipientStatus: { [key: string]: TransferUploadStatus };
//                    newVersionTag: string;


                    return new UploadResult(
                            null,
                            new ExternalFileIdentifier(uploadResultObject.getJSONObject("file")),
                            new GlobalTransitIdFileIdentifier(uploadResultObject.getJSONObject("globalTransitIdFileIdentifier")),
                            null,
                            uploadResultObject.getString("newVersionTag"));
                }
            }

            // Do something if the body is `null`

        } catch (Exception e) {
            // TODO
            System.out.println("Error: " + e.getMessage());
        }

        throw new NotImplementedError();

// return new UploadResult();
    }


    private static String jsonStringify64(Object data) {
        // Implement your JSON stringify logic here
        // Example placeholder implementation:
        return ""; // Placeholder for JSON stringify
    }
}

