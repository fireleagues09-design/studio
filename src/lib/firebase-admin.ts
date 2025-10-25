
import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

let app: admin.app.App;
let auth: admin.auth.Auth;
let db: admin.firestore.Firestore;
let storage: admin.storage.Storage;

try {
  // Ensure the service account key is provided
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    throw new Error(
      "🔥 FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing. " +
      "Please set it with your Firebase service account JSON string. Admin features will be disabled."
    );
  }

  let serviceAccount: ServiceAccount;
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  } catch (err: any) {
    throw new Error(
      "🔥 FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON. " +
      "Please check your environment variable. Error: " + err.message
    );
  }

  if (!admin.apps.length) {
    const projectId = serviceAccount.project_id;
    if (!projectId) {
        throw new Error('The provided service account key is missing the "project_id" field.');
    }
    
    const storageBucket = `${projectId}.appspot.com`;

    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: projectId,
      storageBucket: storageBucket,
    });
    console.log("✅ Firebase Admin initialized successfully");
  } else {
    app = admin.app();
  }

  auth = admin.auth(app);
  db = admin.firestore(app);
  storage = admin.storage(app);

} catch (error: any) {
    console.warn(error.message);
    console.warn("⚠️ Firebase Admin SDK not initialized. Admin features will not work.");

    // Provide mock objects to prevent the app from crashing.
    const mockAuth = {} as admin.auth.Auth;
    const mockDb = {} as admin.firestore.Firestore;
    const mockStorage = { bucket: () => ({ file: () => ({ save: () => {}, getSignedUrl: () => Promise.resolve(['']), delete: () => {} }) }) } as any;

    auth = mockAuth;
    db = mockDb;
    storage = mockStorage as admin.storage.Storage;
}


export { auth, db, storage };
