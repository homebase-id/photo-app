import { useState, FormEventHandler } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate, useSearchParams } from 'react-router-dom';
import Input from '../../components/Form/Input';
import Label from '../../components/Form/Label';
import ActionButton from '../../components/ui/Buttons/ActionButton';
import { t } from '../../helpers/i18n/dictionary';
import useAuth from '../../hooks/auth/useAuth';
import { authenticate } from '../../provider/AuthenticationProvider';
import Layout from '../../components/ui/Layout/Layout';
import LoadingParagraph from '../../components/ui/Layout/Loaders/LoadingParagraph/LoadingParagraph';
import { WireframePhotos } from '../../components/Photos/PhotoLibrary/PhotoLibrary';
import DialogWrapper from '../../components/ui/Dialog/DialogWrapper';
import Alert from '../../components/ui/Alerts/Alert/Alert';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const isError = searchParams.get('state') === 'finalize-error';

  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    <Navigate to="/" />;
  }

  const [identity, setIdentity] = useState('');

  const doAuth: FormEventHandler = (e) => {
    e.preventDefault();
    authenticate(identity, '/');
  };

  return (
    <>
      <Helmet>
        <title>Login | Odin</title>
      </Helmet>
      <Layout noShadedBg={true} noPadding={true}>
        <WireframePhotos className="h-screen overflow-hidden px-2 py-2 pt-4 sm:px-10 sm:pt-8" />
        <DialogWrapper>
          <form onSubmit={doAuth}>
            <h1 className="mb-5 text-4xl dark:text-white">Odin Photos | Login</h1>
            {isError && (
              <Alert className="my-2" type="warning" isCompact={true}>
                {t('Authorization failed, please try again')}
              </Alert>
            )}
            <div className="mb-4">
              <Label htmlFor="youniverse-id" className="text-sm leading-7  dark:text-gray-400">
                Youniverse id
              </Label>

              <Input
                type="text"
                name="youniverse-id"
                id="youniverse-id"
                required
                defaultValue={''}
                onChange={(e) => setIdentity(e.target.value)}
              />
            </div>
            <div className="mt-7 flex flex-row-reverse">
              <ActionButton className="" type="primary" icon="send" size="large">
                {t('login')}
              </ActionButton>
            </div>
          </form>
        </DialogWrapper>
      </Layout>
    </>
  );
};

export default Auth;
