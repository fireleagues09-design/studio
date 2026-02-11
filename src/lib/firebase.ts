// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "fireleagues-41911",
  "appId": "1:959326744237:web:2126f432a51706218f2f8a",
  "storageBucket": "fireleagues-41911.appspot.com",
  "apiKey": "AIzaSyDJLgK3vH-s-sLq3wL-cYC2zD9GkP5o9sQ",
  "authDomain": "fireleagues-41911.firebaseapp.com",
  "messagingSenderId": "959326744237"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, storage, googleProvider };
