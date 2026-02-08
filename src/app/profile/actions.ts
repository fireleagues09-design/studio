
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

        // Transaction to ensure username is unique and then create the new user profile.
        await db.runTransaction(async (transaction) => {
            const usernameSnapshot = await transaction.get(usernameQuery);
            if (!usernameSnapshot.empty) {
                throw new Error("This username is already taken. Please choose another one.");
            }

            const userDoc = await transaction.get(userRef);
            if (userDoc.exists) {
                // This case should ideally not be hit if the UI flow is correct,
                // but as a safeguard, we prevent overwriting an existing profile's username.
                throw new Error("A profile for this user already exists.");
            }
            
            // Create the new user profile document.
            const newUserProfile = {
                username: username,
                email: userEmail,
                isRegistered: true, // Mark profile as complete
                wallet: { deposit: 0, winning: 0, bonus: 0 },
                registeredOn: FieldValue.serverTimestamp(),
            };
            transaction.set(userRef, newUserProfile);
        });

        return { success: true, message: 'Username set successfully!' };

    } catch (error: any) {
        console.error('Error setting username:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}


export async function updateGameProfile(
    idToken: string,
    game: 'Free Fire' | 'BGMI',
    inGameName: string,
    inGameUid: string
): Promise<{ success: boolean; message: string }> {
    if (!idToken) {
        return { success: false, message: 'Authorization required.' };
    }
    if (!game || !inGameName || !inGameUid) {
        return { success: false, message: 'All fields are required.' };
    }

    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;
        
        const userRef = db.collection('users').doc(userId);

        const updateData = {
            [`gameProfiles.${game}`]: {
                inGameName,
                inGameUid
            }
        };

        await userRef.update(updateData);

        return { success: true, message: `${game} profile updated successfully!` };

    } catch (error: any) {
        console.error('Error updating game profile:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}
