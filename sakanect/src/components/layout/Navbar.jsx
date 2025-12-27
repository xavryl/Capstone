import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout, MessageCircle, Bell, ChevronDown, Globe, Menu, User, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { collection, onSnapshot, writeBatch, doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { useLanguage } from '../../context/LanguageContext';

// --- HELPER COMPONENT (Defined OUTSIDE the main component) ---
const NavLink = ({ to, label, className = "" }) => (
  <Link to={to} className={`block px-4 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-green-50 hover:text-saka-green transition font-medium ${className}`}>
      {label}
  </Link>
);

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth(); 
  const { t, switchLanguage, language } = useLanguage();
  
  const [unreadChats, setUnreadChats] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);

  // 1. Listen for Unread Messages
  useEffect(() => {
    if (!user) return;
    const q = collection(db, "conversations");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const unreadList = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.participants?.includes(user.id) && data.unreadBy?.includes(user.id)) {
          const senderId = data.lastSenderId;
          
          // Prioritize Username, fallback to Name
          const senderName = data.users?.[senderId]?.username || data.users?.[senderId]?.name || "Someone";
          
          unreadList.push({ 
            id: doc.id, 
            senderName, 
            message: data.lastMessage, 
            time: data.lastMessageTime 
          });
        }
      });
      // Sort by newest first
      unreadList.sort((a, b) => (b.time?.seconds || 0) - (a.time?.seconds || 0));
      setUnreadChats(unreadList);
    });
    return () => unsubscribe();
  }, [user]);

  const handleClearAll = async () => {
    if (unreadChats.length === 0) return;
    try {
      const batch = writeBatch(db);
      unreadChats.forEach(chat => {
        const chatRef = doc(db, "conversations", chat.id);
        batch.update(chatRef, { unreadBy: arrayRemove(user.id) });
      });
      await batch.commit();
    } catch (error) { console.error(error); }
  };

  const handleNotificationClick = async (chatId) => {
    try {
      await updateDoc(doc(db, "conversations", chatId), { unreadBy: arrayRemove(user.id) });
      setIsNotifOpen(false);
      navigate('/chat');
    } catch (error) { 
        console.error("Error opening chat:", error);
        navigate('/chat'); 
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifRef]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* --- 1. LEFT SIDEBAR (Navigation + Profile) --- */}
      <nav className="no-scrollbar overflow-y-auto sticky top-0 z-50 bg-white shadow-sm border-b md:border-b-0 md:border-r border-gray-100 w-full md:w-64 md:h-screen md:fixed md:left-0 transition-all duration-300 flex flex-col justify-between">
        
        {/* TOP SECTION: Logo & Links */}
        <div className="container mx-auto px-4 md:px-6 py-4 md:py-6 flex md:flex-col items-center md:items-start gap-6">
          
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold text-saka-green flex items-center gap-2 hover:opacity-80 transition">
            <Sprout size={28}/> 
            <span className="hidden md:inline">SakaNect</span>
            <span className="md:hidden">SakaNect</span>
          </Link>

          {/* Links */}
          <div className="hidden md:flex flex-col gap-2 w-full">
            <NavLink to="/" label={t.home} />
            
            {/* --- CHANGE MADE HERE: Replaced t.marketplace with "Listings" --- */}
            <NavLink to="/crops" label="Listings" />
            
            {user && (
                <>
                <NavLink to="/requests" label={t.demand} />
                <NavLink to="/add-crop" label={t.post_crop} />
                <NavLink to="/my-listings" label={t.my_listings} />
                <NavLink to="/transactions" label={t.transactions} />
                <NavLink to="/support" label="Help" />
                {user.role === 'admin' && (
                    <NavLink to="/admin" label={t.admin_panel} className="text-red-600 font-bold hover:bg-red-50" />
                )}
                </>
            )}
          </div>
        </div>

        {/* BOTTOM SECTION: Profile OR Login Button */}
        <div className="hidden md:flex flex-col w-full p-4 border-t border-gray-100 bg-gray-50 mt-auto">
            {user ? (
                <>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-saka-green text-white flex items-center justify-center font-bold text-lg overflow-hidden">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                (user.username?.[0] || user.name?.[0] || "U").toUpperCase()
                            )}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <Link to="/profile" className="text-sm font-bold text-gray-800 hover:text-saka-green truncate">
                                {user.username || user.name}
                            </Link>
                            <span className="text-xs text-gray-500 capitalize">{user.role}</span>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <Link to="/profile" className="flex-1 text-center text-xs border border-gray-300 rounded py-1.5 hover:bg-white transition font-medium">
                            Profile
                        </Link>
                        <button onClick={handleLogout} className="flex-1 text-center text-xs bg-red-100 text-red-600 rounded py-1.5 hover:bg-red-200 transition font-medium">
                            Logout
                        </button>
                    </div>
                </>
            ) : (
                // --- LOGIN BUTTON FOR GUESTS ---
                <Link to="/login" className="flex items-center justify-center gap-2 w-full bg-saka-green text-white font-bold py-2.5 rounded-lg hover:bg-saka-dark transition shadow-sm">
                    <LogIn size={18} />
                    Login / Sign Up
                </Link>
            )}
        </div>
      </nav>

      {/* --- 2. TOP RIGHT HEADER (Notifications, Chat & Language) --- */}
      <div className="fixed top-4 right-6 z-50 flex items-center gap-3">
        
        {/* LANGUAGE DROPDOWN (Visible to Everyone) */}
        <div className="bg-white p-1 pr-2 rounded-full shadow-md border border-gray-100 flex items-center hover:bg-gray-50 transition">
                <div className="p-1.5 bg-gray-100 rounded-full mr-1">
                <Globe size={14} className="text-gray-600"/>
                </div>
                <div className="relative">
                <select 
                    value={language}
                    onChange={(e) => switchLanguage(e.target.value)}
                    className="bg-transparent text-xs font-bold text-gray-700 cursor-pointer outline-none appearance-none pr-4 py-1"
                >
                    <option value="en">🇺🇸 English</option>
                    <option value="tl">🇵🇭 Tagalog</option>
                    <option value="ceb">🇵🇭 Bisaya</option>
                </select>
                <ChevronDown size={12} className="absolute right-0 top-1.5 text-gray-400 pointer-events-none"/>
                </div>
        </div>

        {/* ICONS (Only for Logged In Users) */}
        {user ? (
            <>
                {/* Notification Bell */}
                <div className="relative" ref={notifRef}>
                    <button 
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                    className="w-10 h-10 bg-white hover:bg-gray-50 rounded-full shadow-md border border-gray-100 flex items-center justify-center text-gray-600 transition relative"
                    >
                    <Bell size={20} />
                    {unreadChats.length > 0 && (
                        <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
                    )}
                    </button>

                    {/* Dropdown */}
                    {isNotifOpen && (
                    <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in duration-200 origin-top-right">
                        <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700 text-sm">Notifications</h3>
                        {unreadChats.length > 0 && <button onClick={handleClearAll} className="text-xs text-saka-green font-bold hover:underline">Clear All</button>}
                        </div>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                        {unreadChats.length === 0 ? (
                            <p className="p-6 text-center text-xs text-gray-400">No new messages</p>
                        ) : (
                            unreadChats.map(c => (
                                <div key={c.id} onClick={() => handleNotificationClick(c.id)} className="p-3 border-b hover:bg-green-50 cursor-pointer transition">
                                        <div className="flex justify-between mb-1">
                                            {/* Shows Username First */}
                                            <span className="font-bold text-sm text-gray-800">{c.senderName}</span>
                                            <span className="text-[10px] text-gray-400">New</span>
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">{c.message}</p>
                                </div>
                            ))
                        )}
                        </div>
                    </div>
                    )}
                </div>

                {/* Chat Icon (Quick Link) */}
                <Link 
                    to="/chat" 
                    className="w-10 h-10 bg-white hover:bg-gray-50 rounded-full shadow-md border border-gray-100 flex items-center justify-center text-gray-600 transition relative"
                    title="Open Full Chat"
                >
                    <MessageCircle size={20} />
                    {unreadChats.length > 0 && (
                        <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
                    )}
                </Link>
            </>
        ) : (
            // --- MOBILE LOGIN BUTTON (Top Right) ---
            <Link to="/login" className="md:hidden w-10 h-10 bg-saka-green text-white rounded-full shadow-md flex items-center justify-center hover:bg-saka-dark transition">
                <LogIn size={20} />
            </Link>
        )}
      </div>
    </>
  );
}