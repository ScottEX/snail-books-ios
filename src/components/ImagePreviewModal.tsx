import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Image, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Props {
  images: string[];
  initialIdx?: number;
  visible: boolean;
  onClose: () => void;
}

export default function ImagePreviewModal({ images, initialIdx = 0, visible, onClose }: Props) {
  const { width: WINDOW_W } = useWindowDimensions();
  const [idx, setIdx] = useState(initialIdx);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' }}>
        <TouchableOpacity
          onPress={onClose}
          style={{ position: 'absolute', top: 52, right: 20, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
          activeOpacity={0.7}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round">
            <Path d="M18 6L6 18M6 6l12 12" />
          </Svg>
        </TouchableOpacity>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onScroll={(e) => {
            const page = Math.round(e.nativeEvent.contentOffset.x / WINDOW_W);
            if (page >= 0 && page < images.length) setIdx(page);
          }}
          scrollEventThrottle={16}
        >
          {images.map((url, i) => (
            <View key={i} style={{ width: WINDOW_W, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}>
              <Image source={{ uri: url }} style={{ width: '100%', height: '75%' }} resizeMode="contain" />
            </View>
          ))}
        </ScrollView>
        {images.length > 1 && (
          <Text style={{ position: 'absolute', bottom: 60, alignSelf: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
            {idx + 1} / {images.length}
          </Text>
        )}
      </View>
    </Modal>
  );
}
