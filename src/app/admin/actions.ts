
'use server';

import { auth, db, storage } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type { User } from '@/lib/mock-data';

// This is the single source of truth for admin verification in server actions.
async function verifyAdmin(idToken: string): Promise<boolean> {
    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        
        if (!userDoc.exists) {
            console.warn(`Admin verification failed: User document not found for UID ${decodedToken.uid}`);
            return false;
        }
        
        const userData = userDoc.data();
        if (userData && userData.isAdmin === true) {
            return true;
        }

        console.warn(`Admin verification failed: User ${decodedToken.uid} is not an admin.`);
        return false;

    } catch (error) {
        console.error("Error verifying admin token:", error);
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
        return { success: false, message: "Permission denied. You must be an admin to perform this action." };
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
        return { success: false, message: "Permission denied. You must be an admin to perform this action." };
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


export async function updateTransaction(
    transactionId: string, 
    newStatus: 'Completed' | 'Failed',
    userId: string,
    amount: number,
    type: 'deposit' | 'withdrawal'
): Promise<{ success: boolean, message: string }> {
    const transactionRef = db.collection('transactions').doc(transactionId);
    const userRef = db.collection('users').doc(userId);

    try {
        await db.runTransaction(async (t) => {
            // No need to check user or transaction existence per user request.
            // Just perform the update.

            // 1. Update transaction status
            t.update(transactionRef, { status: newStatus });

            // 2. Update user wallet based on transaction type and new status
            if (newStatus === 'Completed') {
                if (type === 'deposit') {
                    // Add funds to deposit wallet on successful deposit
                    t.update(userRef, { 'wallet.deposit': FieldValue.increment(amount) });
                }
                // For 'withdrawal', the funds are already considered deducted. No action on completion.
            } else if (newStatus === 'Failed') {
                if (type === 'withdrawal') {
                    // Refund the user's winnings wallet if withdrawal fails
                    t.update(userRef, { 'wallet.winning': FieldValue.increment(amount) });
                }
                // For 'deposit', if it fails, nothing was added, so no change is needed.
            }
        });

        return { success: true, message: `Transaction ${transactionId} updated to ${newStatus}.` };

    } catch (error: any) {
        console.error(`Error updating transaction ${transactionId}:`, error);
        // Even if there's an error, we fulfill the user request to not block the admin
        return { success: false, message: error.message || "An unknown error occurred."};
    }
}
