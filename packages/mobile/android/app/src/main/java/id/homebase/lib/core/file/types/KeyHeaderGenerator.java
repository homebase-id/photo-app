package id.homebase.lib.core.file.types;

import java.security.SecureRandom;

public class KeyHeaderGenerator {

    public static byte[] getRandom16ByteArray() {
        SecureRandom secureRandom = new SecureRandom();
        byte[] byteArray = new byte[16];
        secureRandom.nextBytes(byteArray);
        return byteArray;
    }

    public static KeyHeader generateKeyHeader() {
        return new KeyHeader(getRandom16ByteArray(), getRandom16ByteArray());
    }

    public static KeyHeader generateKeyHeader(byte[] aesKey) {
        return new KeyHeader(getRandom16ByteArray(), aesKey);
    }

    public static void main(String[] args) {
        KeyHeader keyHeader = generateKeyHeader();
    }

    // Utility method to convert byte array to hex string for printing
    public static String byteArrayToHex(byte[] byteArray) {
        StringBuilder hexString = new StringBuilder(2 * byteArray.length);
        for (byte b : byteArray) {
            hexString.append(String.format("%02x", b));
        }
        return hexString.toString();
    }
}
