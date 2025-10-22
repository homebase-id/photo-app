import { useQuery } from '@tanstack/react-query';
import { ApiType, getSecurityContext, getSecurityContextOverPeer } from '@homebase-id/js-lib/core';
import { useDotYouClientContext } from 'photo-app-common';


export const useSecurityContext = (odinId?: string, isEnabled?: boolean) => {
    const dotYouClient = useDotYouClientContext();

    const fetch = async (odinId?: string) => {
        if (
            !odinId ||
            odinId === window.location.hostname ||
            (dotYouClient.getType() === ApiType.App && odinId === dotYouClient.getHostIdentity())
        )
            return await getSecurityContext(dotYouClient);
        else return await getSecurityContextOverPeer(dotYouClient, odinId);
    };

    return {
        fetch: useQuery({
            queryKey: ['security-context', odinId],
            queryFn: () => fetch(odinId),
            staleTime: 1000 * 60 * 60, // 1 hour
            enabled: isEnabled === undefined ? true : isEnabled,
        }),
    };
};
