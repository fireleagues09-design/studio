'use server';

import { auth, db } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';


/**
 * Registers a user (and their team if applicable) for a tournament.
 * Handles Solo, Duo, and Squad logic.
 */
export async function registerTournamentEntry(
    tournamentId: string, 
    members: { inGameName: string, inGameUid: string }[],
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

            // Add team to the registrations subcollection
            transaction.set(registrationDocRef, {
                userId,
                members, // Full team member data
                inGameName: members[0].inGameName, // Primary name for tables
                inGameUid: members[0].inGameUid,
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
        console.error('Error registering for tournament:', error);
        return { success: false, message: error.message || 'An unknown error occurred during registration.' };
    }
}

/**
 * Starts a new support chat session with a randomized alphanumeric ID.
 */
export async function startSupportChatAction(
    idToken: string,
    playerDisplayName: string,
    userHandle: string | null,
    playerPhotoURL: string | null,
    encryptedFirstMessage: string
): Promise<{ success: boolean; chatId?: string; message?: string }> {
    if (!idToken) return { success: false, message: 'Authorization required.' };

    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const configRef = db.collection('settings').doc('support_config');
        
        const chatIdString = await db.runTransaction(async (transaction) => {
            const configDoc = await transaction.get(configRef);
            
            // Default random starting point if not set (Alphanumeric range)
            let nextCounter = Math.floor(Math.random() * 1000000000) + 100000000000; 
            
            if (configDoc.exists) {
                const data = configDoc.data();
                if (data && typeof data.lastChatCounter === 'number') {
                    nextCounter = data.lastChatCounter + 1;
                }
            }
            
            transaction.set(configRef, { lastChatCounter: nextCounter }, { merge: true });
            
            // Convert to Base-36 for alphanumeric mixed letters/numbers and capitalize
            const generatedId = nextCounter.toString(36).toUpperCase();
            const chatDocRef = db.collection('chats').doc(generatedId);
            
            transaction.set(chatDocRef, {
                playerDisplayName,
                userHandle,
                playerPhotoURL,
                userId,
                status: "waiting",
                type: "chat",
                createdAt: FieldValue.serverTimestamp(),
                lastMessageTime: FieldValue.serverTimestamp()
            });

            const messageDocRef = chatDocRef.collection('messages').doc();
            transaction.set(messageDocRef, {
                text: encryptedFirstMessage,
                senderId: userId,
                senderType: 'player',
                createdAt: FieldValue.serverTimestamp()
            });
            
            return generatedId;
        });

        return { success: true, chatId: chatIdString };
    } catch (error: any) {
        console.error('Error creating support chat:', error);
        return { success: false, message: error.message || 'Failed to start support session.' };
    }
}

/**
 * Submits a new formal ticket with a randomized alphanumeric ID.
 */
export async function submitTicketAction(
    idToken: string,
    username: string,
    message: string,
    screenshotUrl?: string
): Promise<{ success: boolean; ticketId?: string; message?: string }> {
    if (!idToken) return { success: false, message: 'Authorization required.' };

    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const configRef = db.collection('settings').doc('support_config');
        
        const ticketIdString = await db.runTransaction(async (transaction) => {
            const configDoc = await transaction.get(configRef);
            
            // Different range for tickets to avoid overlap, starting with a random seed
            let nextTicketCounter = Math.floor(Math.random() * 1000000000) + 500000000000; 
            
            if (configDoc.exists) {
                const data = configDoc.data();
                if (data && typeof data.lastTicketCounter === 'number') {
                    nextTicketCounter = data.lastTicketCounter + 1;
                }
            }
            
            transaction.set(configRef, { lastTicketCounter: nextTicketCounter }, { merge: true });
            
            // Convert to Base-36 Alphanumeric and Capitalize
            const generatedId = nextTicketCounter.toString(36).toUpperCase();
            const chatDocRef = db.collection('chats').doc(generatedId);
            
            transaction.set(chatDocRef, {
                playerDisplayName: username,
                userHandle: username,
                userId,
                status: "waiting",
                type: "ticket",
                screenshotUrl: screenshotUrl || null,
                createdAt: FieldValue.serverTimestamp(),
                lastMessageTime: FieldValue.serverTimestamp()
            });

            const messageDocRef = chatDocRef.collection('messages').doc();
            transaction.set(messageDocRef, {
                text: message,
                senderId: userId,
                senderType: 'player',
                createdAt: FieldValue.serverTimestamp()
            });
            
            return generatedId;
        });

        return { success: true, ticketId: ticketIdString };
    } catch (error: any) {
        console.error('Error submitting ticket:', error);
        return { success: false, message: error.message || 'Failed to submit ticket.' };
    }
}
