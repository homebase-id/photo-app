import { createPortal } from 'react-dom';
import { AppPermissionType } from '@homebase-id/js-lib/network';
import { TargetDriveAccessRequest } from '@homebase-id/js-lib/auth';
import usePortal from '../../hooks/portal/usePortal';
import DialogWrapper from '../ui/Dialog/DialogWrapper';
import { t } from 'photo-app-common';
import ActionLink from '../ui/Buttons/ActionLink';
import Shield from '../ui/Icons/Shield/Shield';
import { useMissingPermissions } from '../../hooks/auth/useMissingPermissions';

export const ExtendPermissionDialog = ({
  appId,
  appName,
  drives,
  circleDrives,
  permissions,
  needsAllConnected,
}: {
  appId: string;
  appName: string;
  drives: TargetDriveAccessRequest[];
  circleDrives?: TargetDriveAccessRequest[];
  permissions: AppPermissionType[];
  needsAllConnected?: boolean;
}) => {
  const target = usePortal('modal-container');
  const extendPermissionUrl = useMissingPermissions({
    appId,
    drives,
    circleDrives,
    permissions,
    needsAllConnected,
  });

  if (!extendPermissionUrl) return null;

  const dialog = (
    <DialogWrapper title={t('Missing permissions')} isSidePanel={false}>
      <p>
        {t(
          `The ${appName} app is missing permissions. Without the necessary permissions the functionality of the ${appName} will be limited.`
        )}
      </p>
      <p className="mt-3 text-slate-400">
        {t(
          'This can happen when the app added new features that require additional permissions or when you revoked permission manually.'
        )}
      </p>
      <div className="flex flex-row-reverse mt-5">
        <ActionLink href={extendPermissionUrl} icon={Shield}>
          {t('Extend permissions')}
        </ActionLink>
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
