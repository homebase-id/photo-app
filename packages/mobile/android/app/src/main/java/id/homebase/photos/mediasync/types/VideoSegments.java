package id.homebase.photos.mediasync.types;

public class VideoSegments {
    private String filepath;

    public VideoSegments(String filepath) {
        this.filepath = filepath;
    }

    public String getFilePath() {
        return filepath;
    }

    public void setFilePath(String filepath) {
        this.filepath = filepath;
    }
}