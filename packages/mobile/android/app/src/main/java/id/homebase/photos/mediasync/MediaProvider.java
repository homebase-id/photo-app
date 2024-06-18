package id.homebase.photos.mediasync;

import static id.homebase.lib.core.file.DriveFileUploadProvider.uploadFile;

import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import id.homebase.lib.core.DotYouClient;
import id.homebase.lib.core.file.types.AccessControlList;
import id.homebase.lib.core.file.types.ArchivalStatus;
import id.homebase.lib.core.file.types.EmbeddedThumb;
import id.homebase.lib.core.file.types.PayloadFile;
import id.homebase.lib.core.file.types.SecurityGroupType;
import id.homebase.lib.core.file.types.StorageOptions;
import id.homebase.lib.core.file.types.TargetDrive;
import id.homebase.lib.core.file.types.ThumbnailFile;
import id.homebase.lib.core.file.types.UploadAppFileMetaData;
import id.homebase.lib.core.file.types.UploadFileMetadata;
import id.homebase.lib.core.file.types.UploadInstructionSet;
import id.homebase.lib.core.file.types.UploadResult;

public class MediaProvider {
    private static final String DEFAULT_PAYLOAD_KEY = "dflt_key";
    private static final boolean ENCRYPT_MEDIA = true;
    private static final TargetDrive PHOTO_DRIVE = new TargetDrive("6483b7b1f71bd43eb6896c86148668cc", "2af68fe72fb84896f39f97c59d60813a");
    private static final AccessControlList OWNER_ONLY_ACL = new AccessControlList(SecurityGroupType.OWNER);
    private static final ImageResizer.ResizeInstruction TINY_THUMB_INSTRUCTION = new ImageResizer.ResizeInstruction(20, 20, 10, "jpg");
    private static final ImageResizer.ResizeInstruction[] DEFAULT_IMAGE_SIZES = new ImageResizer.ResizeInstruction[]{
            new ImageResizer.ResizeInstruction(300, 300, 95, "jpg"),
            new ImageResizer.ResizeInstruction(1200, 1200, 95, "jpg"),
    };

    public static UploadResult uploadMedia(DotYouClient dotYouClient, String filePath, Long timestampInMs, String mimeType, String identifier, String width, String height, boolean forceLowerQuality) throws Exception {
        UploadInstructionSet instructions = new UploadInstructionSet(new StorageOptions(PHOTO_DRIVE));

        // Retrieve the latest photo information
        String fileName = Paths.get(filePath).getFileName().toString();
        String uniqueId = toGuidId(identifier != null ? identifier : fileName + "_" + width + "x" + height);

        // Generate thumbnails
        ThumbnailFile tinyThumb = ImageResizer.resizeImage(filePath, List.of(TINY_THUMB_INSTRUCTION), DEFAULT_PAYLOAD_KEY).get(0);
        EmbeddedThumb previewThumbnail = new EmbeddedThumb(TINY_THUMB_INSTRUCTION.height, TINY_THUMB_INSTRUCTION.width, TINY_THUMB_INSTRUCTION.format, tinyThumb.getBase64());

        UploadFileMetadata<String> metadata = new UploadFileMetadata<>(false, ENCRYPT_MEDIA, OWNER_ONLY_ACL, new UploadAppFileMetaData<>(uniqueId, new String[0], 0, 0, timestampInMs, null, ArchivalStatus.None, "", previewThumbnail), null, null);

        // TODO: forceLowerQuality to resize the payload before uploading
        List<PayloadFile> payloads = List.of(new PayloadFile(DEFAULT_PAYLOAD_KEY, filePath, null, mimeType, ""));
        List<ThumbnailFile> thumbnails = new ArrayList<>(ImageResizer.resizeImage(filePath, List.of(DEFAULT_IMAGE_SIZES), DEFAULT_PAYLOAD_KEY));

        return uploadFile(dotYouClient, instructions, metadata, payloads, thumbnails, ENCRYPT_MEDIA);
    }

    private static String toGuidId(String input) throws NoSuchAlgorithmException {
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
