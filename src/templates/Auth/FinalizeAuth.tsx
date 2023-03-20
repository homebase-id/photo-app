import { useSearchParams } from 'react-router-dom';
import useAuth from '../../hooks/auth/useAuth';

const AuthFinalize = () => {
  const [searchParams] = useSearchParams();
  const { finalizeAuthentication } = useAuth();

  const data = decodeURIComponent(searchParams.get('d') || '');
  const v = decodeURIComponent(searchParams.get('v') || '');
  const returnUrl = decodeURIComponent(searchParams.get('returnUrl') || '');

  finalizeAuthentication(data, v, returnUrl || '/');

  return <>123</>;
};

export default AuthFinalize;
