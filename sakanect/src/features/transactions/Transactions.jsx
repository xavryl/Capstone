import { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { updateTransactionStatus } from './transactionService';
import { ArrowUpRight, ArrowDownLeft, Clock, Calendar, Loader2 } from 'lucide-react';

// --- SWEETALERT IMPORT ---
import Swal from 'sweetalert2';

export default function Transactions() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('buying'); // 'buying' or 'selling'
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

    // Define query based on tab
    const field = activeTab === 'buying' ? 'buyerId' : 'sellerId';
    const q = query(collection(db, "transactions"), where(field, "==", user.id), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, 
      (snap) => {
        setOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (error) => {
        console.error("Transaction Fetch Error:", error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user, activeTab]);

  const handleStatus = async (id, status) => {
    // --- SWEETALERT CONFIRMATION ---
    const result = await Swal.fire({
        title: 'Update Status?',
        text: `Mark this order as ${status}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#16a34a', // saka-green
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, update it!'
    });

    if (result.isConfirmed) {
        try {
            await updateTransactionStatus(id, status);
            Swal.fire({
                icon: 'success',
                title: 'Updated!',
                text: `Order marked as ${status}.`,
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

  return (
    <div className="container mx-auto px-6 max-w-4xl h-full flex flex-col">
      
      {/* STICKY HEADER WRAPPER */}
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

      {/* SCROLLABLE LIST */}
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
                        <div className={`p-3 rounded-full ${activeTab === 'buying' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                            {activeTab === 'buying' ? <ArrowUpRight /> : <ArrowDownLeft />}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">{order.cropTitle}</h3>
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
                            {order.type === 'Donation' ? 'Donation' : `₱${order.totalPrice || 0}`}
                        </p>
                        <p className="text-sm text-gray-500">{order.quantity} kg</p>
                    </div>

                    {/* STATUS BADGE */}
                    <div className="flex flex-col items-end gap-2">
                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                            ${order.status === 'pending' ? 'bg-orange-100 text-orange-600' : 
                            order.status === 'accepted' ? 'bg-blue-100 text-blue-600' :
                            order.status === 'completed' ? 'bg-green-100 text-green-600' : 
                            'bg-red-100 text-red-600'}`
                        }>
                            {order.status}
                        </div>

                        {/* Completion Action (Only for Seller if Accepted) */}
                        {activeTab === 'selling' && order.status === 'accepted' && (
                            <button 
                                onClick={() => handleStatus(order.id, 'completed')} 
                                className="px-3 py-1.5 bg-saka-green text-white rounded-lg text-xs font-bold hover:bg-saka-dark transition shadow-sm"
                            >
                                Mark Completed
                            </button>
                        )}
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
}