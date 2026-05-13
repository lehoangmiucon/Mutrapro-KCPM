// web-app/src/firebase.js
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import axios from 'axios'; // Import axios để gọi API

const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Hàm để đăng ký token với backend
export const registerDeviceWithBackend = async (userId, fcmToken) => {
    try {
        await axios.post('http://localhost:3007/api/notifications/register-device', {
            userId: userId,
            fcmToken: fcmToken
        });
        console.log('[FCM] Đã đăng ký thiết bị với backend.');
    } catch (err) {
        console.error('[FCM] Không thể đăng ký thiết bị:', err);
    }
};

// Hàm để lấy Fcm Token
export const getFcmToken = async () => {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Notification permission granted.');
            
            const token = await getToken(messaging, {
                vapidKey: ''
            });

            if (token) {
                console.log('FCM Token:', token);
                return token;
            } else {
                console.log('No registration token available. Request permission to generate one.');
                return null;
            }
        } else {
            console.warn('Notification permission denied.');
            return null;
        }
    } catch (err) {
        console.error('An error occurred while retrieving token. ', err);
        return null;
    }
};

// Lắng nghe thông báo khi đang mở web (Tùy chọn)
onMessage(messaging, (payload) => {
    console.log('Message received while app is in foreground. ', payload);
    // Bạn có thể dùng toast ở đây để hiển thị ngay lập tức
    // toast.info(payload.notification.body);
});
