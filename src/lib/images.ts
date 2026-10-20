// Photos for the profile and for posts: picked from the library, shrunk and compressed on the
// device, then sent to the API as base64 (it keeps them up to 2 MB).
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { launchImageLibraryAsync } from 'expo-image-picker';

import { api } from '@/lib/api';

export type PickedImage = { uri: string; base64: string };

/** Lets the student pick a photo, returned at most `maxWidth` wide, as JPEG. Null when they give up. */
export async function pickImage({ maxWidth, square = false }: { maxWidth: number; square?: boolean }): Promise<PickedImage | null> {
  const result = await launchImageLibraryAsync({
    mediaTypes: ['images'],
    // The crop step (phones only) keeps profile photos square.
    allowsEditing: square,
    aspect: square ? [1, 1] : undefined,
    quality: 1,
  });
  const asset = result.canceled ? null : result.assets?.[0];
  if (!asset) return null;
  const context = ImageManipulator.manipulate(asset.uri);
  // The width can come as 0 when the system doesn't report it: shrink anyway, to stay under the limit.
  if (!asset.width || asset.width > maxWidth) context.resize({ width: maxWidth });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  return saved.base64 ? { uri: saved.uri, base64: saved.base64 } : null;
}

/** Sends the photo; the answer's `url` goes in the profile or the post. */
export function uploadImage(image: PickedImage) {
  return api<{ id: string; url: string }>('/api/imagens', { method: 'POST', body: { data: image.base64 } });
}
