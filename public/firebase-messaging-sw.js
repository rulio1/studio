// Importa e inicializa o Firebase.
// Este arquivo é executado em segundo plano e não tem acesso à janela do navegador.
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

const firebaseConfig = {
  "projectId": "chirp-3wj1h",
  "appId": "1:489188047340:web:050295c19b3300567d68c9",
  "storageBucket": "chirp-3wj1h.appspot.com",
  "apiKey": "AIzaSyCqN-RJbMNqftSqqtuY3lxFzgRXmT2n9SU",
  "authDomain": "chirp-3wj1h.firebaseapp.com",
  "messagingSenderId": "489188047340"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Adiciona um manipulador para notificações recebidas em segundo plano.
onBackgroundMessage(messaging, (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Extrai o título e o corpo da notificação.
  const notificationTitle = payload.notification?.title || 'Zispr';
  const notificationOptions = {
    body: payload.notification?.body || 'Você tem uma nova notificação.',
    icon: '/icons/icon-192x192.png' // Ícone padrão para a notificação
  };

  // Exibe a notificação para o usuário.
  self.registration.showNotification(notificationTitle, notificationOptions);
});
