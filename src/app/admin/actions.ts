
'use server';

import { auth, db, storage } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type { User } from '@/lib/mock-data';

// This is the single source of truth for admin verification in server actions.
// It returns a detailed object to help diagnose issues.
async function verifyAdmin(idToken: string): Promise<{ isAdmin: boolean; message: string; uid?: string }> {
    if (!idToken) {
        return { isAdmin: false, message: "Authentication token was not provided." };
    }
    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const userDocRef = db.collection('users').doc(decodedToken.uid);
        const userDoc = await userDocRef.get();
        
        if (!userDoc.exists()) {
            return { isAdmin: false, message: `Admin verification failed: User document not found for UID ${decodedToken.uid}.` };
        }
        
        const userData = userDoc.data();
        if (userData && userData.isAdmin === true) {
            return { isAdmin: true, message: "Success", uid: decodedToken.uid };
        }

        return { isAdmin: false, message: "Permission denied. The calling user is not an admin." };

    } catch (error: any) {
        console.error("Error during admin verification in server action:", error);
        // This will catch errors from verifyIdToken (e.g., bad service key) or db.get() (SDK not init)
        return { isAdmin: false, message: `Server error during admin check: ${error.code || error.message}` };
    }
}


export async function setAdminStatus(
    targetUserId: string, 
    makeAdmin: boolean,
    idToken: string
): Promise<{ success: boolean; message: string }> {
    const adminCheck = await verifyAdmin(idToken);
    if (!adminCheck.isAdmin) {
        return { success: false, message: adminCheck.message };
    }

    try {
        const callerId = adminCheck.uid;

        if (callerId === targetUserId) {
            return { success: false, message: "Admins cannot change their own status." };
        }

        await db.collection('users').doc(targetUserId).update({
            isAdmin: makeAdmin
        });

        // This ensures the user's token will have the admin claim on next refresh.
        await auth.setCustomUserClaims(targetUserId, { isAdmin: makeAdmin });


        return { success: true, message: `User status updated successfully.` };
    } catch (error: any) {
        console.error('Error updating admin status:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}


export async function uploadSlider(
  base64Data: string,
  contentType: string,
  fileName: string,
  idToken: string
): Promise<{ success: boolean; message: string }> {
   const adminCheck = await verifyAdmin(idToken);
    if (!adminCheck.isAdmin) {
        return { success: false, message: adminCheck.message };
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
    const adminCheck = await verifyAdmin(idToken);
    if (!adminCheck.isAdmin) {
        return { success: false, message: adminCheck.message };
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
    type: 'deposit' | 'withdrawal',
    idToken: string
): Promise<{ success: boolean, message: string }> {
    const adminCheck = await verifyAdmin(idToken);
    if (!adminCheck.isAdmin) {
        return { success: false, message: adminCheck.message };
    }

    const transactionRef = db.collection('transactions').doc(transactionId);
    const userRef = db.collection('users').doc(userId);

    try {
        await db.runTransaction(async (t) => {
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
        return { success: false, message: error.message || "An unknown error occurred."};
    }
}
