import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Sprout, MapPin, Upload, X, Loader2 } from 'lucide-react';
import { storage } from '../../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getCoordinates, reverseGeocode } from '../../utils/geocoding';
import { API_URL } from '../../config/api'; 

// --- SWEETALERT IMPORT ---
import Swal from 'sweetalert2';

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function MapUpdater({ position }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(position, 13);
  }, [position, map]);
  return null;
}

export default function AddCrop() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);

  const [mapPosition, setMapPosition] = useState([10.3157, 123.8854]); 

  const [formData, setFormData] = useState({
    title: '',
    type: 'For Sale',
    price_per_kg: '',
    quantity_kg: '',
    location: '',
    description: '',
    imageFile: null
  });

  useEffect(() => {
    if (user && user.locationCoords) {
        setMapPosition([user.locationCoords.lat, user.locationCoords.lon]);
    }
  }, [user]);

  const [preview, setPreview] = useState(null);

  const onDrop = useCallback(acceptedFiles => {
    const file = acceptedFiles[0];
    setFormData(prev => ({ ...prev, imageFile: file }));
    setPreview(URL.createObjectURL(file));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, accept: {'image/*': []}, maxFiles: 1 
  });

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLocationBlur = async () => {
    if (!formData.location.trim()) return;
    setMapLoading(true);
    const query = formData.location.toLowerCase().includes('philippines') 
      ? formData.location 
      : `${formData.location}, Philippines`;

    const coords = await getCoordinates(query);
    if (coords) {
      setMapPosition([coords.lat, coords.lon]);
    }
    setMapLoading(false);
  };

  function LocationMarker() {
    useMapEvents({
      click: async (e) => {
        const { lat, lng } = e.latlng;
        setMapPosition([lat, lng]);
        
        setMapLoading(true);
        const address = await reverseGeocode(lat, lng);
        if (address) {
            setFormData(prev => ({ ...prev, location: address }));
        }
        setMapLoading(false);
      },
    });
    return mapPosition ? <Marker position={mapPosition} /> : null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    // --- SWEETALERT: LOGIN CHECK ---
    if (!user) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'You must be logged in to post a crop!',
        confirmButtonColor: '#16a34a' // saka-green
      });
      return;
    }

    // --- SWEETALERT: PRICE CHECK ---
    if (formData.type !== 'Donation' && (!formData.price_per_kg || Number(formData.price_per_kg) <= 0)) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Price',
        text: 'Please enter a valid price greater than 0.',
        confirmButtonColor: '#16a34a'
      });
      return;
    }

    // --- NEW CHECK: QUANTITY VALIDATION ---
    const quantity = Number(formData.quantity_kg);
    if (!quantity || quantity <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Quantity',
        text: 'Please enter a quantity greater than 0 kg.',
        confirmButtonColor: '#16a34a'
      });
      return;
    }

    setLoading(true);

    try {
      const lat = mapPosition[0];
      const lon = mapPosition[1];

      let imageUrl = "";
      if (formData.imageFile) {
        const imageRef = ref(storage, `crops/${user.id}/${Date.now()}_${formData.imageFile.name}`);
        const uploadResult = await uploadBytes(imageRef, formData.imageFile);
        imageUrl = await getDownloadURL(uploadResult.ref);
      }

      const newCrop = {
        title: formData.title,
        type: formData.type,
        price_per_kg: Number(formData.price_per_kg) || 0,
        quantity_kg: quantity, // Using the validated quantity
        location: formData.location, 
        coordinates: { 
            type: 'Point',
            coordinates: [lon, lat] 
        },
        imageUrl: imageUrl,
        sellerId: user.id,
        sellerName: user.username || user.name,
        description: formData.description || ""
      };

      const response = await fetch(`${API_URL}/api/crops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCrop)
      });

      if (!response.ok) throw new Error("Failed to save to MongoDB");

      // --- SWEETALERT: SUCCESS MESSAGE ---
      Swal.fire({
        icon: 'success',
        title: 'Posted!',
        text: 'Your crop listing is now live!',
        timer: 2500,
        showConfirmButton: false,
        timerProgressBar: true,
      });

      navigate('/crops');
    } catch (error) {
      console.error("Error posting crop:", error);
      
      // --- SWEETALERT: ERROR MESSAGE ---
      Swal.fire({
        icon: 'error',
        title: 'Upload Failed',
        text: error.message,
        confirmButtonColor: '#16a34a'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto bg-white p-8 rounded-xl shadow-md border border-gray-100 mt-10">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Sprout className="text-saka-green" /> Post New Crop
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${isDragActive ? 'border-saka-green bg-green-50' : 'border-gray-300'}`}>
                    <input {...getInputProps()} />
                    {preview ? (
                        <div className="relative w-full h-48">
                        <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                        <button type="button" onClick={(e) => { e.stopPropagation(); setPreview(null); setFormData(p => ({...p, imageFile: null})) }} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"><X size={16} /></button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-gray-500">
                        <Upload size={40} className="mb-2 text-gray-400" />
                        <p>Drag & drop photo here</p>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-gray-700 font-medium mb-2">Crop Name</label>
                    <input type="text" name="title" placeholder="e.g. Fresh Tomatoes" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-saka-green outline-none" value={formData.title} onChange={handleChange} required />
                </div>

                <div>
                    <label className="block text-gray-700 font-medium mb-2">Transaction Type</label>
                    <div className="flex gap-2">
                        {['For Sale', 'Barter', 'Donation'].map((type) => (
                        <label key={type} className="flex-1 flex items-center justify-center cursor-pointer bg-gray-50 px-2 py-2 rounded-lg border hover:border-saka-green transition text-sm">
                            <input type="radio" name="type" value={type} checked={formData.type === type} onChange={handleChange} className="mr-2 text-saka-green focus:ring-saka-green" />
                            {type}
                        </label>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {formData.type !== 'Donation' && (
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Price/Kg (₱)</label>
                            <input 
                                type="number" 
                                name="price_per_kg" 
                                placeholder="0.00" 
                                min="0.01"
                                step="0.01"
                                value={formData.price_per_kg} 
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-saka-green outline-none" 
                                onChange={handleChange} 
                                required 
                            />
                        </div>
                    )}
                    <div className={formData.type === 'Donation' ? 'col-span-2' : ''}>
                        <label className="block text-gray-700 font-medium mb-2">Quantity (Kg)</label>
                        <input 
                            type="number" 
                            name="quantity_kg" 
                            placeholder="Total kg" 
                            min="0.1"
                            step="0.1"
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-saka-green outline-none" 
                            onChange={handleChange} 
                            required 
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-col h-full">
                <label className="text-gray-700 font-medium mb-2 flex justify-between">
                    Farm Location
                    {mapLoading && <span className="text-xs text-saka-green flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> Locating...</span>}
                </label>
                
                <div className="relative mb-2">
                    <MapPin className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input 
                        type="text" name="location" 
                        placeholder="Search city or click map..." 
                        value={formData.location} 
                        onChange={handleChange} 
                        onBlur={handleLocationBlur} 
                        className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-saka-green outline-none" 
                        required 
                    />
                </div>

                <div className="flex-grow bg-gray-100 rounded-lg overflow-hidden border border-gray-300 min-h-[300px]">
                    <MapContainer center={mapPosition} zoom={13} style={{ height: '100%', width: '100%' }}>
                        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <LocationMarker />
                        <MapUpdater position={mapPosition} />
                    </MapContainer>
                </div>
                <p className="text-xs text-gray-500 mt-1 mb-4">Click the map to set exact location.</p>

                <button disabled={loading} type="submit" className="w-full bg-saka-green text-white font-bold py-3 rounded-lg hover:bg-saka-dark transition shadow-lg flex justify-center items-center gap-2 mt-auto">
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Post Listing'}
                </button>
            </div>
        </div>
      </form>
    </div>
  );
}