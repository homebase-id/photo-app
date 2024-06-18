package id.homebase.lib.core.file.types;

import static id.homebase.lib.core.crypto.CryptoUtil.base64ToByteArray;

import org.json.JSONObject;

import java.util.Map;

public class SuccessfullUploadResult extends UploadResult {
    private KeyHeader keyHeader;
    private ExternalFileIdentifier file;
    private GlobalTransitIdFileIdentifier globalTransitIdFileIdentifier;
    private Map<String, TransferUploadStatus> recipientStatus;
    private String newVersionTag;

    public SuccessfullUploadResult(JSONObject uploadResult) {
        super(200);

        JSONObject keyHeader = uploadResult.optJSONObject("keyHeader");
        if (keyHeader != null) {
            this.keyHeader = new KeyHeader(base64ToByteArray(keyHeader.optString("iv")), base64ToByteArray(keyHeader.optString("aesKey")));
        }

        JSONObject file = uploadResult.optJSONObject("file");
        assert file != null;
        this.file = new ExternalFileIdentifier(file);

        JSONObject globalTransitIdFileIdentifier = uploadResult.optJSONObject("globalTransitIdFileIdentifier");
        assert globalTransitIdFileIdentifier != null;
        this.globalTransitIdFileIdentifier = new GlobalTransitIdFileIdentifier(globalTransitIdFileIdentifier);

        this.newVersionTag = uploadResult.optString("newVersionTag");
    }
}

