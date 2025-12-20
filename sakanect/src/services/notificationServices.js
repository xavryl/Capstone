// import { db } from '../../config/firebase';
// import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// export const sendNotification = async (userId, type, message) => {
//   try {
//     // Matches the Notification schema in your Data Dictionary 
//     const notificationData = {
//       user_id: userId,        // References users._id
//       type: type,             // e.g., 'new_order', 'match_found'
//       message: message,       // Content of the alert
//       read: false,            // Default unread status
//       created_at: serverTimestamp()
//     };

//     await addDoc(collection(db, "notifications"), notificationData);
//     return { success: true };
//   } catch (error) {
//     console.error("Error sending notification:", error);
//     return { success: false, error };
//   }
// };