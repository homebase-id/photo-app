import { ApiType, DotYouClient } from '@youfoundation/dotyoucore-js';
import { APP_AUTH_TOKEN } from '../hooks/auth/useAuth';
import { retrieveIdentity, saveIdentity } from './IdentityProvider';
import { newPair } from './KeyProvider';

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
