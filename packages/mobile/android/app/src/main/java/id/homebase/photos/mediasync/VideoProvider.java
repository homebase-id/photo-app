package id.homebase.photos.mediasync;

import static id.homebase.lib.core.file.DriveFileUploadProvider.uploadFile;

import android.content.Context;
import android.util.Log;

import java.io.File;
import java.io.IOException;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import id.homebase.lib.core.DotYouClient;
import id.homebase.lib.core.crypto.CryptoUtil;
import id.homebase.lib.core.file.types.AccessControlList;
import id.homebase.lib.core.file.types.ArchivalStatus;
import id.homebase.lib.core.file.types.EmbeddedThumb;
import id.homebase.lib.core.file.types.KeyHeader;
import id.homebase.lib.core.file.types.KeyHeaderGenerator;
import id.homebase.lib.core.file.types.SecurityGroupType;
import id.homebase.lib.core.file.types.StorageOptions;
import id.homebase.lib.core.file.types.TargetDrive;
import id.homebase.lib.core.file.types.UploadAppFileMetaData;
import id.homebase.lib.core.file.types.UploadFileMetadata;
import id.homebase.lib.core.file.types.UploadInstructionSet;
import id.homebase.lib.core.file.types.UploadResult;
import id.homebase.lib.core.file.types.payloadorthumbnailbase.PayloadBase;
import id.homebase.lib.core.file.types.payloadorthumbnailbase.PayloadFile;
import id.homebase.lib.core.file.types.payloadorthumbnailbase.ThumbnailBase;
import id.homebase.lib.core.file.types.payloadorthumbnailbase.ThumbnailStream;
import id.homebase.photos.mediasync.types.VideoData;
import id.homebase.photos.mediasync.types.VideoFile;
import id.homebase.photos.mediasync.types.VideoSegments;
import com.arthenica.ffmpegkit.FFmpegKit;
import com.arthenica.ffmpegkit.FFprobeKit;
import com.arthenica.ffmpegkit.ReturnCode;

import org.json.JSONObject;

public class VideoProvider {
    private static final String DEFAULT_PAYLOAD_KEY = "dflt_key";
    private static final boolean ENCRYPT_MEDIA = true;
    private static final TargetDrive PHOTO_DRIVE = new TargetDrive("6483b7b1f71bd43eb6896c86148668cc", "2af68fe72fb84896f39f97c59d60813a");
    private static final AccessControlList OWNER_ONLY_ACL = new AccessControlList(SecurityGroupType.OWNER);
    private static final ImageResizer.ResizeInstruction TINY_THUMB_INSTRUCTION = new ImageResizer.ResizeInstruction(20, 20, 10, "jpeg");
    private static final ImageResizer.ResizeInstruction[] DEFAULT_IMAGE_SIZES = new ImageResizer.ResizeInstruction[]{
            new ImageResizer.ResizeInstruction(300, 300, 95, "jpeg"),
            new ImageResizer.ResizeInstruction(1200, 1200, 95, "jpeg"),
    };

    private final Context context;

    public VideoProvider(Context context) {
        this.context = context;
    }

    public UploadResult uploadMedia(DotYouClient dotYouClient, String filePath, Long timestampInMs, String mimeType, String identifier, String width, String height, boolean forceLowerQuality) throws Exception {
        UploadInstructionSet instructions = new UploadInstructionSet(new StorageOptions(PHOTO_DRIVE));

        // Retrieve the latest photo information
        String fileName = Paths.get(filePath).getFileName().toString();
        String uniqueId = toGuidId(identifier != null ? identifier : fileName + "_" + width + "x" + height);

        // Grab thumbnails for the video
        String videoThumbnailPath = grabVideoThumbnail(filePath).get();

        // Generate thumbnails
        ThumbnailStream tinyThumb = ImageResizer.resizeImage(videoThumbnailPath, TINY_THUMB_INSTRUCTION, DEFAULT_PAYLOAD_KEY, true);
        EmbeddedThumb previewThumbnail = new EmbeddedThumb(tinyThumb.getPixelHeight(), tinyThumb.getPixelWidth(), TINY_THUMB_INSTRUCTION.format, tinyThumb.getBase64());
        List<ThumbnailBase> thumbnails = new ArrayList<>(ImageResizer.resizeImage(videoThumbnailPath, List.of(DEFAULT_IMAGE_SIZES), DEFAULT_PAYLOAD_KEY));

        UploadFileMetadata<String> metadata = new UploadFileMetadata<>(false, ENCRYPT_MEDIA, OWNER_ONLY_ACL, new UploadAppFileMetaData<>(uniqueId, new String[0], 0, 0, timestampInMs, null, ArchivalStatus.None, "{\"originalFileName\":\"" + fileName + "\"}", previewThumbnail), null, null);

        // Compress and segment video
        // Handle compression and segmentation
        KeyHeader keyHeader = ENCRYPT_MEDIA ? KeyHeaderGenerator.generateKeyHeader() : null;
        VideoData videoData = compressAndSegmentVideo(filePath, forceLowerQuality, keyHeader);

        List<PayloadBase> payloads;
            if (videoData.getSegments() != null) {
                String playlistContent = new String(java.nio.file.Files.readAllBytes(Paths.get(videoData.getVideo().getFilePath())));

                // Handle HLS segments
                JSONObject metadataJson = new JSONObject();
                metadataJson.put("isSegmented", true);
                metadataJson.put("mimeType", "application/vnd.apple.mpegurl");
                metadataJson.put("hlsPlaylist", playlistContent);

                // Convert JSONObject to String
                String metadataJsonString = metadataJson.toString();

            PayloadFile payloadStream = new PayloadFile(DEFAULT_PAYLOAD_KEY, videoData.getSegments().getFilePath(), previewThumbnail, "video/mp2t",  metadataJsonString, true, keyHeader != null ? keyHeader.iv() : null);
            payloads = List.of(payloadStream);
        } else {
            // Handle single video file
            String metadataStr = "{ \"mimeType\": \"video/mp4\", \"isSegmented\": false }";

            PayloadFile payloadFile = new PayloadFile(DEFAULT_PAYLOAD_KEY, videoData.getVideo().getFilePath(), previewThumbnail, "video/mp4", metadataStr);
            payloads = List.of(payloadFile);
        }

        if(keyHeader != null) {
            return uploadFile(dotYouClient, instructions, metadata, payloads, thumbnails, keyHeader.aesKey());
        } else {
            return uploadFile(dotYouClient, instructions, metadata, payloads, thumbnails, ENCRYPT_MEDIA);
        }
    }

    // Function to generate video thumbnail using FFmpeg
    public CompletableFuture<String> grabVideoThumbnail(String filePath) {
        File outputDir = context.getCacheDir();
        String fileName = "thumbnail-" + java.util.UUID.randomUUID();

        String argThumbnailPath = new File(outputDir, fileName + "%04d.png").getAbsolutePath();
        String thumbnailPath = new File(outputDir, fileName + "0001.png").getAbsolutePath();

        return CompletableFuture.supplyAsync(() -> {
            String command = String.format("-i %s -frames:v 1 %s", filePath, argThumbnailPath);
            try {
                var session = FFmpegKit.execute(command);
                ReturnCode returnCode = session.getReturnCode();
                if (returnCode.isValueSuccess()) {
                    return thumbnailPath;  // Successfully generated the thumbnail
                } else {
                    throw new RuntimeException("Failed to generate thumbnail: " + session.getAllLogsAsString());
                }
            } catch (Exception e) {
                throw new RuntimeException("Error generating thumbnail", e);
            }
        });
    }

    // Function to compress and segment video
    public VideoData compressAndSegmentVideo(String filePath, boolean compress, KeyHeader keyHeader) throws Exception {
        File outputDir = context.getCacheDir();
        File inputVideoFile = new File(filePath);

        File compressedVideoFile = compress ? compressVideo(inputVideoFile, new File(outputDir, "compressed.mp4")).get() : inputVideoFile;
        File[] hlsFiles = segmentVideoToHLS(compressedVideoFile, outputDir, keyHeader).get();

        return new VideoData(new VideoFile(hlsFiles[0].getAbsolutePath()), new VideoSegments(hlsFiles[1].getAbsolutePath()));
    }

    // Function to compress video using FFmpeg
    public CompletableFuture<File> compressVideo(File inputFile, File outputFile) {
        return CompletableFuture.supplyAsync(() -> {
            String command = String.format("-i %s -preset fast -crf 23 %s", inputFile.getAbsolutePath(), outputFile.getAbsolutePath());
            try {
                var session = FFmpegKit.execute(command);
                ReturnCode returnCode = session.getReturnCode();
                if (returnCode.isValueSuccess()) {
                    return outputFile;  // Successfully compressed the video
                } else {
                    throw new RuntimeException("Failed to compress video: " + session.getAllLogsAsString());
                }
            } catch (Exception e) {
                throw new RuntimeException("Error compressing video", e);
            }
        });
    }

    // Function to get the codec of a video file
    public CompletableFuture<String> getVideoCodec(String inputFilePath) {
        CompletableFuture<String> codecFuture = new CompletableFuture<>();

        // Command to retrieve the codec of the video file using ffprobe
        String command = "-v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 " + inputFilePath;

        // Execute FFmpeg command
        FFprobeKit.executeAsync(command, session -> {
            ReturnCode returnCode = session.getReturnCode();
            if (ReturnCode.isSuccess(returnCode)) {
                // Success: Retrieve codec from output
                String output = session.getOutput();
                codecFuture.complete(output.trim());
            } else {
                // Failure: Handle error
                String errorMessage = session.getFailStackTrace();
                codecFuture.completeExceptionally(new Exception("Failed to get codec: " + errorMessage));
            }
        });

        return codecFuture;
    }

    // Function to segment video to HLS using FFmpeg
    public CompletableFuture<File[]> segmentVideoToHLS(File inputFile, File outputDir, KeyHeader keyHeader) {
        return CompletableFuture.supplyAsync(() -> {
            String randomId = UUID.randomUUID().toString();
            String playlistFileName = "output-" + randomId + ".m3u8";
            String segmentsFileName = "output-" + randomId + ".ts";
            File playlistFile = new File(outputDir, playlistFileName);
            File segmentsFile = new File(outputDir, segmentsFileName);

            String encryptionCommand = "";
            try {
                if (keyHeader != null) {
                    File keyInfoFile = createKeyInfoFile(outputDir, keyHeader);  // This method will need to be implemented
                    encryptionCommand = "-hls_key_info_file " + keyInfoFile.getAbsolutePath();
                }

                 // Extract video rotation metadata
                String rotation = extractRotationMetadata(inputFile); // Implement this method to extract rotation metadata

                // Define the transpose filter based on the rotation metadata
                String rotationCommand = "";
                if (rotation != null) {
                    switch (rotation) {
                        case "90":
                            rotationCommand = "-vf \"transpose=1\""; // Rotate 90 degrees clockwise
                            break;
                        case "180":
                            rotationCommand = "-vf \"transpose=2,transpose=2\""; // Rotate 180 degrees
                            break;
                        case "270":
                            rotationCommand = "-vf \"transpose=2\""; // Rotate 270 degrees clockwise (or 90 degrees counter-clockwise)
                            break;
                        default:
                            break; // No rotation needed for 0 or unknown rotation values
                    }
                }

                String command;
                if(getVideoCodec(inputFile.getAbsolutePath()).get().equals("h264")) {
                    // Command to segment the video to HLS using FFmpeg
                    command = String.format("-i %s -codec copy %s %s -hls_time 6 -hls_list_size 0 -f hls -hls_flags single_file %s",
                            inputFile.getAbsolutePath(), encryptionCommand, rotationCommand, playlistFile.getAbsolutePath());
                } else {
                    // Command to segment the video to HLS using FFmpeg
                    command = String.format("-i %s -c:v libx264 -preset fast -crf 23 -c:a aac %s %s -hls_time 6 -hls_list_size 0 -f hls -hls_flags single_file %s",
                            inputFile.getAbsolutePath(), encryptionCommand, rotationCommand, playlistFile.getAbsolutePath());
                }

                // Execute the FFmpeg command using FFmpegKit
                var session = FFmpegKit.execute(command);
                ReturnCode returnCode = session.getReturnCode();

                if (returnCode.isValueSuccess()) {
                    // Successfully segmented the video
                    return new File[]{playlistFile, segmentsFile};
                } else {
                    throw new RuntimeException("Failed to segment video to HLS: " + session.getAllLogsAsString());
                }
            } catch (Exception e) {
                throw new RuntimeException("Error during HLS segmentation", e);
            }
        });
    }

    // Example method to extract rotation metadata
    private String extractRotationMetadata(File inputFile) throws IOException {
        // Use FFmpeg or MediaMetadataRetriever to extract the rotation metadata
        String rotation = null;
        String command = String.format("-i %s -select_streams v:0 -show_entries stream_tags=rotate -of csv=p=0", inputFile.getAbsolutePath());

        // Execute FFmpeg command to get the rotation metadata
        var session = FFmpegKit.execute(command);
        if (session.getReturnCode().isValueSuccess()) {
            String output = session.getAllLogsAsString().trim();
            if (!output.isEmpty()) {
                rotation = output;
            }
        }
        return rotation;
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder hexString = new StringBuilder();
        for (byte b : bytes) {
            String hex = String.format("%02x", b);  // Converts byte to hex, padding with a leading zero if necessary
            hexString.append(hex);
        }
        return hexString.toString();
    }

    // Helper function to create key info file for encryption
    public File createKeyInfoFile(File directory, KeyHeader keyHeader) throws IOException {
        String id = java.util.UUID.randomUUID().toString();
        File keyFile = new File(directory, "hls-encryption-" + id + ".key");
        File keyInfoFile = new File(directory, "hls-key-info-" + id + ".txt");

        // Write AES key to the key file in raw format
        java.nio.file.Files.write(keyFile.toPath(), keyHeader.aesKey());

        // Write the key info (URL, file path, and IV) to the key info file
        String ivHex = bytesToHex(keyHeader.iv());
        String keyInfoContent = "http://example.com/path/to/encryption.key\n" + keyFile.getAbsolutePath() + "\n" + ivHex;
        java.nio.file.Files.write(keyInfoFile.toPath(), keyInfoContent.getBytes());

        return keyInfoFile;
    }

    // TODO: move this to a common helper class
    private String toGuidId(String input) throws NoSuchAlgorithmException {
        // Compute the MD5 hash
        MessageDigest md = MessageDigest.getInstance("MD5");
        byte[] md5Bytes = md.digest(input.getBytes());

        // Convert the first 16 bytes of the MD5 hash to a UUID
        long msb = 0;
        long lsb = 0;
        for (int i = 0; i < 8; i++) {
            msb = (msb << 8) | (md5Bytes[i] & 0xff);
        }
        for (int i = 8; i < 16; i++) {
            lsb = (lsb << 8) | (md5Bytes[i] & 0xff);
        }

        return new UUID(msb, lsb).toString();
    }
}
