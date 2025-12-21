import { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot, orderBy, getDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { updateTransactionStatus } from './transactionService';
import { ArrowUpRight, ArrowDownLeft, Clock, Calendar, Loader2, Package, CreditCard, CheckCircle } from 'lucide-react';

// --- SWEETALERT IMPORT ---
import Swal from 'sweetalert2';

export default function Transactions() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('buying'); 
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. HANDLE TAB CHANGE
  const handleTabChange = (tab) => {
    if (tab !== activeTab) {
        setLoading(true); 
        setOrders([]);    
        setActiveTab(tab);
    }
  };

  // 2. FETCH DATA
  useEffect(() => {
    if (!user) return;

    const field = activeTab === 'buying' ? 'buyerId' : 'sellerId';
    const q = query(collection(db, "transactions"), where(field, "==", user.id), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, async (snap) => {
        const fetchedOrders = await Promise.all(snap.docs.map(async (document) => {
            const data = document.data();
            
            // --- FIX FOR MISSING SELLER NAME ---
            let displaySellerName = data.sellerName || "Unknown Seller";
            
            if (activeTab === 'buying' && !data.sellerName && data.sellerId) {
                try {
                    const sellerDoc = await getDoc(doc(db, "users", data.sellerId));
                    if (sellerDoc.exists()) {
                        displaySellerName = sellerDoc.data().username || sellerDoc.data().name || "Seller";
                    }
                } catch (e) {
                    console.log("Could not fetch seller name", e);
                }
            }

            return {
                id: document.id,
                ...data,
                cropTitle: data.cropTitle || "Unknown Item",
                totalPrice: data.price_total || 0,      
                quantity: data.quantity_kg || 0,        
                sellerName: displaySellerName,
                buyerName: data.buyerName || "Unknown Buyer",
                status: data.status || 'pending',
                type: data.type || 'Order',
                imageUrl: data.cropImage || null
            };
        }));
        
        setOrders(fetchedOrders);
        setLoading(false);
      },
      (error) => {
        console.error("Transaction Fetch Error:", error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user, activeTab]);

  // --- UPDATED STATUS HANDLER ---
  const handleStatus = async (id, newStatus) => {
    // Customize text based on status
    let title = 'Update Status?';
    let text = `Mark this order as ${newStatus}?`;
    let confirmBtnText = 'Yes, update it!';

    if (newStatus === 'paid') {
        title = 'Confirm Payment Received?';
        text = 'Only click this if you have received the Down Payment or Full Payment externally (e.g., GCash/Cash). This verifies the buyer is legitimate.';
        confirmBtnText = 'Yes, Payment Verified';
    } else if (newStatus === 'completed') {
        title = 'Complete Transaction?';
        text = 'This means the items have been successfully delivered/picked up.';
        confirmBtnText = 'Yes, Order Complete';
    }

    const result = await Swal.fire({
        title: title,
        text: text,
        icon: newStatus === 'paid' ? 'info' : 'question',
        showCancelButton: true,
        confirmButtonColor: '#16a34a', 
        cancelButtonColor: '#6b7280',
        confirmButtonText: confirmBtnText
    });

    if (result.isConfirmed) {
        try {
            await updateTransactionStatus(id, newStatus);
            Swal.fire({
                icon: 'success',
                title: 'Updated!',
                text: `Order status changed to: ${newStatus.toUpperCase()}.`,
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error("Update failed:", error);
            Swal.fire('Error', 'Failed to update transaction status.', 'error');
        }
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Just now";
    return new Date(timestamp.seconds * 1000).toLocaleDateString("en-US", {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // Helper for Status Colors
  const getStatusColor = (status) => {
      switch(status) {
          case 'pending': return 'bg-orange-100 text-orange-600 border-orange-200';
          case 'accepted': return 'bg-blue-100 text-blue-600 border-blue-200';
          case 'paid': return 'bg-purple-100 text-purple-600 border-purple-200'; // New Status Color
          case 'completed': return 'bg-green-100 text-green-600 border-green-200';
          case 'rejected': return 'bg-red-100 text-red-600 border-red-200';
          default: return 'bg-gray-100 text-gray-600';
      }
  };

  return (
    <div className="container mx-auto px-6 max-w-4xl h-full flex flex-col">
      
      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-gray-50 pt-6 pb-2">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Transaction History</h1>

        {/* TABS */}
        <div className="flex gap-4 border-b border-gray-200">
            <button 
                onClick={() => handleTabChange('buying')}
                className={`pb-2 px-4 font-medium transition ${activeTab === 'buying' ? 'border-b-2 border-saka-green text-saka-green' : 'text-gray-500 hover:text-gray-700'}`}
            >
                My Orders (Buying)
            </button>
            <button 
                onClick={() => handleTabChange('selling')}
                className={`pb-2 px-4 font-medium transition ${activeTab === 'selling' ? 'border-b-2 border-saka-green text-saka-green' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Sales (Selling)
            </button>
        </div>
      </div>

      {/* LIST */}
      <div className="space-y-4 py-4">
        {loading ? (
              <div className="flex justify-center p-10"><Loader2 className="animate-spin text-saka-green"/></div>
        ) : orders.length === 0 ? (
            <div className="text-center py-12 bg-gray-100 rounded-xl border border-dashed border-gray-300">
                <Clock className="mx-auto text-gray-400 mb-2" size={32}/>
                <p className="text-gray-500">No {activeTab} transactions found.</p>
            </div>
        ) : (
            orders.map(order => (
                <div key={order.id} className="bg-white border rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        {/* ICON OR IMAGE */}
                        <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border">
                            {order.imageUrl ? (
                                <img src={order.imageUrl} alt="" className="w-full h-full object-cover"/>
                            ) : (
                                <div className={`w-full h-full flex items-center justify-center ${activeTab === 'buying' ? 'text-blue-500' : 'text-green-500'}`}>
                                    {activeTab === 'buying' ? <ArrowUpRight /> : <ArrowDownLeft />}
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                {order.cropTitle}
                            </h3>
                            <p className="text-sm text-gray-500 flex items-center gap-2">
                                <Calendar size={12}/> {formatDate(order.createdAt)}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                {activeTab === 'buying' ? `Seller: ${order.sellerName}` : `Buyer: ${order.buyerName}`}
                            </p>
                        </div>
                    </div>

                    <div className="text-right w-full md:w-auto">
                        <p className="font-bold text-lg text-saka-green">
                            {order.type === 'Donation' ? 'Donation' : `₱${order.totalPrice}`}
                        </p>
                        <p className="text-sm text-gray-500 flex items-center justify-end gap-1">
                            <Package size={14}/> {order.quantity} kg
                        </p>
                    </div>

                    {/* STATUS BADGE & ACTIONS */}
                    <div className="flex flex-col items-end gap-2 min-w-[140px]">
                        
                        {/* 1. Status Badge */}
                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusColor(order.status)}`}>
                            {order.status === 'paid' ? 'DP Paid / Verified' : order.status}
                        </div>

                        {/* 2. Seller Actions Flow */}
                        {activeTab === 'selling' && (
                            <>
                                {/* Step 1: Accept -> Confirm Payment */}
                                {order.status === 'accepted' && (
                                    <button 
                                        onClick={() => handleStatus(order.id, 'paid')} 
                                        className="w-full px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition shadow-sm flex items-center justify-center gap-1"
                                    >
                                        <CreditCard size={12} /> Confirm Payment
                                    </button>
                                )}

                                {/* Step 2: Paid -> Completed */}
                                {order.status === 'paid' && (
                                    <button 
                                        onClick={() => handleStatus(order.id, 'completed')} 
                                        className="w-full px-3 py-1.5 bg-saka-green text-white rounded-lg text-xs font-bold hover:bg-saka-dark transition shadow-sm flex items-center justify-center gap-1"
                                    >
                                        <CheckCircle size={12} /> Mark Completed
                                    </button>
                                )}
                            </>
                        )}
                        
                        {/* Buyer Visual Feedback */}
                        {activeTab === 'buying' && order.status === 'accepted' && (
                            <span className="text-[10px] text-gray-400 text-right">
                                Waiting for seller to<br/>verify payment
                            </span>
                        )}
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
}