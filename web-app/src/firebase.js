import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import axios from 'axios';

const firebaseConfig = {
  apiKey: "AIzaSyCR2EouiicDQLa_IsATzRKMUm2zdArrfoo",
  authDomain: "mutrapro-test.firebaseapp.com",
  projectId: "mutrapro-test",
  storageBucket: "mutrapro-test.firebasestorage.app",
  messagingSenderId: "14920393633",
  appId: "1:14920393633:web:de2730da6c4f4c318221e0"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

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

export const getFcmToken = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        // Dán VAPID KEY vào đây
        vapidKey: 'BAbf7hKyraqlqCA0Ia6bDGH6kf8kfsuRKBSr0rRr_Rk1w6FwIWTZMnUM8Q3B8ZbAtCycwKO5vSWSjzxQotlHu8A'
      });
      if (token) {
        return token;
      }
    }
    return null;
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
    return null;
  }
};

onMessage(messaging, (payload) => {
  console.log('Message received while app is in foreground. ', payload);
});
