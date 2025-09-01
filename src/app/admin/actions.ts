'use server';

import { auth as adminAuth, db, storage } from '@/lib/firebase-admin';

async function verifyAdmin(idToken: string): Promise<boolean> {
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        
        if (!userDoc.exists) {
            console.error(`Admin verification failed: User document not found for UID ${decodedToken.uid}`);
            return false;
        }

        const userData = userDoc.data();
        if (userData?.isAdmin !== true) {
            console.error(`Admin verification failed: User ${decodedToken.uid} is not an admin. isAdmin field is: ${userData?.isAdmin}`);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error verifying admin token:', error);
        return false;
    }
}


export async function uploadSlider(base64Data: string, contentType: string, idToken: string) {
    const isAdmin = await verifyAdmin(idToken);
    if (!isAdmin) {
        return { success: false, message: 'Permission denied. User is not an admin.' };
    }
    
    try {
        const fileBuffer = Buffer.from(base64Data.split(',')[1], 'base64');
        const fileName = `sliders/${Date.now()}`;
        const file = storage.bucket().file(fileName);
        
        await file.save(fileBuffer, {
            metadata: { contentType: contentType },
            public: true,
        });

        const publicUrl = file.publicUrl();

        await db.collection('sliders').add({
            url: publicUrl,
            storagePath: fileName,
            createdAt: new Date(),
        });
        
        return { success: true, url: publicUrl };
    } catch (error: any) {
        console.error("Upload failed:", error);
        return { success: false, message: `Upload failed: ${error.message}` };
    }
}

export async function deleteSlider(sliderId: string, storagePath: string, idToken: string) {
    const isAdmin = await verifyAdmin(idToken);
    if (!isAdmin) {
        return { success: false, message: 'Permission denied. User is not an admin.' };
    }

    try {
        // Delete from Firestore
        await db.collection('sliders').doc(sliderId).delete();
        
        // Delete from Storage
        await storage.bucket().file(storagePath).delete();

        return { success: true };
    } catch (error: any) {
        console.error("Deletion failed:", error);
        return { success: false, message: `Deletion failed: ${error.message}` };
    }
}
