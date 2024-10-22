import Toast, { ToastConfig } from 'react-native-toast-message';
import { ErrorToast } from './ErrorToast';
import { SuccessToast } from './SuccessToast';
import { InfoToast } from './InfoToast';

const config: ToastConfig = {
  success: (props) => <SuccessToast {...props} />,
  info: (props) => <InfoToast {...props} />,
  error: (props) => <ErrorToast {...props} />,
};

const OurToast = () => {
  return <Toast config={config} />;
};

export { OurToast as Toast };
