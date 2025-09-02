
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, initializeAuth, browserLocalPersistence, Auth } from "firebase/auth";
import { getFirestore, Firestore, initializeFirestore, enableIndexedDbPersistence, memoryLocalCache } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

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

try {
    auth = initializeAuth(app, {
        persistence: browserLocalPersistence
    });
} catch (error) {
    auth = getAuth(app);
}

try {
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      localCache: memoryLocalCache(),
    });
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code == 'unimplemented') {
            console.warn('The current browser does not support all of the features required to enable persistence.');
        }
    });
} catch (error) {
    db = getFirestore(app);
}

storage = getStorage(app);

// Push Notifications (Client-side)
const requestNotificationPermission = async (userId: string) => {
    if (!isSupported()) {
        console.log('Firebase Messaging is not supported in this browser.');
        return { success: false, message: 'Notificações não são suportadas neste navegador.' };
    }
    
    try {
        const messaging = getMessaging(app);
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            const VAPID_KEY = 'YOUR_VAPID_KEY_HERE'; // You need to generate this in Firebase Console -> Project Settings -> Cloud Messaging
            const token = await getToken(messaging, { vapidKey: VAPID_KEY });

            if (token) {
                // You would typically save this token to the user's document in Firestore
                // to send them targeted notifications from your server.
                console.log('FCM Token:', token);
                const { doc, updateDoc } = await import('firebase/firestore');
                const userDocRef = doc(db, 'users', userId);
                await updateDoc(userDocRef, { fcmToken: token });
                return { success: true, message: 'Permissão concedida.' };
            } else {
                return { success: false, message: 'Não foi possível obter o token de notificação.' };
            }
        } else {
            return { success: false, message: 'Permissão para notificações não concedida.' };
        }
    } catch (error) {
        console.error('An error occurred while requesting notification permission. ', error);
        return { success: false, message: 'Ocorreu um erro ao solicitar a permissão.' };
    }
};

export { app, auth, db, storage, requestNotificationPermission };
