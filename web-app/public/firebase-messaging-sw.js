/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Khởi tạo app (compat) cho service worker
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Nhận và hiển thị thông báo khi web đang ở background
messaging.onBackgroundMessage((payload) => {
    console.log(' 📩  [firebase-messaging-sw.js] Received background message ', payload);

    const { title, body, icon } = payload.notification;
    self.registration.showNotification(title, {
        body,
        icon: icon || '/logo192.png'
    });
});
