package id.homebase.lib.core.crypto;

import android.util.Log;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import id.homebase.lib.core.DotYouClient;
import id.homebase.lib.core.file.types.EncryptedKeyHeader;
import id.homebase.lib.core.file.types.KeyHeader;
import id.homebase.lib.core.file.types.UploadFileMetadata;

public class CryptoUtil {

    public static SecretKey importKey(byte[] keyBytes) {
        return new SecretKeySpec(keyBytes, "AES");
    }

    public static byte[] innerDecrypt(byte[] iv, SecretKey key, byte[] data) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
        cipher.init(Cipher.DECRYPT_MODE, key, new IvParameterSpec(iv));
        return cipher.doFinal(data);
    }

    public static byte[] cbcDecrypt(byte[] data, byte[] iv, byte[] key) throws Exception {
        SecretKey secretKey = importKey(key);
        return innerDecrypt(iv, secretKey, data);
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

    public static ByteArrayOutputStream cbcEncryptStream(InputStream inputStream, byte[] iv, byte[] key) throws Exception {
        SecretKeySpec secretKey = new SecretKeySpec(key, "AES");
        Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
        IvParameterSpec ivSpec = new IvParameterSpec(iv);
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, ivSpec);

        try {
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

            byte[] buffer = new byte[16]; // Block size for AES

            while (true) {
                int bytesRead = inputStream.read(buffer);
                if (bytesRead == -1) {
                    break; // End of file
                }

                byte[] encryptedBytes = cipher.update(buffer, 0, bytesRead);
                outputStream.write(encryptedBytes);
            }

            // Write the last block of encrypted data (with padding)
            byte[] finalEncryptedBytes = cipher.doFinal();
            outputStream.write(finalEncryptedBytes);

            return outputStream;

        } catch (IOException e) {
            Log.e(null, "Error reading file: " + Arrays.toString(e.getStackTrace()));
            throw new RuntimeException("Error reading file", e);
        }
    }

    public static ByteArrayOutputStream cbcEncryptFile(File inputFile, byte[] iv, byte[] key) throws Exception {
        try (FileInputStream fis = new FileInputStream(inputFile);) {
            return cbcEncryptStream(fis, iv, key);
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

    public static byte[] base64ToByteArray(String input) {
        return Base64.getDecoder().decode(input.getBytes(StandardCharsets.UTF_8));
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
        try {
            return cbcEncryptFile(contentBytes, keyHeader.iv(), keyHeader.aesKey());
        } catch (Exception e) {
            Log.e(null, "Error encrypting file with KeyHeader: " + e.getMessage());
            throw e;
        }
    }

    public static ByteArrayOutputStream encryptWithKeyheader(InputStream outputStream, KeyHeader keyHeader) throws Exception {
        try {
            return cbcEncryptStream(outputStream, keyHeader.iv(), keyHeader.aesKey());
        } catch (Exception e) {
            Log.e(null, "Error encrypting stream with KeyHeader: " + e.getMessage());
            throw e;
        }
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


