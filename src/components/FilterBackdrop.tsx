import React from 'react';
import { TouchableOpacity } from 'react-native';

interface FilterBackdropProps {
  onPress: () => void;
}

export const FilterBackdrop: React.FC<FilterBackdropProps> = ({ onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={1}
    style={{
      position: 'fixed' as any,
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.3)',
      zIndex: 88,
    }}
  />
);
