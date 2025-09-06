
'use server';

import { auth, db, storage } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import type { User } from '@/lib/mock-data';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

async function verifyAdmin(idToken: string): Promise<boolean> {
    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists) {
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

    if (!searchTerm) {
        // Return recent users if search term is empty
        try {
            const snapshot = await db.collection('users').orderBy('registeredOn', 'desc').limit(10).get();
            const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return { success: true, users };
        } catch (error: any) {
            console.error("Error fetching recent users:", error);
            return { success: false, message: error.message };
        }
    }

    try {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        
        // Firestore doesn't support case-insensitive queries directly or OR queries on different fields.
        // We fetch all users and filter on the server. This is not optimal for very large user bases.
        // For production apps with >10k users, consider a dedicated search service like Algolia or Typesense.
        const usersSnapshot = await db.collection('users').get();
        
        const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const filteredUsers = allUsers.filter(user => {
            const nameMatch = user.inGameName?.toLowerCase().includes(lowerCaseSearchTerm);
            const uidMatch = user.inGameUid?.toLowerCase().includes(lowerCaseSearchTerm);
            const phoneMatch = user.phone?.toLowerCase().includes(lowerCaseSearchTerm);
            return nameMatch || uidMatch || phoneMatch;
        });

        return { success: true, users: filteredUsers.slice(0, 50) }; // Limit results to avoid sending huge payloads

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
    idToken: string
): Promise<{ success: boolean, message: string }> {

    const isAdmin = await verifyAdmin(idToken);
    if (!isAdmin) {
        return { success: false, message: 'Permission denied. User is not an admin.' };
    }

    const transactionRef = db.collection('transactions').doc(transactionId);
    const userRef = db.collection('users').doc(userId);

    try {
        if (newStatus === 'Completed') {
            // Use a transaction to ensure atomicity
            await db.runTransaction(async (t) => {
                const userDoc = await t.get(userRef);
                if (!userDoc.exists) {
                    throw new Error("User for this transaction not found.");
                }
                t.update(transactionRef, { status: newStatus });
                t.update(userRef, { 'wallet.deposit': FieldValue.increment(amount) });
            });
        } else { // For 'Failed' or any other status, just update the transaction
            await transactionRef.update({ status: newStatus });
        }

        return { success: true, message: `Transaction ${transactionId} updated to ${newStatus}.` };

    } catch (error: any) {
        console.error(`Error updating transaction ${transactionId}:`, error);
        return { success: false, message: error.message || "An unknown error occurred."};
    }
}

