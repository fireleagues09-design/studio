
'use server';

import { auth, db } from '@/lib/firebase-admin';
import type { Team, TeamMember } from '@/lib/mock-data';

async function verifyToken(idToken: string): Promise<string> {
    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        return decodedToken.uid;
    } catch (error) {
        console.error('Error verifying token:', error);
        throw new Error('Authentication failed.');
    }
}

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
        
        const userRef = db.collection('users').doc(userId);
        const usernameQuery = db.collection('users').where('inGameName', '==', username);

        // 2. Transaction to check uniqueness and update user
        await db.runTransaction(async (transaction) => {
            const usernameSnapshot = await transaction.get(usernameQuery);
            if (!usernameSnapshot.empty) {
                // Throw an error to abort the transaction
                throw new Error("This username is already taken. Please choose another one.");
            }

            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new Error("User profile not found.");
            }
            if (userDoc.data()?.isRegistered === true) {
                 throw new Error("Username has already been set for this account.");
            }

            transaction.update(userRef, {
                inGameName: username,
                isRegistered: true,
            });
        });

        return { success: true, message: 'Username set successfully!' };

    } catch (error: any) {
        console.error('Error setting username:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}
