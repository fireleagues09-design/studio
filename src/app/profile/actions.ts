
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
