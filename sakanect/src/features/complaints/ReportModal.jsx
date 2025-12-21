import { useState } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { X, AlertTriangle, Send, Loader2 } from 'lucide-react';

// --- SWEETALERT IMPORT ---
import Swal from 'sweetalert2';

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
        type: targetType, // 'User' or 'Crop' or 'Request'
        targetId: target.id,
        targetName: target.name,
        reporterId: reporterId,
        reason: reason,
        details: details,
        status: 'new',
        submittedAt: serverTimestamp()
      });

      // Close the modal first so the alert is clearly visible on the main screen
      onClose();

      // --- SUCCESS ALERT ---
      Swal.fire({
        icon: 'success',
        title: 'Report Submitted',
        text: `The admin team will review ${target.name} shortly.`,
        timer: 2500,
        showConfirmButton: false
      });

    } catch (error) {
      console.error("Error submitting complaint:", error);
      
      // --- ERROR ALERT ---
      Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: 'Could not submit the report. Please try again later.',
        confirmButtonColor: '#ef4444' // Red color for error
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md relative shadow-2xl animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="text-red-500" size={24} />
          <h2 className="text-xl font-bold text-gray-800">Report {targetType}</h2>
        </div>
        
        <p className="text-sm text-gray-500 mb-6">You are reporting <span className="font-bold text-gray-800">{target.name}</span>. Please choose a reason below. This report is confidential.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Reason Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Report</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-white"
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
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm resize-none"
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