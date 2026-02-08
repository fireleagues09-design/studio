
'use server';

import { auth, db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function setUsername(
    idToken: string,
    username: string
): Promise<{ success: boolean; message:string }> {
    if (!idToken) {
        return { success: false, message: 'Authorization required.' };
    }
    
    // 1. Validate username format
    if (username.length < 6 || username.length > 12) {
        return { success: false, message: "Username must be between 6 and 12 characters long." };
    }
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
        return { success: false, message: "Username can only contain letters and numbers." };
    }

    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;
        const userEmail = decodedToken.email;
        
        const userRef = db.collection('users').doc(userId);
        const usernameQuery = db.collection('users').where('username', '==', username);

        // Transaction to check uniqueness and update/create user
        await db.runTransaction(async (transaction) => {
            const usernameSnapshot = await transaction.get(usernameQuery);
            if (!usernameSnapshot.empty) {
                throw new Error("This username is already taken. Please choose another one.");
            }

            const userDoc = await transaction.get(userRef);
            
            if (userDoc.exists) {
                // Document exists, update it.
                if (userDoc.data()?.isRegistered === true) {
                     throw new Error("Username has already been set for this account.");
                }
                transaction.update(userRef, {
                    username: username,
                    isRegistered: true,
                });
            } else {
                // Document does not exist, create it.
                // This makes the flow robust against client-side creation failures.
                const newUserProfile = {
                    username: username,
                    isRegistered: true,
                    email: userEmail,
                    wallet: { deposit: 0, winning: 0, bonus: 0 },
                    registeredOn: FieldValue.serverTimestamp(),
                };
                transaction.set(userRef, newUserProfile);
            }
        });

        return { success: true, message: 'Username set successfully!' };

    } catch (error: any) {
        console.error('Error setting username:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}


export async function updateInGameDetails(
    idToken: string,
    details: { inGameName: string; inGameUid: string }
): Promise<{ success: boolean; message: string }> {
    if (!idToken) {
        return { success: false, message: 'Authorization required.' };
    }

    const { inGameName, inGameUid } = details;

    if (!inGameName || !inGameUid) {
        return { success: false, message: 'In-Game Name and UID are required.' };
    }

    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;
        const userRef = db.collection('users').doc(userId);

        await userRef.update({
            inGameName,
            inGameUid
        });

        return { success: true, message: 'In-Game details updated successfully!' };

    } catch (error: any) {
        console.error('Error updating in-game details:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}
