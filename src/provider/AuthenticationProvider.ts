import {
  ApiType,
  base64ToUint8Array,
  DotYouClient,
  uint8ArrayToBase64,
} from '@youfoundation/dotyoucore-js';
import { APP_AUTH_TOKEN } from '../hooks/auth/useAuth';

//checks if the authentication token (stored in a cookie) is valid
export const hasValidToken = async (): Promise<boolean> => {
  const dotYouClient = new DotYouClient({ api: ApiType.App, root: retrieveIdentity() });
  const client = dotYouClient.createAxiosClient();

  const response = await client.get('/auth/verifytoken', {
    validateStatus: () => true,
    headers: {
      BX0900: localStorage.getItem(APP_AUTH_TOKEN),
    },
    withCredentials: false,
  });
  return response.status === 200 && response.data === true;
};

const createPair = async () => {
  const pair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  return pair;
};

const STORAGE_IDENTITY = 'identity';
const saveIdentity = (identity: string) => {
  localStorage.setItem(STORAGE_IDENTITY, identity);
};
export const retrieveIdentity = () => {
  return localStorage.getItem(STORAGE_IDENTITY) || '';
};

const STORAGE_KEY = 'pk';
const saveKey = async (keyPair: CryptoKeyPair) => {
  await window.crypto.subtle
    .exportKey('pkcs8', keyPair.privateKey)
    .then((e) => localStorage.setItem(STORAGE_KEY, uint8ArrayToBase64(new Uint8Array(e))));
};
const retrieveKey = async () => {
  const key = base64ToUint8Array(localStorage.getItem(STORAGE_KEY) || '');
  return await window.crypto.subtle
    .importKey(
      'pkcs8', //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
      key,
      {
        name: 'RSA-OAEP',
        hash: { name: 'SHA-256' }, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
      },
      true,
      ['decrypt']
    )
    .then(function (privateKey) {
      //returns a publicKey (or privateKey if you are importing a private key)

      return privateKey;
    })
    .catch(function (err) {
      console.error(err);
    });
};

const newPair = async () => {
  const pair = await createPair();
  saveKey(pair);

  const rawPk = await crypto.subtle.exportKey('spki', pair.publicKey);
  const pk = uint8ArrayToBase64(new Uint8Array(rawPk));

  return pk;
};

export const decryptWithKey = async (encrypted: string) => {
  const key = await retrieveKey();

  if (!key) {
    console.error('no key found');
    return '';
  }

  return await crypto.subtle
    .decrypt({ name: 'RSA-OAEP' }, key, base64ToUint8Array(encrypted))
    .then((decrypted) => {
      return new Uint8Array(decrypted);
      // console.log('decrypted', new Uint8Array(decrypted));
    })
    .catch((err) => {
      console.error(err);
    });
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
  const redirectUrl = `https://${identity}/owner/appreg?n=Photos&appId=32f0bdbf-017f-4fc0-8004-2d4631182d1e&fn=Browser&ui=minimal&return=${currentUrl}&d=${drivesParam}&pk=${encodeURIComponent(
    pk
  )}`;
  window.location.href = redirectUrl;
};

export const logout = async (): Promise<void> => {
  const dotYouClient = new DotYouClient({ api: ApiType.YouAuth });
  const client = dotYouClient.createAxiosClient();
  await client.get('/auth/delete-token');
};
