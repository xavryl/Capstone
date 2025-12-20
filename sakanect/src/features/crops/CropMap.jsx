import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Image as ImageIcon } from 'lucide-react'; // Fallback icon

// --- Fix Leaflet Icons (Standard Fix) ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
});

L.Marker.prototype.options.icon = DefaultIcon;

const CropMap = ({ crops }) => {
  // Default Center: Cebu City
  const defaultCenter = [10.3157, 123.8854];

  return (
    <div className="w-full h-[600px] rounded-xl overflow-hidden shadow-lg border border-gray-200 relative z-0 mt-4">
      <MapContainer 
        center={defaultCenter} 
        zoom={9} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {crops.map((crop) => {
            // --- Coordinate Normalization ---
            const coordSource = crop.coordinates || crop.locationCoordinates;
            if (!coordSource) return null;

            const lat = coordSource.lat;
            const lng = coordSource.lng || coordSource.lon;

            // Only render valid pins
            if (lat && lng && (lat !== 0 || lng !== 0)) {
                return (
                    <Marker key={crop.id || crop._id} position={[lat, lng]}>
                        <Popup>
                            <div className="min-w-[160px] text-center">
                                {/* --- CROP IMAGE SECTION --- */}
                                <div className="w-full h-32 rounded-lg overflow-hidden mb-2 bg-gray-100 flex items-center justify-center border border-gray-200">
                                    {crop.imageUrl ? (
                                        <img 
                                            src={crop.imageUrl} 
                                            alt={crop.title} 
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.onerror = null; 
                                                e.target.style.display = 'none'; // Hide broken images
                                                e.target.nextSibling.style.display = 'flex'; // Show fallback
                                            }}
                                        />
                                    ) : (
                                        // Fallback if no image URL exists
                                        <div className="flex flex-col items-center text-gray-400">
                                            <ImageIcon size={24} />
                                            <span className="text-[10px] mt-1">No Image</span>
                                        </div>
                                    )}
                                    {/* Fallback for broken links (hidden by default) */}
                                    <div className="hidden flex-col items-center text-gray-400 absolute">
                                        <ImageIcon size={24} />
                                    </div>
                                </div>

                                {/* --- CROP DETAILS --- */}
                                <h3 className="font-bold text-green-700 m-0 text-lg leading-tight">{crop.title}</h3>
                                <p className="text-xs text-gray-500 my-1 truncate max-w-[150px] mx-auto">{crop.location}</p>
                                
                                <div className="flex justify-center items-center gap-2 mt-2">
                                    <span className="font-bold text-base text-gray-800">
                                        {crop.type === 'Donation' ? 'Free' : `₱${crop.price_per_kg}/kg`}
                                    </span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full text-white font-medium ${
                                        crop.type === 'Donation' ? 'bg-purple-500' :
                                        crop.type === 'Barter' ? 'bg-orange-500' : 'bg-green-600'
                                    }`}>
                                        {crop.type}
                                    </span>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                );
            }
            return null;
        })}
      </MapContainer>
    </div>
  );
};

export default CropMap;