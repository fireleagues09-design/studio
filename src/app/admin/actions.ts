'use server';

import { auth, db, storage } from '@/lib/firebase-admin';
import { DecodedIdToken } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';

async function verifyAdmin(idToken: string): Promise<DecodedIdToken> {
    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();

        if (!userDoc.exists || userDoc.data()?.isAdmin !== true) {
            throw new Error('Permission denied: User is not an admin.');
        }
        return decodedToken;
    } catch (error: any) {
        console.error("Admin verification failed:", error.message);
        throw new Error(error.message || 'Admin verification failed.');
    }
}


export async function uploadSlider(data: { fileData: string; contentType: string; fileName: string; idToken: string; }) {
    try {
        await verifyAdmin(data.idToken);

        const buffer = Buffer.from(data.fileData, 'base64');
        const storagePath = `sliders/${Date.now()}-${data.fileName}`;
        const file = storage.bucket().file(storagePath);
        
        await file.save(buffer, {
            metadata: {
                contentType: data.contentType,
            },
        });

        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: '03-09-2491', // A far-future expiration date
        });

        await db.collection('sliders').add({
            url: url,
            storagePath: storagePath,
            createdAt: FieldValue.serverTimestamp(),
        });
        
        return { success: true, message: 'Slider uploaded successfully!' };

    } catch (error: any) {
        console.error("Server action 'uploadSlider' failed:", error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}

export async function deleteSlider(data: { slider: { id: string; storagePath: string; }; idToken: string; }) {
     try {
        await verifyAdmin(data.idToken);

        // Delete from Storage
        const storageRef = storage.bucket().file(data.slider.storagePath);
        await storageRef.delete();
        
        // Delete from Firestore
        await db.collection('sliders').doc(data.slider.id).delete();
        
        return { success: true, message: 'Slider deleted successfully.' };

    } catch (error: any) {
        console.error("Server action 'deleteSlider' failed:", error);
        return { success: false, message: error.message || 'Failed to delete slider.' };
    }
}