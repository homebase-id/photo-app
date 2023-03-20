import { useState, FormEventHandler, MouseEventHandler } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate } from 'react-router-dom';
import Input from '../../components/Form/Input';
import Label from '../../components/Form/Label';
import ActionButton from '../../components/ui/Buttons/ActionButton';
import { t } from '../../helpers/i18n/dictionary';
import useAuth from '../../hooks/auth/useAuth';
import { authenticate } from '../../provider/AuthenticationProvider';
import { MinimalLayout } from '../../components/ui/Layout/Layout';

const Auth = () => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    <Navigate to="/" />;
  }

  const [identity, setIdentity] = useState('');

  const doAuth: FormEventHandler = (e) => {
    e.preventDefault();
    authenticate(identity, window.location.href);
  };

  return (
    <>
      <Helmet>
        <title>Login | Odin</title>
      </Helmet>
      <MinimalLayout noShadedBg={true} noPadding={true}>
        <section className="body-font flex h-full pt-24">
          <div className="container m-auto h-full max-w-[35rem] p-5">
            <div className="max-w-lg">
              <form onSubmit={doAuth}>
                <h1 className="mb-5 text-4xl dark:text-white">YouAuth | Login</h1>

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
                <ActionButton className="mt-10 w-full" type="primary" icon="send" size="large">
                  {t('login')}
                </ActionButton>
              </form>
            </div>
          </div>
        </section>
      </MinimalLayout>
    </>
  );
};

export default Auth;
