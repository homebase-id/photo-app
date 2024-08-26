import { useYouAuthAuthorization } from '../../../hooks/auth/useAuth';
import { IS_DARK_CLASSNAME } from '../../../hooks/useDarkMode';
import LoadingBlock from '../../ui/Layout/Loaders/LoadingBlock/LoadingBlock';
import { stringifyToQueryParams } from '@homebase-id/js-lib/helpers';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';

const useParams = (returnUrl: string) => {
  const { getAuthorizationParameters } = useYouAuthAuthorization();
  return useQuery({
    queryKey: ['params'],
    queryFn: () => getAuthorizationParameters(returnUrl),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const LoginBox = () => {
  const { data: authParams, isLoading } = useParams('/');

  if (isLoading) return <LoadingBlock className="h-[16rem] w-full " />;

  return (
    <>
      {authParams ? (
        <Helmet>
          <meta name="youauth" content={stringifyToQueryParams(authParams as any)} />
        </Helmet>
      ) : null}
      <iframe
        src={`${
          import.meta.env.VITE_CENTRAL_LOGIN_HOST
        }/anonymous?isDarkMode=${document.documentElement.classList.contains(
          IS_DARK_CLASSNAME
        )}${authParams ? `&${stringifyToQueryParams(authParams as any)}` : ''}`}
        className="h-[16rem] w-full"
      ></iframe>
    </>
  );
};
