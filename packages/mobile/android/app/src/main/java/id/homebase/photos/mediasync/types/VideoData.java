package id.homebase.photos.mediasync.types;

public class VideoData {
    private VideoFile video;
    private VideoSegments segments;

    public VideoData(VideoFile video, VideoSegments segments) {
        this.video = video;
        this.segments = segments;
    }

    public VideoFile getVideo() {
        return video;
    }

    public void setVideo(VideoFile video) {
        this.video = video;
    }

    public VideoSegments getSegments() {
        return segments;
    }

    public void setSegments(VideoSegments segments) {
        this.segments = segments;
    }
}