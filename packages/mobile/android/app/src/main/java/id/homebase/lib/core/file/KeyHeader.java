package id.homebase.lib.core.file;

public record KeyHeader(byte[] iv, byte[] aesKey) {}
