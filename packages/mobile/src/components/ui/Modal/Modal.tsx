import {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { ReactNode, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { Text, View } from 'react-native';
import { useDarkMode } from '../../../hooks/useDarkMode';
import { Colors } from '../../../app/Colors';

export const Modal = ({
  onClose,
  children,
  title,
}: {
  onClose: () => void;
  children: ReactNode;
  title?: string;
}) => {
  const { isDarkMode } = useDarkMode();
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  // // callbacks
  // const handleSheetChanges = useCallback((index: number) => {
  //   console.log('handleSheetChanges', index);
  // }, []);

  //#region effects
  useLayoutEffect(() => {
    requestAnimationFrame(() => bottomSheetRef.current?.present());
  }, []);
  //#endregion

  return (
    <BottomSheetModalProvider>
      <View
        style={{
          flex: 1,
          padding: 24,
        }}
      >
        <BottomSheetModal
          ref={bottomSheetRef}
          // enableDynamicSizing={true}
          snapPoints={useMemo(() => ['75', '100'], [])}
          onDismiss={onClose}
          backgroundStyle={{ backgroundColor: isDarkMode ? Colors.gray[900] : Colors.slate[50] }}
        >
          <BottomSheetScrollView style={{ flex: 1 }}>
            <View
              style={{
                paddingHorizontal: 10,
                flex: 1,
                flexDirection: 'column',
              }}
            >
              {title ? (
                <Text
                  style={{
                    fontSize: 18,
                    marginBottom: 12,
                    fontWeight: '600',
                    color: isDarkMode ? Colors.white : Colors.black,
                  }}
                >
                  {title}
                </Text>
              ) : null}
              {children ? children : null}
            </View>
          </BottomSheetScrollView>
        </BottomSheetModal>
      </View>
    </BottomSheetModalProvider>
  );
};
