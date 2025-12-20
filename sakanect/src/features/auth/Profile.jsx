import { useState, useEffect } from 'react';
import { db, storage } from '../../config/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../../context/AuthContext';
import { User, MapPin, Phone, Save, Loader2, Camera, CheckCircle, AlertCircle, Star } from 'lucide-react';
import { getCoordinates } from '../../utils/geocoding';

// --- SWEETALERT IMPORT ---
import Swal from 'sweetalert2';

export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState(null);
  
  // Rating State
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    city: '',
    province: '',
    bio: ''
  });
  const [photoURL, setPhotoURL] = useState(null);

  useEffect(() => {
    if (!user) return;
    
    // 1. Fetch Profile
    const fetchProfile = async () => {
      const docRef = doc(db, "users", user.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData({
          fullName: data.name || '',
          phone: data.phone || '',
          city: data.city || '',
          province: data.province || '',
          bio: data.bio || ''
        });
        setPhotoURL(data.photoURL || null);
      }
    };

    // 2. Fetch Ratings (Calculated Live)
    const fetchRatings = async () => {
        try {
            const q = query(collection(db, "user_feedback"), where("toUserId", "==", user.id));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const totalStars = snap.docs.reduce((sum, doc) => sum + doc.data().rating, 0);
                setAverageRating((totalStars / snap.size).toFixed(1));
                setReviewCount(snap.size);
            }
        } catch (err) {
            console.error("Error fetching ratings", err);
        }
    };

    fetchProfile();
    fetchRatings();
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name === 'city' || e.target.name === 'province') {
      setLocationStatus(null);
    }
  };

  const handlePhotoUpload = async (e) => {
    if (e.target.files[0]) {
      setLoading(true);
      try {
        const file = e.target.files[0];
        const photoRef = ref(storage, `profiles/${user.id}/${file.name}`);
        const result = await uploadBytes(photoRef, file);
        const url = await getDownloadURL(result.ref);
        setPhotoURL(url);
        await updateDoc(doc(db, "users", user.id), { photoURL: url });
        
        // Optional: Small toast for photo success
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
        Toast.fire({ icon: 'success', title: 'Photo updated!' });

      } catch (error) {
        console.error("Upload failed", error);
        Swal.fire({ icon: 'error', title: 'Upload Failed', text: error.message, confirmButtonColor: '#16a34a' });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLocationStatus(null);

    try {
      const queryLocation = `${formData.city}, ${formData.province}, Philippines`;
      const coords = await getCoordinates(queryLocation);

      if (!coords) {
        setLocationStatus('invalid');
        
        // --- SWEETALERT: LOCATION ERROR ---
        Swal.fire({
            icon: 'warning',
            title: 'Location Not Found',
            text: `We couldn't find "${queryLocation}" on the map. Please check your spelling.`,
            confirmButtonColor: '#16a34a'
        });
        
        setLoading(false);
        return;
      }

      setLocationStatus('valid');
      
      await updateDoc(doc(db, "users", user.id), {
        name: formData.fullName,
        phone: formData.phone,
        city: formData.city,
        province: formData.province,
        locationName: `${formData.city}, ${formData.province}`,
        locationCoords: { lat: coords.lat, lon: coords.lon },
        bio: formData.bio
      });

      // --- SWEETALERT: SUCCESS ---
      Swal.fire({
        icon: 'success',
        title: 'Profile Updated!',
        text: 'Your details have been successfully saved.',
        timer: 2000,
        showConfirmButton: false,
        timerProgressBar: true
      });

    } catch (error) {
      console.error("Error updating profile:", error);
      
      // --- SWEETALERT: SAVE ERROR ---
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: 'Something went wrong while saving your profile.',
        confirmButtonColor: '#16a34a'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">My Profile</h1>

      <div className="bg-white rounded-xl shadow-sm border p-8">
        
        {/* Profile Picture & Rating */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-32 h-32 mb-3">
            <img 
              src={photoURL || "https://via.placeholder.com/150"} 
              alt="Profile" 
              className="w-32 h-32 rounded-full object-cover border-4 border-gray-100"
            />
            <label className="absolute bottom-0 right-0 bg-saka-green text-white p-2 rounded-full cursor-pointer hover:bg-saka-dark shadow-md transition">
              <Camera size={20} />
              <input type="file" className="hidden" onChange={handlePhotoUpload} accept="image/*" />
            </label>
          </div>
          
          <h2 className="text-xl font-bold text-gray-800">@{user?.username}</h2>
          
          {/* NEW: Reputation Score */}
          <div className="flex items-center gap-2 mt-1 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-100">
             <div className="flex text-yellow-400">
                 <Star size={16} fill="currentColor"/>
             </div>
             <span className="text-sm font-bold text-gray-700">{averageRating || "New"}</span>
             <span className="text-xs text-gray-400">({reviewCount} reviews)</span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-gray-400" size={20} />
                <input name="fullName" value={formData.fullName} onChange={handleChange} className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-saka-green outline-none" required />
              </div>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 text-gray-400" size={20} />
                <input name="phone" value={formData.phone} onChange={handleChange} placeholder="0912..." className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-saka-green outline-none" required />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
              <MapPin className="text-saka-green" /> Location Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Province</label>
                <input name="province" value={formData.province} onChange={handleChange} placeholder="e.g. Cebu" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-saka-green outline-none" required />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">City / Municipality</label>
                <input name="city" value={formData.city} onChange={handleChange} placeholder="e.g. Carcar City" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-saka-green outline-none" required />
              </div>
            </div>

            {locationStatus === 'valid' && (
              <div className="flex items-center gap-2 text-green-600 text-sm mt-2">
                <CheckCircle size={16} /> Location Verified on Map
              </div>
            )}
            {locationStatus === 'invalid' && (
              <div className="flex items-center gap-2 text-red-500 text-sm mt-2">
                <AlertCircle size={16} /> Location not found. Please verify spelling.
              </div>
            )}
          </div>

          <button disabled={loading} type="submit" className="w-full bg-saka-green text-white font-bold py-3 rounded-lg hover:bg-saka-dark transition shadow-lg flex justify-center items-center gap-2">
            {loading ? <Loader2 className="animate-spin" /> : <><Save size={20}/> Save & Verify Profile</>}
          </button>
        </form>
      </div>
    </div>
  );
}