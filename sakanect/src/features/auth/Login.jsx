import { useState } from 'react';
import { User, Lock, Mail, Sprout, AtSign, ArrowRight, Loader2, MapPin, ArrowLeft, Phone, CheckCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db, auth } from '../../config/firebase'; 
import { collection, query, where, getDocs, serverTimestamp, setDoc, doc, getDoc } from 'firebase/firestore'; 
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, signOut, sendPasswordResetEmail } from 'firebase/auth'; 
import { getCoordinates } from '../../utils/geocoding';
import Swal from 'sweetalert2'; // Use SweetAlert2

export default function Login() {
  const [isLogin, setIsLogin] = useState(true); 
  const [isReset, setIsReset] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    fullName: '',
    username: '', 
    email: '',
    phone: '',
    password: '',
    confirmPassword: '', // <--- NEW FIELD
    city: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (isReset) {
      handlePasswordReset();
    } else if (isLogin) {
      handleLogin();
    } else {
      handleRegister();
    }
  };

  const handlePasswordReset = async () => {
    if (!formData.email) {
      Swal.fire('Error', 'Please enter your email address.', 'error');
      setIsLoading(false);
      return;
    }
    try {
      await sendPasswordResetEmail(auth, formData.email);
      Swal.fire('Sent!', 'Password reset link sent! Check your email.', 'success');
      setIsReset(false); 
    } catch (error) {
      console.error("Reset Error:", error);
      Swal.fire('Error', error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // --- SMART LOGIN LOGIC ---
  const handleLogin = async () => {
    try {
      let loginEmail = formData.email; 

      // 1. Check if input looks like a phone number
      const isPhone = /^[0-9+]+$/.test(formData.email);

      if (isPhone) {
        const q = query(collection(db, "users"), where("phone", "==", formData.email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          Swal.fire('Error', 'No account found with this phone number.', 'error');
          setIsLoading(false);
          return;
        }
        const userData = querySnapshot.docs[0].data();
        loginEmail = userData.email;
      }

      // 2. Sign in
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, formData.password);
      const firebaseUser = userCredential.user;

      if (!firebaseUser.emailVerified) {
        const result = await Swal.fire({
            title: 'Email Not Verified',
            text: "Your email is not verified yet. Resend verification link?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            confirmButtonText: 'Yes, resend it!'
        });

        if (result.isConfirmed) {
            await sendEmailVerification(firebaseUser);
            Swal.fire('Sent!', 'Check your inbox.', 'success');
        }
        await signOut(auth);
        setIsLoading(false);
        return;
      }

      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        login({ id: firebaseUser.uid, ...userData }); 
        
        Swal.fire({
            icon: 'success',
            title: `Welcome back, ${userData.username}!`,
            timer: 1500,
            showConfirmButton: false
        });
        navigate('/');
      } else {
        Swal.fire('Error', 'User profile not found in database.', 'error');
      }

    } catch (error) {
      console.error("Login Error:", error);
      if (error.code === 'auth/invalid-credential') {
        Swal.fire('Login Failed', 'Invalid credentials.', 'error');
      } else {
        Swal.fire('Login Failed', error.message, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- REGISTER LOGIC ---
  const handleRegister = async () => {
    try {
      // 0. Confirm Password Check
      if (formData.password !== formData.confirmPassword) {
          Swal.fire('Error', 'Passwords do not match.', 'error');
          setIsLoading(false);
          return;
      }

      // 1. Check Duplicates
      const userCheck = await getDocs(query(collection(db, "users"), where("username", "==", formData.username)));
      if (!userCheck.empty) { Swal.fire('Error', 'Username taken.', 'error'); setIsLoading(false); return; }
      
      const phoneCheck = await getDocs(query(collection(db, "users"), where("phone", "==", formData.phone)));
      if (!phoneCheck.empty) { Swal.fire('Error', 'Phone number already registered.', 'error'); setIsLoading(false); return; }

      // 2. Validate Location
      let locationData = { name: formData.city, lat: 0, lon: 0 };
      if (formData.city) {
        const coords = await getCoordinates(formData.city + ", Philippines");
        if (!coords) {
          Swal.fire('Error', `Could not find "${formData.city}". Please check spelling.`, 'error');
          setIsLoading(false);
          return;
        }
        locationData = { name: formData.city, lat: coords.lat, lon: coords.lon };
      }

      // 3. Create User
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const firebaseUser = userCredential.user;

      await sendEmailVerification(firebaseUser);

      // 4. Save Profile
      const newUserProfile = {
        name: formData.fullName,
        username: formData.username,
        email: formData.email,
        phone: formData.phone, 
        role: 'Member',
        city: locationData.name, 
        locationName: locationData.name,
        locationCoords: { lat: locationData.lat, lon: locationData.lon },
        friends: [],
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, "users", firebaseUser.uid), newUserProfile);
      
      Swal.fire({
        icon: 'success',
        title: 'Account Created!',
        text: 'Please check your email to verify your account before logging in.',
        confirmButtonColor: '#16a34a'
      });
      setIsLogin(true); 

    } catch (error) {
      console.error("Register Error:", error);
      if (error.code === 'auth/email-already-in-use') {
        Swal.fire('Error', 'Email is already in use.', 'error');
      } else {
        Swal.fire('Registration Failed', error.message, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl border border-gray-100">
        
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-green-100 rounded-full mb-4">
            <Sprout className="w-8 h-8 text-saka-green" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">
            {isReset ? 'Reset Password' : (isLogin ? 'Welcome to SakaNect' : 'Create Account')}
          </h2>
          {isReset && <p className="text-sm text-gray-500 mt-2">Enter your email to receive a reset link.</p>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Sign Up Fields */}
          {!isLogin && !isReset && (
            <>
              <div className="relative">
                <User className="absolute left-3 top-3 text-gray-400" size={20} />
                <input type="text" name="fullName" placeholder="Full Name" className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-saka-green outline-none" onChange={handleChange} required />
              </div>
              <div className="relative">
                <AtSign className="absolute left-3 top-3 text-gray-400" size={20} />
                <input type="text" name="username" placeholder="Username" className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-saka-green outline-none" onChange={handleChange} required />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-3 text-gray-400" size={20} />
                <input 
                    type="text" name="phone" placeholder="Phone Number (e.g. 09123456789)" 
                    className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-saka-green outline-none" 
                    onChange={handleChange} required 
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-gray-400" size={20} />
                <input type="text" name="city" placeholder="City / Municipality" className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-saka-green outline-none" onChange={handleChange} required />
              </div>
            </>
          )}
          
          {/* Email/Phone Input (Dual Purpose) */}
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
            <input 
                type="text" name="email" 
                placeholder={isLogin ? "Email" : "Email Address"} 
                className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-saka-green outline-none" 
                onChange={handleChange} required 
            />
          </div>
          
          {!isReset && (
            <>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input type="password" name="password" placeholder="Password" className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-saka-green outline-none" onChange={handleChange} required />
                </div>
                {/* CONFIRM PASSWORD FOR REGISTER ONLY */}
                {!isLogin && (
                    <div className="relative">
                        <CheckCircle className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input 
                            type="password" name="confirmPassword" 
                            placeholder="Confirm Password" 
                            className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-saka-green outline-none" 
                            onChange={handleChange} required 
                        />
                    </div>
                )}
            </>
          )}

          {isLogin && !isReset && (
            <div className="text-right">
              <button type="button" onClick={() => setIsReset(true)} className="text-sm text-saka-green hover:underline">
                Forgot password?
              </button>
            </div>
          )}

          <button disabled={isLoading} className="w-full bg-saka-green text-white font-bold py-3 rounded-lg hover:bg-saka-dark transition shadow-md flex justify-center items-center gap-2">
            {isLoading && <Loader2 className="animate-spin" size={20} />}
            {isReset ? 'Send Reset Link' : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-4 text-sm text-gray-600">
          {isReset ? (
            <button onClick={() => setIsReset(false)} className="flex items-center gap-2 text-gray-500 hover:text-saka-green transition">
              <ArrowLeft size={16}/> Back to Login
            </button>
          ) : (
            <>
              <button onClick={() => setIsLogin(!isLogin)} className="hover:text-saka-green font-medium">
                {isLogin ? "Need an account? Sign Up" : "Have an account? Login"}
              </button>
              <div className="w-full border-t border-gray-200"></div>
              <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-saka-green transition">
                Continue as Guest <ArrowRight size={16}/>
              </Link>
            </>
          )}
        </div>

      </div>
    </div>
  );
}