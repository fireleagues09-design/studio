'use server';

import { auth, storage } from '@/lib/firebase-admin';
import { getDownloadURL, getStorage } from 'firebase-admin/storage';

export async function getSignedUploadUrl(fileName: string, fileType: string) {
  try {
    const bucket = getStorage().bucket();
    const file = bucket.file(`sliders/${Date.now()}-${fileName}`);

    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: fileType,
    });

    const publicUrl = getDownloadURL(file);

    return {
      success: true,
      uploadUrl: url,
      publicUrl: publicUrl,
    };
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return {
      success: false,
      error: 'Failed to get signed URL. Insufficient permissions.',
    };
  }
}
