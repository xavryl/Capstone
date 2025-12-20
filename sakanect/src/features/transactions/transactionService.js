import { db } from '../../config/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore'; 
import { API_URL } from '../../config/api'; 
import { sendNotification } from './notificationServices'; 

const sendEmailNotification = async (email, subject, message) => {
  try {
    if (!email) return;
    await fetch(`${API_URL}/api/notifications/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: email, subject: subject, text: message })
    });
  } catch (error) {
    console.error("Failed to send email:", error);
  }
};

export const createTransaction = async (crop, buyer, offerData) => {
  try {
    const qty = Number(offerData.quantity);
    const pricePerKg = Number(crop.price_per_kg || 0);
    const total = crop.type === 'For Sale' ? qty * pricePerKg : 0;

    const transactionData = {
      cropId: crop.id,
      cropTitle: crop.title,
      cropImage: crop.imageUrl || null,
      sellerId: crop.sellerId,
      buyerId: buyer.id,
      buyerName: buyer.username || buyer.name,
      quantity_kg: qty,
      price_total: total,
      status: 'pending', 
      type: crop.type, 
      createdAt: serverTimestamp(),
      proofUrl: offerData.proofUrl || null,
      barterItem: offerData.barterItem || null,
      barterQuantity: offerData.barterQuantity || null
    };

    const docRef = await addDoc(collection(db, "transactions"), transactionData);

    await sendNotification(
      crop.sellerId, 
      'new_order', 
      `New Offer: ${buyer.username || buyer.name} wants to ${crop.type === 'Donation' ? 'request' : 'buy'} ${qty}kg of ${crop.title}.`
    );

    let sellerEmail = crop.sellerEmail;
    if (!sellerEmail) {
        const userDoc = await getDoc(doc(db, "users", crop.sellerId));
        if (userDoc.exists()) sellerEmail = userDoc.data().email;
    }

    if (sellerEmail) {
        await sendEmailNotification(
            sellerEmail,
            "New Offer Received - SakaNect",
            `Hello! You have received a new offer for ${crop.title}. Log in to SakaNect to respond.`
        );
    }

    return { success: true, id: docRef.id }; 
  } catch (error) {
    console.error("Error creating transaction:", error);
    return { success: false, error: error.message };
  }
};

export const updateTransactionStatus = async (transactionId, newStatus) => {
  try {
    const txRef = doc(db, "transactions", transactionId);
    
    const txSnap = await getDoc(txRef);
    if (!txSnap.exists()) throw new Error("Transaction not found");
    const transaction = txSnap.data();

    await updateDoc(txRef, { status: newStatus });
    
    if (newStatus === 'accepted') {
        const response = await fetch(`${API_URL}/api/crops/${transaction.cropId}`);
        if (response.ok) {
            const cropData = await response.json();
            const currentQuantity = cropData.quantity_kg || 0; 
            
            const txQty = transaction.quantity_kg || transaction.quantity || 0;
            const newQuantity = Math.max(0, currentQuantity - txQty);
            
            const updatePayload = { quantity_kg: newQuantity };
            if (newQuantity === 0) updatePayload.status = 'sold_out';

            await fetch(`${API_URL}/api/crops/${transaction.cropId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
            });
        }
    }

    let notifMessage = `Your offer for ${transaction.cropTitle} was ${newStatus}.`;
    if (newStatus === 'accepted') notifMessage += " Check your transactions to proceed.";
    
    await sendNotification(
      transaction.buyerId, 
      'order_update', 
      notifMessage
    );

    let buyerEmail = transaction.buyerEmail;
    if (!buyerEmail) {
         const userDoc = await getDoc(doc(db, "users", transaction.buyerId));
         if (userDoc.exists()) buyerEmail = userDoc.data().email;
    }

    if (buyerEmail) {
         await sendEmailNotification(
            buyerEmail,
            `Offer Update: ${newStatus}`,
            `Your offer for ${transaction.cropTitle} has been ${newStatus}.`
         );
    }
    
    return true;
  } catch (error) {
    console.error("Error updating status:", error);
    return false;
  }
};