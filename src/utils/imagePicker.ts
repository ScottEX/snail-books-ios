import * as ImagePicker from 'expo-image-picker';

export interface PickedImage {
  uri: string;
  type?: string;
  name?: string;
  size?: number;
  width?: number;
  height?: number;
}

/** Normalize iOS UTI (e.g. public.jpeg) → MIME (image/jpeg) so validateImages() in useExpenseForm passes */
const UTI_TO_MIME: Record<string, string> = {
  'public.jpeg': 'image/jpeg',
  'public.png': 'image/png',
  'public.heic': 'image/heic',
  'public.heif': 'image/heif',
  'com.compuserve.gif': 'image/gif',
  'public.tiff': 'image/tiff',
  'org.webmproject.webp': 'image/webp',
};
const normalizeMime = (mimeType: string | null | undefined): string => {
  if (!mimeType) return 'image/jpeg';
  return UTI_TO_MIME[mimeType] ?? mimeType;
};

/**
 * Open the system image library and let the user pick one or more images.
 * Returns normalized { uri, type, name, size } — same shape as a web File
 * so the existing code paths (compressImage, preview, upload) can treat
 * the result uniformly.
 *
 * On iOS, requesting MEDIA_LIBRARY permission is required before the picker
 * will appear. We request it lazily on first call.
 */
export async function pickImages(opts: { multiple?: boolean } = {}): Promise<PickedImage[]> {
  // Lazy permission request
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('需要相册权限');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: !!opts.multiple,
    quality: 0.85,
    selectionLimit: opts.multiple ? 10 : 1,
  });

  if (result.canceled) return [];
  return result.assets.map(a => ({
    uri: a.uri,
    type: normalizeMime(a.mimeType),
    name: a.fileName ?? `image-${Date.now()}.jpg`,
    size: a.fileSize ?? 0,
    width: a.width,
    height: a.height,
  }));
}

/**
 * Open the camera and capture a single photo.
 */
export async function takePhoto(): Promise<PickedImage | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') throw new Error('需要相机权限');

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.85,
  });
  if (result.canceled) return null;
  const a = result.assets[0];
  return {
    uri: a.uri,
    type: normalizeMime(a.mimeType),
    name: a.fileName ?? `photo-${Date.now()}.jpg`,
    size: a.fileSize ?? 0,
    width: a.width,
    height: a.height,
  };
}
