// import { useState, useEffect } from 'react';
// import { db, auth } from '../../config/firebase';
// import { collection, getDocs, deleteDoc, doc, updateDoc, addDoc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
// import { useNavigate } from 'react-router-dom';
// import { API_URL } from '../../config/api'; 
// import { 
//   Trash2, ShieldAlert, User, Sprout, Loader2, AlertTriangle, 
//   TrendingUp, TrendingDown, Minus, BarChart3, MessageCircle, Gavel, Eye,
//   HelpCircle, CheckCircle, X, Send
// } from 'lucide-react';
// import { 
//   BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell 
// } from 'recharts';

// export default function AdminDashboard() {
//   const navigate = useNavigate();
//   const [activeTab, setActiveTab] = useState('market_intel'); 
  
//   // Data States
//   const [users, setUsers] = useState([]);
//   const [crops, setCrops] = useState([]);
//   const [complaints, setComplaints] = useState([]); 
//   const [tickets, setTickets] = useState([]);       
  
//   // AI Market Data States
//   const [predictions, setPredictions] = useState([]);
//   const [marketStats, setMarketStats] = useState({ up: 0, down: 0, stable: 0 });

//   // Modal State
//   const [modal, setModal] = useState({ 
//     isOpen: false, 
//     type: 'reply', // 'reply' (blue) or 'warn' (red)
//     targetId: null,
//     targetName: '', // Added to store name for chat metadata
//     contextHeader: '', 
//     contextBody: '' 
//   });
//   const [messageInput, setMessageInput] = useState('');
//   const [isSending, setIsSending] = useState(false);

//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       try {
//         const [userSnap, complaintSnap, ticketSnap] = await Promise.all([
//           getDocs(collection(db, "users")),
//           getDocs(collection(db, "complaints")),
//           getDocs(collection(db, "tickets"))
//         ]);

//         setUsers(userSnap.docs.map(d => ({ id: d.id, ...d.data() })));
//         setComplaints(complaintSnap.docs.map(d => ({ id: d.id, ...d.data() })));
//         setTickets(ticketSnap.docs.map(d => ({ id: d.id, ...d.data() }))); 

//         const cropsResponse = await fetch(`${API_URL}/api/crops`);
//         if (cropsResponse.ok) {
//             const cropsData = await cropsResponse.json();
//             setCrops(cropsData.map(c => ({ ...c, id: c._id }))); 
//         }

//         const aiResponse = await fetch('http://localhost:5000/api/predictedPrices/latest');
//         if (aiResponse.ok) {
//           const data = await aiResponse.json();
//           setPredictions(data);
          
//           const up = data.filter(i => i.trend === 'UP').length;
//           const down = data.filter(i => i.trend === 'DOWN').length;
//           const stable = data.filter(i => i.trend === 'STABLE').length;
//           setMarketStats({ up, down, stable });
//         }

//       } catch (error) {
//         console.error("Dashboard fetch error:", error);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, []);

//   // --- ACTIONS ---

//   const handleBanUser = async (userId, currentStatus) => {
//     if (!userId) return alert("Error: User ID missing");
//     if (!confirm(`Are you sure you want to ${currentStatus === 'banned' ? 'unban' : 'ban'} this user?`)) return;
//     try {
//       const newRole = currentStatus === 'banned' ? 'Member' : 'banned';
//       await updateDoc(doc(db, "users", userId), { role: newRole });
//       setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
//       if (newRole === 'banned') alert("User has been banned.");
//     } catch (error) { console.error(error); }
//   };

//   const handleDeleteCrop = async (cropId) => {
//     if (!confirm("Delete this listing permanently?")) return;
//     try {
//       const response = await fetch(`${API_URL}/api/crops/${cropId}`, {
//           method: 'DELETE',
//       });

//       if (response.ok) {
//           setCrops(crops.filter(c => c.id !== cropId));
//           alert("Listing deleted.");
//       } else {
//           alert("Failed to delete listing.");
//       }
//     } catch (error) { console.error(error); }
//   };

//   const handleResolveTicket = async (ticketId) => {
//       try {
//           await updateDoc(doc(db, "tickets", ticketId), { status: 'resolved' });
//           setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: 'resolved' } : t));
//       } catch (error) {
//           console.error("Error resolving ticket:", error);
//       }
//   };

//   // --- MODAL & MESSAGING LOGIC ---

//   const openTicketModal = (userId, userName, ticketId, subject, originalMessage) => {
//     setModal({
//       isOpen: true,
//       type: 'reply', // Blue Theme
//       targetId: userId,
//       targetName: userName,
//       contextHeader: `Ticket #${ticketId}: ${subject}`,
//       contextBody: originalMessage
//     });
//     setMessageInput('');
//   };

//   const openWarnModal = (userId, userName, reason) => {
//     setModal({
//       isOpen: true,
//       type: 'warn', // Red Theme
//       targetId: userId,
//       targetName: userName,
//       contextHeader: '⚠️ OFFICIAL WARNING',
//       contextBody: reason || 'Violation of terms'
//     });
//     setMessageInput('');
//   };

//   const handleSubmitModal = async (e) => {
//     e.preventDefault();
//     if (!messageInput.trim()) return;
//     setIsSending(true);

//     try {
//       const adminId = auth.currentUser?.uid; 
//       if (!adminId) { 
//           alert("Admin not authenticated. Cannot send message."); 
//           setIsSending(false);
//           return; 
//       }

//       // 1. Construct the formatted message
//       let finalMessage = "";
//       // Flag to mark the message as a special report/warning card in Chat.js
//       let isReportMsg = false; 

//       if (modal.type === 'reply') {
//           finalMessage = `REFERENCE: ${modal.contextHeader}\n"${modal.contextBody}"\n\n💬 ADMIN REPLY:\n${messageInput}`;
//       } else {
//           finalMessage = `${modal.contextHeader}\nReason: ${modal.contextBody}\n\n📢 ADMIN MESSAGE:\n${messageInput}`;
//           isReportMsg = true;
//       }

//       // 2. GENERATE SORTED CHAT ID (This matches your Chat.js logic exactly)
//       const chatId = [adminId, modal.targetId].sort().join("_");

//       // 3. Add Message to Subcollection
//       await addDoc(collection(db, `chats/${chatId}/messages`), {
//         text: finalMessage,
//         senderId: adminId,
//         senderName: "Admin",
//         createdAt: serverTimestamp(),
//         isReport: modal.type === 'warn',       // TRUE if Warning (Red Card)
//         isTicketReply: modal.type === 'reply'  // TRUE if Reply (Blue Card) <--- ADD THIS LINE
//       });

//       // 4. Update/Create Conversation Metadata (So it appears in User's Sidebar)
//       // We need to fetch Admin info briefly to ensure metadata is complete
//       let adminData = { username: "Admin", email: "admin@sakanect.com" };
//       try {
//           const adminDoc = await getDoc(doc(db, "users", adminId));
//           if(adminDoc.exists()) adminData = adminDoc.data();
//       } catch(err) { console.log("Could not fetch admin details, using defaults"); }

//       const conversationData = {
//         participants: [adminId, modal.targetId], 
//         lastMessage: finalMessage, 
//         lastSenderId: adminId,
//         lastMessageTime: serverTimestamp(),
//         // Crucial: This map structure allows Chat.js to find names/photos
//         users: { 
//           [adminId]: { 
//               name: adminData.name || "Admin", 
//               username: "Admin", 
//               email: adminData.email, 
//               photoURL: adminData.photoURL || null 
//           }, 
//           [modal.targetId]: { 
//               name: modal.targetName || "User", 
//               username: modal.targetName || "User", 
//               email: "", // Optional if not available here
//               photoURL: null 
//           } 
//         },
//         // Mark as unread for the user
//         unreadBy: [modal.targetId] 
//       };

//       // Use setDoc with merge: true to create or update
//       await setDoc(doc(db, "conversations", chatId), conversationData, { merge: true });

//       // 5. (Optional) If warning, also send Notification
//       if (modal.type === 'warn') {
//         await addDoc(collection(db, "notifications"), {
//             user_id: modal.targetId,
//             type: 'warning',
//             message: `⚠️ WARNING: ${messageInput}`,
//             read: false,
//             created_at: serverTimestamp()
//         });
//       }

//       setModal({ ...modal, isOpen: false });
//       alert(modal.type === 'reply' ? "Reply sent!" : "Warning sent!");

//     } catch (error) {
//       console.error("Error sending message:", error);
//       alert("Failed to send message. Check console.");
//     } finally {
//       setIsSending(false);
//     }
//   };

//   if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-green-600" size={40} /></div>;

//   return (
//     <div className="container mx-auto p-6 bg-gray-50 min-h-screen relative">
//       <div className="flex items-center gap-3 mb-8">
//         <ShieldAlert className="text-green-700" size={32} />
//         <h1 className="text-3xl font-bold text-gray-800">SakaNect Command Center</h1>
//       </div>

//       {/* Tabs */}
//       <div className="flex gap-4 border-b mb-6 overflow-x-auto bg-white p-2 rounded-lg shadow-sm">
//         <TabButton active={activeTab === 'market_intel'} onClick={() => setActiveTab('market_intel')} icon={<BarChart3 size={18} />} label="Market Intel" />
//         <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<User size={18} />} label="Users" />
//         <TabButton active={activeTab === 'crops'} onClick={() => setActiveTab('crops')} icon={<Sprout size={18} />} label="Listings" />
//         <TabButton active={activeTab === 'complaints'} onClick={() => setActiveTab('complaints')} icon={<AlertTriangle size={18} />} label={`Reports (${complaints.length})`} />
//         <TabButton active={activeTab === 'tickets'} onClick={() => setActiveTab('tickets')} icon={<HelpCircle size={18} />} label={`Tickets (${tickets.filter(t => t.status !== 'resolved').length})`} />
//       </div>

//       {/* --- MODAL POPUP --- */}
//       {modal.isOpen && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className={`bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border-t-8 ${modal.type === 'warn' ? 'border-red-600' : 'border-blue-600'}`}>
//             {/* Header */}
//             <div className={`p-4 flex justify-between items-center ${modal.type === 'warn' ? 'bg-red-50' : 'bg-blue-50'}`}>
//               <div className="flex items-center gap-2">
//                 {modal.type === 'warn' ? <AlertTriangle className="text-red-600" size={20}/> : <MessageCircle className="text-blue-600" size={20}/>}
//                 <h3 className={`font-bold text-lg ${modal.type === 'warn' ? 'text-red-700' : 'text-blue-700'}`}>
//                   {modal.type === 'warn' ? 'Send Warning' : 'Reply to Ticket'}
//                 </h3>
//               </div>
//               <button onClick={() => setModal({...modal, isOpen: false})} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
//             </div>
            
//             {/* Context (The Ticket or Report info) */}
//             <div className="p-4 bg-gray-50 border-b text-sm text-gray-600">
//               <p className="font-bold text-gray-700 mb-1">{modal.contextHeader}</p>
//               <div className="bg-white p-2 rounded border border-gray-200 italic text-gray-500 line-clamp-3">
//                 "{modal.contextBody}"
//               </div>
//             </div>

//             {/* Input Area */}
//             <form onSubmit={handleSubmitModal} className="p-4">
//               <textarea 
//                 className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:outline-none min-h-[120px] resize-none text-gray-800 placeholder-gray-400"
//                 placeholder={modal.type === 'warn' ? "Type warning message here..." : "Type your reply here..."}
//                 value={messageInput}
//                 onChange={(e) => setMessageInput(e.target.value)}
//                 onKeyDown={(e) => {
//                     // Send on Enter (without Shift)
//                     if(e.key === 'Enter' && !e.shiftKey) {
//                         e.preventDefault(); 
//                         handleSubmitModal(e);
//                     }
//                 }}
//                 autoFocus
//               ></textarea>
//               <p className="text-xs text-gray-400 mt-1 text-right">Press Enter to send</p>
              
//               <div className="flex justify-end gap-2 mt-4">
//                 <button type="button" onClick={() => setModal({...modal, isOpen: false})} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
//                 <button 
//                   type="submit" 
//                   disabled={isSending || !messageInput.trim()}
//                   className={`px-6 py-2 rounded-lg font-bold text-white flex items-center gap-2 shadow-sm transition-all transform active:scale-95 ${modal.type === 'warn' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
//                 >
//                   {isSending ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>}
//                   {modal.type === 'warn' ? 'Warn User' : 'Send Reply'}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Content Sections */}
//       {activeTab === 'market_intel' && (
//         <div className="space-y-6">
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//             <StatCard title="PRICE HIKES" count={marketStats.up} desc="Crops trending UP" color="text-red-600" bgColor="bg-red-50" borderColor="border-red-500" Icon={TrendingUp} />
//             <StatCard title="PRICE DROPS" count={marketStats.down} desc="Crops trending DOWN" color="text-green-600" bgColor="bg-green-50" borderColor="border-green-500" Icon={TrendingDown} />
//             <StatCard title="STABLE MARKET" count={marketStats.stable} desc="Steady commodities" color="text-blue-600" bgColor="bg-blue-50" borderColor="border-blue-500" Icon={Minus} />
//           </div>
//           {/* AI Charts */}
//           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//             <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border">
//               <h3 className="text-xl font-bold text-gray-800 mb-4">📋 7-Day AI Forecast</h3>
//               <div className="overflow-x-auto h-96">
//                 <table className="w-full text-left border-collapse">
//                   <thead className="bg-gray-50 sticky top-0">
//                     <tr className="text-xs font-bold text-gray-500 uppercase">
//                       <th className="p-3">Crop</th><th className="p-3">Current</th><th className="p-3">Predicted</th><th className="p-3">Trend</th><th className="p-3">Reason</th>
//                     </tr>
//                   </thead>
//                   <tbody className="text-sm divide-y">
//                     {predictions.map((item, idx) => (
//                       <tr key={idx} className="hover:bg-gray-50">
//                         <td className="p-3 font-medium">{item.crop}</td>
//                         <td className="p-3">₱{item.current_price}</td>
//                         <td className="p-3 font-bold">₱{item.predicted_price}</td>
//                         <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${item.trend === 'UP' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{item.trend}</span></td>
//                         <td className="p-3 text-xs text-gray-500 truncate max-w-[150px]" title={item.reason}>{item.reason}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//             <div className="bg-white p-6 rounded-xl shadow-sm border flex flex-col">
//               <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Top Movers</h3>
//               <div className="flex-1 min-h-[250px]">
//                 <ResponsiveContainer width="100%" height="100%">
//                   <BarChart data={predictions.slice(0, 5)}>
//                     <XAxis dataKey="crop" tick={{fontSize: 10}} interval={0} />
//                     <YAxis />
//                     <Tooltip />
//                     <Bar dataKey="predicted_price" radius={[4, 4, 0, 0]}>
//                       {predictions.slice(0, 5).map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.trend === 'UP' ? '#ef4444' : '#10b981'} />))}
//                     </Bar>
//                   </BarChart>
//                 </ResponsiveContainer>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {activeTab === 'users' && (
//         <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
//            {/* Normal chat navigation for user list */}
//            <UserTable users={users} handleBanUser={handleBanUser} handleChatUser={(uid, name) => navigate('/chat', { state: { sellerId: uid, sellerName: name, cropTitle: 'Admin Support' } })} />
//         </div>
//       )}

//       {activeTab === 'crops' && (
//         <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
//            <CropTable crops={crops} handleDeleteCrop={handleDeleteCrop} />
//         </div>
//       )}

//       {activeTab === 'complaints' && (
//         <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
//            <ComplaintTable 
//              complaints={complaints} 
//              setComplaints={setComplaints} 
//              openWarnModal={openWarnModal}
//              handleBanUser={handleBanUser}
//              handleChatUser={(uid, name) => navigate('/chat', { state: { sellerId: uid, sellerName: name, cropTitle: 'Admin Case' } })}
//            />
//         </div>
//       )}

//       {activeTab === 'tickets' && (
//         <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
//            <TicketTable 
//              tickets={tickets} 
//              handleResolveTicket={handleResolveTicket} 
//              openTicketModal={openTicketModal}
//            />
//         </div>
//       )}
//     </div>
//   );
// }

// // --- SUB-COMPONENTS ---

// function TabButton({ active, onClick, icon, label }) {
//   return (
//     <button onClick={onClick} className={`pb-2 px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-all ${active ? 'bg-green-50 text-green-700 border-green-200 border' : 'text-gray-500 hover:bg-gray-50'}`}>
//       {icon} {label}
//     </button>
//   );
// }

// function StatCard({ title, count, desc, color, bgColor, borderColor, Icon }) {
//   return (
//     <div className={`p-6 rounded-xl shadow-sm border-l-4 flex items-center justify-between bg-white ${borderColor}`}>
//       <div>
//         <p className="text-gray-500 text-xs font-bold uppercase tracking-wide">{title}</p>
//         <h2 className={`text-4xl font-bold my-1 ${color}`}>{count}</h2>
//         <p className="text-xs text-gray-400">{desc}</p>
//       </div>
//       <div className={`p-3 rounded-full ${bgColor}`}>
//         <Icon size={24} className={color} />
//       </div>
//     </div>
//   );
// }

// function UserTable({ users, handleBanUser, handleChatUser }) {
//     return (
//         <table className="w-full text-left border-collapse">
//             <thead className="bg-gray-50">
//                 <tr><th className="p-4 font-semibold text-gray-600">User</th><th className="p-4 font-semibold text-gray-600">Email</th><th className="p-4 font-semibold text-gray-600">Status</th><th className="p-4 font-semibold text-gray-600 text-right">Actions</th></tr>
//             </thead>
//             <tbody>
//                 {users.map(u => (
//                     <tr key={u.id} className="border-t hover:bg-gray-50">
//                         <td className="p-4"><p className="font-bold text-gray-800">{u.username || u.name || "No Name"}</p><p className="text-xs text-gray-500">{u.id}</p></td>
//                         <td className="p-4 text-sm text-gray-600">{u.email}</td>
//                         <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'banned' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{u.role || 'Member'}</span></td>
//                         <td className="p-4 text-right flex justify-end gap-2">
//                             <button onClick={() => handleChatUser(u.id, u.name)} className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100" title="Chat"><MessageCircle size={16} /></button>
//                             <button onClick={() => handleBanUser(u.id, u.role)} className={`text-sm font-bold px-3 py-1 rounded ${u.role === 'banned' ? 'bg-gray-200 text-gray-700' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>{u.role === 'banned' ? 'Unban' : 'Ban'}</button>
//                         </td>
//                     </tr>
//                 ))}
//             </tbody>
//         </table>
//     );
// }

// function CropTable({ crops, handleDeleteCrop }) {
//     return (
//         <table className="w-full text-left border-collapse">
//             <thead className="bg-gray-50">
//                 <tr><th className="p-4 font-semibold text-gray-600">Details</th><th className="p-4 font-semibold text-gray-600">Price/Loc</th><th className="p-4 font-semibold text-gray-600">Type</th><th className="p-4 font-semibold text-gray-600 text-right">Actions</th></tr>
//             </thead>
//             <tbody>
//                 {crops.length === 0 && <tr><td colSpan="4" className="p-6 text-center text-gray-500">No listings found.</td></tr>}
//                 {crops.map(c => (
//                     <tr key={c.id} className="border-t hover:bg-gray-50">
//                         <td className="p-4">
//                             <div className="flex items-center gap-3">
//                                 <div className="w-10 h-10 bg-gray-200 rounded overflow-hidden">{c.imageUrl && <img src={c.imageUrl} className="w-full h-full object-cover" alt={c.title} />}</div>
//                                 <div><p className="font-bold text-gray-800">{c.title}</p><p className="text-xs text-gray-500">by {c.sellerName || "Unknown"}</p></div>
//                             </div>
//                         </td>
//                         <td className="p-4 text-sm text-gray-600">{c.quantity_kg}kg • ₱{c.price_per_kg} • {c.location}</td>
//                         <td className="p-4"><span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-bold">{c.type}</span></td>
//                         <td className="p-4 text-right"><button onClick={() => handleDeleteCrop(c.id)} className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100" title="Delete"><Trash2 size={18} /></button></td>
//                     </tr>
//                 ))}
//             </tbody>
//         </table>
//     );
// }

// function ComplaintTable({ complaints, setComplaints, openWarnModal, handleBanUser, handleChatUser }) {
//     const handleDismiss = async (complaintId) => {
//         if (!confirm("Dismiss this report?")) return;
//         try {
//             await deleteDoc(doc(db, "complaints", complaintId));
//             setComplaints(complaints.filter(c => c.id !== complaintId));
//         } catch (error) { console.error(error); }
//     };

//     return (
//         <table className="w-full text-left border-collapse">
//             <thead className="bg-red-50">
//                 <tr><th className="p-4 font-semibold text-red-600">Reported User</th><th className="p-4 font-semibold text-red-600">Reason</th><th className="p-4 font-semibold text-red-600">Status</th><th className="p-4 font-semibold text-red-600 text-right">Actions</th></tr>
//             </thead>
//             <tbody>
//                 {complaints.length === 0 && <tr><td colSpan="4" className="p-10 text-center text-gray-500">No reports pending.</td></tr>}
//                 {complaints.map(c => {
//                     const targetId = c.accused_user_id || c.targetId;
//                     const reasonText = c.type || c.reason || "No Reason";
//                     const targetName = c.targetName || "Unknown User";

//                     return (
//                         <tr key={c.id} className="border-t hover:bg-gray-50">
//                             <td className="p-4">
//                                 <p className="font-bold text-gray-800">{targetName}</p>
//                                 <p className="text-xs text-gray-500">{c.reporterName ? `By: ${c.reporterName}` : 'Anonymous'}</p>
//                                 {c.proofUrl && (<a href={c.proofUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"><Eye size={12}/> View Proof</a>)}
//                             </td>
//                             <td className="p-4"><span className="font-medium text-red-600 block">{reasonText}</span><span className="text-xs text-gray-500 line-clamp-2">{c.description}</span></td>
//                             <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${c.status === 'warned' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>{c.status || 'Pending'}</span></td>
//                             <td className="p-4 text-right">
//                                 <div className="flex justify-end gap-2">
//                                     <button 
//                                         onClick={() => handleChatUser(targetId, targetName)} 
//                                         className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition" 
//                                         title="Chat with User"
//                                     >
//                                         <MessageCircle size={16} />
//                                     </button>
//                                     <button onClick={() => openWarnModal(targetId, targetName, reasonText)} className="p-2 bg-yellow-50 text-yellow-600 rounded hover:bg-yellow-100" title="Warn"><AlertTriangle size={16} /></button>
//                                     <button onClick={() => handleBanUser(targetId, 'Member')} className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100" title="Ban"><Gavel size={16} /></button>
//                                     <button onClick={() => handleDismiss(c.id)} className="p-2 bg-gray-100 text-gray-500 rounded hover:bg-gray-200" title="Dismiss"><Trash2 size={16} /></button>
//                                 </div>
//                             </td>
//                         </tr>
//                     );
//                 })}
//             </tbody>
//         </table>
//     );
// }

// function TicketTable({ tickets, handleResolveTicket, openTicketModal }) {
//     return (
//         <table className="w-full text-left border-collapse">
//             <thead className="bg-blue-50">
//                 <tr>
//                     <th className="p-4 font-semibold text-blue-700">User / Email</th>
//                     <th className="p-4 font-semibold text-blue-700">Subject / Category</th>
//                     <th className="p-4 font-semibold text-blue-700">Message</th>
//                     <th className="p-4 font-semibold text-blue-700 text-right">Actions</th>
//                 </tr>
//             </thead>
//             <tbody>
//                 {tickets.length === 0 && (
//                     <tr><td colSpan="4" className="p-10 text-center text-gray-500">No support tickets.</td></tr>
//                 )}
//                 {tickets.map(t => (
//                     <tr key={t.id} className="border-t hover:bg-gray-50">
//                         <td className="p-4">
//                             <p className="font-bold text-gray-800">{t.userName || "Unknown"}</p>
//                             <p className="text-xs text-gray-500">{t.email}</p>
//                         </td>
//                         <td className="p-4">
//                             <p className="font-medium text-gray-800">{t.subject}</p>
//                             <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">{t.category}</span>
//                         </td>
//                         <td className="p-4">
//                             <p className="text-sm text-gray-600 line-clamp-2" title={t.message}>{t.message}</p>
//                             <p className="text-xs text-gray-400 mt-1">Status: <span className={`font-bold ${t.status === 'resolved' ? 'text-green-600' : 'text-orange-500'}`}>{t.status || 'open'}</span></p>
//                         </td>
//                         <td className="p-4 text-right">
//                             <div className="flex justify-end gap-2">
//                                 <button 
//                                     onClick={() => openTicketModal(t.userId, t.userName, t.id, t.subject, t.message)}
//                                     className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 flex items-center gap-1 text-xs font-bold"
//                                     title="Reply via Chat"
//                                 >
//                                     <MessageCircle size={16} /> Reply
//                                 </button>

//                                 {t.status !== 'resolved' && (
//                                     <button 
//                                         onClick={() => handleResolveTicket(t.id)} 
//                                         className="p-2 bg-green-50 text-green-600 rounded hover:bg-green-100 flex items-center gap-1 text-xs font-bold"
//                                         title="Mark as Resolved"
//                                     >
//                                         <CheckCircle size={16} /> Resolve
//                                     </button>
//                                 )}
//                             </div>
//                         </td>
//                     </tr>
//                 ))}
//             </tbody>
//         </table>
//     );
// }