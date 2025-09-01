
'use server';

import { Buffer } from 'node:buffer';
import { auth, db, storage } from '@/lib/firebase-admin';

async function verifyToken(idToken: string): Promise<boolean> {
  try {
    await auth.verifyIdToken(idToken);
    return true;
  } catch (error) {
    console.error('Error verifying token:', error);
    return false;
  }
}

export async function uploadSlider(
  idToken: string,
  fileData: { base64: string; type: string; name: string }
): Promise<{ success: boolean; message: string }> {
  try {
    const isAuthenticated = await verifyToken(idToken);
    if (!isAuthenticated) {
      return { success: false, message: 'Authentication failed.' };
    }

    const base64Data = fileData.base64.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    const storagePath = `sliders/${Date.now()}-${fileData.name}`;
    const file = storage.bucket().file(storagePath);

    await file.save(buffer, {
      metadata: {
        contentType: fileData.type,
      },
      public: true, // Make file publicly readable
    });

    const downloadURL = file.publicUrl();

    await db.collection('sliders').add({
      url: downloadURL,
      storagePath: storagePath,
      createdAt: new Date(),
    });

    return { success: true, message: 'Slider uploaded successfully!' };
  } catch (error: any) {
    console.error('Upload failed:', error);
    let errorMessage = 'An unknown error occurred during upload.';
    if (error.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    }
    return { success: false, message: `Upload failed: ${errorMessage}` };
  }
}
