import { useState, useEffect } from 'react';
import useAuth from '../../../hooks/auth/useAuth';
import { IS_DARK_CLASSNAME } from '../../../hooks/useDarkMode';

export const LoginBox = () => {
  const [params, setParams] = useState<string | null>(null);
  const { getRegistrationParams } = useAuth();

  useEffect(() => {
    (async () => {
      setParams(await getRegistrationParams('/'));
    })();
  }, []);

  return (
    <iframe
      src={`${
        import.meta.env.VITE_CENTRAL_LOGIN_URL
      }?isDarkMode=${document.documentElement.classList.contains(IS_DARK_CLASSNAME)}&${params}`}
      className="h-[16rem] w-full"
    ></iframe>
  );
};
