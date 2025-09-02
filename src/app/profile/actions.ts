
'use server';

import { auth, db } from '@/lib/firebase-admin';
import type { Team, TeamMember } from '@/lib/mock-data';

async function verifyToken(idToken: string): Promise<string> {
    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        return decodedToken.uid;
    } catch (error) {
        console.error('Error verifying token:', error);
        throw new Error('Authentication failed.');
    }
}

export async function updateTeam(idToken: string, teamData: Team): Promise<{ success: boolean; message: string }> {
    try {
        const uid = await verifyToken(idToken);
        const userDocRef = db.collection('users').doc(uid);

        await userDocRef.update({
            team: {
                name: teamData.name || '',
                type: teamData.type,
                members: teamData.members.filter(m => m.inGameName && m.inGameUid) // Filter out empty members
            }
        });

        return { success: true, message: 'Team updated successfully.' };
    } catch (error: any) {
        console.error('Error updating team:', error);
        return { success: false, message: error.message || 'Failed to update team.' };
    }
}
