// components/AppTextInput.tsx
import React from 'react';
import { TextInput, TextInputProps } from 'react-native';

/**
 * Global TextInput wrapper.
 *
 * keyboardAppearance is hard-coded to 'light'. Dynamic colour-scheme
 * detection is unreliable on iOS decimal-pad keyboards — see git history
 * for the full investigation. Change this one line to switch globally.
 */
const AppTextInput = React.forwardRef<TextInput, TextInputProps>(
  (props, ref) => (
    <TextInput
      ref={ref}
      keyboardAppearance="light"
      {...props}
    />
  ),
);

AppTextInput.displayName = 'AppTextInput';
export default AppTextInput;
