
'use server';

import { auth, db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

async function verifyToken(idToken: string): Promise<string> {
    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        return decodedToken.uid;
    } catch (error) {
        console.error('Error verifying token:', error);
        throw new Error('Authentication failed.');
    }
}

type Teammate = {
    inGameName: string;
    inGameUid: string;
};

type TeamData = {
    teamName: string;
    category: 'Duo' | 'Squad';
    members: Teammate[];
};

export async function createTeam(teamData: TeamData, idToken: string): Promise<{ success: boolean; message: string }> {
    try {
        const uid = await verifyToken(idToken);
        
        await db.collection('users').doc(uid).collection('teams').add({
            ...teamData,
            ownerId: uid,
            createdAt: FieldValue.serverTimestamp(),
        });
        
        return { success: true, message: 'Team created successfully.' };
    } catch (error: any) {
        console.error("Error creating team:", error);
        return { success: false, message: error.message || "Failed to create team." };
    }
}
