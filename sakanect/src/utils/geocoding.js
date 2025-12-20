const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

export const getCoordinates = async (locationName) => {
  try {
    const url = `${NOMINATIM_BASE_URL}?q=${encodeURIComponent(locationName)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: { "User-Agent": "SakaNect-Capstone-Project" } 
    });
    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        displayName: data[0].display_name
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
};

// NEW: Convert Lat/Lon to Text Address
export const reverseGeocode = async (lat, lon) => {
  try {
    const url = `${NOMINATIM_REVERSE_URL}?lat=${lat}&lon=${lon}&format=json`;
    const response = await fetch(url, {
      headers: { "User-Agent": "SakaNect-Capstone-Project" }
    });
    const data = await response.json();
    
    // Return a simplified address (City/Town + Province is usually best for privacy)
    // We try to find the most relevant address part
    const addr = data.address;
    const city = addr.city || addr.town || addr.village || addr.municipality;
    const state = addr.state || addr.region || addr.province;
    
    return city && state ? `${city}, ${state}` : data.display_name;
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
};

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};

const deg2rad = (deg) => deg * (Math.PI / 180);