import { db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const sendNotification = async (userId, type, message) => {
  try {
    const notificationData = {
      user_id: userId,        // References users table in Firebase
      type: type,             // e.g., 'new_order', 'order_update', 'warning'
      message: message,       // The text displayed to the user
      read: false,            // Default status
      created_at: serverTimestamp()
    };

    await addDoc(collection(db, "notifications"), notificationData);
    return { success: true };
  } catch (error) {
    console.error("Error sending notification:", error);
    return { success: false, error };
  }
};