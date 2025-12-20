import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Loader2, Trash2, Edit, MapPin, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../config/api'; // <--- Import API_URL

export default function MyListings() {
  const { user } = useAuth();
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 1. Fetch from MongoDB API
  useEffect(() => {
    if (!user) return;

    const fetchMyCrops = async () => {
      try {
        // FIX: Use API_URL
        const response = await fetch(`${API_URL}/api/crops`);
        if (!response.ok) throw new Error("Failed to fetch");
        
        const data = await response.json();
        
        const myCrops = data
          .filter(crop => crop.sellerId === user.id)
          .map(crop => ({
            ...crop,
            id: crop._id, 
            coordinates: crop.coordinates?.coordinates 
                ? { lat: crop.coordinates.coordinates[1], lon: crop.coordinates.coordinates[0] }
                : crop.locationCoordinates || { lat: 0, lon: 0 }
          }));
          
        setCrops(myCrops);
      } catch (error) {
        console.error("Error fetching listings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyCrops();
  }, [user]);

  // 2. Handle Delete via API
  const handleDelete = async (cropId) => {
    if (confirm("Are you sure you want to delete this listing?")) {
      try {
        // FIX: Use API_URL
        const response = await fetch(`${API_URL}/api/crops/${cropId}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            setCrops(crops.filter(c => c.id !== cropId));
            alert("Listing deleted.");
        } else {
            alert("Failed to delete listing.");
        }
      } catch (error) {
        console.error("Error deleting:", error);
        alert("Server error.");
      }
    }
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-saka-green" /></div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">My Listings</h1>

      {crops.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500 mb-4">You haven't posted any crops yet.</p>
          <button 
            onClick={() => navigate('/add-crop')}
            className="bg-saka-green text-white px-6 py-2 rounded-lg font-bold hover:bg-saka-dark"
          >
            Post Your First Crop
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {crops.map(crop => (
            <div key={crop.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="h-48 bg-gray-200 relative">
                {crop.imageUrl ? (
                  <img src={crop.imageUrl} alt={crop.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
                )}
                <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded text-xs font-bold shadow-sm">
                  {crop.type}
                </div>
              </div>
              
              <div className="p-4 flex-1">
                <h3 className="font-bold text-lg text-gray-800 mb-1">{crop.title}</h3>
                <p className="text-saka-green font-bold text-xl mb-3">
                  {crop.type === 'Donation' ? 'Free' : `₱${crop.price_per_kg}/kg`}
                </p>
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center gap-2"><MapPin size={16}/> {crop.location}</div>
                  <div className="flex items-center gap-2"><Scale size={16}/> {crop.quantity_kg} kg left</div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="p-4 border-t bg-gray-50 flex gap-3">
                <button 
                  onClick={() => navigate(`/edit-crop/${crop.id}`)}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  <Edit size={16} /> Edit
                </button>
                <button 
                  onClick={() => handleDelete(crop.id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-100 text-red-600 py-2 rounded-lg hover:bg-red-200 transition"
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}