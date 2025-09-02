
import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

// This is a more robust way to initialize the Firebase Admin SDK.
// It ensures that we don't try to re-initialize the app if it's already been done.
if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (!projectId) {
      throw new Error('FIREBASE_PROJECT_ID environment variable not set.');
    }

    const storageBucket = `${projectId}.appspot.com`;
    
    let credential;
    
    // Recommended: Use a service account key for consistent authentication.
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
       const serviceAccount: ServiceAccount = {
            projectId: projectId,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // The private key must be correctly formatted.
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
       };
       credential = admin.credential.cert(serviceAccount);
       console.log('Firebase Admin SDK initialized with Service Account.');
    } else {
        // Fallback for environments with Application Default Credentials
        console.warn("Initializing Firebase Admin with Application Default Credentials. This may not be reliable. For production, use a service account key.");
        credential = admin.credential.applicationDefault();
    }

    admin.initializeApp({
      credential,
      projectId: projectId,
      storageBucket: storageBucket,
    });
    
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
  }
}

// These will now be safely initialized.
export const auth = admin.auth();
export const db = admin.firestore();
export const storage = admin.storage();
