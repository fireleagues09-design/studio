
'use server';

import { revalidatePath } from 'next/cache';
import { db, storage } from '@/lib/firebase-admin';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Define the expected input structure
interface UploadSliderInput {
    fileBuffer: string; // Base64 encoded file
    fileName: string;
    fileType: string;
}

export async function uploadSlider(input: UploadSliderInput): Promise<{ success: boolean; message: string; }> {
    try {
        const { fileBuffer, fileName, fileType } = input;

        // 1. Decode base64 and create a buffer
        const buffer = Buffer.from(fileBuffer, 'base64');
        const storagePath = `sliders/${Date.now()}-${fileName}`;
        const file = storage.bucket().file(storagePath);
        
        // 2. Upload the file to Firebase Storage
        await file.save(buffer, {
            metadata: {
                contentType: fileType,
            },
        });

        // 3. Make the file public and get its URL
        await file.makePublic();
        const publicUrl = file.publicUrl();

        // 4. Save the URL and other info to Firestore
        await addDoc(collection(db, 'sliders'), {
            url: publicUrl,
            storagePath: storagePath,
            createdAt: serverTimestamp(),
        });
        
        revalidatePath('/'); // Revalidate homepage to show new slider
        revalidatePath('/admin'); // Revalidate admin page
        
        return { success: true, message: "Slider uploaded successfully!" };

    } catch (error: any) {
        console.error("Upload Slider Server Action Error:", error);
        return { success: false, message: `Upload failed: ${error.message}` };
    }
}
