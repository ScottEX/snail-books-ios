import React, { useMemo } from 'react';
import { View, ImageBackground, StyleSheet } from 'react-native';
import { getCurrentUserId } from '../utils/storage';

const BG_IMAGE = require('../../assets/img/bg.jpg');

/**
 * Static snapshot of HomeScreen's background (default bg + user's cached
 * custom bg + dark overlay), mirroring HomeScreen's bg layers.
 *
 * Several stack screens were designed transparent over HomeScreen (the old
 * SlideScreen overlay kept HomeScreen mounted underneath). With
 * native-stack, UINavigationController detaches the previous screen after
 * the push completes — so these screens render this snapshot behind their
 * content to keep the same look.
 */
export default function HomeBackground() {
  const { customUri, opacity } = useMemo(() => {
    let uri: string | null = null;
    let opacity = 1;
    try {
      uri = localStorage.getItem('bg-local-path');
      const uid = getCurrentUserId();
      const key = uid ? `bg-opacity-${uid}` : 'bg-opacity';
      const s = localStorage.getItem(key);
      if (s !== null) {
        const v = parseFloat(s);
        if (!isNaN(v)) opacity = v;
      }
    } catch {}
    return { customUri: uri, opacity };
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ImageBackground
        source={BG_IMAGE}
        style={[StyleSheet.absoluteFillObject, { opacity }]}
        resizeMode="cover"
      />
      {customUri ? (
        <ImageBackground
          source={{ uri: customUri }}
          style={[StyleSheet.absoluteFillObject, { opacity }]}
          resizeMode="cover"
        />
      ) : null}

    </View>
  );
}
