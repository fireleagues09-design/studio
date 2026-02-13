
'use server';

import { auth, db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function completeRegistration(
    idToken: string,
    username: string
): Promise<{ success: boolean; message:string }> {
    if (!idToken) {
        return { success: false, message: 'Authorization required.' };
    }
    if (!username || username.length < 6 || username.length > 12) {
        return { success: false, message: 'Username must be 6-12 characters.' };
    }
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
        return { success: false, message: 'Username can only contain letters and numbers.' };
    }

    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;
        
        // Check for username uniqueness
        const usernameQuery = await db.collection('users').where('username', '==', username).limit(1).get();
        if (!usernameQuery.empty) {
            // Make sure it's not the user's own document if they somehow trigger this twice
            if (usernameQuery.docs[0].id !== userId) {
                 return { success: false, message: 'This username is already taken. Please choose another.' };
            }
        }
        
        const userRef = db.collection('users').doc(userId);
        await userRef.update({
            username: username,
            isRegistered: true,
        });

        return { success: true, message: 'Profile completed successfully!' };
    } catch (error: any) {
        console.error('Error completing registration:', error);
        return { success: false, message: error.message || 'An unknown server error occurred.' };
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
