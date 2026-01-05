import { useState, useEffect } from 'react';
import { db, storage } from '../../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { X, AlertTriangle, Send, Loader2, Upload, FileText } from 'lucide-react';
import Swal from 'sweetalert2';

export default function ReportModal({ target, targetType, reporterId, onClose }) {
  // 1. Define Reason Lists based on Type
  const userReasons = [
    "Fraudulent Activity / Scam",
    "Harassment or Abusive Chat",
    "Fake Profile / Impersonation",
    "Non-fulfillment of Orders",
    "Other"
  ];

  const cropReasons = [
    "Fake Listing / Misrepresentation",
    "Inappropriate Content",
    "Wrong Category or Pricing",
    "Prohibited Item",
    "Other"
  ];

  // 2. Initialize State
  const activeReasons = targetType === 'User' ? userReasons : cropReasons;
  const [reason, setReason] = useState(activeReasons[0]);
  const [details, setDetails] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // A. Upload Proof (if any)
      let proofUrl = null;
      if (proofFile) {
        const fileRef = ref(storage, `complaints/${reporterId}/${Date.now()}_${proofFile.name}`);
        const uploadRes = await uploadBytes(fileRef, proofFile);
        proofUrl = await getDownloadURL(uploadRes.ref);
      }

      // B. Save to Firestore
      await addDoc(collection(db, "complaints"), {
        targetType: targetType, // 'User' or 'Crop'
        targetId: target.id,
        targetName: target.name,
        reporterId: reporterId,
        reason: reason,
        description: details, // Changed 'details' to 'description' to match Admin Dashboard
        proofUrl: proofUrl,
        status: 'pending',
        submittedAt: serverTimestamp()
      });

      onClose();

      Swal.fire({
        icon: 'success',
        title: 'Report Submitted',
        text: `We will review your report against ${target.name}.`,
        timer: 2500,
        showConfirmButton: false
      });

    } catch (error) {
      console.error("Error submitting complaint:", error);
      Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: 'Could not submit the report. Please try again.',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl p-6 w-full max-w-md relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        {/* HEADER */}
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-red-100 p-2 rounded-full">
            <AlertTriangle className="text-red-600" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Report {targetType}</h2>
            <p className="text-xs text-red-500 font-medium">Confidential Report</p>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-6">
            You are reporting <span className="font-bold text-gray-900">{target.name}</span>. 
            Please select the violation below.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Reason Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Report</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-white"
              required
            >
              {activeReasons.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Details Textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Details</label>
            <textarea
              rows="3"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm resize-none"
              placeholder="Describe what happened..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={300}
            />
          </div>

          {/* Proof Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Evidence (Screenshot/Photo)</label>
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-red-50 transition">
                <div className="flex flex-col items-center justify-center pt-2 pb-3">
                    {proofFile ? (
                        <>
                            <FileText className="text-gray-600 mb-1" size={24}/>
                            <p className="text-xs text-gray-700 font-bold truncate max-w-[200px]">{proofFile.name}</p>
                        </>
                    ) : (
                        <>
                            <Upload className="text-gray-400 mb-1" size={24}/>
                            <p className="text-xs text-gray-500">Click to upload proof</p>
                        </>
                    )}
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => setProofFile(e.target.files[0])} />
            </label>
          </div>

          <button disabled={submitting} className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition shadow-md flex justify-center items-center gap-2">
            {submitting ? <Loader2 className="animate-spin" size={20} /> : <><Send size={18}/> Submit Report</>}
          </button>
        </form>
      </div>
    </div>
  );
}