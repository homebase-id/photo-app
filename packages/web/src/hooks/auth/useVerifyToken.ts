import { useQuery } from '@tanstack/react-query';
import { hasValidToken } from '@homebase-id/js-lib/auth';
import { DotYouClient } from '@homebase-id/js-lib/core';
import { APP_SHARED_SECRET } from './useAuth';

const MINUTE_IN_MS = 60000;

const hasSharedSecret = () => {
  const raw = window.localStorage.getItem(APP_SHARED_SECRET);
  return !!raw;
};

const useVerifyToken = (dotYouClient: DotYouClient | null) => {
  const fetchData = async () => {
    if (!hasSharedSecret() || !dotYouClient) {
      return false;
    }

    return await hasValidToken(dotYouClient);
  };
  return useQuery({
    queryKey: ['verifyToken'],
    queryFn: fetchData,
    refetchOnMount: false,
    staleTime: MINUTE_IN_MS * 10,
  });
};

export default useVerifyToken;
