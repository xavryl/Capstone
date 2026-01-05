import { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext'; 
import { useNavigate } from 'react-router-dom';
import { Plus, MessageCircle, TrendingUp, User, X, Loader2, AlertTriangle, Edit, Trash2, CheckCircle, Send } from 'lucide-react';
import ReportModal from '../complaints/ReportModal';

// --- SWEETALERT IMPORT ---
import Swal from 'sweetalert2';

export default function Requests() {
  const { user } = useAuth();
  const { startChat } = useChat(); 
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('market'); 
  const [requests, setRequests] = useState([]);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReportTarget, setSelectedReportTarget] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. FETCH REQUESTS
  useEffect(() => {
    const collectionRef = collection(db, "crop_requests");
    let q;

    if (activeTab === 'mine' && user) {
        // My Requests
        q = query(collectionRef, where("requestorId", "==", user.id), orderBy("createdAt", "desc"));
    } else {
        // Market Requests
        q = query(collectionRef, where("status", "==", "open"), orderBy("createdAt", "desc"));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeTab, user]);

  // 2. HANDLERS
  
  // --- UPDATED FULFILL HANDLER WITH CUSTOM MESSAGE MODAL ---
  const handleFulfill = async (req) => {
    if (!user) {
        Swal.fire({
            title: 'Login Required',
            text: "Please login to chat with the buyer.",
            icon: 'info',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            confirmButtonText: 'Go to Login'
        }).then((result) => {
            if (result.isConfirmed) navigate('/login');
        });
        return;
    }
    if (req.requestorId === user.id) return; 

    // Define Default Values
    const defaultSubject = `Supply Offer: ${req.quantity}kg of ${req.cropName}`;
    const defaultMessage = `Hi, I saw your request for ${req.quantity}kg of ${req.cropName}. I can supply this!`;

    // --- CUSTOM INPUT MODAL ---
    const { value: formValues } = await Swal.fire({
        title: 'Send Offer Message',
        html: `
            <div style="text-align: left;">
                <label style="display:block; font-size:12px; font-weight:bold; color:#777; margin-bottom:5px;">SUBJECT (LOCKED)</label>
                <input id="swal-subject" class="swal2-input" value="${defaultSubject}" disabled style="margin: 0 0 15px 0; width: 100%; background-color: #f3f4f6; color: #6b7280; font-weight: bold;">
                
                <label style="display:block; font-size:12px; font-weight:bold; color:#777; margin-bottom:5px;">MESSAGE</label>
                <textarea id="swal-message" class="swal2-textarea" style="margin: 0; width: 100%; height: 100px;">${defaultMessage}</textarea>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#16a34a',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Send Message',
        preConfirm: () => {
            return document.getElementById('swal-message').value;
        }
    });

    if (formValues) {
        const buyer = { 
            name: req.requestorName, 
            id: req.requestorId, 
            username: req.requestorName, 
            email: "" 
        };
        
        // Combine subject and message for clarity in chat
        const finalMsg = `**${defaultSubject}**\n\n${formValues}`;
        
        startChat(buyer, finalMsg);
    }
  };

  // --- MARK AS FULFILLED ---
  const handleMarkFulfilled = async (reqId) => {
    const result = await Swal.fire({
        title: 'Mark as Fulfilled?',
        text: "This request will be removed from the public market list.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#16a34a',
        confirmButtonText: 'Yes, mark it!'
    });

    if (result.isConfirmed) {
        try {
            await updateDoc(doc(db, "crop_requests", reqId), {
                status: 'fulfilled'
            });
            Swal.fire('Updated!', 'Request marked as fulfilled.', 'success');
        } catch (error) {
            console.error("Error updating status:", error);
            Swal.fire('Error', 'Failed to update status.', 'error');
        }
    }
  };
  
  const handleReportOpen = (e, request) => {
    e.stopPropagation(); 
    if (!user) {
        Swal.fire({
            title: 'Login Required',
            text: "Please login to report a request.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            confirmButtonText: 'Go to Login'
        }).then((result) => {
            if (result.isConfirmed) navigate('/login');
        });
        return;
    }
    setSelectedReportTarget(request);
    setIsReportModalOpen(true);
  };
  
  const handleReportClose = () => {
    setSelectedReportTarget(null);
    setIsReportModalOpen(false);
  };

  const handleDelete = async (e, reqId) => {
    e.stopPropagation();
    
    const result = await Swal.fire({
        title: 'Delete Request?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444', 
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
        try { 
            await deleteDoc(doc(db, "crop_requests", reqId)); 
            Swal.fire('Deleted!', 'Your request has been deleted.', 'success');
        } catch (e) { 
            console.error(e);
            Swal.fire('Error', 'Failed to delete.', 'error');
        }
    }
  };

  const handleEdit = (e, req) => {
    e.stopPropagation();
    setEditingRequest(req);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRequest(null);
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Crop Demand</h1>
          <p className="text-gray-500 text-sm mt-1">See what buyers are looking for right now.</p>
        </div>
        
        <button 
          onClick={() => { setEditingRequest(null); setIsModalOpen(true); }}
          className="bg-saka-green text-white px-6 py-3 rounded-lg font-bold hover:bg-saka-dark transition shadow-lg flex items-center gap-2"
        >
          <Plus size={20} /> Make Request
        </button>
      </div>

      {/* TABS */}
      <div className="flex gap-6 border-b mb-6">
        <button 
            onClick={() => setActiveTab('market')}
            className={`pb-3 px-2 font-medium flex items-center gap-2 transition border-b-2 ${activeTab === 'market' ? 'border-saka-green text-saka-green' : 'border-transparent text-gray-500'}`}
        >
            <TrendingUp size={18}/> Market Demand
        </button>
        {user && (
            <button 
                onClick={() => setActiveTab('mine')}
                className={`pb-3 px-2 font-medium flex items-center gap-2 transition border-b-2 ${activeTab === 'mine' ? 'border-saka-green text-saka-green' : 'border-transparent text-gray-500'}`}
            >
                <User size={18}/> My Requests
            </button>
        )}
      </div>

      {/* LIST */}
      {loading ? (
        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-saka-green"/></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.length === 0 && (
            <div className="col-span-full text-center py-10 text-gray-400 border border-dashed rounded-xl">
                No requests found.
            </div>
          )}
          
          {requests.map(req => {
            const isOwner = user?.id === req.requestorId;
            const isFulfilled = req.status === 'fulfilled';

            return (
                <div 
                    key={req.id} 
                    onClick={() => !isOwner && handleFulfill(req)}
                    className={`bg-white p-5 rounded-xl shadow-sm border transition group relative ${
                        !isOwner ? 'hover:border-saka-green cursor-pointer' : 'border-gray-200'
                    } ${isFulfilled ? 'opacity-75 bg-gray-50' : ''}`}
                >
                    
                    {!isOwner && (
                        <button 
                            onClick={(e) => handleReportOpen(e, req)}
                            className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 transition z-10"
                            title="Report this Request"
                        >
                            <AlertTriangle size={16} />
                        </button>
                    )}
                    
                    <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-lg text-gray-800">{req.cropName}</h3>
                        <span className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded font-bold shrink-0">
                            Target: ₱{req.targetPrice}/kg
                        </span>
                    </div>
                    
                    <div className="text-gray-600 text-sm mb-4 space-y-1">
                        <p>Need: <span className="font-bold text-black">{req.quantity} kg</span></p>
                        <p className="text-xs text-gray-400">Posted by {req.requestorName}</p>
                        {req.note && <p className="italic text-gray-500">"{req.note}"</p>}
                    </div>

                    {/* ACTION BUTTONS */}
                    {isOwner ? (
                        <div className="flex flex-col gap-2">
                            {!isFulfilled ? (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleMarkFulfilled(req.id); }}
                                    className="w-full bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 transition flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={16} /> Mark as Fulfilled
                                </button>
                            ) : (
                                <div className="w-full bg-gray-200 text-gray-600 py-2 rounded-lg font-bold text-center text-sm flex items-center justify-center gap-2">
                                    <CheckCircle size={16} /> Fulfilled
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button onClick={(e) => handleEdit(e, req)} className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg font-bold hover:bg-blue-100 transition flex items-center justify-center gap-1 text-xs">
                                    <Edit size={14} /> Edit
                                </button>
                                <button onClick={(e) => handleDelete(e, req.id)} className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg font-bold hover:bg-red-100 transition flex items-center justify-center gap-1 text-xs">
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button className="w-full bg-gray-900 text-white py-2 rounded-lg font-medium hover:bg-gray-700 transition flex items-center justify-center gap-2">
                            <MessageCircle size={16} /> Fulfill Request
                        </button>
                    )}
                </div>
            );
          })}
        </div>
      )}

      {/* MODALS */}
      {isModalOpen && <RequestFormModal onClose={closeModal} user={user} existingRequest={editingRequest} />}
      
      {isReportModalOpen && selectedReportTarget && (
        <ReportModal 
            target={{ id: selectedReportTarget.id, name: selectedReportTarget.cropName }}
            targetType="Request"
            reporterId={user.id}
            onClose={handleReportClose}
        />
      )}

    </div>
  );
}

// --- FORM MODAL ---
function RequestFormModal({ onClose, user, existingRequest }) {
  const [formData, setFormData] = useState({ 
    cropName: existingRequest?.cropName || '', 
    quantity: existingRequest?.quantity || '', 
    targetPrice: existingRequest?.targetPrice || '', 
    note: existingRequest?.note || '' 
  });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { 
        Swal.fire({
            title: 'Login Required',
            text: "Please login to post a request.",
            icon: 'info',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            confirmButtonText: 'Go to Login'
        }).then((result) => {
            if (result.isConfirmed) navigate('/login');
        });
        return; 
    }
    
    setSubmitting(true);
    try {
        if (existingRequest) {
            await updateDoc(doc(db, "crop_requests", existingRequest.id), {
                cropName: formData.cropName,
                quantity: Number(formData.quantity),
                targetPrice: Number(formData.targetPrice),
                note: formData.note,
            });
            Swal.fire({ icon: 'success', title: 'Updated!', text: 'Your request has been updated.', timer: 1500, showConfirmButton: false });
        } else {
            await addDoc(collection(db, "crop_requests"), {
                cropName: formData.cropName,
                quantity: Number(formData.quantity),
                targetPrice: Number(formData.targetPrice),
                note: formData.note,
                requestorId: user.id,
                requestorName: user.username || user.name,
                status: 'open',
                createdAt: serverTimestamp()
            });
            Swal.fire({ icon: 'success', title: 'Posted!', text: 'Your request is now live.', timer: 1500, showConfirmButton: false });
        }
        onClose();
    } catch (error) { 
        console.error(error); 
        Swal.fire('Error', 'Something went wrong.', 'error');
    } finally { 
        setSubmitting(false); 
    }
  };

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 w-full max-w-md relative shadow-2xl animate-in fade-in zoom-in duration-200">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
            <h2 className="text-xl font-bold text-gray-800 mb-4">{existingRequest ? 'Edit Request' : 'Post Request'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Crop Needed</label><input autoFocus name="cropName" value={formData.cropName} onChange={handleChange} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-saka-green" required /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Quantity (kg)</label><input type="number" name="quantity" value={formData.quantity} onChange={handleChange} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-saka-green" required /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Target Price</label><input type="number" name="targetPrice" value={formData.targetPrice} onChange={handleChange} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-saka-green" required /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Note</label><textarea name="note" value={formData.note} onChange={handleChange} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-saka-green" /></div>
                <button disabled={submitting} className="w-full bg-saka-green text-white py-3 rounded-lg font-bold hover:bg-saka-dark transition shadow-md">{submitting ? 'Saving...' : 'Submit'}</button>
            </form>
        </div>
    </div>
  );
}