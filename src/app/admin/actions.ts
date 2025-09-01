
'use server';

import { Buffer } from 'node:buffer';
import { auth, db, storage } from '@/lib/firebase-admin';

async function verifyAdmin(idToken: string): Promise<boolean> {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (userDoc.exists && userDoc.data()?.isAdmin) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error verifying admin token:', error);
    return false;
  }
}

export async function uploadSlider(
  idToken: string,
  fileData: { base64: string; type: string; name: string }
): Promise<{ success: boolean; message: string }> {
  try {
    const isAdmin = await verifyAdmin(idToken);
    if (!isAdmin) {
      return { success: false, message: 'Permission denied. User is not an admin.' };
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
