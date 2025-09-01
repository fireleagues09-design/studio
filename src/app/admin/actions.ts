
'use server';

import { auth, db, storage } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

async function verifyAdmin(token: string) {
    try {
        const decodedToken = await auth.verifyIdToken(token);
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        if (userDoc.exists && userDoc.data()?.isAdmin) {
            return { isAdmin: true, uid: decodedToken.uid };
        }
        return { isAdmin: false, uid: null };
    } catch (error) {
        console.error('Error verifying admin token:', error);
        return { isAdmin: false, uid: null };
    }
}

export async function uploadSlider(base64Data: string, contentType: string, fileName: string) {
    const cookieStore = cookies();
    const token = cookieStore.get('firebaseIdToken')?.value;

    if (!token) {
        return { success: false, message: 'User not authenticated.' };
    }

    try {
        const { isAdmin } = await verifyAdmin(token);
        if (!isAdmin) {
            return { success: false, message: 'Permission denied. User is not an admin.' };
        }

        const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('Invalid base64 string format.');
        }

        const buffer = Buffer.from(matches[2], 'base64');
        const storagePath = `sliders/${Date.now()}-${fileName}`;
        const file = storage.bucket().file(storagePath);
        
        await file.save(buffer, {
            metadata: {
                contentType: contentType || 'application/octet-stream',
            },
            public: true, // Make file publicly readable
        });
        
        const downloadURL = file.publicUrl();

        await db.collection('sliders').add({
            url: downloadURL,
            storagePath: storagePath,
            createdAt: FieldValue.serverTimestamp(),
        });
        
        revalidatePath('/'); // Revalidate home page to show new slider
        revalidatePath('/admin'); // Revalidate admin page

        return { success: true, message: 'Slider uploaded successfully.' };

    } catch (error: any) {
        console.error('Upload failed:', error);
        return { success: false, message: error.message || 'An unknown error occurred during upload.' };
    }
}

export async function deleteSlider(sliderId: string, storagePath: string) {
     const cookieStore = cookies();
    const token = cookieStore.get('firebaseIdToken')?.value;

    if (!token) {
        return { success: false, message: 'User not authenticated.' };
    }

    try {
        const { isAdmin } = await verifyAdmin(token);
        if (!isAdmin) {
            return { success: false, message: 'Permission denied. User is not an admin.' };
        }

        // Delete Firestore document
        await db.collection('sliders').doc(sliderId).delete();

        // Delete file from Storage
        await storage.bucket().file(storagePath).delete();
        
        revalidatePath('/');
        revalidatePath('/admin');
        
        return { success: true, message: 'Slider deleted successfully.' };

    } catch (error: any) {
        console.error('Deletion failed:', error);
        return { success: false, message: error.message || 'An unknown error occurred during deletion.' };
    }
}
