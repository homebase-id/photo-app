import {
  ApiType,
  base64ToUint8Array,
  DotYouClient,
  uint8ArrayToBase64,
} from '@youfoundation/dotyoucore-js';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useVerifyToken from './useVerifyToken';
import {
  logout as logoutYouauth,
  authenticate as authenticateYouAuth,
  decryptWithKey,
} from '../../provider/AuthenticationProvider';

export const APP_SHARED_SECRET = 'ASS';

const hasSharedSecret = () => {
  const raw = window.localStorage.getItem(APP_SHARED_SECRET);
  return !!raw;
};

const splitDataString = (byteArray: Uint8Array) => {
  if (byteArray.length !== 49) {
    throw new Error("shared secret encrypted keyheader has an unexpected length, can't split");
  }

  const authToken = byteArray.slice(0, 33);
  const sharedSecret = byteArray.slice(33);

  return { authToken, sharedSecret };
};

const useAuth = () => {
  const [authenticationState, setAuthenticationState] = useState<
    'unknown' | 'anonymous' | 'authenticated'
  >(hasSharedSecret() ? 'unknown' : 'anonymous');
  const { data: hasValidToken, isFetchedAfterMount } = useVerifyToken();
  const navigate = useNavigate();

  const authenticate = (identity: string, returnUrl: string): void => {
    const strippedIdentity = identity.replace(new RegExp('^(http|https)://'), '').split('/')[0];

    authenticateYouAuth(strippedIdentity, returnUrl);
  };

  const finalizeAuthentication = async (
    registrationData: string | null,
    v: string | null,
    returnUrl: string | null
  ) => {
    if (!registrationData || !v || !returnUrl) {
      return;
    }

    if (v !== '1') {
      throw new Error('Failed to decrypt data, version unsupported');
    }

    const decryptedData = await decryptWithKey(registrationData);
    if (!decryptedData) {
      throw new Error('Failed to decrypt data');
    }
    const { authToken, sharedSecret } = splitDataString(decryptedData);

    // Store sharedSecret in local storage
    window.localStorage.setItem(APP_SHARED_SECRET, uint8ArrayToBase64(sharedSecret));

    // Store auth Token in cookie
    document.cookie = `BX0900=${uint8ArrayToBase64(authToken)}; path=/;`;

    // window.location.href = returnUrl;
  };

  const logout = async (): Promise<void> => {
    await logoutYouauth();

    window.localStorage.removeItem(APP_SHARED_SECRET);

    setAuthenticationState('anonymous');

    navigate('/home');
  };

  const getSharedSecret = () => {
    const raw = window.localStorage.getItem(APP_SHARED_SECRET);
    if (raw) {
      return base64ToUint8Array(raw);
    }
  };

  const getApiType = () => {
    return ApiType.App;
  };

  const getDotYouClient = () => {
    return new DotYouClient({
      sharedSecret: getSharedSecret(),
      api: getApiType(),
      root: 'samwise.digital',
    });
  };

  useEffect(() => {
    if (isFetchedAfterMount && hasValidToken !== undefined) {
      setAuthenticationState(hasValidToken ? 'authenticated' : 'anonymous');

      if (!hasValidToken) {
        setAuthenticationState('anonymous');

        console.log('about to logout');
        // if (window.localStorage.getItem(APP_SHARED_SECRET)) {
        //   // Auth state was presumed logged in, but not allowed.. Will attempt reload page? (Browsers may ignore, as it's not a reload on user request)
        //   window.localStorage.removeItem(APP_SHARED_SECRET);

        //   window.location.reload();
        // }
      }
    }
  }, [hasValidToken]);

  return {
    authenticate,
    finalizeAuthentication,
    logout,
    getDotYouClient,
    isAuthenticated: authenticationState !== 'anonymous',
  };
};

export default useAuth;
