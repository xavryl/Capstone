// import { db } from '../../config/firebase';
// import { collection, addDoc, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore'; 
// import { API_URL } from '../../config/api'; 
// import { sendNotification } from './notificationServices'; 

// // Helper function to call your backend Email API
// const sendEmailNotification = async (email, subject, message) => {
//   try {
//     await fetch(`${API_URL}/api/notifications/email`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ to: email, subject: subject, text: message })
//     });
//   } catch (error) {
//     console.error("Failed to send email:", error);
//     // We do not throw an error here to prevent blocking the transaction flow
//   }
// };

// // 1. Create a new Order (Buyer triggers this)
// export const createTransaction = async (crop, buyer, offerData) => {
//   try {
//     // Ensure all numeric values are properly converted
//     const qty = Number(offerData.quantity);
//     const pricePerKg = Number(crop.price_per_kg);
//     const total = crop.type === 'For Sale' ? qty * pricePerKg : 0;

//     const transactionData = {
//       cropId: crop._id,             // Matches MongoDB _id
//       cropTitle: crop.title,
//       cropImage: crop.imageUrl || null,
//       sellerId: crop.user_id,       // Matches 'user_id' in crops table [cite: 1459]
//       buyerId: buyer._id,           // Matches 'id' in users table [cite: 1401]
//       buyerName: buyer.full_name,
//       quantity_kg: qty,             // Updated to match schema 'quantity_kg' 
//       price_total: total,           // Matches 'price_total' 
//       status: 'pending', 
//       type: crop.type, 
//       createdAt: serverTimestamp(),
//       proofUrl: offerData.proofUrl || null
//     };

//     const docRef = await addDoc(collection(db, "transactions"), transactionData);

//     // --- A. In-App Notification: Alert the Farmer ---
//     await sendNotification(
//       crop.user_id, 
//       'new_order', 
//       `New request: ${buyer.full_name} wants to buy ${qty}kg of ${crop.title}.`
//     );

//     // --- B. Email Notification: Alert the Farmer ---
//     if (crop.sellerEmail) {
//         await sendEmailNotification(
//             crop.sellerEmail,
//             "New Order Received - SakaNect",
//             `Hello! You have received a new order for ${crop.title} from ${buyer.full_name}. Please log in to your dashboard to view details.`
//         );
//     }

//     return { success: true, id: docRef.id }; 
//   } catch (error) {
//     console.error("Error creating transaction:", error);
//     return { success: false, error };
//   }
// };

// // 2. Update Status (Farmer triggers this)
// export const updateTransactionStatus = async (transactionId, newStatus) => {
//   try {
//     const txRef = doc(db, "transactions", transactionId);
    
//     // Get transaction details to identify the crop and buyer
//     const txSnap = await getDoc(txRef);
//     if (!txSnap.exists()) throw new Error("Transaction not found");
//     const transaction = txSnap.data();

//     // Update Firebase Status
//     await updateDoc(txRef, { status: newStatus });
    
//     // IF ACCEPTED: Deduct Stock in MongoDB via cropRoutes
//     if (newStatus === 'accepted') {
//         // 1. Fetch current crop details using your GET /:id route
//         const response = await fetch(`${API_URL}/api/crops/${transaction.cropId}`);
//         if (!response.ok) throw new Error("Failed to fetch crop from backend");
        
//         const cropData = await response.json();
//         const currentQuantity = cropData.quantity_kg || 0; 

//         // 2. Calculate new quantity
//         const txQty = transaction.quantity_kg || transaction.quantity; // Fallback support
//         const newQuantity = Math.max(0, currentQuantity - txQty);
        
//         const updatePayload = { quantity_kg: newQuantity };
//         if (newQuantity === 0) updatePayload.status = 'sold_out'; // Update status if empty [cite: 1482]

//         // 3. Update MongoDB using your PUT /:id route
//         await fetch(`${API_URL}/api/crops/${transaction.cropId}`, {
//             method: 'PUT',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify(updatePayload)
//         });
//     }

//     // --- A. In-App Notification: Alert the Buyer ---
//     let notifMessage = `Your request for ${transaction.cropTitle} was ${newStatus}.`;
//     if (newStatus === 'accepted') notifMessage += " Check your transactions for details.";
    
//     await sendNotification(
//       transaction.buyerId, 
//       'order_update', 
//       notifMessage
//     );

//     // --- B. Email Notification: Alert the Buyer ---
//     if (transaction.buyerEmail) {
//          await sendEmailNotification(
//             transaction.buyerEmail,
//             `Order Update: ${newStatus}`,
//             `Your order for ${transaction.cropTitle} has been ${newStatus}. Please proceed to the app to complete the transaction.`
//          );
//     }
    
//     return true;
//   } catch (error) {
//     console.error("Error updating status/inventory:", error);
//     return false;
//   }
// };