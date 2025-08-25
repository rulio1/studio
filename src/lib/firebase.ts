
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, browserLocalPersistence, initializeAuth, Auth, setPersistence } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  "projectId": "chirp-3wj1h",
  "appId": "1:489188047340:web:050295c19b3300567d68c9",
  "storageBucket": "chirp-3wj1h.appspot.com",
  "apiKey": "AIzaSyCqN-RJbMNqftSqqtuY3lxFzgRXmT2n9SU",
  "authDomain": "chirp-3wj1h.firebaseapp.com",
  "messagingSenderId": "489188047340"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

// Reverted to the standard initialization. The logic in MainLayout handles the async nature of auth restoration.
auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error("Firebase persistence error", error);
});


db = getFirestore(app);
storage = getStorage(app);


export { app, auth, db, storage };
