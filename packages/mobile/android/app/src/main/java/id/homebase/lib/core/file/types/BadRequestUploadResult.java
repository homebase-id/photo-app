package id.homebase.lib.core.file.types;

import org.json.JSONObject;

public class BadRequestUploadResult extends UploadResult {
    private String title;
    private String correlationId;
    private String errorCode;

    public BadRequestUploadResult(JSONObject uploadResultObject) {
        super(400);
        this.title = uploadResultObject.optString("title");
        this.correlationId = uploadResultObject.optString("correlationId");
        this.errorCode = uploadResultObject.optString("errorCode");
    }

    public String getErrorCode() {
        return errorCode;
    }
}
