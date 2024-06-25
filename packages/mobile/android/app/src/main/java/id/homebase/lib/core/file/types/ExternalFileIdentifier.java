package id.homebase.lib.core.file.types;

import org.json.JSONObject;

public class ExternalFileIdentifier {


    private final TargetDrive targetDrive;
    private final String fileId;

    public ExternalFileIdentifier(JSONObject fileIdentifier) {
        this.fileId = fileIdentifier.optString("fileId");

        JSONObject targetDrive = fileIdentifier.optJSONObject("targetDrive");
        assert targetDrive != null;
        this.targetDrive = new TargetDrive(targetDrive.optString("alias"), targetDrive.optString("type"));
    }
}
