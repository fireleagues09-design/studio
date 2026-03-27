'use server';

import { auth, db } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';


export async function registerSoloPlayer(
    tournamentId: string, 
    inGameName: string, 
    inGameUid: string,
    idToken: string
): Promise<{success: boolean; message: string}> {
    if (!idToken) {
       return { success: false, message: 'Authorization required.'};
    }

    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const tournamentDocRef = db.collection('tournaments').doc(tournamentId);
        const registrationDocRef = tournamentDocRef.collection('registrations').doc(userId);
        
        // Use a transaction to ensure atomicity
        await db.runTransaction(async (transaction) => {
            const tournamentDoc = await transaction.get(tournamentDocRef);
            if (!tournamentDoc.exists) {
                throw new Error("Tournament not found.");
            }

            const tournamentData = tournamentDoc.data()!;
            if (tournamentData.status !== 'Upcoming') {
                 throw new Error("This tournament is not open for registration.");
            }
            if (tournamentData.slotsFilled >= tournamentData.slots) {
                throw new Error("This tournament is already full.");
            }
            const registeredPlayers: string[] = tournamentData.registeredPlayers || [];
            if (registeredPlayers.includes(userId)) {
                throw new Error("You are already registered for this tournament.");
            }

            // Add user to the registrations subcollection
            transaction.set(registrationDocRef, {
                userId,
                inGameName,
                inGameUid,
                registeredAt: Timestamp.now(),
            });

            // Update the main tournament document
            transaction.update(tournamentDocRef, {
                registeredPlayers: FieldValue.arrayUnion(userId),
                slotsFilled: FieldValue.increment(1),
            });
        });


        return { success: true, message: 'Registration successful!' };
    } catch (error: any) {
        console.error('Error registering solo player:', error);
        return { success: false, message: error.message || 'An unknown error occurred during registration.' };
    }
}

/**
 * Starts a new support chat session with a sequential numeric ID.
 * Starts at 8 digits (10000000) and grows to 9+ naturally.
 */
export async function startSupportChatAction(
    idToken: string,
    playerDisplayName: string,
    userHandle: string | null,
    playerPhotoURL: string | null
): Promise<{ success: boolean; chatId?: string; message?: string }> {
    if (!idToken) return { success: false, message: 'Authorization required.' };

    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const configRef = db.collection('settings').doc('support_config');
        
        const chatId = await db.runTransaction(async (transaction) => {
            const configDoc = await transaction.get(configRef);
            
            // Starting at 10,000,000 ensures 8 digits. 
            // Once it hits 100,000,000 it becomes 9 digits automatically.
            let nextId = 10000000; 
            
            if (configDoc.exists) {
                const data = configDoc.data();
                if (data && typeof data.lastChatId === 'number') {
                    nextId = data.lastChatId + 1;
                }
            }
            
            // Update the global counter
            transaction.set(configRef, { lastChatId: nextId }, { merge: true });
            
            const newChatIdString = nextId.toString();
            const chatDocRef = db.collection('chats').doc(newChatIdString);
            
            transaction.set(chatDocRef, {
                playerDisplayName,
                userHandle,
                playerPhotoURL,
                userId,
                status: "waiting",
                createdAt: FieldValue.serverTimestamp(),
                lastMessageTime: FieldValue.serverTimestamp()
            });
            
            return newChatIdString;
        });

        return { success: true, chatId };
    } catch (error: any) {
        console.error('Error creating sequential support chat:', error);
        return { success: false, message: error.message || 'Failed to start support session.' };
    }
}
