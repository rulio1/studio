
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, browserLocalPersistence, initializeAuth, Auth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, Firestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, FirebaseStorage, connectStorageEmulator } from "firebase/storage";
import { getMessaging, Messaging, getToken } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";

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
let messaging: Messaging | null = null;

if (typeof window !== "undefined") {
    if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
    }
    auth = initializeAuth(app, {
        persistence: browserLocalPersistence
    });
    db = getFirestore(app);
    storage = getStorage(app);
    messaging = getMessaging(app);

} else {
    if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
    }
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
}

export const requestNotificationPermission = async (userId: string) => {
    if (!messaging || typeof window === 'undefined' || !("Notification" in window)) {
        console.log("Este navegador não suporta notificações.");
        return;
    }
    
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Permissão para notificação concedida.');
            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            if (!vapidKey) {
                console.error("Chave VAPID do Firebase não encontrada. Verifique seu arquivo .env");
                return;
            }
            const fcmToken = await getToken(messaging, { vapidKey });
            if (fcmToken) {
                console.log('FCM Token:', fcmToken);
                // Salvar o token no documento do usuário
                const userDocRef = doc(db, 'users', userId);
                await setDoc(userDocRef, { fcmToken: fcmToken }, { merge: true });
            } else {
                console.log('Não foi possível obter o token de registro. Permissão necessária?');
            }
        } else {
            console.log('Permissão para notificação não concedida.');
        }
    } catch (error) {
        console.error('Ocorreu um erro ao obter a permissão para notificação.', error);
    }
};


export { app, auth, db, storage, messaging };
