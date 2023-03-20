import { useQuery } from '@tanstack/react-query';
import { hasValidToken as hasValidYouAuthToken } from '../../provider/AuthenticationProvider';
import { APP_SHARED_SECRET } from './useAuth';

const MINUTE_IN_MS = 60000;

const hasSharedSecret = () => {
  const raw = window.localStorage.getItem(APP_SHARED_SECRET);
  return !!raw;
};

const useVerifyToken = () => {
  const fetchData = async () => {
    if (!hasSharedSecret()) {
      return false;
    }

    return await hasValidYouAuthToken();
  };
  return useQuery(['verifyToken'], fetchData, {
    refetchOnMount: false,
    staleTime: MINUTE_IN_MS * 10,
  });
};

export default useVerifyToken;
