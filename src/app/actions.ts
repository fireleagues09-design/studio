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
 * Starts a new support chat session with a sequential alphanumeric ID.
 * Starts at 8 characters (Base36) and grows to 9+ naturally.
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
        
        const chatIdString = await db.runTransaction(async (transaction) => {
            const configDoc = await transaction.get(configRef);
            
            /**
             * Starting at 36^7 ensures the first ID generated is 8 characters in Base36.
             * 36^7 = 78,364,164,096. 
             * We use a slightly higher start (100 billion) to ensure it looks "mixed" from the start.
             * 100,000,000,000 in Base36 is "2B0IK3S0".
             */
            let nextCounter = 100000000000; 
            
            if (configDoc.exists) {
                const data = configDoc.data();
                if (data && typeof data.lastChatCounter === 'number') {
                    nextCounter = data.lastChatCounter + 1;
                } else if (data && typeof data.lastChatId === 'number') {
                    // Migration path from previous purely numeric IDs
                    nextCounter = Math.max(nextCounter, data.lastChatId + 1);
                }
            }
            
            // Update the global counter in Firestore
            transaction.set(configRef, { lastChatCounter: nextCounter }, { merge: true });
            
            // Convert numeric counter to Alphanumeric Uppercase (Base36)
            const generatedId = nextCounter.toString(36).toUpperCase();
            
            const chatDocRef = db.collection('chats').doc(generatedId);
            
            transaction.set(chatDocRef, {
                playerDisplayName,
                userHandle,
                playerPhotoURL,
                userId,
                status: "waiting",
                createdAt: FieldValue.serverTimestamp(),
                lastMessageTime: FieldValue.serverTimestamp()
            });
            
            return generatedId;
        });

        return { success: true, chatId: chatIdString };
    } catch (error: any) {
        console.error('Error creating sequential support chat:', error);
        return { success: false, message: error.message || 'Failed to start support session.' };
    }
}
