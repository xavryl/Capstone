import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storage } from '../../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Sprout, MapPin, DollarSign, Scale, Loader2, Upload, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
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

export default function EditCrop() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);

  const [mapPosition, setMapPosition] = useState([10.3157, 123.8854]); 
  const [mapLoading, setMapLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    type: 'For Sale',
    price_per_kg: '',
    quantity_kg: '',
    location: '',
    imageFile: null
  });

  useEffect(() => {
    const fetchCrop = async () => {
      try {
        const response = await fetch(`${API_URL}/api/crops/${id}`);
        if (!response.ok) throw new Error("Crop not found");
        
        const data = await response.json();
        
        setFormData({
          title: data.title,
          type: data.type,
          price_per_kg: data.price_per_kg,
          quantity_kg: data.quantity_kg,
          location: data.location,
          imageFile: null
        });
        setPreview(data.imageUrl);

        if (data.coordinates) {
             const lat = data.coordinates.coordinates ? data.coordinates.coordinates[1] : data.coordinates.lat;
             const lon = data.coordinates.coordinates ? data.coordinates.coordinates[0] : data.coordinates.lon;
             if (lat && lon) setMapPosition([lat, lon]);
        }
      } catch (error) {
        console.error("Error fetching crop:", error);
        
        // --- SWEETALERT: ERROR (Redirects after close) ---
        Swal.fire({
            icon: 'error',
            title: 'Not Found',
            text: 'This listing could not be found.',
            confirmButtonColor: '#16a34a'
        }).then(() => {
            navigate('/my-listings');
        });

      } finally {
        setLoading(false);
      }
    };
    fetchCrop();
  }, [id, navigate]);

  const onDrop = useCallback(acceptedFiles => {
    const file = acceptedFiles[0];
    setFormData(prev => ({ ...prev, imageFile: file }));
    setPreview(URL.createObjectURL(file));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, accept: {'image/*': []}, maxFiles: 1 
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let newImageUrl = preview;
      if (formData.imageFile) {
        const imageRef = ref(storage, `crops/${id}/updated_${Date.now()}_${formData.imageFile.name}`);
        const uploadResult = await uploadBytes(imageRef, formData.imageFile);
        newImageUrl = await getDownloadURL(uploadResult.ref);
      }

      const lat = mapPosition[0];
      const lon = mapPosition[1];

      const updates = {
        title: formData.title,
        type: formData.type,
        price_per_kg: Number(formData.price_per_kg),
        quantity_kg: Number(formData.quantity_kg),
        location: formData.location,
        coordinates: { type: 'Point', coordinates: [lon, lat] }, 
        imageUrl: newImageUrl
      };

      const response = await fetch(`${API_URL}/api/crops/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) throw new Error("Failed to update in MongoDB");

      // --- SWEETALERT: SUCCESS ---
      await Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: 'Your listing changes have been saved.',
        timer: 2000,
        showConfirmButton: false,
        timerProgressBar: true
      });

      navigate('/my-listings');
    } catch (error) {
      console.error("Update failed:", error);
      
      // --- SWEETALERT: ERROR ---
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: error.message || 'Something went wrong.',
        confirmButtonColor: '#16a34a'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-saka-green" size={40} /></div>;

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md border border-gray-100 mt-10">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Loader2 className="text-saka-green" /> Edit Listing
      </h2>

      <form onSubmit={handleUpdate} className="space-y-6">
        
        <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${isDragActive ? 'border-saka-green bg-green-50' : 'border-gray-300'}`}>
          <input {...getInputProps()} />
          {preview ? (
            <div className="relative w-full h-48">
              <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
              <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); setPreview(null); setFormData(p => ({...p, imageFile: null})) }} 
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-gray-500">
              <Upload size={40} className="mb-2 text-gray-400" />
              <p>Drag & drop to change photo</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-2">Crop Name</label>
          <input type="text" name="title" value={formData.title} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-saka-green outline-none" onChange={handleChange} required />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-2">Transaction Type</label>
          <div className="flex gap-4">
            {['For Sale', 'Barter', 'Donation'].map((type) => (
              <label key={type} className="flex items-center cursor-pointer bg-gray-50 px-4 py-2 rounded-lg border hover:border-saka-green transition">
                <input type="radio" name="type" value={type} checked={formData.type === type} onChange={handleChange} className="mr-2 text-saka-green focus:ring-saka-green" />
                {type}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {formData.type !== 'Donation' && (
            <div>
              <label className="block text-gray-700 font-medium mb-2">Price per Kg (₱)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 text-gray-400" size={20} />
                <input type="number" name="price_per_kg" value={formData.price_per_kg} className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-saka-green outline-none" onChange={handleChange} required />
              </div>
            </div>
          )}
          <div>
            <label className="block text-gray-700 font-medium mb-2">Quantity (Kg)</label>
            <div className="relative">
              <Scale className="absolute left-3 top-3 text-gray-400" size={20} />
              <input type="number" name="quantity_kg" value={formData.quantity_kg} className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-saka-green outline-none" onChange={handleChange} required />
            </div>
          </div>
        </div>

        <div>
          <label className="text-gray-700 font-medium mb-2 flex justify-between">
              Farm Location
              {mapLoading && <span className="text-xs text-saka-green flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> Finding map location...</span>}
          </label>
          <div className="border rounded-lg overflow-hidden border-gray-300">
             <div className="relative border-b">
                <MapPin className="absolute left-3 top-3 text-gray-400" size={20} />
                <input 
                    type="text" name="location" 
                    placeholder="Click on map to set location" 
                    value={formData.location} 
                    onChange={handleChange} 
                    onBlur={handleLocationBlur} 
                    className="w-full pl-10 p-3 outline-none" 
                    required 
                />
             </div>
             
             <div className="h-64 w-full bg-gray-100 z-0">
                <MapContainer center={mapPosition} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <LocationMarker />
                    <MapUpdater position={mapPosition} />
                </MapContainer>
             </div>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button type="button" onClick={() => navigate('/my-listings')} className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300 transition">Cancel</button>
          <button disabled={saving} type="submit" className="flex-1 bg-saka-green text-white font-bold py-3 rounded-lg hover:bg-saka-dark transition shadow-lg flex justify-center items-center gap-2">
            {saving && <Loader2 className="animate-spin" size={20} />}
            {saving ? 'Updating...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}