package id.homebase.photos;

import static id.homebase.lib.core.file.DriveFileUploadProvider.uploadFile;

import java.util.ArrayList;
import java.util.List;

import id.homebase.lib.core.DotYouClient;
import id.homebase.lib.core.file.AccessControlList;
import id.homebase.lib.core.file.ArchivalStatus;
import id.homebase.lib.core.file.PayloadFile;
import id.homebase.lib.core.file.SecurityGroupType;
import id.homebase.lib.core.file.StorageOptions;
import id.homebase.lib.core.file.TargetDrive;
import id.homebase.lib.core.file.ThumbnailFile;
import id.homebase.lib.core.file.TransitOptions;
import id.homebase.lib.core.file.UploadAppFileMetaData;
import id.homebase.lib.core.file.UploadFileMetadata;
import id.homebase.lib.core.file.UploadInstructionSet;

public class MediaProvider {
    private static final String  DEFAULT_PAYLOAD_KEY = "dflt_key";
    private static final boolean ENCRYPT_MEDIA = true;

    public static id.homebase.lib.core.file.UploadResult uploadMedia (DotYouClient dotYouClient, String filePath , String timestamp) throws Exception {
        TargetDrive targetDrive = new TargetDrive("6483b7b1f71bd43eb6896c86148668cc", "2af68fe72fb84896f39f97c59d60813a");
        UploadInstructionSet instructions = new UploadInstructionSet(new StorageOptions(targetDrive),
                new TransitOptions());

        String uniqueId = "uniqueId";
        // parse timestamp to double
        Long userDate = Long.parseLong(timestamp);

        String[] tags = new String[0];

        UploadFileMetadata<String> metadata = new UploadFileMetadata<String>(false, true, new AccessControlList(SecurityGroupType.OWNER), new UploadAppFileMetaData<String>(uniqueId, tags, 0, 0, userDate, null, ArchivalStatus.None, "", null), null, null);
        List<PayloadFile> payloads = List.of(new PayloadFile(DEFAULT_PAYLOAD_KEY, filePath,null,  "image/jpeg", ""));
        List<ThumbnailFile> thumbnails = new ArrayList<>();

        return uploadFile(dotYouClient, instructions, metadata, payloads, thumbnails, ENCRYPT_MEDIA);
    }
}
