import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from '../components/ui/SafeAreaView/SafeAreaView';

const LoadingPage = () => {
  return (
    <SafeAreaView style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
      <ActivityIndicator size="large" />
    </SafeAreaView>
  );
};

export default LoadingPage;
