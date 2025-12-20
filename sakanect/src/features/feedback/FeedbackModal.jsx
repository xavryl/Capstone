import { useState } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { Star, X, Loader2 } from 'lucide-react';

export default function FeedbackModal({ transaction, currentUser, onClose }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  // Determine who we are rating
  const isBuyer = currentUser.id === transaction.buyerId;
  const targetUserId = isBuyer ? transaction.sellerId : transaction.buyerId;
  const targetUserName = isBuyer ? transaction.sellerName : transaction.buyerName;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Save Feedback to Database
      await addDoc(collection(db, "user_feedback"), {
        transactionId: transaction.id,
        fromUserId: currentUser.id,
        fromUserName: currentUser.username || currentUser.name,
        toUserId: targetUserId,
        rating: Number(rating),
        message: comment,
        submittedAt: serverTimestamp()
      });

      // 2. Mark Transaction as "Rated" (so they can't rate twice)
      // We add a flag like 'buyerRated: true' or 'sellerRated: true'
      const txRef = doc(db, "transactions", transaction.id);
      await updateDoc(txRef, {
        [isBuyer ? 'buyerRated' : 'sellerRated']: true
      });

      alert("Feedback submitted!");
      onClose();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("Failed to submit feedback.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm relative shadow-2xl animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        <h3 className="text-xl font-bold text-gray-800 mb-2">Rate Experience</h3>
        <p className="text-sm text-gray-500 mb-6">How was your transaction with <span className="font-bold text-gray-700">{targetUserName}</span>?</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* STAR RATING */}
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`transition-transform hover:scale-110 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
              >
                <Star size={32} fill={star <= rating ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          <p className="text-center text-sm font-bold text-saka-green">
            {rating === 5 ? "Excellent!" : rating === 4 ? "Good" : rating === 3 ? "Okay" : rating === 2 ? "Bad" : "Terrible"}
          </p>

          {/* COMMENT */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comment (Optional)</label>
            <textarea
              rows="3"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-saka-green outline-none text-sm"
              placeholder="Describe your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-saka-green text-white py-3 rounded-lg font-bold hover:bg-saka-dark transition shadow-md flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20}/> : "Submit Review"}
          </button>
        </form>
      </div>
    </div>
  );
}