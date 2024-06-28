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
import id.homebase.lib.core.file.types.SecurityGroupType;
import id.homebase.lib.core.file.types.StorageOptions;
import id.homebase.lib.core.file.types.TargetDrive;
import id.homebase.lib.core.file.types.UploadAppFileMetaData;
import id.homebase.lib.core.file.types.UploadFileMetadata;
import id.homebase.lib.core.file.types.UploadInstructionSet;
import id.homebase.lib.core.file.types.UploadResult;
import id.homebase.lib.core.file.types.payloadorthumbnailbase.PayloadBase;
import id.homebase.lib.core.file.types.payloadorthumbnailbase.PayloadFile;
import id.homebase.lib.core.file.types.payloadorthumbnailbase.PayloadStream;
import id.homebase.lib.core.file.types.payloadorthumbnailbase.ThumbnailBase;
import id.homebase.lib.core.file.types.payloadorthumbnailbase.ThumbnailStream;

public class MediaProvider {
    private static final String DEFAULT_PAYLOAD_KEY = "dflt_key";
    private static final boolean ENCRYPT_MEDIA = true;
    private static final TargetDrive PHOTO_DRIVE = new TargetDrive("6483b7b1f71bd43eb6896c86148668cc", "2af68fe72fb84896f39f97c59d60813a");
    private static final AccessControlList OWNER_ONLY_ACL = new AccessControlList(SecurityGroupType.OWNER);
    private static final ImageResizer.ResizeInstruction TINY_THUMB_INSTRUCTION = new ImageResizer.ResizeInstruction(20, 20, 10, "jpeg");
    private static final ImageResizer.ResizeInstruction[] DEFAULT_IMAGE_SIZES = new ImageResizer.ResizeInstruction[]{
            new ImageResizer.ResizeInstruction(300, 300, 95, "jpeg"),
            new ImageResizer.ResizeInstruction(1200, 1200, 95, "jpeg"),
    };

    public static UploadResult uploadMedia(DotYouClient dotYouClient, String filePath, Long timestampInMs, String mimeType, String identifier, String width, String height, boolean forceLowerQuality) throws Exception {
        UploadInstructionSet instructions = new UploadInstructionSet(new StorageOptions(PHOTO_DRIVE));

        // Retrieve the latest photo information
        String fileName = Paths.get(filePath).getFileName().toString();
        String uniqueId = toGuidId(identifier != null ? identifier : fileName + "_" + width + "x" + height);

        // Generate thumbnails
        ThumbnailStream tinyThumb = ImageResizer.resizeImage(filePath, TINY_THUMB_INSTRUCTION, DEFAULT_PAYLOAD_KEY, true);
        EmbeddedThumb previewThumbnail = new EmbeddedThumb(tinyThumb.getPixelHeight(), tinyThumb.getPixelWidth(), TINY_THUMB_INSTRUCTION.format, tinyThumb.getBase64());

        UploadFileMetadata<String> metadata = new UploadFileMetadata<>(false, ENCRYPT_MEDIA, OWNER_ONLY_ACL, new UploadAppFileMetaData<>(uniqueId, new String[0], 0, 0, timestampInMs, null, ArchivalStatus.None, "{\"originalFileName\":\"" + fileName + "\"}", previewThumbnail), null, null);

        PayloadBase payload;
        if (forceLowerQuality) {
            ThumbnailStream payloadStream = ImageResizer.resizeImage(filePath, new ImageResizer.ResizeInstruction(1200, 1200, 80, "jpeg"), DEFAULT_PAYLOAD_KEY, false);
            payload = new PayloadStream(DEFAULT_PAYLOAD_KEY, payloadStream.getOutputStream(), null, mimeType, fileName);
        } else {
            payload = new PayloadFile(DEFAULT_PAYLOAD_KEY, filePath, null, mimeType, fileName);
        }
        List<ThumbnailBase> thumbnails = new ArrayList<>(ImageResizer.resizeImage(filePath, List.of(DEFAULT_IMAGE_SIZES), DEFAULT_PAYLOAD_KEY));

        return uploadFile(dotYouClient, instructions, metadata, List.of(payload), thumbnails, ENCRYPT_MEDIA);
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
