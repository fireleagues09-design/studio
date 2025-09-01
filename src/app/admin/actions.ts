
'use server';

import { revalidatePath } from 'next/cache';
import { db, storage } from '@/lib/firebase-admin';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface UploadSliderInput {
    fileBuffer: string; // Base64 encoded file
    fileName: string;
    fileType: string;
}

export async function uploadSlider(input: UploadSliderInput): Promise<{ success: boolean; message: string; }> {
    try {
        const { fileBuffer, fileName, fileType } = input;

        const buffer = Buffer.from(fileBuffer, 'base64');
        const storagePath = `sliders/${Date.now()}-${fileName}`;
        const file = storage.bucket().file(storagePath);
        
        await file.save(buffer, {
            metadata: {
                contentType: fileType,
            },
        });

        await file.makePublic();
        const publicUrl = file.publicUrl();

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
