'use server';

import { auth, db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

function formatAuthError(error: any): string {
    if (typeof error.message === 'string' && (error.message.includes('serviceusage.services.use') || error.message.includes('identitytoolkit.googleapis.com'))) {
        return 'A project permission error occurred. Please ensure the "Identity Toolkit API" is enabled and that Billing is active for your Google Cloud project. This is required for user management features.';
    }
    return error.message || 'An unknown server error occurred.';
}

export async function completeRegistration(
    idToken: string,
    username: string,
    realName: string
): Promise<{ success: boolean; message:string }> {
    if (!idToken) {
        return { success: false, message: 'Authorization required.' };
    }
    // Validation
    if (!username || username.length < 6 || username.length > 12) {
        return { success: false, message: 'Username must be 6-12 characters.' };
    }
    if (!/^[a-z0-9]+$/.test(username)) {
        return { success: false, message: 'Username can only contain lowercase letters and numbers.' };
    }
    if (!realName || realName.trim().length < 2) {
        return { success: false, message: 'Real name must be at least 2 characters.' };
    }

    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;
        
        // Check for username uniqueness
        const usernameQuery = await db.collection('users').where('username', '==', username).limit(1).get();
        if (!usernameQuery.empty) {
            if (usernameQuery.docs[0].id !== userId) {
                 return { success: false, message: 'This username is already taken. Please choose another.' };
            }
        }
        
        // Update Firestore document
        const userRef = db.collection('users').doc(userId);
        await userRef.update({
            username: username,
            realName: realName.trim(),
            isRegistered: true,
        });

        return { success: true, message: 'Profile completed successfully!' };
    } catch (error: any) {
        console.error('Error completing registration:', error);
        return { success: false, message: error.message || 'An unknown server error occurred.' };
    }
}

export async function updateRealName(
    idToken: string,
    realName: string
): Promise<{ success: boolean; message: string }> {
    if (!idToken) {
        return { success: false, message: 'Authorization required.' };
    }
    const trimmedName = realName.trim();
    if (!trimmedName || trimmedName.length < 2) {
        return { success: false, message: 'Real name must be at least 2 characters.' };
    }

    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;
        
        await db.collection('users').doc(userId).update({
            realName: trimmedName
        });

        return { success: true, message: 'Real name updated successfully!' };
    } catch (error: any) {
        console.error('Error updating real name:', error);
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
