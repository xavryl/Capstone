// import { useState, useEffect, useRef } from 'react';
// import { db } from '../../config/firebase';
// import { 
//   collection, addDoc, query, where, getDocs, onSnapshot, 
//   orderBy, serverTimestamp, setDoc, doc, updateDoc, 
//   arrayUnion, arrayRemove, deleteDoc, writeBatch, getDoc 
// } from 'firebase/firestore';
// import { useAuth } from '../../context/AuthContext';
// import { useLocation, useNavigate } from 'react-router-dom';
// import { 
//   Send, User, Search, MessageSquare, UserPlus, 
//   Clock, Check, X as XIcon, ShoppingCart,
//   Trash2, UserMinus, MessageCircle, AlertTriangle, ShieldAlert 
// } from 'lucide-react';
// import ReportModal from '../complaints/ReportModal';
// import { updateTransactionStatus } from '../transactions/transactionService'; 

// export default function Chat() {
//   const { user: currentUser } = useAuth();
//   const location = useLocation();
//   const navigate = useNavigate(); 
  
//   const [activeChat, setActiveChat] = useState(null);
//   const [conversations, setConversations] = useState([]);
  
//   const [friends, setFriends] = useState([]); 
//   const [incomingRequests, setIncomingRequests] = useState([]);
//   const [outgoingRequests, setOutgoingRequests] = useState([]); 
  
//   const [activeTab, setActiveTab] = useState('chats'); 
//   const [searchResults, setSearchResults] = useState([]);
//   const [searchTerm, setSearchTerm] = useState('');
  
//   const [isReportModalOpen, setIsReportModalOpen] = useState(false);

//   // --- HANDLE NAVIGATION ---
//   useEffect(() => {
//     const initChatFromNav = async () => {
//       if (location.state?.sellerId && currentUser) {
//         const { sellerId, cropTitle, sellerName, reportReason, reportDetails } = location.state;
        
//         if (activeChat?.id === sellerId) return;

//         try {
//           const userDoc = await getDoc(doc(db, "users", sellerId));
          
//           let userData = {
//              name: "Unknown User",
//              username: "Unknown",
//              email: "",
//              photoURL: null
//           };

//           if (userDoc.exists()) {
//             userData = userDoc.data();
//           } else if (sellerName) {
//              userData.name = sellerName;
//              userData.username = sellerName;
//           }
          
//           let autoMessage = "";
//           let isReportContext = false;

//           if (reportReason) {
//               autoMessage = `⚠️ OFFICIAL NOTICE: You have been reported for "${reportReason}".\n\nDetails: ${reportDetails}\n\nPlease respond immediately or further action may be taken.`;
//               isReportContext = true;
//           } else if (cropTitle) {
//               autoMessage = `Hi, I am interested in your ${cropTitle}.`;
//           }

//           setActiveChat({
//             id: sellerId,
//             name: userData.name || userData.username || "User",
//             username: userData.username || userData.name || "User",
//             email: userData.email,
//             photoURL: userData.photoURL || null,
//             initialMessage: autoMessage, 
//             isReportContext: isReportContext 
//           });

//           navigate(location.pathname, { replace: true, state: {} });

//         } catch (error) {
//           console.error("Error initializing chat from nav:", error);
//         }
//       }
//     };

//     initChatFromNav();
//   }, [location.state, currentUser, activeChat, navigate, location.pathname]); 

//   // 1. Listen to MY Friends List
//   useEffect(() => {
//     if (!currentUser) return;
//     const unsub = onSnapshot(doc(db, "users", currentUser.id), async (docSnap) => {
//       if (docSnap.exists()) {
//         const friendIds = docSnap.data().friends || [];
//         if (friendIds.length > 0) {
//           const friendPromises = friendIds.map(fid => getDoc(doc(db, "users", fid)));
//           const friendSnaps = await Promise.all(friendPromises);
//           const friendList = friendSnaps
//             .filter(snap => snap.exists())
//             .map(snap => ({ id: snap.id, ...snap.data() }));
//           setFriends(friendList);
//         } else {
//           setFriends([]);
//         }
//       }
//     });
//     return () => unsub();
//   }, [currentUser]);

//   // 2. Listen to INCOMING Requests
//   useEffect(() => {
//     if (!currentUser) return;
//     const q = query(collection(db, "friend_requests"), where("toUid", "==", currentUser.id));
//     const unsub = onSnapshot(q, (snap) => {
//       const reqs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
//       setIncomingRequests(reqs);
//     });
//     return () => unsub();
//   }, [currentUser]);

//   // 3. Listen to OUTGOING Requests
//   useEffect(() => {
//     if (!currentUser) return;
//     const q = query(collection(db, "friend_requests"), where("fromUid", "==", currentUser.id));
//     const unsub = onSnapshot(q, (snap) => {
//       const reqs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
//       setOutgoingRequests(reqs.map(r => r.toUid));
//     });
//     return () => unsub();
//   }, [currentUser]);

//   // 4. Listen to Conversations
//   useEffect(() => {
//     if (!currentUser) return;
//     const q = collection(db, "conversations"); 
//     const unsub = onSnapshot(q, (snap) => {
//       const data = snap.docs
//         .map(doc => ({ id: doc.id, ...doc.data() }))
//         .filter(chat => chat.participants && chat.participants.includes(currentUser.id));
//       setConversations(data);
//     });
//     return () => unsub();
//   }, [currentUser]);

//   // 5. Search Logic
//   useEffect(() => {
//     const searchUsers = async () => {
//       if (searchTerm.trim() === '') {
//         setSearchResults([]);
//         return;
//       }
//       const q = query(
//         collection(db, "users"), 
//         where("username", ">=", searchTerm), 
//         where("username", "<=", searchTerm + '\uf8ff')
//       );
//       try {
//         const snapshot = await getDocs(q);
//         const foundUsers = snapshot.docs
//           .map(doc => ({ id: doc.id, ...doc.data() }))
//           .filter(u => u.id !== currentUser.id);
//         setSearchResults(foundUsers);
//       } catch (error) {
//         console.error("Search error:", error);
//       }
//     };
//     const delayDebounce = setTimeout(() => { searchUsers(); }, 500);
//     return () => clearTimeout(delayDebounce);
//   }, [searchTerm, currentUser?.id]);

//   // --- HANDLERS ---

//   const handleSelectChat = async (user) => {
//     setActiveChat({ 
//       name: user.name || user.username || "Unknown", 
//       id: user.id, 
//       email: user.email, 
//       username: user.username || user.name || "Unknown",
//       photoURL: user.photoURL || user.recipientPhoto || null 
//     });
    
//     const chatId = [currentUser.id, user.id].sort().join("_");
//     const chatRef = doc(db, "conversations", chatId);
//     try {
//       await updateDoc(chatRef, { [`unread.${currentUser.id}`]: false });
//     } catch { /* ignore new chat errors */ }
//   };

//   const handleSendRequest = async (targetUser) => {
//     try {
//       await addDoc(collection(db, "friend_requests"), {
//         fromUid: currentUser.id,
//         fromUsername: currentUser.username || currentUser.name, 
//         toUid: targetUser.id,
//         toUsername: targetUser.username || targetUser.name,
//         createdAt: serverTimestamp()
//       });
//       alert("Request sent!");
//     } catch (error) {
//       console.error("Error sending request:", error);
//     }
//   };

//   const handleAcceptRequest = async (request) => {
//     try {
//       const batch = writeBatch(db);
//       const myRef = doc(db, "users", currentUser.id);
//       batch.update(myRef, { friends: arrayUnion(request.fromUid) });
//       const theirRef = doc(db, "users", request.fromUid);
//       batch.update(theirRef, { friends: arrayUnion(currentUser.id) });
//       const requestRef = doc(db, "friend_requests", request.id);
//       batch.delete(requestRef);
//       await batch.commit();
//       alert(`You are now friends with ${request.fromUsername}!`);
//     } catch (error) {
//       console.error("Error accepting request:", error);
//     }
//   };

//   const handleDeclineRequest = async (requestId) => {
//     await deleteDoc(doc(db, "friend_requests", requestId));
//   };

//   const handleRemoveFriend = async (friendId, friendName) => {
//     if (!confirm(`Remove ${friendName} from friends?`)) return;
//     try {
//       const myRef = doc(db, "users", currentUser.id);
//       await updateDoc(myRef, { friends: arrayRemove(friendId) });
//       if (activeChat?.id === friendId) setActiveChat(null);
//     } catch (error) {
//       console.error("Error removing friend:", error);
//     }
//   };

//   const handleRemoveConversation = async (convId) => {
//     if (!confirm("Remove this conversation?")) return;
//     try {
//       const convRef = doc(db, "conversations", convId);
//       await updateDoc(convRef, { participants: arrayRemove(currentUser.id) });
//       setActiveChat(null); 
//     } catch (error) {
//       console.error("Error removing conversation:", error);
//     }
//   };

//   if (!currentUser) return <div className="p-10 text-center">Please login to chat.</div>;

//   return (
//     <div className="container mx-auto h-[calc(100vh-100px)] min-h-[500px] mt-4 bg-white border rounded-xl shadow-sm overflow-hidden flex">
      
//       {/* SIDEBAR */}
//       <div className="w-1/3 border-r flex flex-col bg-gray-50">
//         <div className="p-4 border-b bg-white">
//           <h2 className="font-bold text-xl text-gray-800 mb-4">Messages</h2>
          
//           <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg">
//             {['chats', 'friends', 'requests'].map(tab => (
//               <button 
//                 key={tab}
//                 onClick={() => setActiveTab(tab)}
//                 className={`flex-1 py-1.5 text-xs font-bold uppercase rounded-md transition ${activeTab === tab ? 'bg-white shadow text-saka-green' : 'text-gray-500 hover:text-gray-700'}`}
//               >
//                 {tab === 'requests' && incomingRequests.length > 0 ? (
//                   <span className="flex items-center justify-center gap-1">
//                     Reqs <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{incomingRequests.length}</span>
//                   </span>
//                 ) : tab}
//               </button>
//             ))}
//           </div>

//           <div className="relative">
//             <Search className="absolute left-3 top-3 text-gray-400" size={18} />
//             <input 
//               type="text" placeholder="Find by username..." 
//               className="w-full pl-10 p-2.5 bg-gray-100 border-none rounded-lg focus:ring-2 focus:ring-saka-green outline-none transition"
//               onChange={(e) => setSearchTerm(e.target.value)} value={searchTerm}
//             />
//           </div>
//         </div>

//         <div className="flex-1 overflow-y-auto p-2 space-y-1">
//           {searchTerm ? (
//             <>
//               <p className="px-3 py-2 text-xs font-bold text-gray-400 uppercase">Results</p>
//               {searchResults.map(user => {
//                 const isFriend = friends.some(f => f.id === user.id);
//                 const isPending = outgoingRequests.includes(user.id);
                
//                 return (
//                   <div key={user.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white hover:shadow-sm transition">
//                     <div className="flex items-center gap-3">
//                       <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold overflow-hidden">
//                         {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover"/> : (user.username || "U")[0].toUpperCase()}
//                       </div>
//                       <div>
//                         <p className="font-bold text-gray-800">{user.username}</p>
//                         <p className="text-xs text-gray-500">{user.role || 'Member'}</p>
//                       </div>
//                     </div>
//                     {isFriend ? (
//                       <button onClick={() => { handleSelectChat(user); setSearchTerm(''); }} className="p-2 bg-green-100 text-green-600 rounded-full">
//                         <MessageCircle size={18} />
//                       </button>
//                     ) : isPending ? (
//                       <span className="text-xs text-orange-500 font-bold flex items-center gap-1"><Clock size={12}/> Pending</span>
//                     ) : (
//                       <button onClick={() => handleSendRequest(user)} className="p-2 bg-gray-200 text-gray-600 rounded-full hover:bg-saka-green hover:text-white transition">
//                         <UserPlus size={18} />
//                       </button>
//                     )}
//                   </div>
//                 );
//               })}
//             </>
//           ) : (
//             <>
//               {activeTab === 'requests' && (
//                 <>
//                   {incomingRequests.length === 0 && <p className="text-center text-gray-400 text-sm mt-10">No pending requests</p>}
//                   {incomingRequests.map(req => (
//                     <div key={req.id} className="p-3 bg-white border rounded-lg mb-2">
//                       <div className="flex items-center gap-2 mb-2">
//                         <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold">
//                           {req.fromUsername[0].toUpperCase()}
//                         </div>
//                         <div>
//                           <p className="text-sm font-bold">{req.fromUsername}</p>
//                           <p className="text-[10px] text-gray-500">Wants to be friends</p>
//                         </div>
//                       </div>
//                       <div className="flex gap-2">
//                         <button onClick={() => handleAcceptRequest(req)} className="flex-1 bg-saka-green text-white text-xs py-1.5 rounded flex items-center justify-center gap-1 hover:bg-saka-dark"><Check size={14}/> Confirm</button>
//                         <button onClick={() => handleDeclineRequest(req.id)} className="flex-1 bg-gray-200 text-gray-600 text-xs py-1.5 rounded flex items-center justify-center gap-1 hover:bg-gray-300"><XIcon size={14}/> Delete</button>
//                       </div>
//                     </div>
//                   ))}
//                 </>
//               )}

//               {activeTab === 'friends' && (
//                 <>
//                   {friends.length === 0 && <p className="text-center text-gray-400 text-sm mt-10">No friends yet</p>}
//                   {friends.map(friend => (
//                     <div 
//                         key={friend.id} 
//                         className="group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-white hover:shadow-sm transition"
//                         onClick={() => handleSelectChat(friend)}
//                     >
//                       <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold overflow-hidden border border-gray-200">
//                           {friend.photoURL ? <img src={friend.photoURL} alt="" className="w-full h-full object-cover"/> : (friend.username || "F")[0].toUpperCase()}
//                       </div>
//                       <div>
//                         <p className="font-bold text-gray-800">{friend.username}</p>
//                         <p className="text-xs text-gray-500">Friend</p>
//                       </div>
                      
//                       <button 
//                         onClick={(e) => { e.stopPropagation(); handleRemoveFriend(friend.id, friend.username); }}
//                         className="absolute right-2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
//                         title="Remove Friend"
//                       >
//                         <UserMinus size={18} />
//                       </button>
//                     </div>
//                   ))}
//                 </>
//               )}

//               {activeTab === 'chats' && (
//                 <>
//                   {conversations.length === 0 && <p className="text-center text-gray-400 text-sm mt-10">No recent chats</p>}
//                   {conversations.map(conv => {
//                     const otherUserId = conv.participants.find(uid => uid !== currentUser.id);
//                     const otherUser = conv.users && conv.users[otherUserId] ? conv.users[otherUserId] : { username: "Unknown" };
//                     const display = otherUser.username || otherUser.name || "Unknown";
//                     const isUnread = conv.unreadBy && conv.unreadBy.includes(currentUser.id);

//                     return (
//                       <div 
//                         key={conv.id} 
//                         className={`group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${isUnread ? 'bg-blue-50 border border-blue-100' : 'hover:bg-white hover:shadow-sm'}`}
//                         onClick={() => handleSelectChat({ ...otherUser, id: otherUserId })}
//                       >
//                         <div className="relative">
//                             <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold overflow-hidden border border-gray-200">
//                                 {otherUser.photoURL ? (
//                                     <img src={otherUser.photoURL} alt="" className="w-full h-full object-cover" />
//                                 ) : (
//                                     display[0].toUpperCase()
//                                 )}
//                             </div>
//                             {isUnread && <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></span>}
//                         </div>
                        
//                         <div className="flex-1 min-w-0">
//                           <p className={`truncate ${isUnread ? 'font-bold text-black' : 'font-bold text-gray-800'}`}>
//                               {display}
//                           </p>
//                           <p className={`text-xs truncate w-32 ${isUnread ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
//                               {conv.lastMessage}
//                           </p>
//                         </div>

//                         <button 
//                             onClick={(e) => { e.stopPropagation(); handleRemoveConversation(conv.id); }}
//                             className="absolute right-2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
//                             title="Remove from Recents"
//                         >
//                             <Trash2 size={18} />
//                         </button>
//                       </div>
//                     );
//                   })}
//                 </>
//               )}
//             </>
//           )}
//         </div>
//       </div>

//       {/* CHAT AREA */}
//       <div className="flex-1 flex flex-col bg-white">
//         {activeChat ? (
//           <FullPageChatWindow 
//             key={activeChat.id} 
//             activeChat={activeChat} 
//             currentUser={currentUser} 
//             onReport={() => setIsReportModalOpen(true)} 
//           />
//         ) : (
//           <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
//             <MessageSquare size={64} className="mb-4 text-gray-200" />
//             <p className="text-xl font-medium text-gray-400">Select a friend or chat to start</p>
//           </div>
//         )}
//       </div>

//       {isReportModalOpen && activeChat && (
//         <ReportModal 
//             target={{ id: activeChat.id, name: activeChat.username }}
//             targetType="User"
//             reporterId={currentUser.id}
//             onClose={() => setIsReportModalOpen(false)}
//         />
//       )}
//     </div>
//   );
// }

// // --- SUB-COMPONENT WITH CONTRACT AND BLUE CARD LOGIC ---
// function FullPageChatWindow({ activeChat, currentUser, onReport }) {
//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState(activeChat.initialMessage || '');
//   const messagesEndRef = useRef(null);
//   const chatId = [currentUser.id, activeChat.id].sort().join("_");

//   useEffect(() => {
//     if (!chatId) return;
//     const q = query(collection(db, `chats/${chatId}/messages`), orderBy("createdAt", "asc"));
//     const unsub = onSnapshot(q, (snap) => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
//     return () => unsub();
//   }, [chatId]);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   // CONTRACT: Handle Accept/Decline
//   const handleTransactionAction = async (msgId, transactionId, action) => {
//     try {
//         const status = action === 'accept' ? 'accepted' : 'rejected';
//         await updateTransactionStatus(transactionId, status); 
        
//         const msgRef = doc(db, `chats/${chatId}/messages`, msgId);
//         await updateDoc(msgRef, { offerStatus: status });

//         if (action === 'accept') {
//             await addDoc(collection(db, `chats/${chatId}/messages`), {
//                 text: "✅ Offer Accepted! Deal is now in progress.",
//                 senderId: currentUser.id,
//                 senderName: "System",
//                 createdAt: serverTimestamp(),
//                 isSystemMessage: true
//             });
//         }
//     } catch (error) {
//         console.error("Action failed:", error);
//     }
//   };

//   const handleSend = async (e) => {
//     e.preventDefault();
//     if (!input.trim()) return;

//     // --- FIX: Prevent undefined error ---
//     const isReportMsg = (activeChat.isReportContext && input.startsWith("⚠️ OFFICIAL NOTICE")) || false;

//     await addDoc(collection(db, `chats/${chatId}/messages`), {
//       text: input, 
//       senderId: currentUser.id, 
//       senderName: currentUser.username || currentUser.name, 
//       createdAt: serverTimestamp(),
//       isReport: isReportMsg, 
//       isTicketReply: false // Default to false for user/admin sent chats from this window
//     });

//     const conversationData = {
//       participants: [currentUser.id, activeChat.id], 
//       lastMessage: input, 
//       lastSenderId: currentUser.id,
//       lastMessageTime: serverTimestamp(),
//       users: { 
//         [currentUser.id]: { name: currentUser.name || "User", email: currentUser.email, username: currentUser.username || "User", photoURL: currentUser.photoURL || null }, 
//         [activeChat.id]: { name: activeChat.name || "User", email: activeChat.email, username: activeChat.username || "User", photoURL: activeChat.photoURL || null } 
//       },
//       unreadBy: arrayUnion(activeChat.id)
//     };
//     await setDoc(doc(db, "conversations", chatId), conversationData, { merge: true });
//     setInput("");
//   };

//   const displayName = activeChat.username || activeChat.name || "Unknown";

//   return (
//     <>
//       <div className="p-4 border-b flex items-center justify-between shadow-sm bg-white z-10">
//         <div className="flex items-center gap-3">
//             <div className="w-10 h-10 rounded-full bg-saka-green flex items-center justify-center overflow-hidden border border-gray-200">
//                 {activeChat.photoURL ? (
//                     <img src={activeChat.photoURL} alt="" className="w-full h-full object-cover" />
//                 ) : (
//                     <span className="text-white font-bold text-lg">{displayName[0].toUpperCase()}</span>
//                 )}
//             </div>
//             <h2 className="font-bold text-xl text-gray-800">
//                 {displayName}
//                 {activeChat.isReportContext && <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full border border-red-200">Report Case</span>}
//             </h2>
//         </div>
        
//         <button onClick={onReport} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition" title="Report User">
//           <AlertTriangle size={20} />
//         </button>
//       </div>
      
//       <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
//         {messages.map(msg => {
//           const isMe = msg.senderId === currentUser.id;
          
//           // --- 1. ADMIN RED CARD (WARNING) ---
//           if (msg.isReport) {
//              return (
//                <div key={msg.id} className="flex w-full justify-center my-4">
//                  <div className="bg-red-50 border border-red-200 p-4 rounded-xl shadow-sm max-w-[90%] md:max-w-[70%] text-center">
//                     <div className="flex items-center justify-center gap-2 mb-2 text-red-600 font-bold border-b border-red-100 pb-2">
//                         <ShieldAlert size={20} />
//                         <span>Administrative Warning</span>
//                     </div>
//                     <p className="text-sm text-gray-800 whitespace-pre-wrap font-medium">{msg.text}</p>
//                  </div>
//                </div>
//              );
//           }

//           // --- 2. ADMIN BLUE CARD (TICKET REPLY) ---
//           if (msg.isTicketReply) {
//              const regex = /REFERENCE: (.*?)\n"(.*?)"\n\n💬 ADMIN REPLY:\n([\s\S]*)/;
//              const match = msg.text.match(regex);

//              if (match) {
//                  const refHeader = match[1];
//                  const concernText = match[2];
//                  const replyText = match[3];

//                  return (
//                    <div key={msg.id} className="flex w-full justify-center my-6">
//                      <div className="bg-blue-50 border border-blue-200 rounded-xl shadow-sm w-[90%] md:w-[70%] overflow-hidden">
//                         <div className="bg-blue-100 px-4 py-2 flex items-center justify-between border-b border-blue-200">
//                             <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
//                                 <MessageCircle size={16} />
//                                 <span>Support Ticket</span>
//                             </div>
//                             <span className="text-xs text-blue-600 font-mono hidden sm:inline">{refHeader.split(':')[0]}</span> 
//                         </div>

//                         <div className="p-4 space-y-4">
//                             <div className="text-center">
//                                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{refHeader}</span>
//                             </div>
//                             <div className="bg-white p-3 rounded-lg border border-blue-100 mx-4 shadow-sm relative">
//                                 <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">User Concern:</p>
//                                 <p className="text-sm text-gray-600 italic">"{concernText}"</p>
//                             </div>
//                             <div className="relative flex items-center py-2">
//                                 <div className="flex-grow border-t border-blue-200"></div>
//                                 <span className="flex-shrink-0 mx-4 text-xs font-bold text-blue-600 uppercase bg-blue-100 px-2 py-0.5 rounded-full shadow-sm">
//                                     Admin Reply
//                                 </span>
//                                 <div className="flex-grow border-t border-blue-200"></div>
//                             </div>
//                             <div className="px-4 text-center">
//                                 <p className="text-gray-800 font-medium leading-relaxed whitespace-pre-wrap">{replyText}</p>
//                             </div>
//                         </div>
//                      </div>
//                    </div>
//                  );
//              } 
//              return (
//                <div key={msg.id} className="flex w-full justify-center my-4">
//                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl shadow-sm max-w-[90%] text-center">
//                     <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.text}</p>
//                  </div>
//                </div>
//              );
//           }

//           // --- 3. CONTRACT / OFFER CARD ---
//           if (msg.transactionId) {
//              return (
//                <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} my-2`}>
//                  <div className={`p-4 rounded-xl shadow-sm border ${isMe ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'} max-w-[80%]`}>
//                     <div className="flex items-center gap-2 mb-2 border-b pb-2">
//                         <ShoppingCart size={16} className={isMe ? "text-green-600" : "text-gray-500"}/>
//                         <span className="font-bold text-sm text-gray-800">Offer Sent</span>
//                     </div>
//                     <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{msg.text}</p>
                    
//                     {!isMe && !msg.offerStatus && (
//                         <div className="flex gap-2">
//                             <button onClick={() => handleTransactionAction(msg.id, msg.transactionId, 'accept')} className="flex-1 bg-saka-green text-white py-1.5 px-3 rounded-lg text-xs font-bold hover:bg-saka-dark transition">Accept</button>
//                             <button onClick={() => handleTransactionAction(msg.id, msg.transactionId, 'decline')} className="flex-1 bg-gray-200 text-gray-600 py-1.5 px-3 rounded-lg text-xs font-bold hover:bg-gray-300 transition">Decline</button>
//                         </div>
//                     )}

//                     {msg.offerStatus && (
//                         <div className={`text-xs font-bold text-center py-1 rounded ${msg.offerStatus === 'accepted' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}`}>
//                             {msg.offerStatus === 'accepted' ? '✅ Offer Accepted' : '❌ Offer Declined'}
//                         </div>
//                     )}
//                  </div>
//                </div>
//              );
//           }

//           // --- 4. NORMAL MESSAGE ---
//           return (
//             <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
//               <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[60%]`}>
//                 <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm ${
//                   isMe ? 'bg-saka-green text-white rounded-br-none' : 'bg-white border text-gray-700 rounded-bl-none'
//                 }`}>
//                     {msg.text}
//                 </div>
//                 <span className="text-[10px] text-gray-400 mt-1 px-1">{isMe ? 'You' : msg.senderName}</span>
//               </div>
//             </div>
//           );
//         })}
//         <div ref={messagesEndRef} />
//       </div>

//       <div className="p-4 bg-white border-t">
//         <form onSubmit={handleSend} className="flex gap-4 max-w-4xl mx-auto">
//           <input 
//             className={`flex-1 border-0 rounded-full px-6 py-3 focus:outline-none transition
//                 ${activeChat.isReportContext 
//                     ? 'bg-red-50 text-red-900 placeholder-red-300 focus:ring-2 focus:ring-red-500' 
//                     : 'bg-gray-100 focus:ring-2 focus:ring-saka-green'}`}
//             placeholder="Type a message..."
//             value={input}
//             onChange={e => setInput(e.target.value)}
//           />
//           <button type="submit" className={`text-white p-3 rounded-full transition shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${activeChat.isReportContext ? 'bg-red-600 hover:bg-red-700' : 'bg-saka-green hover:bg-saka-dark'}`}>
//             <Send size={24} />
//           </button>
//         </form>
//       </div>
//     </>
//   );
// }