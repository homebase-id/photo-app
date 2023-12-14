import React from 'react';

import { useDarkMode } from '../../../hooks/useDarkMode';
import { Colors } from '../../../app/Colors';
import { Text, TextProps } from 'react-native';

const OurText = (props: TextProps) => {
  const { isDarkMode } = useDarkMode();
  const { style, ...rest } = props;

  return (
    <Text
      style={{ color: isDarkMode ? Colors.white : Colors.black, ...((style as any) || {}) }}
      {...rest}
    />
  );
};

export { OurText as Text };
