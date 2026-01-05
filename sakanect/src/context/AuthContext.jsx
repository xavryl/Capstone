import { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../config/firebase'; // Make sure to import 'auth'
import { doc, onSnapshot } from 'firebase/firestore'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. LISTEN TO FIREBASE AUTH STATE
    // This replaces localStorage. automatically handles session persistence
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // 2. USER IS AUTHENTICATED
        // Now request.auth in rules will be populated!
        
        const userRef = doc(db, "users", firebaseUser.uid);
        
        // Listen to the Firestore User Profile
        const unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            // Combine Auth data (email/uid) with Firestore data (role/name)
            setUser({ 
              id: docSnap.id, 
              email: firebaseUser.email, // reliable email from Auth
              ...docSnap.data() 
            });
          } else {
            console.error("User authenticated but no profile found in Firestore");
            // Optional: fallback or just set basic auth info
            setUser({ id: firebaseUser.uid, email: firebaseUser.email });
          }
          setLoading(false);
        }, (error) => {
          console.error("Firestore Listen Error:", error);
          setLoading(false);
        });

        // Cleanup the snapshot listener when auth state changes
        return () => unsubscribeSnapshot();

      } else {
        // 3. USER IS LOGGED OUT
        setUser(null);
        setLoading(false);
      }
    });

    // Cleanup auth listener on unmount
    return () => unsubscribeAuth();
  }, []);

  // 4. LOGIN ACTION
  // No need to manually set user state here. 
  // Just calling signInWithEmailAndPassword in your Login component 
  // will trigger the onAuthStateChanged above automatically.
  
  // 5. LOGOUT ACTION
  const logout = async () => {
    try {
      await signOut(auth); // Tells Firebase server to invalidate session
      // onAuthStateChanged will handle the state update to null
      window.location.href = '/login'; 
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, logout, loading }}>
      {!loading ? children : (
        <div className="h-screen flex items-center justify-center text-saka-green font-bold">
          Loading SakaNect...
        </div>
      )}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);