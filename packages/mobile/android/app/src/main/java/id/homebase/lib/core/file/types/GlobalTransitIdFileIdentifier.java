package id.homebase.lib.core.file.types;

import org.json.JSONObject;

public class GlobalTransitIdFileIdentifier {
    private final TargetDrive targetDrive;
    private final String globalTransitId;

    public GlobalTransitIdFileIdentifier(JSONObject globalTransitIdFileIdentifier) {
        this.globalTransitId = globalTransitIdFileIdentifier.optString("globalTransitId");

        JSONObject targetDrive = globalTransitIdFileIdentifier.optJSONObject("targetDrive");
        assert targetDrive != null;
        this.targetDrive = new TargetDrive(targetDrive.optString("alias"), targetDrive.optString("type"));
    }
    // Define the properties and methods for GlobalTransitIdFileIdentifier
}
