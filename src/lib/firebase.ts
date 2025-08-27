
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, initializeAuth, browserLocalPersistence, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getMessaging, Messaging, getToken, onMessage } from "firebase/messaging";
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

if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

if (typeof window !== 'undefined') {
    auth = initializeAuth(app, {
        persistence: browserLocalPersistence
    });
} else {
    auth = getAuth(app);
}

db = getFirestore(app);
storage = getStorage(app);

// Lazy initialization for Messaging
export const getMessagingInstance = () => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        if (!messaging) {
            messaging = getMessaging(app);
            onMessage(messaging, (payload) => {
                console.log('Mensagem recebida em primeiro plano. ', payload);
            });
        }
        return messaging;
    }
    return null;
}


export const requestNotificationPermission = async (userId: string) => {
    const messagingInstance = getMessagingInstance();
    if (!messagingInstance || typeof window === 'undefined' || !("Notification" in window)) {
        console.log("Este navegador não suporta notificações ou o app não está em um contexto seguro (HTTPS).");
        return { success: false, message: 'Notificações não suportadas.' };
    }
    
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const vapidKey = "ZXxyxikRId-4OKGJsYPU8vDe7mJicoucrwpzhRo-Fdw";
            
            const fcmToken = await getToken(messagingInstance, { vapidKey });
            
            if (fcmToken) {
                const userDocRef = doc(db, 'users', userId);
                await setDoc(userDocRef, { fcmToken: fcmToken }, { merge: true });
                return { success: true, message: 'Permissão concedida e token salvo!' };
            } else {
                return { success: false, message: 'Não foi possível obter o token. A permissão foi concedida?' };
            }
        } else {
            return { success: false, message: 'Permissão para notificações não foi concedida.' };
        }
    } catch (error) {
        console.error('Ocorreu um erro ao obter a permissão para notificação:', error);
        return { success: false, message: 'Erro ao solicitar permissão.' };
    }
};

export { app, auth, db, storage };
