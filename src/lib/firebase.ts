
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, inMemoryPersistence, Auth } from "firebase/auth";
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

// Initialize Firebase
if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

auth = getAuth(app);
db = getFirestore(app);
storage = getStorage(app);

// Set persistence on the client side. This is crucial for PWAs.
if (typeof window !== 'undefined') {
  try {
    // This makes sure the user stays logged in across sessions.
    setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    console.error("Error setting Firebase Auth persistence:", error);
  }
}

export { app, auth, db, storage };
