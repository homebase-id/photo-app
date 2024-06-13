package id.homebase.lib.core.file;

public record EncryptedKeyHeader(int encryptionVersion, int type, byte[] iv, byte[] encryptedAesKey) {
    // Constructor with fields defined implicitly by the record
}