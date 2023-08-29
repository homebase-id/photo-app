import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate, useSearchParams } from 'react-router-dom';
import Layout from '../../components/ui/Layout/Layout';
import { useYouAuthAuthorization } from '../../hooks/auth/useAuth';
import PhotoLibraryLoader from '../../components/Photos/PhotoLibraryLoader/PhotoLibraryLoader';

const AuthFinalize = () => {
  const isRunning = useRef(false);

  const [searchParams] = useSearchParams();
  const { finalizeAuthorization } = useYouAuthAuthorization();
  const [finalizeState, setFinalizeState] = useState<undefined | 'success' | 'error'>();

  const code = searchParams.get('code');
  const identity = searchParams.get('identity');
  const public_key = searchParams.get('public_key');
  const salt = searchParams.get('salt');
  const returnUrl = searchParams.get('state');

  useEffect(() => {
    (async () => {
      if (!code || !identity || !public_key || !salt) return;
      if (isRunning.current) return;

      isRunning.current = true;
      const authState = await finalizeAuthorization(identity, code, public_key, salt);
      setFinalizeState(authState ? 'success' : 'error');
    })();
  }, []);

  if (!code || !identity || !public_key || !salt) return <Navigate to={'/auth'} />;
  if (finalizeState === 'success') return <Navigate to={returnUrl || '/'} />;
  if (finalizeState === 'error') return <Navigate to={'/auth?state=finalize-error'} />;

  return (
    <>
      <Helmet>
        <title>Login | Odin</title>
      </Helmet>
      <div className="cursor-wait ">
        <div className="pointer-events-none ">
          <Layout noShadedBg={true} noPadding={true}>
            <PhotoLibraryLoader className="h-screen overflow-hidden px-2 py-2 pt-4 sm:px-10 sm:pt-8" />
          </Layout>
        </div>
      </div>
    </>
  );
};

export default AuthFinalize;
