
'use server';

import { auth, db, storage } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

async function verifyAdmin(idToken: string): Promise<boolean> {
    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const userDoc = await db.collection('users').doc(uid).get();

        if (userDoc.exists && userDoc.data()?.isAdmin === true) {
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error verifying admin token:', error);
        return false;
    }
}


export async function uploadSlider(
  base64Data: string,
  contentType: string,
  fileName: string,
  idToken: string
): Promise<{ success: boolean; message: string }> {

  const isAdmin = await verifyAdmin(idToken);
  if (!isAdmin) {
    return { success: false, message: 'Permission denied. User is not an admin.' };
  }

  try {
    const fileBuffer = Buffer.from(base64Data.split(',')[1], 'base64');
    const storagePath = `sliders/${Date.now()}-${fileName}`;
    const file = storage.bucket().file(storagePath);

    await file.save(fileBuffer, {
      metadata: {
        contentType: contentType,
      },
    });
    
    const [url] = await file.getSignedUrl({
        action: 'read',
        expires: '03-09-2491' // Far-future expiration date
    });

    await db.collection('sliders').add({
      url: url,
      storagePath: storagePath,
      createdAt: Timestamp.now(),
    });

    return { success: true, message: 'Slider uploaded successfully.' };
  } catch (error: any) {
    console.error('Server-side upload failed:', error);
    return { success: false, message: error.message || 'An unknown server error occurred.' };
  }
}

export async function deleteSlider(
    sliderId: string, 
    storagePath: string,
    idToken: string
): Promise<{ success: boolean, message: string}> {
    
    const isAdmin = await verifyAdmin(idToken);
    if (!isAdmin) {
        return { success: false, message: 'Permission denied. User is not an admin.' };
    }

    try {
        // Delete from Storage
        await storage.bucket().file(storagePath).delete();

        // Delete from Firestore
        await db.collection('sliders').doc(sliderId).delete();

        return { success: true, message: "Slider deleted" };

    } catch (error: any) {
        console.error("Error deleting slider on server:", error);
        return { success: false, message: error.message || "Failed to delete slider on server."};
    }
}
