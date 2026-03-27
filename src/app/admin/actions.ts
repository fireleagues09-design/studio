
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
        return { isAdmin: false, message: `Server error during admin check: ${error.code || error.message}` };
    }
}

export async function setSupportStatus(
    targetUserId: string, 
    makeSupport: boolean,
    idToken: string
): Promise<{ success: boolean; message: string }> {
    const adminCheck = await verifyAdmin(idToken);
    if (!adminCheck.isAdmin) {
        return { success: false, message: adminCheck.message };
    }

    try {
        await db.collection('users').doc(targetUserId).update({
            isSupport: makeSupport
        });

        return { success: true, message: `Support status updated successfully.` };
    } catch (error: any) {
        console.error('Error updating support status:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
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

        await auth.setCustomUserClaims(targetUserId, { isAdmin: makeAdmin });

        return { success: true, message: `User status updated successfully.` };
    } catch (error: any) {
        console.error('Error updating admin status:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
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
    new URL(imageUrl);
    await db.collection(collectionName).add({
      url: imageUrl,
      createdAt: Timestamp.now(),
    });
    return { success: true, message: 'Slider added successfully.' };
  } catch (error: any) {
    console.error(`Server-side add slider to ${collectionName} failed:`, error);
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
        if (storagePath) {
            await storage.bucket().file(storagePath).delete();
        }
        await db.collection(collectionName).doc(sliderId).delete();
        return { success: true, message: "Slider deleted" };
    } catch (error: any) {
        if (error.code === 404) {
            await db.collection(collectionName).doc(sliderId).delete();
            return { success: true, message: "Slider record deleted (file not in storage)." };
        }
        return { success: false, message: error.message || `Failed to delete slider.`};
    }
}

export async function updateTransaction(
    transactionId: string, 
    newStatus: 'Completed' | 'Failed',
    userId: string,
    amount: number,
    type: 'deposit' | 'entry_fee' | 'withdrawal' | 'prize',
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
            t.update(transactionRef, { status: newStatus });
            if (newStatus === 'Completed') {
                if (type === 'deposit') {
                    t.update(userRef, { 'wallet.deposit': FieldValue.increment(amount) });
                }
            } else if (newStatus === 'Failed') {
                if (type === 'withdrawal') {
                    t.update(userRef, { 'wallet.winning': FieldValue.increment(amount) });
                }
            }
        });
        return { success: true, message: `Transaction updated.` };
    } catch (error: any) {
        return { success: false, message: error.message || "An unknown error occurred."};
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
        await db.collection('users').doc(targetUserId).update({
            bestiePageActive: isEnabled
        });
        return { success: true, message: `Bestie status updated.` };
    } catch (error: any) {
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
        await db.collection('settings').doc('paymentDetails').set(details, { merge: true });
        return { success: true, message: `Payment details updated.` };
    } catch (error: any) {
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}

export async function updateAllPlayerResults(
    tournamentId: string,
    results: { userId: string; rank: string; prizeWon: number; kills: number }[],
    idToken: string
): Promise<{ success: boolean; message: string }> {
    const adminCheck = await verifyAdmin(idToken);
    if (!adminCheck.isAdmin) {
        return { success: false, message: adminCheck.message };
    }
    try {
        const batch = db.batch();
        const tournamentRef = db.collection('tournaments').doc(tournamentId);
        for (const res of results) {
            const registrationRef = tournamentRef.collection('registrations').doc(res.userId);
            batch.update(registrationRef, { rank: res.rank, prizeWon: res.prizeWon, kills: res.kills });
        }
        await batch.commit();
        return { success: true, message: `Results updated.` };
    } catch (error: any) {
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}

export async function updateUserSuspension(
    userId: string,
    isSuspended: boolean,
    note: string,
    idToken: string
): Promise<{ success: boolean; message: string }> {
    const adminCheck = await verifyAdmin(idToken);
    if (!adminCheck.isAdmin) {
        return { success: false, message: adminCheck.message };
    }
    try {
        await db.collection('users').doc(userId).update({
            suspended: isSuspended,
            suspensionNote: isSuspended ? note : '',
        });
        await db.collection('adminLogs').add({
            type: isSuspended ? 'user-suspended' : 'user-unsuspended',
            target: userId,
            actor: adminCheck.uid,
            note: note,
            createdAt: Timestamp.now(),
        });
        return { success: true, message: `User status updated.` };
    } catch (error: any) {
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}
