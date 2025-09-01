
'use server';

import { auth, db, storage } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

type ActionResponse = {
    success: boolean;
    message: string;
};

// This function securely uploads a slider image using the Firebase Admin SDK.
export async function uploadSlider(base64Data: string, fileName: string, fileType: string): Promise<ActionResponse> {
    try {
        // 1. Verify user is an admin
        const cookieStore = cookies();
        const token = cookieStore.get('firebaseIdToken')?.value;

        if (!token) {
            throw new Error('User not authenticated.');
        }

        const decodedToken = await auth.verifyIdToken(token);
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();

        if (!userDoc.exists || !userDoc.data()?.isAdmin) {
            throw new Error('Permission Denied. User is not an admin.');
        }

        // 2. Prepare the file for upload
        const storagePath = `sliders/${Date.now()}-${fileName}`;
        const bucket = storage.bucket();
        const file = bucket.file(storagePath);

        // Convert base64 to a buffer
        const buffer = Buffer.from(base64Data.split(',')[1], 'base64');

        // 3. Upload the file buffer to Firebase Storage
        await file.save(buffer, {
            metadata: {
                contentType: fileType,
            },
        });

        // 4. Get the public URL for the uploaded file
        const [publicUrl] = await file.getSignedUrl({
            action: 'read',
            expires: '03-09-2491', // A very long expiration date
        });

        // 5. Save the slider metadata to Firestore
        await db.collection('sliders').add({
            url: publicUrl,
            storagePath: storagePath,
            createdAt: new Date(),
        });
        
        revalidatePath('/'); // Revalidate the homepage to show the new slider
        revalidatePath('/admin'); // Revalidate the admin page
        return { success: true, message: 'Upload successful.' };

    } catch (error: any) {
        console.error('SERVER ACTION ERROR - uploadSlider:', error.message);
        return { success: false, message: `Upload failed: ${error.message}` };
    }
}


// This function securely deletes a slider image and its Firestore document.
export async function deleteSlider(docId: string, storagePath: string): Promise<ActionResponse> {
     try {
        // 1. Verify user is an admin
        const cookieStore = cookies();
        const token = cookieStore.get('firebaseIdToken')?.value;

        if (!token) {
            throw new Error('User not authenticated.');
        }
        const decodedToken = await auth.verifyIdToken(token);
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();

        if (!userDoc.exists || !userDoc.data()?.isAdmin) {
            throw new Error('Permission Denied. User is not an admin.');
        }

        // 2. Delete the Firestore document
        await db.collection('sliders').doc(docId).delete();

        // 3. Delete the file from Firebase Storage
        const bucket = storage.bucket();
        await bucket.file(storagePath).delete();

        revalidatePath('/'); // Revalidate the homepage
        revalidatePath('/admin'); // Revalidate the admin page
        return { success: true, message: 'Deletion successful.' };

    } catch (error: any) {
        console.error('SERVER ACTION ERROR - deleteSlider:', error.message);
        return { success: false, message: `Deletion failed: ${error.message}` };
    }
}
