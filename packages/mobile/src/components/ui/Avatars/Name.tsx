import { memo } from 'react';
import { useDotYouClientContext } from 'photo-app-common';
import { useExternalOdinId } from '../../../hooks/profile/useExternalOdinId';
import { useProfile } from '../../../hooks/profile/useProfile';

export const ConnectionName = memo(({ odinId }: { odinId: string | undefined }) => {
  const { data: connectionDetails } = useExternalOdinId({
    odinId: odinId,
  }).fetch;

  if (!odinId) return null;

  const fullName = connectionDetails?.name;

  return <>{fullName ?? odinId}</>;
});

export const AuthorName = memo(({ odinId, showYou }: { odinId?: string; showYou?: boolean }) => {
  const identity = useDotYouClientContext().getHostIdentity();

  if (!odinId || odinId === identity) return <OwnerName showYou={showYou} />;
  return <ConnectionName odinId={odinId} />;
});

export const OwnerName = memo(({ showYou }: { showYou?: boolean }) => {
  const { firstName, surName } = useProfile().data ?? {};
  if (showYou) return <>{'You'}</>;
  return (
    <>
      {firstName} {surName}
    </>
  );
});
