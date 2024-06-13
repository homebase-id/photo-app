package id.homebase.lib.core.file;

public enum SecurityGroupType {
    ANONYMOUS("anonymous"),
    AUTHENTICATED("authenticated"),
    CONNECTED("connected"),
    OWNER("owner");

    private final String value;

    SecurityGroupType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
