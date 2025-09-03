
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
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
if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

// Push Notifications (Client-side)
const requestNotificationPermission = async (userId: string) => {
    const isMessagingSupported = await isSupported();
    if (!isMessagingSupported) {
        console.log('Firebase Messaging is not supported in this browser.');
        return { success: false, message: 'Notificações não são suportadas neste navegador.' };
    }
    
    try {
        const messaging = getMessaging(app);
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            // You would typically get this from your Firebase project settings
            const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY; 
            if (!VAPID_KEY) {
                console.error('VAPID key is not configured in environment variables.');
                return { success: false, message: 'Configuração de notificação incompleta.' };
            }
            const token = await getToken(messaging, { vapidKey: VAPID_KEY });

            if (token) {
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
