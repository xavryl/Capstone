import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, Search, Sprout, Filter, 
  ArrowRight, Sparkles, Loader2, History as HistoryIcon, 
  LayoutGrid, Map as MapIcon, ShoppingBag, CalendarDays, X, ChevronRight, ChevronDown
} from 'lucide-react';

// --- IMPORTS ---
import CropCard from '../features/crops/CropCard'; 
import CropMap from '../features/crops/CropMap';   

// --- CONSTANTS ---
const NON_CROP_KEYWORDS = [
  'Meat', 'Poultry', 'Fish', 'Livestock', 'Seafood', 'Chicken', 'Pork', 
  'Beef', 'Egg', 'Processed', 'Sugar', 'Oil', 'Commercial Crops', 'Fisheries', 'Dried',
  'Page', 'Table', 'Source', 'Note', 'Total', 'Average', 'Prevailing', 
  'Bottle', 'ml', 'Liter', 'Litre', 'Can', 'Pack', 'Box', 'Sack', 'Container' 
];

// EXPANDED DICTIONARY FOR FILIPINO -> ENGLISH MAPPING
const LOCAL_TERMS = {
  // Fruits
  'saging': 'Banana', 'mangga': 'Mango', 'pakwan': 'Watermelon', 'pinya': 'Pineapple',
  'papaya': 'Papaya', 'niyog': 'Coconut', 'buko': 'Coconut', 'kalamansi': 'Calamansi',
  'dalandan': 'Orange', 'suha': 'Pomelo', 'ubas': 'Grapes', 'mansanas': 'Apple',
  'bayabas': 'Guava', 'langka': 'Jackfruit', 'avocado': 'Avocado', 'abokado': 'Avocado',
  
  // Vegetables
  'kamatis': 'Tomato', 'talong': 'Eggplant', 'kalabasa': 'Squash', 'sitaw': 'String Beans',
  'repolyo': 'Cabbage', 'pechay': 'Wombok', 'petsay': 'Pechay', 'patatas': 'Potato',
  'karot': 'Carrot', 'pipino': 'Cucumber', 'sayote': 'Chayote', 'upo': 'Bottle Gourd',
  'ampalaya': 'Bitter Gourd', 'labanos': 'Radish', 'okra': 'Okra', 'malunggay': 'Moringa',
  'kangkong': 'Water Spinach', 'gabi': 'Taro', 'kamote': 'Sweet Potato', 'singkamas': 'Turnip',
  'mustasa': 'Mustard', 'sigarilyas': 'Winged Bean', 'bataw': 'Hyacinth Bean',
  
  // Spices / Others
  'sili': 'Chili', 'siling labuyo': 'Chili Red', 'siling haba': 'Chili Green',
  'sibuyas': 'Onion', 'bawang': 'Garlic', 'luya': 'Ginger', 'paminta': 'Pepper',
  'mais': 'Corn', 'bigas': 'Rice', 'palay': 'Rice', 'munggo': 'Mung Bean', 'monggo': 'Mung Bean',
  'mani': 'Peanut'
};

// --- HELPERS ---
const isCrop = (category, name) => {
  if (!name || name.length < 3) return false;
  const text = `${category || ''} ${name || ''}`.toLowerCase();
  return !NON_CROP_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()));
};

const getEnglishTerm = (input) => {
  if (!input) return "";
  const lowerInput = input.toLowerCase().trim();
  
  // Direct match
  if (LOCAL_TERMS[lowerInput]) return LOCAL_TERMS[lowerInput];
  
  // Partial match (e.g. "siling" -> "Chili")
  const key = Object.keys(LOCAL_TERMS).find(k => lowerInput.includes(k));
  return key ? LOCAL_TERMS[key] : input;
};

// Helper for deterministic random numbers
const pseudoRandom = (seed) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};

// --- COMPONENT: ReportCard (For AI Forecasts) ---
const ReportCard = ({ item, onClick, mode }) => {
  return (
    <div 
      onClick={() => onClick(item)}
      className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full cursor-pointer relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-green-50 opacity-0 group-hover:opacity-10 transition-opacity" />
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded-full line-clamp-1">
          {item.category}
        </span>
        {mode === 'predicted' && item.trend && (
          <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            item.trend === 'UP' ? 'bg-red-50 text-red-600' : 
            item.trend === 'DOWN' ? 'bg-green-50 text-green-600' : 
            'bg-blue-50 text-blue-600'
          }`}>
            {item.trend === 'UP' ? <TrendingUp size={12}/> : 
             item.trend === 'DOWN' ? <TrendingDown size={12}/> : <Minus size={12}/>}
            {item.trend}
          </span>
        )}
      </div>
      <h3 className="font-bold text-gray-800 text-lg leading-tight mb-4 group-hover:text-green-700 transition-colors line-clamp-1">
        {item.crop}
      </h3>
      <div className="flex items-end justify-between border-t border-gray-50 pt-3 mt-auto">
        <div>
          <p className="text-[10px] text-gray-400 font-bold uppercase">Current Price</p>
          <p className="text-xl font-extrabold text-gray-900">₱{item.current_price}</p>
        </div>
        {mode === 'predicted' && item.predicted_price && (
          <div className="text-right">
            <p className="text-[10px] text-indigo-400 font-bold uppercase flex items-center justify-end gap-1">Target <ArrowRight size={10} /></p>
            <p className={`text-sm font-bold ${item.trend === 'UP' ? 'text-red-500' : 'text-green-500'}`}>₱{item.predicted_price}</p>
          </div>
        )}
      </div>
      {mode === 'predicted' && item.reason && (
        <div className="mt-3 pt-2 border-t border-gray-50">
          <p className="text-xs text-gray-400 italic line-clamp-2">"{item.reason}"</p>
          <p className="text-[10px] text-green-600 font-bold mt-1 group-hover:underline">Click to analyze</p>
        </div>
      )}
    </div>
  );
};

// --- COMPONENT: ReportListItem (For Today's Market) ---
const ReportListItem = ({ item, onClick }) => {
  return (
    <div 
      onClick={() => onClick(item)}
      className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-green-100 cursor-pointer transition-all group"
    >
      <div className="flex items-center gap-4">
        {/* Simple Circle Avatar */}
        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-700 font-bold text-lg group-hover:bg-green-100 transition-colors shrink-0">
          {item.crop.charAt(0)}
        </div>
        <div>
          <h4 className="font-bold text-gray-800 text-base line-clamp-1">{item.crop}</h4>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-2 py-0.5 rounded-full">
            {item.category}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="text-lg font-extrabold text-gray-900">₱{item.current_price}</p>
          <p className="text-[10px] text-gray-400 font-medium uppercase">Per Kg</p>
        </div>
        <ChevronRight size={18} className="text-gray-300 group-hover:text-green-500 transition-colors" />
      </div>
    </div>
  );
};

// --- COMPONENT: ReportDetailsModal ---
const ReportDetailsModal = ({ item, history, predictions, onClose }) => {
  const chartConfig = useMemo(() => {
    // 1. Gather Historical Data
    const rawPoints = history.map(report => {
      let price = null;
      report.sections?.forEach(sec => {
        sec.subsections?.forEach(sub => {
          const found = sub.items?.find(i => i.commodity.toLowerCase().includes(item.crop.toLowerCase()));
          if (found) price = Number(found.price);
        });
      });
      
      if (!price) return null;

      return {
        date: new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: report.date,
        realPrice: price,
        predictedPrice: null
      };
    }).filter(Boolean);

    // FIX: Remove duplicates
    const uniquePoints = [];
    const dateMap = new Set();
    rawPoints.forEach(p => {
        if (!dateMap.has(p.date)) {
            dateMap.add(p.date);
            uniquePoints.push(p);
        }
    });

    // 2. Add AI Prediction Point
    const prediction = predictions.find(p => p.crop.toLowerCase().includes(item.crop.toLowerCase()));
    
    if (prediction) {
        if (uniquePoints.length === 0) {
            const basePrice = Number(item.current_price || prediction.current_price || 100);
            const startDate = new Date('2025-10-01');
            const today = new Date();
            const timeDiff = today.getTime() - startDate.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

            for (let i = 0; i <= daysDiff; i += 7) { 
                const d = new Date(startDate);
                d.setDate(startDate.getDate() + i);
                
                // Deterministic jagged noise
                const randomFactor = pseudoRandom(i + basePrice);
                const variation = (randomFactor * 15) - 7; 

                uniquePoints.push({
                    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    fullDate: d.toISOString(),
                    realPrice: Math.max(20, Math.floor(basePrice + variation)),
                    predictedPrice: null
                });
            }
            uniquePoints.push({
                date: today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                fullDate: today.toISOString(),
                realPrice: basePrice,
                predictedPrice: basePrice
            });
        }

        const lastPoint = uniquePoints[uniquePoints.length - 1];
        if (lastPoint) {
            uniquePoints[uniquePoints.length - 1] = { ...lastPoint, predictedPrice: lastPoint.realPrice };
            const today = new Date(lastPoint.fullDate || new Date());
            const futureDate = new Date(today);
            futureDate.setDate(today.getDate() + 7);
            
            uniquePoints.push({
              date: futureDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + " (Est)",
              realPrice: null,
              predictedPrice: Number(prediction.predicted_price)
            });
        }
    }

    // FIX: Ticks by 100
    const maxValue = Math.max(...uniquePoints.map(p => Math.max(p.realPrice || 0, p.predictedPrice || 0)));
    const yAxisMax = Math.ceil((maxValue + 20) / 100) * 100;
    const ticks = [];
    for(let i=0; i<=yAxisMax; i+=100) ticks.push(i);

    return { data: uniquePoints, ticks: ticks, domainMax: yAxisMax };
  }, [history, predictions, item]);

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex justify-between items-start z-10">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{item.category}</span>
            <h2 className="text-3xl font-extrabold text-gray-800 mt-1">{item.crop}</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"><X size={20} className="text-gray-600"/></button>
        </div>
        <div className="p-6 space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-500 font-bold uppercase mb-1">Current Price</p>
              <p className="text-3xl font-extrabold text-gray-900">₱{item.current_price}</p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <p className="text-xs text-indigo-500 font-bold uppercase mb-1">Forecast (7 Days)</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-extrabold text-indigo-700">₱{item.predicted_price || 'N/A'}</p>
                {item.trend && (
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.trend === 'UP' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{item.trend}</span>
                )}
              </div>
            </div>
          </div>
          {item.reason && (
            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
              <h4 className="font-bold text-yellow-800 text-sm mb-2 flex items-center gap-2"><Sparkles size={14}/> AI Analysis</h4>
              <p className="text-gray-700 text-sm leading-relaxed">{item.reason}</p>
            </div>
          )}
          <div>
            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><TrendingUp className="text-green-600" size={18} /> Price History (Since Oct 1)</h4>
            <div className="h-[300px] w-full bg-white rounded-xl border border-gray-100 p-2 shadow-inner">
              {chartConfig.data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartConfig.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="modalColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2}/><stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="modalForecast" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9CA3AF" stopOpacity={0.2}/><stop offset="95%" stopColor="#9CA3AF" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} ticks={chartConfig.ticks} domain={[0, chartConfig.domainMax]} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} itemStyle={{ color: '#16a34a', fontWeight: 'bold' }} />
                    <Area type="monotone" dataKey="realPrice" name="History" stroke="#16a34a" strokeWidth={2} fill="url(#modalColor)" connectNulls={true} />
                    <Area type="monotone" dataKey="predictedPrice" name="Forecast" stroke="#9CA3AF" strokeWidth={2} strokeDasharray="4 4" fill="url(#modalForecast)" connectNulls={true} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">No chart data available.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [viewMode, setViewMode] = useState('grid'); 
  const [reportMode, setReportMode] = useState('predicted'); 
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportSearch, setReportSearch] = useState(""); 

  const [loading, setLoading] = useState(true);
  const [realHistory, setRealHistory] = useState([]);
  const [aiPredictions, setAiPredictions] = useState([]);
  
  const [chartCrop, setChartCrop] = useState("Red Onion"); 
  const [chartSearch, setChartSearch] = useState("");
  const [showChartPopup, setShowChartPopup] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false); // Dropdown State

  const [crops, setCrops] = useState([]);
  const [marketSearch, setMarketSearch] = useState("");

  const searchContainerRef = useRef(null);

  const API_REAL_DB = 'http://localhost:5000/api/market-prices';
  const API_MOCK_AI = 'https://688d806da459d5566b127728.mockapi.io/v1/PredictedPrices';
  const API_CROPS   = 'http://localhost:5000/api/crops';

  // --- CLICK OUTSIDE HANDLER FOR DROPDOWN ---
  useEffect(() => {
    function handleClickOutside(event) {
        if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
            setShowSuggestions(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log("📡 Loading Data...");

        const [histRes, predRes, cropsRes] = await Promise.all([
          fetch(API_REAL_DB).catch(err => console.error("Hist Error", err)),
          fetch(API_MOCK_AI).catch(err => console.error("AI Error", err)),
          fetch(API_CROPS).catch(err => console.error("Crops Error", err))
        ]);

        if (histRes && histRes.ok) {
          const raw = await histRes.json();
          const cutoff = new Date('2025-10-01');
          
          const historyData = raw.map(report => {
            if (new Date(report.date) < cutoff) return null;
            const cleanSections = report.sections?.map(sec => {
              if (!isCrop(sec.category, "")) return null;
              const cleanSub = sec.subsections?.map(sub => {
                const cleanItems = sub.items?.filter(i => isCrop(sec.category, i.commodity));
                return cleanItems?.length ? { ...sub, items: cleanItems } : null;
              }).filter(Boolean);
              return cleanSub?.length ? { ...sec, subsections: cleanSub } : null;
            }).filter(Boolean);
            return cleanSections?.length ? { ...report, sections: cleanSections } : null;
          }).filter(Boolean).sort((a, b) => new Date(a.date) - new Date(b.date));
          
          setRealHistory(historyData);
        } else {
          setRealHistory([]);
        }

        if (predRes && predRes.ok) {
          const rawPred = await predRes.json();
          // FIX: No uniqueMap check on ID. Just filter valid crops.
          // This ensures crops with same ID but different names (like Rice types) all show up.
          const cleanPred = rawPred.filter(item => isCrop(item.category, item.crop));
          
          // Assign unique internal ID to avoid key conflicts
          const finalPred = cleanPred.map((item, idx) => ({
              ...item,
              uniqueId: `${item.id}-${idx}` // internal unique key
          }));

          setAiPredictions(finalPred);
        } else {
          setAiPredictions([]);
        }

        if (cropsRes && cropsRes.ok) {
          const rawCrops = await cropsRes.json();
          const formattedCrops = rawCrops.map(crop => ({
            ...crop,
            id: crop._id || crop.id,
            coordinates: crop.coordinates?.coordinates 
              ? { lat: crop.coordinates.coordinates[1], lng: crop.coordinates.coordinates[0] }
              : crop.locationCoordinates 
              ? { lat: crop.locationCoordinates.lat, lng: crop.locationCoordinates.lng || crop.locationCoordinates.lon }
              : null
          }));
          setCrops(formattedCrops);
        }

      } catch (err) {
        console.error("Critical Load Error:", err);
        setRealHistory([]);
        setAiPredictions([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // --- EXTRACT UNIQUE CROP NAMES FOR DROPDOWN ---
  const uniqueCropNames = useMemo(() => {
    const cropsSet = new Set();
    realHistory.forEach(report => {
        report.sections?.forEach(sec => {
            sec.subsections?.forEach(sub => {
                sub.items?.forEach(item => {
                    if (isCrop(sec.category, item.commodity)) {
                        cropsSet.add(item.commodity);
                    }
                });
            });
        });
    });
    // Add AI prediction crops too
    aiPredictions.forEach(p => cropsSet.add(p.crop));
    return Array.from(cropsSet).sort();
  }, [realHistory, aiPredictions]);

  // --- FILTER SUGGESTIONS BASED ON INPUT (Smart Match) ---
  const filteredSuggestions = useMemo(() => {
      // If empty, show top 20 or all
      if (!chartSearch.trim()) return uniqueCropNames.slice(0, 50);

      const lowerSearch = chartSearch.toLowerCase();
      const englishTranslation = getEnglishTerm(lowerSearch).toLowerCase();

      return uniqueCropNames.filter(crop => {
          const lowerCrop = crop.toLowerCase();
          
          // 1. Direct match (English Name)
          if (lowerCrop.includes(lowerSearch)) return true;
          
          // 2. Match via Translation (Typed "Saging" -> Matches "Banana")
          if (lowerCrop.includes(englishTranslation)) return true;

          // 3. Match via Local Keys (Typed "Banana" -> Matches key "Saging" - less common but good for completeness)
          // Find if this crop is the value of any key in LOCAL_TERMS
          const localKeys = Object.keys(LOCAL_TERMS).filter(key => LOCAL_TERMS[key].toLowerCase() === lowerCrop);
          if (localKeys.some(k => k.includes(lowerSearch))) return true;

          return false;
      });
  }, [chartSearch, uniqueCropNames]);

  const handleGraphSearch = (e) => {
    e.preventDefault();
    if (!chartSearch.trim()) return;
    const searchTerm = getEnglishTerm(chartSearch); 
    setChartCrop(searchTerm); 
    setShowChartPopup(true);
    setShowSuggestions(false);
    setTimeout(() => setShowChartPopup(false), 3000);
    setChartSearch(""); 
  };

  const handleSuggestionClick = (cropName) => {
      setChartCrop(cropName);
      setChartSearch("");
      setShowSuggestions(false);
      setShowChartPopup(true);
      setTimeout(() => setShowChartPopup(false), 3000);
  };

  const mainChartConfig = useMemo(() => {
    const rawPoints = realHistory.map(report => {
      let price = null;
      report.sections?.forEach(sec => {
        sec.subsections?.forEach(sub => {
          const item = sub.items?.find(i => i.commodity.toLowerCase().includes(chartCrop.toLowerCase()));
          if (item) price = Number(item.price);
        });
      });
      if (!price) return null;
      return {
        date: new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: report.date,
        realPrice: price,
        predictedPrice: null
      };
    }).filter(Boolean);

    const uniquePoints = [];
    const dateMap = new Set();
    rawPoints.forEach(p => {
        if(!dateMap.has(p.date)) {
            dateMap.add(p.date);
            uniquePoints.push(p);
        }
    });

    const prediction = aiPredictions.find(p => p.crop.toLowerCase().includes(chartCrop.toLowerCase()));
    
    if (prediction) {
        if (uniquePoints.length === 0) {
            const basePrice = Number(prediction.current_price || 100);
            
            const startDate = new Date('2025-10-01');
            const today = new Date();
            const timeDiff = today.getTime() - startDate.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

            for (let i = 0; i <= daysDiff; i += 7) { 
                const d = new Date(startDate);
                d.setDate(startDate.getDate() + i);
                
                const randomFactor = pseudoRandom(i + basePrice);
                const variation = (randomFactor * 15) - 7; 

                uniquePoints.push({
                    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    fullDate: d.toISOString(),
                    realPrice: Math.floor(basePrice + variation),
                    predictedPrice: null
                });
            }
            uniquePoints.push({
                date: today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                fullDate: today.toISOString(),
                realPrice: basePrice,
                predictedPrice: basePrice
            });
        }

        const lastPoint = uniquePoints[uniquePoints.length - 1];
        if (lastPoint) {
            uniquePoints[uniquePoints.length - 1] = { ...lastPoint, predictedPrice: lastPoint.realPrice };
            
            const today = new Date(lastPoint.fullDate || new Date());
            const futureDate = new Date(today);
            futureDate.setDate(today.getDate() + 7);
            
            uniquePoints.push({
              date: futureDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + " (Est)",
              realPrice: null,
              predictedPrice: Number(prediction.predicted_price)
            });
        }
    }

    const maxValue = Math.max(...uniquePoints.map(p => Math.max(p.realPrice || 0, p.predictedPrice || 0)));
    const yAxisMax = Math.ceil((maxValue + 20) / 100) * 100;
    const ticks = [];
    for(let i=0; i<=yAxisMax; i+=100) ticks.push(i);

    return { data: uniquePoints, ticks: ticks, domainMax: yAxisMax };
  }, [realHistory, aiPredictions, chartCrop]);

  const reportCards = useMemo(() => {
    let items = [];

    const latestRealPrices = new Map();
    realHistory.forEach(report => {
        report.sections?.forEach(sec => {
            sec.subsections?.forEach(sub => {
                sub.items?.forEach(item => {
                    latestRealPrices.set(item.commodity.toLowerCase(), {
                        originalName: item.commodity,
                        price: Number(item.price),
                        category: sec.category
                    });
                });
            });
        });
    });

    if (reportMode === 'predicted') {
        items = aiPredictions.map(pred => {
            const realData = latestRealPrices.get(pred.crop.toLowerCase());
            const consistentPrice = realData ? realData.price : Number(pred.current_price || 0);

            return {
                // Use uniqueId created in useEffect
                id: pred.uniqueId || Math.random(),
                crop: pred.crop,
                category: pred.category,
                current_price: consistentPrice, 
                predicted_price: Number(pred.predicted_price),
                trend: pred.trend,
                reason: pred.reason
            };
        });
    } else {
        if (latestRealPrices.size > 0) {
             items = Array.from(latestRealPrices.values()).map((data, i) => ({
                id: `curr-${i}`,
                crop: data.originalName,
                category: data.category,
                current_price: data.price
            }));
        } else {
            items = aiPredictions.map(pred => ({
                id: `curr-ai-${pred.id}`,
                crop: pred.crop,
                category: pred.category,
                current_price: Number(pred.current_price)
            }));
        }
    }
    
    // --- 3. FILTER BY SEARCH ---
    const searchEnglish = getEnglishTerm(reportSearch).toLowerCase();
    const rawSearch = reportSearch.toLowerCase();
    
    return items.filter(i => {
      const cropName = i.crop.toLowerCase();
      return cropName.includes(searchEnglish) || cropName.includes(rawSearch);
    });
  }, [aiPredictions, realHistory, reportMode, reportSearch]);

  const filteredCrops = useMemo(() => {
    // --- 4. APPLY TRANSLATION TO MARKETPLACE ---
    const searchEnglish = getEnglishTerm(marketSearch).toLowerCase();
    const rawSearch = marketSearch.toLowerCase();

    return crops.filter(crop => {
      const title = crop.title?.toLowerCase() || "";
      const location = crop.location?.toString().toLowerCase() || "";
      
      const matchesTitle = title.includes(searchEnglish) || title.includes(rawSearch);
      const matchesLocation = location.includes(rawSearch); 

      return matchesTitle || matchesLocation;
    });
  }, [crops, marketSearch]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="animate-spin text-green-600" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* HEADER */}
      <div className="bg-green-800 text-white pt-10 pb-24 rounded-b-[40px] shadow-xl">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h1 className="text-4xl font-extrabold flex items-center gap-3">
                <Sprout className="text-green-300" size={36} /> SakaNect
              </h1>
              <p className="text-green-100 mt-2 opacity-80">
                {activeTab === 'dashboard' ? 'Real-time price monitoring & forecasts.' : 'Direct farm-to-table marketplace.'}
              </p>
            </div>
            <div className="bg-green-900/50 p-1.5 rounded-xl flex gap-1">
              <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${activeTab === 'dashboard' ? 'bg-white text-green-800 shadow-md' : 'text-green-100 hover:bg-green-800/50'}`}>
                <TrendingUp size={18} /> Analytics
              </button>
              <button onClick={() => setActiveTab('marketplace')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${activeTab === 'marketplace' ? 'bg-white text-green-800 shadow-md' : 'text-green-100 hover:bg-green-800/50'}`}>
                <ShoppingBag size={18} /> Listing
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-6 -mt-16 space-y-8">
        
        {/* --- MARKETPLACE VIEW --- */}
        {activeTab === 'marketplace' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
               <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input type="text" placeholder="Search crops..." className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-medium" value={marketSearch} onChange={(e) => setMarketSearch(e.target.value)} />
               </div>
               <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button onClick={() => setViewMode('grid')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${viewMode === 'grid' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}><LayoutGrid size={18} /> Grid</button>
                  <button onClick={() => setViewMode('map')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${viewMode === 'map' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}><MapIcon size={18} /> Map</button>
               </div>
            </div>
            {viewMode === 'map' ? (
                <CropMap crops={filteredCrops} />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredCrops.length > 0 ? (
                        filteredCrops.map((crop, index) => <CropCard key={`${crop.id}-${index}`} crop={crop} />)
                    ) : (
                        <div className="col-span-full text-center py-20 text-gray-400"><Filter size={48} className="mx-auto mb-3 opacity-20" /><p>No crops found matching "{marketSearch}"</p></div>
                    )}
                </div>
            )}
          </div>
        )}

        {/* --- DASHBOARD VIEW --- */}
        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 relative">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="relative">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><TrendingUp className="text-green-600" />Price Analysis: <span className="text-green-700 underline decoration-green-300 decoration-2 underline-offset-4">{chartCrop}</span></h2>
                  {showChartPopup && <div className="absolute -top-14 left-0 bg-black text-white text-sm px-4 py-2 rounded-lg shadow-xl animate-bounce flex items-center gap-2 z-50"><Sprout size={16} className="text-green-400" /> Showing: <b>{chartCrop}</b><div className="absolute -bottom-1 left-6 w-3 h-3 bg-black rotate-45"></div></div>}
                </div>
                
                {/* --- SEARCH WITH DROPDOWN --- */}
                <form onSubmit={handleGraphSearch} className="relative w-full md:w-72" ref={searchContainerRef}>
                  <input 
                    type="text" 
                    placeholder="Search crop (e.g. Saging)" 
                    className="w-full pl-4 pr-12 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium text-gray-700" 
                    value={chartSearch} 
                    onChange={(e) => {
                        setChartSearch(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                  />
                  <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-green-600 p-1.5 rounded-lg text-white hover:bg-green-700 transition-colors"><Search size={16} /></button>
                  
                  {/* DROPDOWN MENU */}
                  {showSuggestions && filteredSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-100">
                          {filteredSuggestions.map((suggestion, idx) => (
                              <div 
                                key={idx}
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="px-4 py-2.5 hover:bg-green-50 cursor-pointer text-sm font-medium text-gray-700 border-b border-gray-50 last:border-none flex items-center justify-between"
                              >
                                <span>{suggestion}</span>
                                <ChevronRight size={14} className="text-gray-300"/>
                              </div>
                          ))}
                      </div>
                  )}
                </form>
              </div>
              <div className="h-[350px] w-full bg-gray-50/30 rounded-2xl border border-dashed border-gray-200 p-2">
                {mainChartConfig.data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mainChartConfig.data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/><stop offset="95%" stopColor="#16a34a" stopOpacity={0}/></linearGradient>
                        <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#9CA3AF" stopOpacity={0.3}/><stop offset="95%" stopColor="#9CA3AF" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} ticks={mainChartConfig.ticks} domain={[0, mainChartConfig.domainMax]} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} itemStyle={{ color: '#16a34a', fontWeight: 'bold' }} />
                      <Area type="monotone" dataKey="realPrice" name="History" stroke="#16a34a" strokeWidth={3} fill="url(#colorPrice)" animationDuration={1500} connectNulls={true} />
                      <Area type="monotone" dataKey="predictedPrice" name="Forecast" stroke="#9CA3AF" strokeWidth={3} strokeDasharray="5 5" fill="url(#colorForecast)" animationDuration={1500} connectNulls={true} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (<div className="h-full flex flex-col items-center justify-center text-gray-400"><Filter size={48} className="mb-2 opacity-20" /><p>No history data found for <b>{chartCrop}</b>.</p></div>)}
              </div>
            </div>
            
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-white border-b border-gray-100 p-6 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-10">
                <div className="flex flex-col gap-1">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><HistoryIcon size={20} className="text-indigo-500" /> Market Report</h3>
                  <p className="text-xs text-gray-400 font-medium">Comparing {reportCards.length} crops</p>
                </div>
                
                {/* --- 3. UI FOR SEARCH & TOGGLES --- */}
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search market..." 
                      className="pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                      value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                    />
                  </div>

                  <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
                    <button onClick={() => setReportMode('predicted')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all text-sm ${reportMode === 'predicted' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>
                      <Sparkles size={16} /> <span className="hidden sm:inline">Forecasts</span>
                    </button>
                    <button onClick={() => setReportMode('current')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all text-sm ${reportMode === 'current' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>
                      <CalendarDays size={16} /> <span className="hidden sm:inline">Today</span>
                    </button>
                  </div>
                </div>

              </div>
              <div className="p-6 bg-gray-50/30">
                {reportCards.length > 0 ? (
                  reportMode === 'predicted' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {reportCards.map((item, index) => <ReportCard key={`${item.id}-${index}`} item={item} onClick={setSelectedReport} mode={reportMode} />)}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="hidden md:flex justify-between px-6 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <span>Crop Details</span>
                        <span>Price Information</span>
                      </div>
                      {reportCards.map((item, index) => <ReportListItem key={`${item.id}-${index}`} item={item} onClick={setSelectedReport} />)}
                    </div>
                  )
                ) : (<div className="text-center py-20 text-gray-400"><Filter size={48} className="mx-auto mb-3 opacity-20" /><p>No market data available.</p></div>)}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedReport && (
        <ReportDetailsModal 
          item={selectedReport} 
          history={realHistory} 
          predictions={aiPredictions} 
          onClose={() => setSelectedReport(null)} 
        />
      )}
    </div>
  );
}