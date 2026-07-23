import React from 'react';
import { Dimensions } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import CustomActionSheet, { ActionItem } from './CustomActionSheet';
import { t } from '../i18n';
import { pickImages, takePhoto, PickedImage } from '../utils/imagePicker';
import * as DocumentPicker from 'expo-document-picker';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Callback with the picked image (null if user cancelled) */
  onPicked: (image: PickedImage | null) => void;
  /** Include 'choose from files' option */
  showFileOption?: boolean;
  /** 'center' = below dynamic island centered; 'anchor' = at offsetX/offsetY (default) */
  position?: 'center' | 'anchor';
  /** Popup position — measureInWindow of trigger view (position='anchor' only) */
  offsetX?: number;
  offsetY?: number;
}

export default function ImagePickerSheet({ visible, onClose, onPicked, showFileOption = false, position = 'anchor', offsetX = 16, offsetY = 100 }: Props) {
  const screenW = Dimensions.get('window').width;
  const finalX = position === 'center' ? Math.max(8, (screenW - 180) / 2) : Math.min(offsetX, screenW - 196);
  const finalY = position === 'center' ? 60 : offsetY;
  const handleCamera = async () => {
    onClose();
    try {
      const photo = await takePhoto();
      onPicked(photo);
    } catch {
      onPicked(null);
    }
  };

  const handleLibrary = async () => {
    onClose();
    try {
      const imgs = await pickImages({ multiple: false });
      onPicked(imgs.length > 0 ? imgs[0] : null);
    } catch {
      onPicked(null);
    }
  };

  const handleFile = async () => {
    onClose();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) { onPicked(null); return; }
      const a = result.assets[0];
      onPicked({ uri: a.uri, type: a.mimeType ?? 'image/jpeg', name: a.name, size: a.size ?? 0 });
    } catch {
      onPicked(null);
    }
  };

  const actions: ActionItem[] = [
    {
      label: t('chooseFromLibrary'),
      icon: (
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <Rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <Circle cx="9" cy="9" r="2" />
          <Path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </Svg>
      ),
      onPress: handleLibrary,
    },
    {
      label: t('takePhoto'),
      icon: (
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
          <Circle cx="12" cy="13" r="3" />
        </Svg>
      ),
      onPress: handleCamera,
    },
  ];

  if (showFileOption) {
    actions.push({
      label: t('chooseFile'),
      icon: (
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
        </Svg>
      ),
      onPress: handleFile,
    });
  }

  return (
    <CustomActionSheet
      visible={visible}
      onClose={onClose}
      dark
      noOverlay
      offsetY={finalY}
      offsetX={finalX}
      actions={actions}
    />
  );
}
