
'use server';

import { auth, db } from '@/lib/firebase-admin';

async function verifyAdmin(idToken: string): Promise<boolean> {
    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        
        if (!userDoc.exists) {
            console.warn(`Admin verification failed: User document not found for UID ${decodedToken.uid}`);
            return false;
        }
        
        const userData = userDoc.data();
        if (userData && userData.isAdmin === true) {
            return true;
        }

        console.warn(`Admin verification failed: User ${decodedToken.uid} is not an admin.`);
        return false;

    } catch (error) {
        console.error("Error verifying admin token:", error);
        return false;
    }
}

export async function searchUsers(
    idToken: string,
    searchTerm: string
): Promise<{ success: boolean; users?: any[]; message?: string }> {
    try {
        const isAdmin = await verifyAdmin(idToken);
        if (!isAdmin) {
            return { success: false, message: "Permission denied. You must be an admin to perform this action." };
        }

        if (!searchTerm.trim()) {
             return { success: true, users: [] };
        }
        
        const lowerCaseSearchTerm = searchTerm.toLowerCase();

        // This approach is not highly scalable. For larger user bases,
        // a dedicated search service like Algolia or Elasticsearch is recommended.
        const usersSnapshot = await db.collection('users').get();
        const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const filteredUsers = allUsers.filter(user => {
            const nameMatch = user.inGameName?.toLowerCase().includes(lowerCaseSearchTerm);
            const uidMatch = user.inGameUid?.toLowerCase().includes(lowerCaseSearchTerm);
            const phoneMatch = user.phone?.toLowerCase().includes(lowerCaseSearchTerm);
            const emailMatch = user.email?.toLowerCase().includes(lowerCaseSearchTerm);
            return nameMatch || uidMatch || phoneMatch || emailMatch;
        });

        return { success: true, users: filteredUsers.slice(0, 50) };

    } catch (error: any) {
        console.error('Error searching users:', error);
        return { success: false, message: error.message || 'An unknown server error occurred.' };
    }
}
