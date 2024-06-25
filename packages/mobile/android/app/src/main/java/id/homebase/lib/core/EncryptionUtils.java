package id.homebase.lib.core;

public class EncryptionUtils {

    public static byte[] encryptData(String data, byte[] iv, byte[] sharedSecret) {
        // Implement your encryption logic here
        return data.getBytes();
    }

    public static String decryptData(byte[] data, byte[] iv, byte[] sharedSecret) {
        // Implement your decryption logic here
        return new String(data);
    }

    public static String encryptUrl(String url, byte[] sharedSecret) {
        // Implement your URL encryption logic here
        return url;
    }

    public static byte[] getRandomIv() {
        // Generate and return a random IV
        return new byte[16];
    }

    public static boolean hasDebugFlag() {
        // Return your debug flag
        return true;
    }

    public static boolean isLocalStorageAvailable() {
        // Check if local storage is available
        return true;
    }
}