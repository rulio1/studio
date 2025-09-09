
// Importa os scripts do Firebase
self.importScripts("https://www.gstatic.com/firebasejs/9.2.0/firebase-app-compat.js");
self.importScripts("https://www.gstatic.com/firebasejs/9.2.0/firebase-messaging-compat.js");

// Sua configuração do Firebase da web
const firebaseConfig = {
  "projectId": "chirp-3wj1h",
  "appId": "1:489188047340:web:050295c19b3300567d68c9",
  "storageBucket": "chirp-3wj1h.appspot.com",
  "apiKey": "AIzaSyCqN-RJbMNqftSqqtuY3lxFzgRXmT2n9SU",
  "authDomain": "chirp-3wj1h.firebaseapp.com",
  "messagingSenderId": "489188047340"
};

// Inicializa o app Firebase
firebase.initializeApp(firebaseConfig);

// Obtém uma instância do Firebase Messaging.
const messaging = firebase.messaging();

// Adiciona um manipulador de mensagens em segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  
  // Extrai o título e o corpo da notificação
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icons/icon-192x192.png", // Ícone da notificação
  };

  // Exibe a notificação
  self.registration.showNotification(notificationTitle, notificationOptions);
});
