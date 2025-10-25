
'use server';

import { auth, db, storage } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type { User } from '@/lib/mock-data';

async function verifyAdmin(idToken: string): Promise<boolean> {
    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        
        if (!userDoc.exists) {
            return false;
        }
        
        // This is a more robust way to check the field.
        const isAdmin = userDoc.data()?.isAdmin === true;
        return isAdmin;

    } catch (error) {
        console.error("Error verifying admin token:", error);
        return false;
    }
}


export async function searchUsers(
    idToken: string,
    searchTerm: string
): Promise<{ success: boolean; users?: any[]; message?: string }> {
    try {
        // Temporarily removed admin verification as requested
        // const isAdmin = await verifyAdmin(idToken);
        // if (!isAdmin) {
        //     return { success: false, message: "Permission denied. You must be an admin to perform this action." };
        // }

        if (!searchTerm) {
             const recentUsersQuery = db.collection('users').orderBy('registeredOn', 'desc').limit(10);
             const recentUsersSnapshot = await recentUsersQuery.get();
             const recentUsers = recentUsersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
             return { success: true, users: recentUsers };
        }
        
        const lowerCaseSearchTerm = searchTerm.toLowerCase();

        // This is not efficient for large datasets, but works for smaller ones.
        // For production, consider a dedicated search service like Algolia or Elasticsearch.
        const usersSnapshot = await db.collection('users').limit(1000).get();
        const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const filteredUsers = allUsers.filter(user => {
            const nameMatch = user.inGameName?.toLowerCase().includes(lowerCaseSearchTerm);
            const uidMatch = user.inGameUid?.toLowerCase().includes(lowerCaseSearchTerm);
            const phoneMatch = user.phone?.toLowerCase().includes(lowerCaseSearchTerm);
            const emailMatch = user.email?.toLowerCase().includes(lowerCaseSearchTerm);
            return nameMatch || uidMatch || phoneMatch || emailMatch;
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
    type: 'deposit' | 'withdrawal',
    idToken: string
): Promise<{ success: boolean, message: string }> {
    const isAdmin = await verifyAdmin(idToken);
    if (!isAdmin) {
        return { success: false, message: "Permission denied. You must be an admin to perform this action." };
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
