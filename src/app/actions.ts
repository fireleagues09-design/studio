
'use server';

import { auth, db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
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
