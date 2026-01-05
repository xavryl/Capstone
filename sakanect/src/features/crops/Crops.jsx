import { useState, useEffect } from 'react';
import { 
  Loader2, Search, Filter, SlidersHorizontal, 
  Map as MapIcon, RefreshCcw, X, LayoutGrid, Tag 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCoordinates, calculateDistance } from '../../utils/geocoding';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config/api';

// --- COMPONENTS ---
import CropCard from './CropCard';
import CropMap from './CropMap'; 

// --- SWEETALERT IMPORT ---
import Swal from 'sweetalert2';

export default function Crops() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // --- VIEW STATE ---
  const [viewMode, setViewMode] = useState('grid'); 

  // --- DATA STATE ---
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- FILTER STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All'); 
  const [sortBy, setSortBy] = useState('newest'); 
  
  // --- LOCATION STATES ---
  const [targetCity, setTargetCity] = useState('');
  const [radius, setRadius] = useState(20); 
  const [cityCoords, setCityCoords] = useState(null);

  // 1. Fetch Data
  const fetchCrops = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/crops`);
      if (!response.ok) throw new Error("Failed to connect to server");
      
      const data = await response.json();
      
      const formattedCrops = data.map(crop => {
        let lat = 0, lng = 0;
        if (crop.coordinates?.coordinates) {
            lng = crop.coordinates.coordinates[0];
            lat = crop.coordinates.coordinates[1];
        } else if (crop.locationCoordinates) {
            lat = crop.locationCoordinates.lat;
            lng = crop.locationCoordinates.lng || crop.locationCoordinates.lon;
        }
        return {
            ...crop,
            id: crop._id, 
            // Ensure we have a valid seller ID
            sellerId: crop.sellerId || crop.user_id, 
            coordinates: { lat, lng } 
        };
      });

      setCrops(formattedCrops);
      setError(null);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Could not load crops. Is the backend server running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrops();
  }, []);

  // 2. Auto-Apply User Location
  useEffect(() => {
    if (user && user.locationCoords && user.city) {
        setTargetCity(user.city);
        setCityCoords(user.locationCoords);
        setSortBy('closest'); 
    }
  }, [user]);

  // 3. Handle Manual City Search
  const handleCitySearch = async () => {
    if (!targetCity.trim()) {
      setCityCoords(null);
      if (sortBy === 'closest') setSortBy('newest');
      return;
    }
    const coords = await getCoordinates(targetCity);
    if (coords) {
      setCityCoords(coords);
    } else {
      Swal.fire({ icon: 'error', title: 'City not found', text: 'Please check spelling', confirmButtonColor: '#16a34a' });
    }
  };

  // 4. Filtering Logic
  const filteredCrops = crops
    .map(crop => {
      let distance = null;
      if (cityCoords && crop.coordinates && crop.coordinates.lat !== 0) {
        distance = calculateDistance(
          cityCoords.lat, 
          cityCoords.lon || cityCoords.lng, 
          crop.coordinates.lat, 
          crop.coordinates.lng
        );
      }
      return { ...crop, distance };
    })
    .filter((crop) => {
      if (crop.quantity_kg <= 0 || crop.status === 'sold_out') return false;

      const matchesSearch = 
        crop.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        crop.location?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'All' || crop.type === filterType;

      let matchesRadius = true;
      if (radius > 0 && cityCoords) {
        if (crop.distance !== null) {
           matchesRadius = crop.distance <= radius;
        } else {
           matchesRadius = false; 
        }
      }

      return matchesSearch && matchesType && matchesRadius;
    })
    .sort((a, b) => {
      if (sortBy === 'price_low') return a.price_per_kg - b.price_per_kg;
      if (sortBy === 'price_high') return b.price_per_kg - a.price_per_kg;
      
      if (sortBy === 'closest') {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance; 
      }

      return new Date(b.createdAt) - new Date(a.createdAt); 
    });

  const resetFilters = () => {
    setSearchTerm('');
    setFilterType('All');
    setSortBy('newest');
    setTargetCity('');
    setCityCoords(null);
    setRadius(20);
    fetchCrops(); 
  };

  // --- 5. HANDLERS ---

  const handleChatClick = (crop) => {
    if (!user) {
        Swal.fire({ icon: 'info', title: 'Login Required', text: 'Please login to chat.', confirmButtonColor: '#16a34a' });
        return;
    }
    navigate('/chat', { 
      state: { 
        sellerId: crop.sellerId, 
        cropId: crop.id,
        cropTitle: crop.title
      } 
    });
  };

  // --- UPDATED MAKE OFFER HANDLER (Counter Offer + Quantity) ---
  const handleMakeOffer = async (crop) => {
    if (!user) {
        Swal.fire({ icon: 'info', title: 'Login Required', text: 'Please login to make an offer.', confirmButtonColor: '#16a34a' });
        return;
    }

    // --- SWEETALERT: DUAL INPUT MODAL ---
    const { value: formValues } = await Swal.fire({
        title: `Make an Offer`,
        html: `
            <div style="text-align: left; margin-bottom: 10px;">
                <p style="font-size: 14px; color: #555;">Item: <b>${crop.title}</b></p>
                <p style="font-size: 14px; color: #555;">Asking Price: <b style="color: #16a34a">₱${crop.price_per_kg}/kg</b></p>
                <hr style="margin: 15px 0; border-top: 1px dashed #ccc;">
                
                <label style="display:block; font-size:12px; font-weight:bold; color:#777; margin-bottom:5px;">YOUR COUNTER OFFER (₱/kg)</label>
                <input id="swal-input-price" type="number" class="swal2-input" placeholder="Price per kg" value="${crop.price_per_kg}" style="margin: 0 0 15px 0; width: 100%;">
                
                <label style="display:block; font-size:12px; font-weight:bold; color:#777; margin-bottom:5px;">QUANTITY (kg)</label>
                <input id="swal-input-qty" type="number" class="swal2-input" placeholder="Amount (kg)" value="1" style="margin: 0; width: 100%;">
                <p style="font-size: 10px; color: #999; margin-top: 5px;">Available: ${crop.quantity_kg}kg</p>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#16a34a',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Send Offer',
        preConfirm: () => {
            const price = document.getElementById('swal-input-price').value;
            const qty = document.getElementById('swal-input-qty').value;

            if (!price || price <= 0) {
                Swal.showValidationMessage('Please enter a valid price');
                return false;
            }
            if (!qty || qty <= 0) {
                Swal.showValidationMessage('Please enter a valid quantity');
                return false;
            }
            if (qty > crop.quantity_kg) {
                Swal.showValidationMessage(`Only ${crop.quantity_kg}kg available!`);
                return false;
            }

            return { offerPrice: price, offerQty: qty };
        }
    });
    
    if (formValues) {
        const { offerPrice, offerQty } = formValues;

        // Navigate to Chat, passing BOTH Price and Quantity
        navigate('/chat', { 
            state: { 
              sellerId: crop.sellerId, 
              cropId: crop.id,
              cropTitle: crop.title,
              offerAmount: offerPrice,  // The Counter Price
              offerQuantity: offerQty,  // The Quantity
              originalPrice: crop.price_per_kg,
              sellerName: crop.sellerName
            } 
        });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      
      {/* HEADER & TOGGLE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Listing</h1>
          <p className="text-gray-500 text-sm mt-1">
            {cityCoords && radius > 0
                ? `Showing crops near ${targetCity} (within ${radius}km)` 
                : "Find fresh produce near you."}
          </p>
        </div>

        <div className="bg-white p-1 rounded-lg border border-gray-200 flex shadow-sm">
            <button onClick={() => setViewMode('grid')} className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${viewMode === 'grid' ? 'bg-saka-green text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
               <LayoutGrid size={18} /> Grid
            </button>
            <button onClick={() => setViewMode('map')} className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${viewMode === 'map' ? 'bg-saka-green text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
               <MapIcon size={18} /> Map
            </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search crops..." 
              className="w-full pl-10 p-2.5 border rounded-lg focus:ring-2 focus:ring-saka-green focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2 items-center border p-1 pl-3 rounded-lg bg-gray-50 w-full md:w-auto focus-within:ring-2 focus-within:ring-saka-green transition relative">
            <MapIcon className={cityCoords ? "text-saka-green" : "text-gray-400"} size={20}/>
            <input 
              type="text" 
              placeholder="Filter by City" 
              className="bg-transparent outline-none w-full md:w-40 text-sm placeholder-gray-500 text-gray-700"
              value={targetCity}
              onChange={(e) => setTargetCity(e.target.value)}
              onBlur={handleCitySearch}
              onKeyDown={(e) => e.key === 'Enter' && handleCitySearch()}
            />
            {targetCity && <button onClick={() => { setTargetCity(''); setCityCoords(null); }} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>}
            <div className="h-6 w-px bg-gray-300 mx-1"></div>
            <select value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="bg-transparent text-sm p-1 cursor-pointer outline-none text-gray-600 font-medium max-w-[120px]">
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
              <option value={20}>20 km</option>
              <option value={50}>50 km</option>
              <option value={100}>100 km</option>
              <option value={0}>Anywhere</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center border-t pt-4">
          <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto w-full sm:w-auto">
            {['All', 'For Sale', 'Barter', 'Donation'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-pre ${filterType === type ? 'bg-white text-saka-green shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-auto">
            <div className="absolute left-3 top-2.5 pointer-events-none text-gray-500"><SlidersHorizontal size={18} /></div>
            <select className="w-full sm:w-56 pl-10 pr-4 py-2.5 border rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-saka-green focus:outline-none appearance-none cursor-pointer" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="closest" disabled={!cityCoords}>Closest Location</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-center py-10 bg-red-50 rounded-xl border border-red-100 mb-6">
            <p className="text-red-500 mb-2">{error}</p>
            <button onClick={fetchCrops} className="flex items-center gap-2 mx-auto bg-white px-4 py-2 rounded border shadow-sm hover:bg-gray-50">
                <RefreshCcw size={16}/> Retry
            </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin text-saka-green" size={40} />
        </div>
      ) : (
        <>
          {viewMode === 'map' ? (
            <div className="animate-in fade-in duration-300">
                <CropMap crops={filteredCrops} />
            </div>
          ) : (
            filteredCrops.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-300">
                  {filteredCrops.map(crop => (
                    <div key={crop.id} className="relative group">
                      <CropCard 
                        crop={crop} 
                        // Normal Chat
                        onChat={() => handleChatClick(crop)}
                        // --- UPDATED: MAKE OFFER HANDLER ---
                        onOffer={() => handleMakeOffer(crop)} 
                      />
                      
                      {cityCoords && crop.distance !== null && (
                        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md font-bold shadow-sm z-10 flex items-center gap-1">
                          <MapIcon size={12} /> {crop.distance.toFixed(1)} km
                        </div>
                      )}
                    </div>
                  ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <div className="inline-flex p-4 bg-white rounded-full shadow-sm mb-4"><Filter className="text-gray-400" size={32} /></div>
                  <h3 className="text-lg font-bold text-gray-700">No crops found.</h3>
                  <p className="text-gray-500 mb-6">Try adjusting your search or filters.</p>
                  <button onClick={resetFilters} className="text-saka-green font-bold hover:underline">Clear all filters</button>
                </div>
            )
          )}
        </>
      )}
    </div>
  );
}