// import React, { useState, useEffect, useMemo } from 'react';
// import {
//   AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
// } from 'recharts';
// import {
//   TrendingUp, TrendingDown, Minus, Search, Calendar, Sprout, Filter, 
//   ArrowRight, Sparkles, Loader2, History as HistoryIcon, AlertTriangle,
//   LayoutGrid, Map as MapIcon, ShoppingBag
// } from 'lucide-react';
// import { collection, getDocs } from 'firebase/firestore';

// // --- IMPORTS ---
// import { db } from '../config/firebase'; 
// import CropCard from '../features/crops/CropCard'; 
// import CropMap from '../features/crops/CropMap';   

// // --- 1. UPDATED FILTER LIST (Removes "Bottles", "ml", "Page", etc.) ---
// const NON_CROP_KEYWORDS = [
//   // Categories to ignore
//   'Meat', 'Poultry', 'Fish', 'Livestock', 'Seafood', 'Chicken', 'Pork', 
//   'Beef', 'Egg', 'Processed', 'Sugar', 'Oil', 'Commercial Crops', 'Fisheries', 'Dried',
  
//   // Artifacts (Headers/Footers)
//   'Page', 'Table', 'Source', 'Note', 'Total', 'Average', 'Prevailing', 
  
//   // Packaging/Units (Removes "1000ml bottle", "Liter", etc.)
//   'Bottle', 'ml', 'Liter', 'Litre', 'Can', 'Pack', 'Box', 'Sack', 'Container' 
// ];

// const LOCAL_TERMS = {
//   'kamatis': 'Tomato', 'talong': 'Eggplant', 'kalabasa': 'Squash',
//   'sitaw': 'String Beans', 'repolyo': 'Cabbage', 'pechay': 'Wombok', 
//   'patatas': 'Potato', 'karot': 'Carrot', 'sili': 'Chili', 'bigas': 'Rice'
// };

// const isCrop = (category, name) => {
//   // 1. Filter out empty or very short names
//   if (!name || name.length < 3) return false;

//   // 2. Normalize text for checking
//   const text = `${category || ''} ${name || ''}`.toLowerCase();

//   // 3. Check against forbidden keywords
//   return !NON_CROP_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()));
// };

// const getEnglishTerm = (input) => {
//   const lowerInput = input.toLowerCase().trim();
//   if (LOCAL_TERMS[lowerInput]) return LOCAL_TERMS[lowerInput];
//   const key = Object.keys(LOCAL_TERMS).find(k => lowerInput.includes(k));
//   return key ? LOCAL_TERMS[key] : input;
// };

// export default function Home() {
//   // --- STATE ---
//   const [activeTab, setActiveTab] = useState('dashboard'); 
//   const [viewMode, setViewMode] = useState('grid'); 

//   // Dashboard State
//   const [loading, setLoading] = useState(true);
//   const [realHistory, setRealHistory] = useState([]);
//   const [aiPredictions, setAiPredictions] = useState([]);
//   const [allCropNames, setAllCropNames] = useState([]);
//   const [chartCrop, setChartCrop] = useState("Red Onion"); 
//   const [chartSearch, setChartSearch] = useState("");
//   const [showChartPopup, setShowChartPopup] = useState(false);
//   const [reportSearch, setReportSearch] = useState("");
//   const [reportDate, setReportDate] = useState(""); 

//   // Marketplace State
//   const [crops, setCrops] = useState([]);
//   const [marketSearch, setMarketSearch] = useState("");

//   const API_REAL_DB = 'http://localhost:5000/api/market-prices';
//   const API_MOCK_AI = 'https://688d806da459d5566b127728.mockapi.io/v1/PredictedPrices';

//   // --- LOAD DATA ---
//   useEffect(() => {
//     const loadData = async () => {
//       try {
//         console.log("📡 Loading Data...");
//         setLoading(true);
//         const uniqueCrops = new Set();

//         // 1. Fetch Analytics
//         const [histRes, predRes] = await Promise.all([
//           fetch(API_REAL_DB).catch(err => console.error("Hist Error", err)),
//           fetch(API_MOCK_AI).catch(err => console.error("AI Error", err))
//         ]);

//         if (histRes && histRes.ok) {
//           const raw = await histRes.json();
//           const historyData = raw.map(report => {
//             const cleanSections = report.sections?.map(sec => {
//               if (!isCrop(sec.category, "")) return null;
//               const cleanSub = sec.subsections?.map(sub => {
//                 const cleanItems = sub.items?.filter(i => {
//                   const valid = isCrop(sec.category, i.commodity);
//                   if (valid) uniqueCrops.add(i.commodity);
//                   return valid;
//                 });
//                 return cleanItems?.length ? { ...sub, items: cleanItems } : null;
//               }).filter(Boolean);
//               return cleanSub?.length ? { ...sec, subsections: cleanSub } : null;
//             }).filter(Boolean);
//             return { ...report, sections: cleanSections || [] };
//           }).sort((a, b) => new Date(a.date) - new Date(b.date));
          
//           setRealHistory(historyData);
//         }

//         if (predRes && predRes.ok) {
//           const rawPred = await predRes.json();
//           const cleanPred = rawPred.filter(i => isCrop(i.category, i.crop));
//           cleanPred.forEach(i => uniqueCrops.add(i.crop));
//           setAiPredictions(cleanPred);
//         }
//         setAllCropNames(Array.from(uniqueCrops).sort());

//         // 2. Fetch Marketplace Crops
//         const querySnapshot = await getDocs(collection(db, "crops"));
//         const cropsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
//         setCrops(cropsData);

//       } catch (err) {
//         console.error("Load Error:", err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     loadData();
//   }, []);

//   // --- CHART HELPERS ---
//   const handleGraphSearch = (e) => {
//     e.preventDefault();
//     const searchTerm = getEnglishTerm(chartSearch); 
//     const match = allCropNames.find(c => c.toLowerCase().includes(searchTerm.toLowerCase()));
//     if (match) {
//       setChartCrop(match);
//       setShowChartPopup(true);
//       setTimeout(() => setShowChartPopup(false), 3000);
//       setChartSearch(""); 
//     } else {
//       alert("Crop not found");
//     }
//   };

//   const chartData = useMemo(() => {
//     const dataPoints = realHistory.map(report => {
//       let price = null;
//       report.sections?.forEach(sec => {
//         sec.subsections?.forEach(sub => {
//           const item = sub.items?.find(i => i.commodity === chartCrop);
//           if (item) price = item.price;
//         });
//       });
//       if (!price) return null;
//       return {
//         date: new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
//         fullDate: report.date,
//         realPrice: price,
//         predictedPrice: null
//       };
//     }).filter(Boolean);

//     const prediction = aiPredictions.find(p => p.crop === chartCrop);
//     if (prediction && dataPoints.length > 0) {
//         const lastPoint = dataPoints[dataPoints.length - 1];
//         dataPoints[dataPoints.length - 1] = { ...lastPoint, predictedPrice: lastPoint.realPrice };
//         const today = new Date(lastPoint.fullDate);
//         const futureDate = new Date(today);
//         futureDate.setDate(today.getDate() + 7);
//         dataPoints.push({
//           date: futureDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + " (Est)",
//           realPrice: null,
//           predictedPrice: prediction.predicted_price
//         });
//     }
//     return dataPoints;
//   }, [realHistory, aiPredictions, chartCrop]);

//   const reportCards = useMemo(() => {
//     let targetReport = reportDate ? realHistory.find(r => r.date.startsWith(reportDate)) : realHistory[realHistory.length - 1];
//     const items = [];

//     if (targetReport) {
//       targetReport.sections?.forEach(sec => {
//         sec.subsections?.forEach(sub => {
//           sub.items?.forEach(i => {
//             // DOUBLE CHECK: Filter out garbage data here too
//             if (!isCrop(sec.category, i.commodity)) return;

//             const prediction = aiPredictions.find(p => p.crop === i.commodity);
//             items.push({
//               id: i._id || Math.random(), crop: i.commodity, category: sec.category,
//               current_price: i.price, predicted_price: prediction?.predicted_price,
//               trend: prediction?.trend || 'STABLE', reason: prediction?.reason
//             });
//           });
//         });
//       });
//     } else if (!reportDate) {
//       aiPredictions.forEach(pred => {
//         if (!items.find(i => i.crop === pred.crop)) {
//           items.push({
//             id: pred.id || Math.random(), crop: pred.crop, category: pred.category,
//             current_price: pred.current_price || 0, predicted_price: pred.predicted_price,
//             trend: pred.trend, reason: pred.reason
//           });
//         }
//       });
//     }

//     const searchEnglish = getEnglishTerm(reportSearch).toLowerCase();
//     const rawSearch = reportSearch.toLowerCase();
//     return items.filter(i => {
//       const cropName = i.crop.toLowerCase();
//       return cropName.includes(searchEnglish) || cropName.includes(rawSearch);
//     });
//   }, [realHistory, aiPredictions, reportSearch, reportDate]);

//   // --- FILTER CROPS ---
//   const filteredCrops = useMemo(() => {
//     return crops.filter(crop => 
//       crop.title?.toLowerCase().includes(marketSearch.toLowerCase()) ||
//       crop.location?.toString().toLowerCase().includes(marketSearch.toLowerCase())
//     );
//   }, [crops, marketSearch]);

//   if (loading) return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-50">
//       <Loader2 className="animate-spin text-green-600" size={40} />
//     </div>
//   );

//   return (
//     <div className="min-h-screen bg-gray-50 pb-20">
      
//       {/* HEADER & TABS */}
//       <div className="bg-green-800 text-white pt-10 pb-24 rounded-b-[40px] shadow-xl">
//         <div className="container mx-auto max-w-7xl px-6">
//           <div className="flex flex-col md:flex-row justify-between items-center gap-6">
//             <div>
//               <h1 className="text-4xl font-extrabold flex items-center gap-3">
//                 <Sprout className="text-green-300" size={36} /> SakaNect
//               </h1>
//               <p className="text-green-100 mt-2 opacity-80">
//                 {activeTab === 'dashboard' ? 'Real-time price monitoring & forecasts.' : 'Direct farm-to-table marketplace.'}
//               </p>
//             </div>

//             {/* TAB BUTTONS */}
//             <div className="bg-green-900/50 p-1.5 rounded-xl flex gap-1">
//               <button 
//                 onClick={() => setActiveTab('dashboard')}
//                 className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${
//                   activeTab === 'dashboard' ? 'bg-white text-green-800 shadow-md' : 'text-green-100 hover:bg-green-800/50'
//                 }`}
//               >
//                 <TrendingUp size={18} /> Analytics
//               </button>
//               <button 
//                 onClick={() => setActiveTab('marketplace')}
//                 className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${
//                   activeTab === 'marketplace' ? 'bg-white text-green-800 shadow-md' : 'text-green-100 hover:bg-green-800/50'
//                 }`}
//               >
//                 <ShoppingBag size={18} /> Marketplace
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>

//       <div className="container mx-auto max-w-7xl px-6 -mt-16 space-y-8">

//         {/* --- MARKETPLACE VIEW --- */}
//         {activeTab === 'marketplace' && (
//           <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            
//             {/* CONTROLS BAR */}
//             <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
//                <div className="relative w-full md:w-96">
//                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
//                   <input 
//                     type="text" 
//                     placeholder="Search crops..." 
//                     className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-medium"
//                     value={marketSearch}
//                     onChange={(e) => setMarketSearch(e.target.value)}
//                   />
//                </div>

//                <div className="flex bg-gray-100 p-1 rounded-xl">
//                   <button 
//                     onClick={() => setViewMode('grid')}
//                     className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${
//                       viewMode === 'grid' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:bg-gray-200'
//                     }`}
//                   >
//                     <LayoutGrid size={18} /> Grid
//                   </button>
//                   <button 
//                     onClick={() => setViewMode('map')}
//                     className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${
//                       viewMode === 'map' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:bg-gray-200'
//                     }`}
//                   >
//                     <MapIcon size={18} /> Map
//                   </button>
//                </div>
//             </div>

//             {/* CONTENT TOGGLE */}
//             {viewMode === 'map' ? (
//                 <CropMap crops={filteredCrops} />
//             ) : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
//                     {filteredCrops.length > 0 ? (
//                         filteredCrops.map(crop => (
//                             <CropCard key={crop.id} crop={crop} />
//                         ))
//                     ) : (
//                         <div className="col-span-full text-center py-20 text-gray-400">
//                             <Filter size={48} className="mx-auto mb-3 opacity-20" />
//                             <p>No crops found matching "{marketSearch}"</p>
//                         </div>
//                     )}
//                 </div>
//             )}
//           </div>
//         )}

//         {/* --- DASHBOARD VIEW --- */}
//         {activeTab === 'dashboard' && (
//           <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            
//             {/* 1. GRAPH */}
//             <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 relative">
//               <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
//                 <div className="relative">
//                   <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
//                     <TrendingUp className="text-green-600" />
//                     Price Analysis: <span className="text-green-700 underline decoration-green-300 decoration-2 underline-offset-4">{chartCrop}</span>
//                   </h2>
//                   {showChartPopup && (
//                     <div className="absolute -top-14 left-0 bg-black text-white text-sm px-4 py-2 rounded-lg shadow-xl animate-bounce flex items-center gap-2 z-50">
//                       <Sprout size={16} className="text-green-400" /> Showing: <b>{chartCrop}</b>
//                       <div className="absolute -bottom-1 left-6 w-3 h-3 bg-black rotate-45"></div>
//                     </div>
//                   )}
//                 </div>

//                 <form onSubmit={handleGraphSearch} className="relative w-full md:w-72">
//                   <input type="text" placeholder="Search crop..." className="w-full pl-4 pr-12 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium text-gray-700" value={chartSearch} onChange={(e) => setChartSearch(e.target.value)} />
//                   <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-green-600 p-1.5 rounded-lg text-white hover:bg-green-700 transition-colors"><Search size={16} /></button>
//                 </form>
//               </div>

//               <div className="h-[350px] w-full bg-gray-50/30 rounded-2xl border border-dashed border-gray-200 p-2">
//                 {chartData.length > 0 ? (
//                   <ResponsiveContainer width="100%" height="100%">
//                     <AreaChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
//                       <defs>
//                         <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
//                           <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/><stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
//                         </linearGradient>
//                       </defs>
//                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
//                       <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
//                       <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
//                       <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} itemStyle={{ color: '#16a34a', fontWeight: 'bold' }} formatter={(val) => [`₱${val}`, "Price"]} />
//                       <Area type="monotone" dataKey="realPrice" name="Real History" stroke="#16a34a" strokeWidth={3} fill="url(#colorPrice)" animationDuration={1500} />
//                       <Area type="monotone" dataKey="predictedPrice" name="AI Forecast" stroke="#9CA3AF" strokeWidth={3} strokeDasharray="5 5" fill="transparent" animationDuration={1500} connectNulls={true} />
//                     </AreaChart>
//                   </ResponsiveContainer>
//                 ) : (
//                   <div className="h-full flex flex-col items-center justify-center text-gray-400">
//                     <Filter size={48} className="mb-2 opacity-20" /><p>No history data found for <b>{chartCrop}</b>.</p>
//                   </div>
//                 )}
//               </div>
//             </div>

//             {/* 2. MARKET REPORT CARD */}
//             <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
//               <div className="bg-white border-b border-gray-100 p-6 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-10">
//                 <div>
//                   <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><HistoryIcon size={20} className="text-indigo-500" /> Market Report</h3>
//                   <p className="text-xs text-gray-400 font-medium mt-1">Showing prices for {reportCards.length} crops</p>
//                 </div>
//                 <div className="flex gap-3 w-full md:w-auto">
//                   <div className="relative flex-grow md:flex-grow-0 md:w-64">
//                     <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
//                     <input type="text" placeholder="Filter..." className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={reportSearch} onChange={(e) => setReportSearch(e.target.value)} />
//                   </div>
//                   <div className="relative">
//                     <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
//                     <input type="date" className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-600 font-medium cursor-pointer" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
//                   </div>
//                 </div>
//               </div>
//               <div className="p-6 bg-gray-50/30">
//                 {reportCards.length > 0 ? (
//                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
//                     {reportCards.map((item) => (
//                       <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
//                         <div className="flex justify-between items-start mb-2">
//                           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded-full">{item.category?.split(' ')[0]}</span>
//                           {item.trend && <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${item.trend === 'UP' ? 'bg-red-50 text-red-600' : item.trend === 'DOWN' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>{item.trend === 'UP' ? <TrendingUp size={12}/> : item.trend === 'DOWN' ? <TrendingDown size={12}/> : <Minus size={12}/>} {item.trend}</span>}
//                         </div>
//                         <h3 className="font-bold text-gray-800 text-lg leading-tight mb-4 group-hover:text-indigo-600 transition-colors line-clamp-1" title={item.crop}>{item.crop}</h3>
//                         <div className="flex items-end justify-between border-t border-gray-50 pt-3">
//                           <div><p className="text-[10px] text-gray-400 font-bold uppercase">Current</p><p className="text-xl font-extrabold text-gray-900">₱{item.current_price}</p></div>
//                           {item.predicted_price && <div className="text-right"><p className="text-[10px] text-indigo-400 font-bold uppercase flex items-center justify-end gap-1">Target <ArrowRight size={10} /></p><p className={`text-sm font-bold ${item.trend === 'UP' ? 'text-red-500' : 'text-green-500'}`}>₱{item.predicted_price}</p></div>}
//                         </div>
//                         {item.reason && <div className="mt-3 pt-2 border-t border-gray-50"><p className="text-xs text-gray-400 italic line-clamp-2">"{item.reason}"</p></div>}
//                       </div>
//                     ))}
//                   </div>
//                 ) : (
//                   <div className="text-center py-20 text-gray-400"><Filter size={48} className="mx-auto mb-3 opacity-20" /><p>No crops found matching "{reportSearch}"</p></div>
//                 )}
//               </div>
//             </div>
//           </div>
//         )}

//       </div>
//     </div>
//   );
// }