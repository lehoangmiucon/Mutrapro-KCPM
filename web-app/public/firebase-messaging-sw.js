/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCR2EouiicDQLa_IsATzRKMUm2zdArrfoo",
  authDomain: "mutrapro-test.firebaseapp.com",
  projectId: "mutrapro-test",
  storageBucket: "mutrapro-test.firebasestorage.app",
  messagingSenderId: "14920393633",
  appId: "1:14920393633:web:de2730da6c4f4c318221e0"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: icon || '/logo192.png'
  });
});
