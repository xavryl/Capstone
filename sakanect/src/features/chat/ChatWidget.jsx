import { useState, useEffect, useRef } from 'react';
import { db } from '../../config/firebase';
import { 
  collection, addDoc, query, where, getDocs, onSnapshot, 
  orderBy, serverTimestamp, setDoc, doc, updateDoc, 
  arrayUnion, arrayRemove 
} from 'firebase/firestore';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { MessageCircle, X, Send, Search, ChevronLeft } from 'lucide-react';

export default function ChatWidget() {
  const { isOpen, toggleChat, activeChat, setActiveChat } = useChat();
  const { user: currentUser } = useAuth();
  
  const [conversations, setConversations] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. LISTEN TO CONVERSATIONS
  useEffect(() => {
    if (!currentUser) return;
    
    const q = collection(db, "conversations"); 
    
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(chat => chat.participants && chat.participants.includes(currentUser.id));
      
      setConversations(data);
    });
    return () => unsub();
  }, [currentUser]); 

  // 2. AUTO-MARK AS READ
  useEffect(() => {
    if (isOpen && activeChat && currentUser) {
      const currentConv = conversations.find(c => 
        c.participants.includes(activeChat.id) && c.participants.includes(currentUser.id)
      );

      if (currentConv && currentConv.unreadBy && currentConv.unreadBy.includes(currentUser.id)) {
         const chatId = [currentUser.id, activeChat.id].sort().join("_");
         const chatRef = doc(db, "conversations", chatId);
         updateDoc(chatRef, { unreadBy: arrayRemove(currentUser.id) }).catch(() => {});
      }
    }
  }, [conversations, activeChat, isOpen, currentUser]);

  // Badge Logic
  const showBadge = conversations.some(c => c.unreadBy && c.unreadBy.includes(currentUser.id));

  // 3. SEARCH USERS
  useEffect(() => {
    const searchUsers = async () => {
      if (searchTerm.trim() === '') {
        setSearchResults([]);
        return;
      }
      const q = query(
        collection(db, "users"), 
        where("username", ">=", searchTerm), 
        where("username", "<=", searchTerm + '\uf8ff')
      );
      try {
        const snapshot = await getDocs(q);
        const foundUsers = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(u => u.id !== currentUser.id);
        setSearchResults(foundUsers);
      } catch (error) {
        console.error("Search error:", error);
      }
    };
    const delayDebounce = setTimeout(() => searchUsers(), 500);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm, currentUser?.id]);

  if (!currentUser) return null;

  return (
    // POSITION: Fixed Bottom Right
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end pointer-events-none">
      
      {/* CHAT WINDOW */}
      {isOpen && (
        <div className="bg-white border shadow-2xl rounded-t-xl flex flex-col overflow-hidden mb-4 pointer-events-auto transition-all duration-300 w-80 h-96 border-gray-200">
          
          {/* HEADER */}
          <div className="bg-saka-green p-3 text-white flex justify-between items-center shadow-md z-10">
            {activeChat ? (
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveChat(null)}>
                    <ChevronLeft size={20}/>
                    {/* Header PFP */}
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                       {activeChat.photoURL ? (
                           <img src={activeChat.photoURL} alt="" className="w-full h-full object-cover"/>
                       ) : (
                           <span className="text-xs font-bold">{activeChat.username?.[0] || activeChat.name?.[0] || "U"}</span>
                       )}
                    </div>
                    <span className="font-bold truncate max-w-[150px] text-sm">{activeChat.username || activeChat.name}</span>
                </div>
            ) : (
                <span className="font-bold flex items-center gap-2 text-sm"><MessageCircle size={18}/> Messages</span>
            )}
            <button onClick={toggleChat} className="hover:bg-white/20 p-1 rounded"><X size={18} /></button>
          </div>

          {/* CONTENT AREA */}
          <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col">
            {activeChat ? (
              <ActiveChatWindow 
                key={activeChat.id} 
                activeChat={activeChat} 
                currentUser={currentUser} 
              />
            ) : (
              // LIST VIEW
              <div className="p-2">
                <div className="relative mb-2">
                    <Search className="absolute left-2 top-2.5 text-gray-400" size={14} />
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        className="w-full pl-8 p-2 text-xs border rounded-lg bg-white outline-none focus:ring-1 focus:ring-saka-green"
                        onChange={(e) => setSearchTerm(e.target.value)}
                        value={searchTerm}
                    />
                </div>
                
                {/* SEARCH RESULTS */}
                {searchTerm ? (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 mb-1 px-1 uppercase">Results</p>
                    {searchResults.map(user => (
                      <div 
                          key={user.id}
                          className="p-2 bg-white border rounded-lg cursor-pointer hover:bg-gray-50 flex gap-3 items-center mb-1"
                          onClick={() => {
                            setActiveChat({ name: user.name || user.username, id: user.id, email: user.email, username: user.username, photoURL: user.photoURL });
                            setSearchTerm('');
                          }}
                      >
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-xs overflow-hidden">
                              {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover"/> : (user.username || "U")[0].toUpperCase()}
                          </div>
                          <div>
                              <p className="text-sm font-bold">{user.username}</p>
                              <p className="text-[10px] text-gray-500">Click to chat</p>
                          </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // CONVERSATIONS LIST
                  <div>
                    {conversations.length === 0 && <p className="text-center text-xs text-gray-400 mt-10">No chats yet.</p>}
                    {conversations.map((conv) => {
                      const otherUserId = conv.participants.find(uid => uid !== currentUser.id);
                      const otherUser = conv.users && conv.users[otherUserId] ? conv.users[otherUserId] : { name: "Unknown" };
                      const isUnread = conv.unreadBy && conv.unreadBy.includes(currentUser.id);

                      return (
                        <div 
                            key={conv.id}
                            className={`p-2 border rounded-lg cursor-pointer flex gap-3 items-center mb-1 ${isUnread ? 'bg-green-50 border-saka-green' : 'bg-white hover:bg-gray-50 border-transparent hover:border-gray-200'}`}
                            onClick={() => {
                                setActiveChat({ 
                                  name: otherUser.name || otherUser.username, 
                                  id: otherUserId, 
                                  email: otherUser.email, 
                                  username: otherUser.username,
                                  photoURL: otherUser.photoURL
                                });
                            }}
                        >
                            <div className="relative">
                              <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs overflow-hidden border border-gray-200">
                                  {otherUser.photoURL ? <img src={otherUser.photoURL} alt="" className="w-full h-full object-cover"/> : (otherUser.username || "U")[0].toUpperCase()}
                              </div>
                              {isUnread && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
                            </div>
                            <div className="overflow-hidden flex-1">
                                <div className="flex justify-between items-center">
                                  <p className={`text-xs truncate ${isUnread ? 'font-bold text-black' : 'font-medium text-gray-700'}`}>{otherUser.username}</p>
                                  {isUnread && <span className="text-[9px] text-saka-green font-bold">NEW</span>}
                                </div>
                                <p className={`text-[10px] truncate w-40 ${isUnread ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>{conv.lastMessage}</p>
                            </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOGGLE BUTTON */}
      {!isOpen && (
        <button 
          onClick={toggleChat}
          className="relative w-14 h-14 bg-saka-green rounded-full shadow-lg flex items-center justify-center text-white hover:bg-saka-dark pointer-events-auto transition-transform hover:scale-110 active:scale-95"
        >
          <MessageCircle size={26} />
          {showBadge && (
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
          )}
        </button>
      )}
    </div>
  );
}

// --- ACTIVE CHAT SUB-COMPONENT ---
function ActiveChatWindow({ activeChat, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState(activeChat.initialMessage || '');
  const messagesEndRef = useRef(null);
  const chatId = [currentUser.id, activeChat.id].sort().join("_");

  useEffect(() => {
    if (!chatId) return;
    const q = query(collection(db, `chats/${chatId}/messages`), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    await addDoc(collection(db, `chats/${chatId}/messages`), {
      text: input, 
      senderId: currentUser.id, 
      senderName: currentUser.username || currentUser.name, 
      createdAt: serverTimestamp()
    });

    const conversationData = {
      participants: [currentUser.id, activeChat.id], 
      lastMessage: input, 
      lastSenderId: currentUser.id,
      lastMessageTime: serverTimestamp(),
      users: { 
        [currentUser.id]: { name: currentUser.name || "User", email: currentUser.email, username: currentUser.username || "User", photoURL: currentUser.photoURL || null }, 
        [activeChat.id]: { name: activeChat.name || "User", email: activeChat.email, username: activeChat.username || "User", photoURL: activeChat.photoURL || null } 
      },
      unreadBy: arrayUnion(activeChat.id)
    };
    await setDoc(doc(db, "conversations", chatId), conversationData, { merge: true });
    setInput("");
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 flex flex-col">
        {messages.map(msg => {
          const isMe = msg.senderId === currentUser.id;
          return (
            <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} items-end gap-1.5`}>
               {/* Left Avatar (Only for Receiver) */}
               {!isMe && (
                   <div className="w-6 h-6 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden border border-gray-100 mb-1">
                      {activeChat.photoURL ? (
                          <img src={activeChat.photoURL} alt="" className="w-full h-full object-cover"/>
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-gray-500">
                             {(activeChat.username || "U")[0].toUpperCase()}
                          </div>
                      )}
                   </div>
               )}
               
               <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                <div className={`px-3 py-2 rounded-2xl text-xs shadow-sm ${
                  isMe ? 'bg-saka-green text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                }`}>
                    {msg.text}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-2 border-t bg-white">
        <form onSubmit={handleSend} className="flex gap-2">
          <input 
            className="flex-1 border border-gray-300 rounded-full px-3 py-2 text-xs focus:ring-1 focus:ring-saka-green focus:border-saka-green outline-none transition"
            placeholder="Type a message..."
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button type="submit" className="text-saka-green hover:bg-green-50 p-2 rounded-full transition"><Send size={18} /></button>
        </form>
      </div>
    </>
  );
}