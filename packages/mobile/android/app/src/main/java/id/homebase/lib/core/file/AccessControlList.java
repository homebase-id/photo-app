package id.homebase.lib.core.file;

import java.util.List;

public record AccessControlList(SecurityGroupType requiredSecurityGroup, List<String> circleIdList,
                                List<String> odinIdList) {
}
