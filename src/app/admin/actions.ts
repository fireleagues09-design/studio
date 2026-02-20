
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
        
        if (!userDoc.exists) {
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

function formatAuthError(error: any): string {
    if (typeof error.message === 'string' && (error.message.includes('serviceusage.services.use') || error.message.includes('identitytoolkit.googleapis.com'))) {
        return 'A project permission error occurred. Please ensure the "Identity Toolkit API" is enabled and that Billing is active for your Google Cloud project. This is required for user management features.';
    }
    return error.message || 'An unknown server error occurred.';
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
        return { success: false, message: formatAuthError(error) };
    }
}


export async function addSliderByUrl(
  imageUrl: string,
  collectionName: 'homeSliders' | 'landingSliders',
  idToken: string
): Promise<{ success: boolean; message: string }> {
  const adminCheck = await verifyAdmin(idToken);
  if (!adminCheck.isAdmin) {
    return { success: false, message: adminCheck.message };
  }
  try {
    // Basic URL validation
    new URL(imageUrl);

    await db.collection(collectionName).add({
      url: imageUrl,
      createdAt: Timestamp.now(),
    });

    return { success: true, message: 'Slider added successfully.' };
  } catch (error: any) {
    console.error(`Server-side add slider to ${collectionName} failed:`, error);
    if (error instanceof TypeError) {
      return { success: false, message: 'Invalid URL provided.' };
    }
    return { success: false, message: error.message || 'An unknown server error occurred.' };
  }
}

export async function deleteSlider(
    sliderId: string, 
    storagePath: string | null,
    collectionName: 'homeSliders' | 'landingSliders',
    idToken: string
): Promise<{ success: boolean, message: string}> {
    const adminCheck = await verifyAdmin(idToken);
    if (!adminCheck.isAdmin) {
        return { success: false, message: adminCheck.message };
    }

    try {
        // Delete from Storage only if a storage path is provided
        if (storagePath) {
            await storage.bucket().file(storagePath).delete();
        }

        // Always delete from Firestore
        await db.collection(collectionName).doc(sliderId).delete();

        return { success: true, message: "Slider deleted" };
    } catch (error: any) {
        // This handles cases where file doesn't exist in storage but we want to clean up the DB entry.
        if (error.code === 404) {
            console.warn(`File not found at ${storagePath}. Deleting from Firestore only.`);
            await db.collection(collectionName).doc(sliderId).delete();
            return { success: true, message: "Slider record deleted (file not in storage)." };
        }
        console.error(`Error deleting slider from ${collectionName} on server:`, error);
        return { success: false, message: error.message || `Failed to delete slider from ${collectionName} on server.`};
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

export async function setBestiePageStatus(
    isEnabled: boolean,
    idToken: string
): Promise<{ success: boolean; message: string }> {
    const adminCheck = await verifyAdmin(idToken);
    if (!adminCheck.isAdmin) {
        return { success: false, message: adminCheck.message };
    }

    try {
        const settingsRef = db.collection('settings').doc('featureControls');
        await settingsRef.set({
            isBestiePageEnabled: isEnabled
        }, { merge: true });

        return { success: true, message: `Bestie page status updated.` };
    } catch (error: any) {
        console.error('Error updating bestie page status:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}

export async function setIndividualBestiePageStatus(
    targetUserId: string,
    isEnabled: boolean,
    idToken: string
): Promise<{ success: boolean; message: string }> {
    const adminCheck = await verifyAdmin(idToken);
    if (!adminCheck.isAdmin) {
        return { success: false, message: adminCheck.message };
    }

    try {
        const userRef = db.collection('users').doc(targetUserId);
        await userRef.update({
            bestiePageActive: isEnabled
        });

        return { success: true, message: `Bestie page status updated for user.` };
    } catch (error: any) {
        console.error('Error updating individual bestie page status:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}


export async function updatePaymentDetails(
    details: { upiId: string; upiQrCodeUrl: string },
    idToken: string
): Promise<{ success: boolean; message: string }> {
    const adminCheck = await verifyAdmin(idToken);
    if (!adminCheck.isAdmin) {
        return { success: false, message: adminCheck.message };
    }

    try {
        const settingsRef = db.collection('settings').doc('paymentDetails');
        await settingsRef.set(details, { merge: true });

        return { success: true, message: `Payment details updated.` };
    } catch (error: any) {
        console.error('Error updating payment details:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}

export async function updatePlayerResult(
    tournamentId: string,
    userId: string,
    rank: string,
    prizeWon: number,
    idToken: string
): Promise<{ success: boolean; message: string }> {
    const adminCheck = await verifyAdmin(idToken);
    if (!adminCheck.isAdmin) {
        return { success: false, message: adminCheck.message };
    }

    try {
        const registrationRef = db.collection('tournaments').doc(tournamentId).collection('registrations').doc(userId);
        await registrationRef.update({
            rank: rank,
            prizeWon: prizeWon
        });

        return { success: true, message: `Result updated for player.` };
    } catch (error: any) {
        console.error('Error updating player result:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}
