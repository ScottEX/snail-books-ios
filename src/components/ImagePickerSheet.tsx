import React from 'react';
import { Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
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
  const { width: screenW } = Dimensions.get('window');
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
        <Svg width={18} height={18} viewBox="0 0 1024 1024" fill="#FFFFFF">
          <Path d="M875.5 151.4H149.2c-46.3 0-83.8 37.5-83.8 83.8v558.7c0 46.3 37.5 83.8 83.8 83.8h726.3c46.3 0 83.8-37.5 83.8-83.8V235.2c0-46.3-37.5-83.8-83.8-83.8z m14 557L714.1 474.6s-10.2-18.9-46-18.9c-40.6 0-52.8 18.3-52.8 18.3L461.7 711.1s-8.4 15.9-28.8 15.9c-21.5 0-31.7-15.9-31.7-15.9l-80.8-92.3s-20.7-27.4-47.6-27.4c-26.8 0-49 30.3-49 30.3l-88.6 110.4v-482c0-15.4 12.5-28 28-28h698.4c15.4 0 28 12.5 28 28l-0.1 458.3zM470.3 402.8c0 54.7-44.3 99-98.9 99-54.6 0-99-44.3-99-99 0-54.6 44.3-98.9 99-98.9 54.6 0 98.9 44.3 98.9 98.9z" />
        </Svg>
      ),
      onPress: handleLibrary,
    },
    {
      label: t('takePhoto'),
      icon: (
        <Svg width={18} height={18} viewBox="0 0 1024 1024" fill="#FFFFFF">
          <Path d="M851.552 890.88 172.448 890.88c-74.592 0-135.296-60.672-135.296-135.296L37.152 370.752c0-74.624 60.672-135.328 135.296-135.328l132.16 0L302.912 195.904c0-34.624 28.192-62.816 62.816-62.816l302.016 0c29.408 0 53.312 23.904 53.312 53.312l0 49.024 130.464 0c74.592 0 135.296 60.672 135.296 135.328l0 384.832C986.816 830.208 926.144 890.88 851.552 890.88zM172.448 283.456c-48.128 0-87.296 39.168-87.296 87.328l0 384.832c0 48.128 39.168 87.296 87.296 87.296l679.104 0c48.128 0 87.296-39.168 87.296-87.296L938.848 370.752c0-48.16-39.168-87.328-87.296-87.328L716.8 283.424c-24.096 0-43.712-19.616-43.712-43.712L673.088 186.4c0-2.944-2.368-5.312-5.312-5.312l-302.016 0c-8.16 0-14.816 6.656-14.816 14.816L350.944 237.12c0 25.536-20.768 46.304-46.304 46.304L172.448 283.424zM512 755.84c-107.04 0-194.08-87.072-194.08-194.08S404.992 367.68 512 367.68s194.08 87.072 194.08 194.08S619.04 755.84 512 755.84zM512 415.68c-80.576 0-146.08 65.536-146.08 146.08S431.456 707.84 512 707.84s146.08-65.536 146.08-146.08S592.576 415.68 512 415.68zM816.8 438.016c-25.568 0-46.336-20.768-46.336-46.336s20.768-46.336 46.336-46.336 46.336 20.768 46.336 46.336S842.368 438.016 816.8 438.016z" />
        </Svg>
      ),
      onPress: handleCamera,
    },
  ];

  if (showFileOption) {
    actions.push({
      label: t('chooseFile'),
      icon: (
        <Svg width={18} height={18} viewBox="0 0 1024 1024" fill="#FFFFFF">
          <Path d="M873.7 985.6H150.3C61.9 985.6 0 930.3 0 850.9V231.2C0 148.1 78.6 69.5 161.7 69.5h215.6c16.3 0 31.9 7.5 42 20.3l91.6 114.5h378.3c78.1 0 134.7 66 134.7 156.9v475.5c0.1 82.2-67.3 148.9-150.2 148.9zM142.5 158c-24.4 0-56.8 32.4-56.8 56.8v653.9c0 24.8 28.1 28.5 44.9 28.5h763c24.8 0 44.9-19.5 44.9-43.4V352c0-14.4-5.1-51.9-28.5-51.9H483.5c-17.2 0-33.6-7.9-44.3-21.4l-96.7-120.9h-200v0.2z m19.2 19.2M107.8 446.8h808.4v80.9H107.8z" />
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
