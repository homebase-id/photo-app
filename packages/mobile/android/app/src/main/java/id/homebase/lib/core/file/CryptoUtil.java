package id.homebase.lib.core.file;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.Base64;
import java.util.concurrent.CompletableFuture;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import id.homebase.lib.core.DotYouClient;
import okhttp3.MediaType;
import okhttp3.RequestBody;
import okio.BufferedSink;
import okio.Okio;

public class CryptoUtil {

    public static SecretKey importKey(byte[] keyBytes) {
        return new SecretKeySpec(keyBytes, "AES");
    }

    public static byte[] innerEncrypt(byte[] iv, SecretKey key, byte[] data) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
        cipher.init(Cipher.ENCRYPT_MODE, key, new IvParameterSpec(iv));
        return cipher.doFinal(data);
    }

    public static byte[] cbcEncrypt(byte[] data, byte[] iv, byte[] key) throws Exception {
        SecretKey secretKey = importKey(key);
        return innerEncrypt(iv, secretKey, data);
    }

    public static ByteArrayOutputStream cbcEncryptStream(File inputFile, byte[] iv, byte[] key) throws Exception {
        SecretKeySpec secretKey = new SecretKeySpec(key, "AES");
        Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
        IvParameterSpec ivSpec = new IvParameterSpec(iv);
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, ivSpec);

        try (FileInputStream fis = new FileInputStream(inputFile);
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            byte[] buffer = new byte[16]; // Block size for AES

            while (true) {
                int bytesRead = fis.read(buffer);
                if (bytesRead == -1) {
                    break; // End of file
                }

                byte[] encryptedBytes = cipher.update(buffer, 0, bytesRead);
                baos.write(encryptedBytes);
            }

            // Write the last block of encrypted data (with padding)
            byte[] finalEncryptedBytes = cipher.doFinal();
            baos.write(finalEncryptedBytes);

            return baos;

        } catch (IOException e) {
            throw new RuntimeException("Error reading file", e);
        }
    }


    // Method to convert a string to a byte array
    public static byte[] stringToByteArray(String input) {
        return input.getBytes(StandardCharsets.UTF_8);
    }

    // Method to convert a byte array to a base64 string
    public static String byteArrayToBase64(byte[] input) {
        return Base64.getEncoder().encodeToString(input);
    }

    // Encrypt metadata method
    public static UploadFileMetadata<String> encryptMetaData(UploadFileMetadata<String> metadata, KeyHeader keyHeader) throws Exception {
        if (keyHeader != null && metadata.getAppData().content() != null) {
            String encryptedContent = encryptWithKeyheader(metadata.getAppData().content(), keyHeader);
            metadata.getAppData().content(encryptedContent);
        }
        return metadata;
    }

    // Encrypt with key header method
    public static String encryptWithKeyheader(String content, KeyHeader keyHeader) throws Exception {
        byte[] contentBytes = stringToByteArray(content);
        byte[] encryptedBytes = encryptWithKeyheader(contentBytes, keyHeader);
        return byteArrayToBase64(encryptedBytes);
    }

    public static byte[] encryptWithKeyheader(byte[] contentBytes, KeyHeader keyHeader) throws Exception {
        return cbcEncrypt(contentBytes, keyHeader.iv(), keyHeader.aesKey());
    }

    public static ByteArrayOutputStream encryptWithKeyheader(File contentBytes, KeyHeader keyHeader) throws Exception {
        return cbcEncryptStream(contentBytes, keyHeader.iv(), keyHeader.aesKey());

    }


    private static byte[] concatenateByteArrays(byte[] array1, byte[] array2) {
        byte[] combined = new byte[array1.length + array2.length];
        System.arraycopy(array1, 0, combined, 0, array1.length);
        System.arraycopy(array2, 0, combined, array1.length, array2.length);
        return combined;
    }

    public static EncryptedKeyHeader encryptKeyHeader(
            DotYouClient dotYouClient,
            KeyHeader keyHeader,
            byte[] transferIv) throws Exception {

        byte[] ss = dotYouClient.getSharedSecret();
        if (ss == null) {
            throw new IllegalStateException("Attempting to encrypt but missing the shared secret");
        }

        byte[] combined = concatenateByteArrays(keyHeader.iv(), keyHeader.aesKey());
        byte[] encryptedAesKey = cbcEncrypt(combined, transferIv, ss);
        return new EncryptedKeyHeader(1, 11, transferIv, encryptedAesKey);
    }
}


