
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "fireleagues-drrjw",
  "appId": "1:388454536362:web:886eafbbcb0bd9ceb7acd3",
  "storageBucket": "fireleagues-drrjw.appspot.com",
  "apiKey": "AIzaSyAyQkLAUnzfEnQDZv8fY_sxJ1Epfq_IO4g",
  "authDomain": "fireleagues-drrjw.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "388454536362"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
// This is necessary to fix Google login issues in some development environments.
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    auth.tenantId = 'fireleagues-drrjw.firebaseapp.com';
}
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, storage, googleProvider };
