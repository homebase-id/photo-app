package id.homebase.lib.core.file.types;

public record EncryptedKeyHeader(int encryptionVersion, int type, byte[] iv, byte[] encryptedAesKey) {
    // Constructor with fields defined implicitly by the record
}