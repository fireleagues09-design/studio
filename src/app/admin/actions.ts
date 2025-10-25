
'use server';

import { auth, db, storage } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type { User } from '@/lib/mock-data';

async function verifyAdmin(idToken: string): Promise<boolean> {
    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists()) {
            console.error(`Admin verification failed: User document not found for UID: ${uid}`);
            return false;
        }
        
        const isAdmin = userDoc.data()?.isAdmin === true;
        if (!isAdmin) {
            console.error(`Admin verification failed: User ${uid} does not have 'isAdmin' flag set to true.`);
        }
        return isAdmin;

    } catch (error) {
        console.error('Error verifying admin token:', error);
        return false;
    }
}

export async function searchUsers(
    idToken: string,
    searchTerm: string
): Promise<{ success: boolean; users?: any[]; message?: string }> {
    const isAdmin = await verifyAdmin(idToken);
    if (!isAdmin) {
        return { success: false, message: 'Permission denied. User is not an admin.' };
    }

    try {
        // Always filter for admin users first.
        const adminUsersQuery = db.collection('users').where('isAdmin', '==', true);
        const adminUsersSnapshot = await adminUsersQuery.get();
        const adminUsers = adminUsersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (!searchTerm) {
            // Return recent admin users if search term is empty
            const recentAdminUsers = adminUsers
                .sort((a, b) => (b.registeredOn?.seconds || 0) - (a.registeredOn?.seconds || 0))
                .slice(0, 10);
            return { success: true, users: recentAdminUsers };
        }
        
        const lowerCaseSearchTerm = searchTerm.toLowerCase();

        const filteredUsers = adminUsers.filter(user => {
            const nameMatch = user.inGameName?.toLowerCase().includes(lowerCaseSearchTerm);
            const uidMatch = user.inGameUid?.toLowerCase().includes(lowerCaseSearchTerm);
            const phoneMatch = user.phone?.toLowerCase().includes(lowerCaseSearchTerm);
            return nameMatch || uidMatch || phoneMatch;
        });

        return { success: true, users: filteredUsers.slice(0, 50) }; // Limit results

    } catch (error: any) {
        console.error('Error searching users:', error);
        return { success: false, message: error.message || 'An unknown server error occurred.' };
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
    return { success: false, message: 'Permission denied. User is not an admin.' };
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
        return { success: false, message: 'Permission denied. User is not an admin.' };
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

    const isAdmin = await verifyAdmin(idToken);
    if (!isAdmin) {
        return { success: false, message: 'Permission denied. User is not an admin.' };
    }

    const transactionRef = db.collection('transactions').doc(transactionId);
    const userRef = db.collection('users').doc(userId);

    try {
        await db.runTransaction(async (t) => {
            const userDoc = await t.get(userRef);
            if (!userDoc.exists) {
                throw new Error("User for this transaction not found.");
            }

            t.update(transactionRef, { status: newStatus });

            if (type === 'deposit' && newStatus === 'Completed') {
                t.update(userRef, { 'wallet.deposit': FieldValue.increment(amount) });
            } else if (type === 'withdrawal' && newStatus === 'Failed') {
                // Refund the user's winnings wallet if withdrawal fails
                t.update(userRef, { 'wallet.winning': FieldValue.increment(amount) });
            }
        });

        return { success: true, message: `Transaction ${transactionId} updated to ${newStatus}.` };

    } catch (error: any) {
        console.error(`Error updating transaction ${transactionId}:`, error);
        return { success: false, message: error.message || "An unknown error occurred."};
    }
}

