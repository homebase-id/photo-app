import { ApiType, DotYouClient } from '@homebase-id/js-lib/core';
import { useContext, createContext } from 'react';

export const DotYouClientContext = createContext<DotYouClient | null>(null);

export const useDotYouClientContext = () => {
  const dotYouClient = useContext(DotYouClientContext);
  return (
    dotYouClient ||
    new DotYouClient({
      api: ApiType.Guest,
      hostIdentity: '',
    })
  );
};
