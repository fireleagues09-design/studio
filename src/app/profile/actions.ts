
'use server';

import { auth, db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function setUsername(
    idToken: string,
    username: string
): Promise<{ success: boolean; message:string }> {
    // This functionality has been moved into the main registration flow
    // and is no longer needed as a separate action.
    return { success: false, message: 'This feature is deprecated.' };
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
