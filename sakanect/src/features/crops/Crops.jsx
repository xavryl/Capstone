import { useState } from 'react';
import { MapPin, Scale, MessageCircle, ShoppingCart, X, AlertTriangle, Upload, FileText, Tag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../../config/firebase';
import { collection, addDoc, serverTimestamp, setDoc, doc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import ReportModal from '../complaints/ReportModal'; 
import Swal from 'sweetalert2';

export default function CropCard({ crop }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [offerData, setOfferData] = useState({
    price: crop.price_per_kg || 0, 
    quantity: 1,
    barterItem: '',
    barterQuantity: '',
    organizationName: '',
    proofFile: null
  });

  const isMyCrop = user?.id === crop.sellerId;

  const openOfferModal = () => {
    if (!user) {
      Swal.fire({
        title: 'Login Required',
        text: "You must be logged in to make an offer.",
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#16a34a',
        confirmButtonText: 'Go to Login'
      }).then((result) => {
        if (result.isConfirmed) {
            navigate('/login');
        }
      });
      return;
    }
    if (isMyCrop) {
        Swal.fire({
            icon: 'warning',
            title: 'Oops...',
            text: 'You cannot buy your own crop!',
            confirmButtonColor: '#16a34a'
        });
        return;
    }
    // Set default price to asking price when opening
    setOfferData(prev => ({...prev, price: crop.price_per_kg || 0}));
    setIsModalOpen(true);
  };

  // --- Navigate to Chat Page (General Chat) ---
  const handleRequest = () => {
    if (!user) {
        Swal.fire({
            title: 'Login Required',
            text: "Please login to chat with the seller.",
            icon: 'info',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            confirmButtonText: 'Go to Login'
        }).then((result) => {
            if (result.isConfirmed) navigate('/login');
        });
        return;
    }
    if (isMyCrop) {
        Swal.fire({
            icon: 'warning',
            title: 'Action Denied',
            text: 'You cannot chat with yourself!',
            confirmButtonColor: '#16a34a'
        });
        return;
    }

    // Simplified Navigation: Just go to chat with sellerId
    navigate('/chat', { 
      state: { 
        sellerId: crop.sellerId,
        sellerName: crop.sellerName 
      } 
    });
  };

  // --- CONFIRM OFFER & REDIRECT TO CHAT ---
  const handleConfirmOffer = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
        const chatId = [user.id, crop.sellerId].sort().join("_");
        let messageText = "";
        let proofUrl = null;
        let isOffer = true;
        let offerDetails = {};

        // --- 1. PREPARE DATA BASED ON TYPE ---
        if (crop.type === 'Barter') {
            if (!offerData.barterItem) throw new Error("Please specify what you are trading.");
            messageText = `I want to barter ${offerData.barterQuantity} of ${offerData.barterItem} for your ${offerData.quantity}kg of ${crop.title}.`;
            offerDetails = { offerAmount: 0 }; 

        } else if (crop.type === 'Donation') {
            if (!offerData.proofFile) throw new Error("Please upload proof of legitimacy.");
            
            const fileRef = ref(storage, `proofs/${user.id}/${Date.now()}_${offerData.proofFile.name}`);
            const uploadRes = await uploadBytes(fileRef, offerData.proofFile);
            proofUrl = await getDownloadURL(uploadRes.ref);
            
            messageText = `I requested a donation of ${offerData.quantity}kg of ${crop.title} for ${offerData.organizationName}. Proof attached.`;
            offerDetails = { offerAmount: 0, proofUrl: proofUrl };

        } else if (crop.type === 'For Sale') {
            if (offerData.quantity > crop.quantity_kg) throw new Error(`Only ${crop.quantity_kg}kg available!`);
            if (offerData.price <= 0) throw new Error("Please enter a valid price.");

            messageText = `I'd like to make an offer for ${crop.title}.`;
            offerDetails = {
                offerAmount: Number(offerData.price),
                originalPrice: Number(crop.price_per_kg),
                offerQuantity: Number(offerData.quantity)
            };
        }

        // --- 2. SAVE MESSAGE TO FIRESTORE (ALL TYPES) ---
        await addDoc(collection(db, `chats/${chatId}/messages`), {
            text: messageText,
            senderId: user.id,
            senderName: user.username || user.name || "Unknown",
            createdAt: serverTimestamp(),
            isOffer: isOffer,
            cropTitle: crop.title,
            cropId: crop.id,
            offerStatus: 'pending',
            ...offerDetails
        });

        // --- 3. CREATE/UPDATE CONVERSATION HEADER ---
        await setDoc(doc(db, "conversations", chatId), {
            participants: [user.id, crop.sellerId],
            lastMessage: `Offer: ${crop.title}`,
            lastSenderId: user.id,
            lastMessageTime: serverTimestamp(),
            users: {
                [user.id]: { 
                    name: user.name || user.username || "Unknown", 
                    email: user.email || "", 
                    username: user.username || "Unknown", 
                    photoURL: user.photoURL || null  
                },
                [crop.sellerId]: { 
                    name: crop.sellerName || "Unknown", 
                    email: "", 
                    username: crop.sellerName || "Unknown",
                    photoURL: null 
                }
            },
            unreadBy: arrayUnion(crop.sellerId)
        }, { merge: true });

        // --- 4. SUCCESS & NAVIGATE ---
        setIsModalOpen(false);
        navigate('/chat', { state: { sellerId: crop.sellerId } }); 

    } catch (err) {
        console.error("Offer Error", err);
        Swal.fire({
            icon: 'error',
            title: 'Offer Failed',
            text: err.message || "Failed to send offer.",
            confirmButtonColor: '#16a34a'
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden border border-gray-100 flex flex-col h-full">
        {/* IMAGE AREA */}
        <div className="h-48 bg-gray-200 w-full flex items-center justify-center text-gray-500 relative">
            {crop.imageUrl ? (
            <img src={crop.imageUrl} alt={crop.title} className="w-full h-full object-cover" />
            ) : <span className="text-gray-400">No Image</span>}
            
            <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded-md text-xs font-bold text-gray-700 shadow-sm flex items-center gap-2">
                {crop.sellerName}
                {!isMyCrop && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsReportModalOpen(true); }}
                        className="text-red-400 hover:text-red-600 p-0.5"
                        title="Report this user"
                    >
                        <AlertTriangle size={14} />
                    </button>
                )}
            </div>
        </div>
        
        {/* DETAILS AREA */}
        <div className="p-4 flex flex-col flex-grow">
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{crop.title}</h3>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    crop.type === 'Donation' ? 'bg-purple-100 text-purple-700' : 
                    crop.type === 'Barter' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                }`}>
                    {crop.type}
                </span>
            </div>
            <div className="text-2xl font-bold text-saka-green mb-3">
                {crop.type === 'Donation' ? 'Free' : `₱${crop.price_per_kg}/kg`}
            </div>
            
            <div className="space-y-2 text-sm text-gray-500 mb-4 flex-grow">
                <div className="flex items-center gap-2"><MapPin size={16} /> <span className="truncate">{crop.location}</span></div>
                <div className="flex items-center gap-2"><Scale size={16} /> {crop.quantity_kg} kg available</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <button 
                    onClick={handleRequest}
                    disabled={isMyCrop}
                    className={`py-2 rounded-lg transition flex items-center justify-center gap-1 text-sm font-bold ${
                        isMyCrop ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    <MessageCircle size={16} /> Chat
                </button>
                
                {!isMyCrop ? (
                    <button 
                        onClick={openOfferModal}
                        className="bg-saka-green text-white py-2 rounded-lg hover:bg-saka-dark transition flex items-center justify-center gap-1 text-sm font-bold"
                    >
                        <ShoppingCart size={16} /> {crop.type === 'Donation' ? 'Request' : 'Offer'}
                    </button>
                ) : (
                    <div className="bg-gray-50 text-gray-400 py-2 rounded-lg flex items-center justify-center text-xs font-bold border border-gray-200">
                        Your Listing
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* --- OFFER MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm relative shadow-2xl animate-in fade-in zoom-in duration-200">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    {crop.type === 'Donation' ? 'Request Donation' : crop.type === 'Barter' ? 'Offer Barter' : 'Make an Offer'}
                </h3>
                
                {/* Crop Summary */}
                <div className="mb-4 bg-gray-50 p-3 rounded-lg flex gap-3 items-center border border-gray-100">
                    <div className="w-12 h-12 bg-gray-200 rounded-md overflow-hidden shrink-0">
                        {crop.imageUrl && <img src={crop.imageUrl} className="w-full h-full object-cover" alt="crop"/>}
                    </div>
                    <div>
                        <p className="font-bold text-sm text-gray-800">{crop.title}</p>
                        <p className="text-xs text-gray-500">Asking: <span className="text-saka-green font-bold">₱{crop.price_per_kg}/kg</span></p>
                    </div>
                </div>

                <form onSubmit={handleConfirmOffer} className="space-y-4">
                    
                    {/* -- QUANTITY INPUT (For All Types) -- */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (kg)</label>
                        <input 
                            type="number" min="1" max={crop.quantity_kg}
                            value={offerData.quantity} 
                            onChange={(e) => setOfferData({...offerData, quantity: e.target.value})}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-saka-green outline-none font-medium"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1 text-right">Max available: {crop.quantity_kg}kg</p>
                    </div>

                    {/* -- FOR SALE: COUNTER OFFER PRICE -- */}
                    {crop.type === 'For Sale' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                <Tag size={14} className="text-saka-green"/> Your Counter Offer (₱/kg)
                            </label>
                            <input 
                                type="number" min="1" 
                                value={offerData.price} 
                                onChange={(e) => setOfferData({...offerData, price: e.target.value})}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-saka-green outline-none font-medium text-lg text-saka-green"
                                required
                            />
                            
                            <div className="flex justify-between items-center border-t pt-4 mt-2">
                                <span className="text-gray-600 font-medium">Total:</span>
                                <span className="text-xl font-bold text-saka-green">
                                    ₱{(offerData.quantity * offerData.price).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* -- BARTER INPUTS -- */}
                    {crop.type === 'Barter' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">What item are you trading?</label>
                                <input 
                                    type="text" placeholder="e.g. 1 Sack of Rice"
                                    value={offerData.barterItem}
                                    onChange={(e) => setOfferData({...offerData, barterItem: e.target.value})}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Trade Quantity</label>
                                <input 
                                    type="text" placeholder="e.g. 50 kg"
                                    value={offerData.barterQuantity}
                                    onChange={(e) => setOfferData({...offerData, barterQuantity: e.target.value})}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                    required
                                />
                            </div>
                        </>
                    )}

                    {/* -- DONATION INPUTS -- */}
                    {crop.type === 'Donation' && (
                        <>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Organization / Cooperative Name</label>
                                <input 
                                    type="text" placeholder="e.g. Cebu Food Bank"
                                    value={offerData.organizationName}
                                    onChange={(e) => setOfferData({...offerData, organizationName: e.target.value})}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    required
                                />
                            </div>
                            <div className="border-t pt-2">
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Proof of Legitimacy (Required)</label>
                                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer bg-purple-50 hover:bg-purple-100 transition">
                                    <div className="flex flex-col items-center justify-center pt-2 pb-3">
                                        {offerData.proofFile ? (
                                            <>
                                                <FileText className="text-purple-600 mb-1" size={24}/>
                                                <p className="text-xs text-purple-700 font-bold">{offerData.proofFile.name}</p>
                                            </>
                                            ) : (
                                            <>
                                                <Upload className="text-purple-400 mb-1" size={24}/>
                                                <p className="text-xs text-gray-500">Upload ID or Document</p>
                                            </>
                                            )}
                                    </div>
                                    <input 
                                        type="file" className="hidden" accept="image/*,.pdf"
                                        onChange={(e) => setOfferData({...offerData, proofFile: e.target.files[0]})}
                                        required
                                    />
                                </label>
                            </div>
                        </>
                    )}

                    <button disabled={isSubmitting} className={`w-full text-white py-3 rounded-lg font-bold transition shadow-md ${
                        crop.type === 'Donation' ? 'bg-purple-600 hover:bg-purple-700' : 
                        crop.type === 'Barter' ? 'bg-orange-500 hover:bg-orange-600' : 
                        'bg-saka-green hover:bg-saka-dark'
                    }`}>
                        {isSubmitting ? 'Sending...' : 'Send Offer'}
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* --- REPORT MODAL TARGETING THE SELLER --- */}
      {isReportModalOpen && user && (
          <ReportModal 
            target={{ id: crop.sellerId, name: crop.sellerName }}
            targetType="User"
            reporterId={user.id}
            onClose={() => setIsReportModalOpen(false)}
          />
      )}
    </>
  );
}