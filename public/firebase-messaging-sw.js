
// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
const firebaseConfig = {
  apiKey: "AIzaSyCqN-RJbMNqftSqqtuY3lxFzgRXmT2n9SU",
  authDomain: "chirp-3wj1h.firebaseapp.com",
  projectId: "chirp-3wj1h",
  storageBucket: "chirp-3wj1h.appspot.com",
  messagingSenderId: "489188047340",
  appId: "1:489188047340:web:050295c19b3300567d68c9"
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();


messaging.onBackgroundMessage(function(payload) {
  console.log('Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.svg'
  };

  self.registration.showNotification(notificationTitle,
    notificationOptions);
});
