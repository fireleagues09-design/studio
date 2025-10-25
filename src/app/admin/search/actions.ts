
'use server';

import { auth, db } from '@/lib/firebase-admin';

async function verifyAdmin(idToken: string): Promise<boolean> {
    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        
        if (!userDoc.exists) {
            return false;
        }
        
        const userData = userDoc.data();
        if (userData && userData.isAdmin === true) {
            return true;
        }

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

        if (!searchTerm) {
             const recentUsersQuery = db.collection('users').orderBy('registeredOn', 'desc').limit(10);
             const recentUsersSnapshot = await recentUsersQuery.get();
             const recentUsers = recentUsersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
             return { success: true, users: recentUsers };
        }
        
        const lowerCaseSearchTerm = searchTerm.toLowerCase();

        // This is not efficient for large datasets, but works for smaller ones.
        // For production, consider a dedicated search service like Algolia or Elasticsearch.
        const usersSnapshot = await db.collection('users').limit(1000).get();
        const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const filteredUsers = allUsers.filter(user => {
            const nameMatch = user.inGameName?.toLowerCase().includes(lowerCaseSearchTerm);
            const uidMatch = user.inGameUid?.toLowerCase().includes(lowerCaseSearchTerm);
            const phoneMatch = user.phone?.toLowerCase().includes(lowerCaseSearchTerm);
            const emailMatch = user.email?.toLowerCase().includes(lowerCaseSearchTerm);
            return nameMatch || uidMatch || phoneMatch || emailMatch;
        });

        return { success: true, users: filteredUsers.slice(0, 50) }; // Limit results

    } catch (error: any) {
        console.error('Error searching users:', error);
        return { success: false, message: error.message || 'An unknown server error occurred.' };
    }
}
