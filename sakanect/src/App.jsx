import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import Navbar from './components/layout/Navbar';

// 1. IMPORT YOUR NEW HOME PAGE HERE
import Home from './pages/Home'; 

// Features
import AddCrop from './features/crops/AddCrop';
import Crops from './features/crops/Crops';
import MyListings from './features/crops/MyListings';
import EditCrop from './features/crops/EditCrop';
import Login from './features/auth/Login';
import Profile from './features/auth/Profile';
import Chat from './features/chat/Chat';
import Transactions from './features/transactions/Transactions';
import Requests from './features/requests/Requests';
import Support from './features/support/Support'; 
import AdminDashboard from './features/admin/AdminDashboard';

// Contexts & Widgets
import { ChatProvider } from './context/ChatContext'; 
import AIChatWidget from './features/ai/AIChatWidget'; // AI Chat
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';

// --- ROUTE GUARDS ---
function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <h2 className="text-2xl font-bold text-red-500 mb-2">Access Denied</h2>
      <p className="text-gray-600">You do not have permission to view this page.</p>
      <Link to="/" className="mt-4 text-saka-green hover:underline">Go Home</Link>
    </div>
  );
  return children;
}

// --- NEW COMPONENT: INNER CONTENT ---
// We moved the main logic here so we can call useAuth()
function AppContent() {
  const { user } = useAuth(); // ✅ Now this works because it's inside AuthProvider

  return (
    <BrowserRouter>
      {/* LAYOUT CONTAINER */}
      <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 relative isolate">
        
        <Navbar />
        
        {/* Main Content */}
        <main className="flex-grow container mx-auto p-4 md:p-6 z-0 md:ml-64 w-auto">
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/crops" element={<Crops />} />
            <Route path="/login" element={<Login />} />
            <Route path="/requests" element={<Requests />} />
            <Route path="/support" element={<Support />} />

            {/* Private */}
            <Route path="/add-crop" element={ <RequireAuth><AddCrop /></RequireAuth> } />
            <Route path="/my-listings" element={ <RequireAuth><MyListings /></RequireAuth> } />
            <Route path="/edit-crop/:id" element={ <RequireAuth><EditCrop /></RequireAuth> } />
            <Route path="/chat" element={ <RequireAuth><Chat /></RequireAuth> } />
            <Route path="/profile" element={ <RequireAuth><Profile /></RequireAuth> } />
            <Route path="/transactions" element={ <RequireAuth><Transactions /></RequireAuth> } />

            {/* Admin */}
            <Route path="/admin" element={ <RequireAdmin><AdminDashboard /></RequireAdmin> } />
          </Routes>
        </main>
        
      </div>

      {/* WIDGETS - ONLY SHOW IF LOGGED IN */}
      {user && <AIChatWidget />}

    </BrowserRouter>
  );
}

// --- MAIN APP COMPONENT ---
function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <LanguageProvider>
           {/* We render AppContent inside the providers */}
           <AppContent />
        </LanguageProvider>
      </ChatProvider>
    </AuthProvider>
  );
}

export default App;