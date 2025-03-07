import { Colors } from '../../../app/Colors';
import { SafeAreaView, ViewProps, ViewStyle } from 'react-native';
import OfflineMessage from '../../Offline/OfflineMessage';
import { useDarkMode } from '../../../hooks/useDarkMode';

interface SaferAreaViewProps extends Omit<ViewProps, 'style'> {
  style?: ViewStyle;
}

const OurSafeAreaView = (props: SaferAreaViewProps) => {
  const { style, children, ...rest } = props;
  const { isDarkMode } = useDarkMode();

  return (
    <SafeAreaView
      style={{
        backgroundColor: isDarkMode ? Colors.gray[900] : Colors.slate[50],
        minHeight: '100%',
        ...style,
      }}
      {...rest}>
      {children}
      <OfflineMessage />
    </SafeAreaView>
  );
};

export { OurSafeAreaView as SafeAreaView };
