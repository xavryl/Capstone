import { useState } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { X, AlertTriangle, Send, Loader2 } from 'lucide-react';

// Common reasons for reporting
const commonReasons = [
  "Inappropriate or abusive language",
  "Attempted scam or fraud",
  "Misrepresentation of goods (Fake crops/quantity)",
  "Asking for private contact details (outside chat)",
  "Spam or harassment"
];

export default function ReportModal({ target, targetType, reporterId, onClose }) {
  const [reason, setReason] = useState(commonReasons[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await addDoc(collection(db, "complaints"), {
        type: targetType, // 'User' or 'Crop'
        targetId: target.id,
        targetName: target.name,
        reporterId: reporterId,
        reason: reason,
        details: details,
        status: 'new',
        submittedAt: serverTimestamp()
      });

      alert(`Report submitted successfully! The admin team will review ${target.name}.`);
      onClose();
    } catch (error) {
      console.error("Error submitting complaint:", error);
      alert("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="text-red-500" size={24} />
          <h2 className="text-xl font-bold text-gray-800">Report {targetType}</h2>
        </div>
        
        <p className="text-sm text-gray-500 mb-6">You are reporting **{target.name}**. Please choose a reason below. This report is confidential.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Reason Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Report</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
              required
            >
              {commonReasons.map(r => <option key={r} value={r}>{r}</option>)}
              <option value="Other">Other (Please specify below)</option>
            </select>
          </div>

          {/* Details Textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Details (Max 200 chars)</label>
            <textarea
              rows="3"
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
              placeholder="Provide details about the issue..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={200}
            />
          </div>

          <button disabled={submitting} className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition shadow-md flex justify-center items-center gap-2">
            {submitting ? <Loader2 className="animate-spin" size={20} /> : <><Send size={18}/> Submit Report</>}
          </button>
        </form>
      </div>
    </div>
  );
}