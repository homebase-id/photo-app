import {
  ApiType,
  base64ToUint8Array,
  DotYouClient,
  uint8ArrayToBase64,
} from '@youfoundation/dotyoucore-js';
import { getBrowser, getOperatingSystem } from '../helpers/browserInfo';
import { retrieveIdentity, saveIdentity } from './IdentityProvider';
import { decryptWithKey, newPair, throwAwayTheKey } from './KeyProvider';

export const APP_SHARED_SECRET = 'APSS';
export const APP_AUTH_TOKEN = 'BX0900';

const getSharedSecret = () => {
  const raw = window.localStorage.getItem(APP_SHARED_SECRET);
  if (raw) {
    return base64ToUint8Array(raw);
  }
};

//checks if the authentication token (stored in a cookie) is valid
export const hasValidToken = async (): Promise<boolean> => {
  const dotYouClient = new DotYouClient({
    api: ApiType.App,
    root: retrieveIdentity(),
    sharedSecret: getSharedSecret(),
  });
  const client = dotYouClient.createAxiosClient();

  const response = await client
    .get('/auth/verifytoken', {
      validateStatus: () => true,
      headers: {
        BX0900: localStorage.getItem(APP_AUTH_TOKEN),
      },
    })
    .catch((error) => {
      console.error({ error });
      return { status: 400, data: false };
    });
  return response.status === 200 && response.data === true;
};

const drivesParam = encodeURIComponent(
  JSON.stringify([
    {
      a: '6483b7b1f71bd43eb6896c86148668cc',
      t: '2af68fe72fb84896f39f97c59d60813a',
      n: 'Photo Library',
      d: 'Place for your memories',
      p: 3,
    },
  ])
);

//https://frodo.digital/owner/appreg?n=Chatr&appId=0babb1e6-7604-4bcd-b1fb-87e959226492&fn=My%20Phone&p=10,30&d=%5B%7B%22a%22%3A%229ff813aff2d61e2f9b9db189e72d1a11%22%2C%22t%22%3A%2266ea8355ae4155c39b5a719166b510e3%22%2C%22n%22%3A%22Chat%20Drive%22%2C%22d%22%3A%22Chat%20Drive%22%2C%22p%22%3A3%7D%2C%7B%22a%22%3A%222612429d1c3f037282b8d42fb2cc0499%22%2C%22t%22%3A%2270e92f0f94d05f5c7dcd36466094f3a5%22%2C%22n%22%3A%22Contacts%22%2C%22d%22%3A%22Contacts%22%2C%22p%22%3A3%7D%5D&cd=%5B%7B%22a%22%3A%229ff813aff2d61e2f9b9db189e72d1a11%22%2C%22t%22%3A%2266ea8355ae4155c39b5a719166b510e3%22%2C%22n%22%3A%22Chat%20Drive%22%2C%22d%22%3A%22Chat%20Drive%22%2C%22p%22%3A2%7D%5D&ui=minimal&return=odin-chat://&pk=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtP9KKODoOZpNGXQy4IdyyBJJO3HJPkbg%2FLXwR5SQGxWWuLpv2THnZoSHqaDl6YWQ3OWCndY22Q0RJZkDBuqqJyn%2B8ErpMdgtJuMhFOpEU2h9nLGeI7BIWENkuqlqBh56YC8qdfYhfpdcv53p106o%2Bi93%2Bzeb0GvfLN6fk1y8o4Rd56DBHXn9zjjDaLWa8m8EDXgZKs7waziPFArIphh0W06Wnb4wCa%2F%2B1HEULhH%2BsIY7bGpoQvgP7xucHZGrqkRmg5X2XhleBIXWYCD7QUM6PvKHdqUSrFkl9Z2UU1SkVAhUUH4UxfwyLQKHXxC7IhKu2VSOXK4%2FkjGua6iW%2BXUQtwIDAQAB
export const authenticate = async (identity: string, returnUrl: string): Promise<void> => {
  saveIdentity(identity);
  const pk = await newPair();

  const currentUrl = `${window.location.origin}/auth/finalize?`;
  const appName = 'Odin - Photos';
  const appId = '32f0bdbf-017f-4fc0-8004-2d4631182d1e';
  const clientFriendly = `${getBrowser()} | ${getOperatingSystem()}`;
  const redirectUrl = `https://${identity}/owner/appreg?n=${appName}&appId=${appId}&fn=${clientFriendly}&return=${currentUrl}&d=${drivesParam}&pk=${encodeURIComponent(
    pk
  )}`;
  window.location.href = redirectUrl;
};

const splitDataString = (byteArray: Uint8Array) => {
  if (byteArray.length !== 49) {
    throw new Error("shared secret encrypted keyheader has an unexpected length, can't split");
  }

  const authToken = byteArray.slice(0, 33);
  const sharedSecret = byteArray.slice(33);

  return { authToken, sharedSecret };
};

export const finalizeAuthentication = async (
  registrationData: string,
  v: string
): Promise<void> => {
  if (v !== '1') {
    throw new Error('Failed to decrypt data, version unsupported');
  }

  const decryptedData = await decryptWithKey(registrationData);
  if (!decryptedData) {
    throw new Error('Failed to decrypt data');
  }
  const { authToken, sharedSecret } = splitDataString(decryptedData);

  // Store authToken and sharedSecret
  window.localStorage.setItem(APP_SHARED_SECRET, uint8ArrayToBase64(sharedSecret));
  window.localStorage.setItem(APP_AUTH_TOKEN, uint8ArrayToBase64(authToken));

  // Remove key
  throwAwayTheKey();
};

export const logout = () => {
  window.localStorage.removeItem(APP_SHARED_SECRET);
  window.localStorage.removeItem(APP_AUTH_TOKEN);
};
