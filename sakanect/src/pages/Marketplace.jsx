import React, { useState, useEffect } from 'react';
import { LayoutGrid, Map as MapIcon, Search, Filter, Loader2 } from 'lucide-react';
import CropCard from '../components/crops/CropCard';
import CropMap from '../components/crops/CropMap'; // Make sure this file exists (code below)
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function Marketplace() {
  const [viewMode, setViewMode] = useState('grid'); // This is the state for the missing button
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // --- FETCH CROPS FROM FIREBASE ---
  useEffect(() => {
    const fetchCrops = async () => {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, "crops")); 
        const cropsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCrops(cropsData);
      } catch (error) {
        console.error("Error fetching crops:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCrops();
  }, []);

  // --- FILTER LOGIC ---
  const filteredCrops = crops.filter(crop => 
    crop.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    crop.location?.toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20 pt-6">
      <div className="container mx-auto max-w-7xl px-4">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Marketplace</h1>
            <p className="text-gray-500 text-sm">Find fresh produce near you</p>
          </div>

          {/* --- CONTROLS --- */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            
            {/* Search Bar */}
            <div className="relative flex-grow md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search crops..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* --- THIS IS THE MISSING BUTTON GROUP --- */}
            <div className="bg-white p-1 rounded-xl border border-gray-200 flex shadow-sm">
              <button 
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                  viewMode === 'grid' 
                    ? 'bg-green-100 text-green-700 shadow-sm' 
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <LayoutGrid size={18} />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button 
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                  viewMode === 'map' 
                    ? 'bg-green-100 text-green-700 shadow-sm' 
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <MapIcon size={18} />
                <span className="hidden sm:inline">Map</span>
              </button>
            </div>
          </div>
        </div>

        {/* --- CONTENT RENDERER --- */}
        {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-green-600" /></div>
        ) : (
            <>
                {viewMode === 'map' ? (
                    // SHOW MAP COMPONENT
                    <div className="animate-in fade-in duration-300">
                        <CropMap crops={filteredCrops} />
                    </div>
                ) : (
                    // SHOW GRID OF CARDS
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-300">
                        {filteredCrops.length > 0 ? (
                            filteredCrops.map((crop) => (
                                <CropCard key={crop.id} crop={crop} />
                            ))
                        ) : (
                            <div className="col-span-full text-center py-20 text-gray-400">
                                <Filter size={48} className="mx-auto mb-3 opacity-20" />
                                <p>No crops found matching "{searchTerm}"</p>
                            </div>
                        )}
                    </div>
                )}
            </>
        )}
      </div>
    </div>
  );
}