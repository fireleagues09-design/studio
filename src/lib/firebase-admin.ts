
import admin from 'firebase-admin';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// This is a more robust way to initialize the Firebase Admin SDK.
// It ensures that we don't try to re-initialize the app if it's already been done.
if (!admin.apps.length) {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;

    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT or FIREBASE_PROJECT_ID environment variable not set.');
    }

    const storageBucket = `${projectId}.appspot.com`;

    admin.initializeApp({
      // The service account credentials should be automatically available
      // in the App Hosting environment via Application Default Credentials.
      credential: admin.credential.applicationDefault(),
      // Explicitly set the project and storage bucket to avoid discovery issues.
      projectId: projectId,
      storageBucket: storageBucket,
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
    // You might want to handle this more gracefully, but for now, we'll log it.
  }
}

// These will now be safely initialized.
export const auth = admin.auth();
export const db = admin.firestore();
export const storage = admin.storage();
