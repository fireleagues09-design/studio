
'use server';

import { auth, db } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { headers } from 'next/headers';


export async function isUserRegisteredForTournament(tournamentId: string): Promise<boolean> {
    const idToken = headers().get('Authorization')?.split('Bearer ')[1];
    
    if (!idToken) {
        console.error("Authorization header missing");
        return false;
    }

    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const tournamentDocRef = db.collection('tournaments').doc(tournamentId);
        const tournamentDoc = await tournamentDocRef.get();

        if (!tournamentDoc.exists) {
            console.error(`Tournament not found: ${tournamentId}`);
            return false;
        }

        const tournamentData = tournamentDoc.data();
        const registeredPlayers: string[] = tournamentData?.registeredPlayers || [];

        return registeredPlayers.includes(uid);
    } catch (error) {
        console.error('Error verifying user registration:', error);
        return false;
    }
}

export async function registerSoloPlayer(
    tournamentId: string, 
    inGameName: string, 
    inGameUid: string
): Promise<{success: boolean; message: string}> {
    const idToken = headers().get('Authorization')?.split('Bearer ')[1];
    
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
