
import admin from 'firebase-admin';

// This is a more robust way to initialize the Firebase Admin SDK.
// It ensures that we don't try to re-initialize the app if it's already been done.
if (!admin.apps.length) {
  try {
    admin.initializeApp({
        // The service account credentials should be automatically available
        // in the App Hosting environment via Application Default Credentials.
        credential: admin.credential.applicationDefault(),
        // Explicitly set the project and storage bucket to avoid discovery issues.
        projectId: 'fireleagues-drrjw',
        storageBucket: 'fireleagues-drrjw.appspot.com',
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
  }
}

export const auth = admin.auth();
export const db = admin.firestore();
export const storage = admin.storage();
