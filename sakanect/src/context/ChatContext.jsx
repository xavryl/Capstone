import { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, serverTimestamp, doc, setDoc, updateDoc, arrayUnion 
} from 'firebase/firestore';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]); 
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    
    // UI State
    const [isOpen, setIsOpen] = useState(false);

    // 1. LISTENER: Fetch Conversations
    useEffect(() => {
        if (!user) {
            setTimeout(() => { setConversations([]); setActiveChat(null); }, 0);
            return;
        }

        const q = query(
            collection(db, "conversations"),
            where("participants", "array-contains", user.id),
            orderBy("lastMessageTime", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const updatedConversations = snapshot.docs.map(docSnap => {
                const data = docSnap.data();
                const recipientId = data.participants.find(id => id !== user.id);
                const userMap = data.users || {};
                const recipientData = userMap[recipientId] || {};
                
                return {
                    id: docSnap.id,
                    ...data,
                    recipientId: recipientId,      
                    recipientName: recipientData.name || recipientData.username || 'Unknown',
                    recipientPhoto: recipientData.photoURL || null, // <--- RETRIEVE PHOTO
                    unreadBy: data.unreadBy || []
                };
            });
            
            setConversations(updatedConversations);

            setActiveChat(prev => {
                if (prev) {
                    const found = updatedConversations.find(c => c.id === prev.id);
                    return found ? { ...found } : null; 
                }
                return null;
            });
        });

        return () => unsubscribe();
    }, [user]); 

    // 2. LISTENER: Fetch Messages
    useEffect(() => {
        if (!activeChat?.id) {
            setTimeout(() => setMessages([]), 0);
            return;
        }

        const q = query(
            collection(db, `chats/${activeChat.id}/messages`),
            orderBy("createdAt", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => unsubscribe();
    }, [activeChat?.id]); 

    // --- ACTIONS ---
    const toggleChat = () => setIsOpen(!isOpen);
    const closeChat = () => setIsOpen(false);

    const selectConversation = (chatId) => {
        const chat = conversations.find(c => c.id === chatId);
        if (chat) {
            setActiveChat(chat);
            setIsOpen(true);
        }
    };
    
    const startChat = async (recipient, initialMessage = null) => {
        if (!user) return;
        const chatId = [user.id, recipient.id].sort().join("_");
        const existingChat = conversations.find(c => c.id === chatId);

        if (existingChat) {
            setActiveChat(existingChat);
            setIsOpen(true);
            if (initialMessage) await sendMessage(chatId, initialMessage);
        } else {
            // FIX: SAVE PHOTOS TO DATABASE
            const newChatData = {
                participants: [user.id, recipient.id],
                lastMessage: initialMessage || `Started chat`,
                lastSenderId: user.id,
                lastMessageTime: serverTimestamp(),
                users: {
                    [user.id]: { 
                        name: user.name || user.username, 
                        username: user.username, 
                        email: user.email, 
                        photoURL: user.photoURL || null // <--- SAVE MY PHOTO
                    },
                    [recipient.id]: { 
                        name: recipient.name || recipient.username, 
                        username: recipient.username, 
                        email: recipient.email,
                        photoURL: recipient.photoURL || recipient.recipientPhoto || null // <--- SAVE THEIR PHOTO
                    }
                },
                unreadBy: [recipient.id] 
            };
            
            try {
                await setDoc(doc(db, "conversations", chatId), newChatData, { merge: true });
                if (initialMessage) {
                     await addDoc(collection(db, `chats/${chatId}/messages`), {
                        text: initialMessage,
                        senderId: user.id,
                        senderName: user.username || user.name,
                        createdAt: serverTimestamp(),
                    });
                }
                setActiveChat({ id: chatId, ...newChatData, recipientId: recipient.id });
                setIsOpen(true);
            } catch (e) { console.error(e); }
        }
    };

    const sendMessage = async (chatId, text) => {
        if (!user || !activeChat) return;
        const targetId = chatId || activeChat.id;
        const recipientId = activeChat.participants.find(id => id !== user.id);

        try {
            await addDoc(collection(db, `chats/${targetId}/messages`), {
                text: text,
                senderId: user.id,
                senderName: user.username || user.name,
                createdAt: serverTimestamp(),
            });

            // FIX: Update users map with latest photos on every message
            await updateDoc(doc(db, "conversations", targetId), {
                lastMessage: text,
                lastSenderId: user.id,
                lastMessageTime: serverTimestamp(),
                unreadBy: arrayUnion(recipientId),
                [`users.${user.id}.photoURL`]: user.photoURL || null,
                [`users.${user.id}.name`]: user.name || user.username
            });
        } catch (error) { console.error(error); }
    };
    
    const clearActiveChat = () => setActiveChat(null);

    return (
        <ChatContext.Provider value={{
            conversations, activeChat, messages, isOpen, 
            toggleChat, closeChat, selectConversation, startChat, sendMessage, clearActiveChat, setActiveChat
        }}>
            {children}
        </ChatContext.Provider>
    );
};