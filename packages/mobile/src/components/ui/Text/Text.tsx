import React from 'react';

import {
  ITextProps,
  InterfaceTextProps,
} from 'native-base/lib/typescript/components/primitives/Text/types';
import { useDarkMode } from '../../../hooks/useDarkMode';
import { Colors } from '../../../app/Colors';
import { Text, TextStyle } from 'react-native';

interface TextProps extends Omit<InterfaceTextProps<ITextProps>, 'style'> {
  style?: TextStyle;
}

const OurText = (props: TextProps) => {
  const { isDarkMode } = useDarkMode();
  const { style, ...rest } = props;

  return <Text style={{ color: isDarkMode ? Colors.white : Colors.black, ...style }} {...rest} />;
};

export { OurText as Text };
