import { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { Loader2, Users, ShoppingBag, Sprout, TrendingUp } from 'lucide-react';

// --- API CONFIGURATION ---
const API_URL = "https://capstone-0h24.onrender.com";

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  
  // Stats Data
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCrops: 0,
    totalOrders: 0,
    totalVolume: 0
  });

  // Chart Data
  const [roleData, setRoleData] = useState([]);
  const [cropData, setCropData] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // 1. Fetch Users (Firestore)
        const userSnap = await getDocs(collection(db, "users"));
        const users = userSnap.docs.map(d => d.data());
        
        // 2. Fetch Transactions (Firestore)
        const txSnap = await getDocs(collection(db, "transactions"));
        const transactions = txSnap.docs.map(d => d.data());

        // 3. Fetch Crops (MongoDB API - FIXED URL)
        const cropRes = await fetch(`${API_URL}/api/crops`);
        let crops = [];
        if (cropRes.ok) {
            crops = await cropRes.json();
        } else {
            console.error("Failed to fetch crops for analytics");
        }

        // --- PROCESS DATA ---

        // A. Card Stats
        const totalVolume = crops.reduce((sum, c) => sum + (c.quantity_kg || 0), 0);
        
        setStats({
          totalUsers: users.length,
          totalCrops: crops.length,
          totalOrders: transactions.length,
          totalVolume: totalVolume
        });

        // B. Pie Chart: User Roles
        const farmers = users.filter(u => u.role === 'Member').length; 
        const admins = users.filter(u => u.role === 'admin').length;
        
        setRoleData([
          { name: 'Members', value: farmers },
          { name: 'Admins', value: admins }
        ]);

        // C. Bar Chart: Top 5 Crop Categories
        const typeCounts = {};
        crops.forEach(c => {
          const type = c.title || "Unknown"; 
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        const sortedCrops = Object.keys(typeCounts)
          .map(key => ({ name: key, count: typeCounts[key] }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setCropData(sortedCrops);

      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-saka-green" size={40} /></div>;

  const COLORS = ['#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#e74c3c'];

  return (
    <div className="space-y-8">
      
      {/* 1. STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={<Users className="text-blue-500"/>} title="Total Users" value={stats.totalUsers} color="bg-blue-50 border-blue-100" />
        <StatCard icon={<Sprout className="text-green-500"/>} title="Active Listings" value={stats.totalCrops} color="bg-green-50 border-green-100" />
        <StatCard icon={<ShoppingBag className="text-purple-500"/>} title="Total Orders" value={stats.totalOrders} color="bg-purple-50 border-purple-100" />
        <StatCard icon={<TrendingUp className="text-orange-500"/>} title="Total Volume (kg)" value={`${stats.totalVolume} kg`} color="bg-orange-50 border-orange-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 2. BAR CHART: Top Crops */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Top 5 Posted Crops</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cropData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{fontSize: 12}} interval={0} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#2ecc71" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. PIE CHART: User Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-bold text-gray-800 mb-4">User Distribution</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label
                >
                  {roleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

// Simple Sub-component for Cards
function StatCard({ icon, title, value, color }) {
  return (
    <div className={`p-4 rounded-xl border flex items-center gap-4 ${color}`}>
      <div className="p-3 bg-white rounded-full shadow-sm">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}