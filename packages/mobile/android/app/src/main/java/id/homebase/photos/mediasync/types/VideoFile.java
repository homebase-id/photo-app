package id.homebase.photos.mediasync.types;

public class VideoFile {
    private String filepath;

    public VideoFile(String filepath) {
        this.filepath = filepath;
    }

    public void setFilePath(String filepath) {
        this.filepath = filepath;
    }

    public String getFilePath() {
        return filepath;
    }
}
