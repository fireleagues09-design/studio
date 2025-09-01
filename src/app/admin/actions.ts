
'use server';

import { auth, db, storage } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

async function verifyAdmin(idToken: string): Promise<boolean> {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const userDoc = await db.collection('users').doc(uid).get();
    return userDoc.exists && userDoc.data()?.isAdmin === true;
  } catch (error) {
    console.error('Error verifying admin token:', error);
    return false;
  }
}

type UploadSliderPayload = {
    fileDataUrl: string;
    fileName: string;
    idToken: string;
};

export async function uploadSlider(payload: UploadSliderPayload): Promise<{ success: boolean; message: string }> {
    const { fileDataUrl, fileName, idToken } = payload;
    
    const isAdmin = await verifyAdmin(idToken);
    if (!isAdmin) {
        return { success: false, message: 'Permission denied. User is not an admin.' };
    }

    try {
        const bucket = storage.bucket();
        
        // Extract content type and base64 data from the data URL
        const matches = fileDataUrl.match(/^data:(.+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('Invalid file data URL format.');
        }
        const contentType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        const storagePath = `sliders/${Date.now()}-${fileName}`;
        const file = bucket.file(storagePath);

        await file.save(buffer, {
            metadata: {
                contentType: contentType,
            },
        });
        
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: '03-09-2491'
        });

        await db.collection('sliders').add({
            url: url,
            storagePath: storagePath,
            createdAt: FieldValue.serverTimestamp(),
        });
        
        return { success: true, message: 'Upload successful.' };

    } catch (error: any) {
        console.error('Upload failed:', error);
        return { success: false, message: `Upload failed: ${error.message}` };
    }
}
