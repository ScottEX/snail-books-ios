import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { modalClose } from '../sharedStyles';
import { FONTS } from '../theme';

interface CloseButtonProps {
  onPress: () => void;
  /** "plain" (default): simple ✕ on dark headers. "circle": 28×28 circle with semi-transparent white bg, for fullscreen dark overlays. */
  variant?: 'plain' | 'circle';
}

const circleS = StyleSheet.create({
  btn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  text: { color: 'rgba(255,255,255,0.7)', fontSize: FONTS.body.size, lineHeight: 20 },
});

export default function CloseButton({ onPress, variant = 'plain' }: CloseButtonProps) {
  if (variant === 'circle') {
    return (
      <TouchableOpacity onPress={onPress} style={circleS.btn}>
        <Text style={circleS.text}>✕</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity onPress={onPress}>
      <Text style={modalClose}>✕</Text>
    </TouchableOpacity>
  );
}
