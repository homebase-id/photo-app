package id.homebase.lib.core.file;

import static id.homebase.lib.core.crypto.CryptoUtil.cbcEncrypt;
import static id.homebase.lib.core.crypto.CryptoUtil.encryptKeyHeader;
import static id.homebase.lib.core.crypto.CryptoUtil.encryptMetaData;
import static id.homebase.lib.core.crypto.CryptoUtil.stringToByteArray;
import static id.homebase.lib.core.file.types.KeyHeaderGenerator.generateKeyHeader;
import static id.homebase.lib.core.file.types.KeyHeaderGenerator.getRandom16ByteArray;

import android.util.Log;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import id.homebase.lib.core.DotYouClient;
import id.homebase.lib.core.HttpClientOptions;
import id.homebase.lib.core.crypto.CryptoUtil;
import id.homebase.lib.core.file.types.BadRequestUploadResult;
import id.homebase.lib.core.file.types.EncryptedKeyHeader;
import id.homebase.lib.core.file.types.KeyHeader;
import id.homebase.lib.core.file.types.StreamRequestBody;
import id.homebase.lib.core.file.types.SuccessfullUploadResult;
import id.homebase.lib.core.file.types.UploadFileMetadata;
import id.homebase.lib.core.file.types.UploadInstructionSet;
import id.homebase.lib.core.file.types.UploadManifest;
import id.homebase.lib.core.file.types.UploadPayloadDescriptor;
import id.homebase.lib.core.file.types.UploadResult;
import id.homebase.lib.core.file.types.UploadThumbnailDescriptor;
import id.homebase.lib.core.file.types.payloadorthumbnailbase.PayloadBase;
import id.homebase.lib.core.file.types.payloadorthumbnailbase.PayloadOrThumbnailBase;
import id.homebase.lib.core.file.types.payloadorthumbnailbase.PayloadOrThumbnailFile;
import id.homebase.lib.core.file.types.payloadorthumbnailbase.PayloadOrThumbnailStream;
import id.homebase.lib.core.file.types.payloadorthumbnailbase.ThumbnailBase;
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
            List<PayloadBase> payloads,
            List<ThumbnailBase> thumbnails,
            boolean encrypt
    ) throws Exception {
        // Debug information
        if (isDebug()) {
            Log.v(null, "request: " + dotYouClient.getEndpoint() + "/drive/files/upload" +
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

    public static boolean isDebug() {
        // Return your debug flag
        return true;
    }

    private static UploadManifest buildManifest(
            List<PayloadBase> payloads,
            List<ThumbnailBase> thumbnails,
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
            List<PayloadBase> payloads,
            List<ThumbnailBase> thumbnails,
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
            for (PayloadBase payload : payloads) {
                RequestBody payloadBody;

                if (keyHeader == null) {
                    payloadBody = getFileOrStreamRequestBody(payload);
                } else {
                    java.io.File payloadFile = payload instanceof PayloadOrThumbnailFile ? ((PayloadOrThumbnailFile) payload).getPayload() : null;
                    InputStream payloadStream = payload instanceof PayloadOrThumbnailStream ? ((PayloadOrThumbnailStream) payload).getInputStream() : null;

                    ByteArrayOutputStream encryptedPayload = payloadFile != null ? CryptoUtil.encryptWithKeyheader(payloadFile, getUpdatedKeyHeader(keyHeader, manifest, payload.getKey())) : CryptoUtil.encryptWithKeyheader(payloadStream, getUpdatedKeyHeader(keyHeader, manifest, payload.getKey()));
                    payloadBody = new StreamRequestBody(encryptedPayload, MediaType.parse(payload.getContentType()));
                }

                builder.addFormDataPart("payload", payload.getKey(), payloadBody);
            }
        }

        if (thumbnails != null) {
            for (ThumbnailBase thumb : thumbnails) {
                RequestBody payloadBody;

                if (keyHeader == null) {
                    payloadBody = getFileOrStreamRequestBody(thumb);
                } else {
                    java.io.File thumbFile = thumb instanceof PayloadOrThumbnailFile ? ((PayloadOrThumbnailFile) thumb).getPayload() : null;
                    InputStream thumbStream = thumb instanceof PayloadOrThumbnailStream ? ((PayloadOrThumbnailStream) thumb).getInputStream() : null;

                    ByteArrayOutputStream encryptedPayload = thumbFile != null ? CryptoUtil.encryptWithKeyheader(thumbFile, getUpdatedKeyHeader(keyHeader, manifest, thumb.getKey())) : CryptoUtil.encryptWithKeyheader(thumbStream, getUpdatedKeyHeader(keyHeader, manifest, thumb.getKey()));
                    payloadBody = new StreamRequestBody(encryptedPayload, MediaType.parse(thumb.getContentType()));
                }

                builder.addFormDataPart("thumbnail", thumb.getKey() + thumb.getPixelWidth(), payloadBody);
            }
        }

        return builder.build();

    }

    private static RequestBody getFileOrStreamRequestBody(PayloadOrThumbnailBase payloadOrThumbnailBase) {
        if (payloadOrThumbnailBase instanceof PayloadOrThumbnailStream) {
            return new StreamRequestBody(((PayloadOrThumbnailStream) payloadOrThumbnailBase).getOutputStream(), MediaType.parse(payloadOrThumbnailBase.getContentType()));
        } else if (payloadOrThumbnailBase instanceof PayloadOrThumbnailFile) {
            return RequestBody.create(((PayloadOrThumbnailFile) payloadOrThumbnailBase).getPayload(), MediaType.parse(payloadOrThumbnailBase.getContentType()));
        }
        return null;
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
                JSONObject uploadResultObject = new JSONObject(jsonData);

                if (response.isSuccessful()) {
                    return new SuccessfullUploadResult(uploadResultObject);
                } else if (response.code() == 400) {
                    return new BadRequestUploadResult(uploadResultObject);
                }

                // TODO
                Log.e(null, "Error: " + jsonData);
            }

            // Do something if the body is `null`

        } catch (Exception e) {
            // TODO
            Log.e(null, "Error: " + e.getMessage() + Arrays.toString(e.getStackTrace()));
        }

        throw new NotImplementedError();
    }

    private static class DescriptorData {
        private final EncryptedKeyHeader encryptedKeyHeader;
        private final UploadFileMetadata<String> fileMetadata;

        public DescriptorData(EncryptedKeyHeader encryptedKeyHeader, UploadFileMetadata<String> fileMetadata) {
            this.encryptedKeyHeader = encryptedKeyHeader;
            this.fileMetadata = fileMetadata;
        }

        public String toJsonString() throws JsonProcessingException {
            ObjectMapper objectMapper = new ObjectMapper();
            objectMapper.setVisibility(PropertyAccessor.FIELD, JsonAutoDetect.Visibility.ANY);

            return objectMapper.writeValueAsString(this);
        }
    }
}

