
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

        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            throw new Error('User profile not found.');
        }
        const userData = userDoc.data();
        const creatorAsMember: Teammate = {
            inGameName: userData?.inGameName,
            inGameUid: userData?.inGameUid,
        };
        
        const finalMembers = [creatorAsMember, ...teamData.members];

        await db.collection('users').doc(uid).collection('teams').add({
            teamName: teamData.teamName,
            category: teamData.category,
            members: finalMembers,
            ownerId: uid,
            createdAt: FieldValue.serverTimestamp(),
        });
        
        return { success: true, message: 'Team created successfully.' };
    } catch (error: any) {
        console.error("Error creating team:", error);
        return { success: false, message: error.message || "Failed to create team." };
    }
}
