import { supabase } from './supabaseClient';

const MEDIA_BUCKET = 'achilis-media';
const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
const MIME_EXTENSIONS = {
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/ogg': 'ogv',
  'video/webm': 'webm',
};

function getFileExtension(blob, fileType) {
  const mimeExtension = MIME_EXTENSIONS[blob.type.toLowerCase()];
  if (mimeExtension) return mimeExtension;

  const requestedExtension = String(fileType || '')
    .replace(/^\./, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (requestedExtension) return requestedExtension;

  return blob.type.split('/')[1]?.split(';')[0]?.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
}

export async function uploadMediaToSupabase(base64String, userId, fileType) {
  if (!supabase) {
    throw new Error('Cloud media storage is not configured.');
  }
  if (!userId) {
    throw new Error('Sign in before uploading media.');
  }
  if (typeof base64String !== 'string' || !base64String.startsWith('data:')) {
    throw new Error('Expected media encoded as a data URL.');
  }

  const response = await fetch(base64String);
  if (!response.ok) {
    throw new Error('Could not read the selected media.');
  }
  const blob = await response.blob();
  if (blob.size > MAX_MEDIA_BYTES) {
    const error = new Error('Media files must be 50 MB or smaller. Remove this file or choose a shorter recording.');
    error.code = 'MEDIA_TOO_LARGE';
    throw error;
  }
  if (!blob.size) {
    throw new Error('The selected media file is empty.');
  }

  const safeUserId = String(userId).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeUserId) {
    throw new Error('The signed-in user ID is invalid.');
  }

  const randomSuffix = Math.random().toString(36).substring(7);
  const filePath = `${safeUserId}/${Date.now()}-${randomSuffix}.${getFileExtension(blob, fileType)}`;
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(filePath, blob, {
      contentType: blob.type || undefined,
      upsert: false,
    });
  if (error) throw error;

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(filePath);
  if (!data?.publicUrl) {
    throw new Error('The media uploaded, but Supabase did not return a public URL.');
  }
  return data.publicUrl;
}

export async function uploadDiaryMediaToSupabase(state, userId) {
  let uploadedCount = 0;
  let inlineMediaCount = 0;
  const failedUploads = [];
  const diary = [];

  for (const entry of Array.isArray(state?.diary) ? state.diary : []) {
    const migratedEntry = { ...entry };
    for (const field of ['video', 'audio', 'photo']) {
      const media = migratedEntry[field];
      if (typeof media !== 'string' || !media.startsWith('data:')) continue;
      inlineMediaCount += 1;
      try {
        migratedEntry[field] = await uploadMediaToSupabase(media, userId, field);
        uploadedCount += 1;
      } catch (error) {
        failedUploads.push({ entryId: entry.id, field, error });
      }
    }
    diary.push(migratedEntry);
  }

  return {
    failedUploads,
    inlineMediaCount,
    state: { ...state, diary },
    uploadedCount,
  };
}
