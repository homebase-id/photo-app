package id.homebase.lib.core.file.types;

public record KeyHeader(byte[] iv, byte[] aesKey) {}
