// Profile photo: pick from the library, square-crop, shrink to 512 px and
// upload to the cloud 'avatars' bucket under <user id>/. Requires sign-in.
//
// The picker and manipulator are native modules that older installed builds
// don't have, and JS updates reach those builds too. So they're loaded only
// when needed, and a missing module becomes a friendly error instead of a crash.
import { getProfile, updateProfile } from '@/db/repositories/profile';
import { getSession } from '@/features/account/auth';
import { supabase } from '@/features/account/supabase';

const BUCKET = 'avatars';
const SIZE = 512;

export class AvatarError extends Error {}

export function avatarUrl(path: string | null | undefined): string | null {
  return path ? supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : null;
}

/** Returns false when the user cancelled. Throws AvatarError with a readable message. */
export async function pickAndUploadAvatar(): Promise<boolean> {
  const userId = getSession()?.user.id;
  if (!userId) throw new AvatarError('Sign in to add a photo. It’s shown to people in your groups.');

  let ImagePicker: typeof import('expo-image-picker');
  let Manipulator: typeof import('expo-image-manipulator');
  try {
    ImagePicker = await import('expo-image-picker');
    Manipulator = await import('expo-image-manipulator');
  } catch {
    throw new AvatarError('This version of the app can’t add photos yet. Install the latest build to use it.');
  }

  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
  if (picked.canceled || !picked.assets[0]) return false;

  const image = await Manipulator.manipulateAsync(picked.assets[0].uri, [{ resize: { width: SIZE, height: SIZE } }], {
    compress: 0.8,
    format: Manipulator.SaveFormat.JPEG,
  });
  const body = await (await fetch(image.uri)).arrayBuffer();

  // A new name per upload, so cached copies of the old photo don't linger.
  const path = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: 'image/jpeg' });
  if (error) throw new AvatarError(`Upload failed: ${error.message}`);

  const old = getProfile()?.avatarPath;
  updateProfile({ avatarPath: path });
  if (old && old.startsWith(`${userId}/`)) await supabase.storage.from(BUCKET).remove([old]);
  return true;
}

export async function removeAvatar() {
  const old = getProfile()?.avatarPath;
  updateProfile({ avatarPath: null });
  if (old) await supabase.storage.from(BUCKET).remove([old]);
}
