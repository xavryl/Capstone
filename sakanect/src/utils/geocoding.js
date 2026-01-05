// src/utils/geocoding.js

// --- 1. GET COORDINATES (Forward Geocoding) ---
export const getCoordinates = async (address) => {
  try {
    // FIX: Extract just the city name (everything before the first comma)
    // Example: "Talisay, Cebu, Philippines" -> "Talisay"
    const cityName = address.split(',')[0].trim();
    
    if (!cityName) return null;

    const query = encodeURIComponent(cityName);
    // We ask for 5 results so we can filter for the Philippines later
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5&language=en&format=json`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Geocoding fetch failed');
    
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      // SMART MATCH: Look for a result specifically in the Philippines
      const phResult = data.results.find(place => 
          place.country === "Philippines" || place.country_code === "PH"
      ) || data.results[0]; // Fallback to first result if PH not found

      return {
        lat: phResult.latitude,
        lon: phResult.longitude,
        display_name: `${phResult.name}, ${phResult.admin1 || phResult.country || 'Philippines'}`
      };
    }
    
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
};

// --- 2. GET ADDRESS FROM COORDS (Reverse Geocoding) ---
export const reverseGeocode = async (lat, lon) => {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Reverse geocoding fetch failed');

    const data = await response.json();
    
    const city = data.city || data.locality || data.town;
    const province = data.principalSubdivision;
    
    if (city && province) {
        return `${city}, ${province}`;
    }
    return data.locality || "Unknown Location";

  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
};

// --- 3. CALCULATE DISTANCE (Math) ---
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of Earth in km
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