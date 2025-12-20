import { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../config/firebase'; 
import { doc, onSnapshot } from 'firebase/firestore'; 

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. RESTORE SESSION & LISTEN FOR UPDATES
  useEffect(() => {
    const storedUserId = localStorage.getItem('sakanect_uid');
    
    if (!storedUserId) {
      // FIX: Wrap in setTimeout to avoid "setState during render" warning
      setTimeout(() => setLoading(false), 0);
      return;
    }

    // --- REAL-TIME LISTENER ---
    const unsubscribe = onSnapshot(doc(db, "users", storedUserId), (docSnap) => {
      if (docSnap.exists()) {
        // Update the app state with the fresh data
        setUser({ id: docSnap.id, ...docSnap.data() });
      } else {
        // If user was deleted from DB, log them out locally
        localStorage.removeItem('sakanect_uid');
        setUser(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Auth Listener Error:", error);
      setLoading(false);
    });

    // Cleanup
    return () => unsubscribe();
  }, []);

  // 2. LOGIN ACTION
  const login = (userData) => {
    localStorage.setItem('sakanect_uid', userData.id);
    setUser(userData);
  };

  // 3. LOGOUT ACTION
  const logout = () => {
    setUser(null);
    localStorage.removeItem('sakanect_uid');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading ? children : <div className="h-screen flex items-center justify-center text-saka-green font-bold">Loading SakaNect...</div>}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);