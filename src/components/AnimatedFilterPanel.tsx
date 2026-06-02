import React from 'react';
import { View, TouchableOpacity } from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Filter panel — simple conditional render, no animation.
 * RN Web cross-component Animated compatibility issues prevent
 * animation at this time. Revisit when upgrading Expo/RN Web.
 */
export const AnimatedFilterPanel: React.FC<Props> = ({ visible, onClose, children }) => {
  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <View
        style={{
          position: 'fixed' as any,
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          zIndex: 99998,
        }}
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </View>

      {/* Panel */}
      <View
        style={{
          position: 'fixed' as any,
          top: 72, left: 12, right: 12,
          zIndex: 99999,
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          overflow: 'hidden' as any,
        }}
      >
        {children}
      </View>
    </>
  );
};
