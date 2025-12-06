"use client";

import { useEffect, useState } from "react";

const AddressDisplay = ({ lat, lon }) => {
  const [address, setAddress] = useState(null);

  useEffect(() => {
    if (!lat || !lon) return;
    
    const fetchAddress = async () => {
        try {
            // 1. Check Session Storage (Politeness Policy)
            // Nominatim has a usage policy of 1 request per second max. Caching helps.
            const cacheKey = `addr_${lat}_${lon}`;
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                setAddress(cached);
                return;
            }

            // 2. Fetch from OpenStreetMap Nominatim
            // Note: User-Agent header is required by OSM terms of service
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
                headers: {
                    'User-Agent': 'CourierDashboardApp/1.0', 
                    'Accept-Language': 'en' 
                }
            });
            
            if (!res.ok) throw new Error('Geocoding failed');
            
            const data = await res.json();
            const addr = data.address;
            
            // 3. Format Address nicely: "Street 12, City"
            let formatted = data.display_name.split(',').slice(0, 3).join(','); // Fallback
            
            if (addr) {
                const street = addr.road || addr.pedestrian || '';
                const number = addr.house_number || '';
                const city = addr.city || addr.town || addr.village || '';
                const zip = addr.postcode || '';
                
                // Construct readable string
                const parts = [];
                if (street) parts.push(`${street} ${number}`.trim());
                if (city) parts.push(city);
                if (zip) parts.push(zip);
                
                if (parts.length > 0) {
                    formatted = parts.join(', ');
                }
            }
            
            sessionStorage.setItem(cacheKey, formatted);
            setAddress(formatted);
        } catch (e) {
            // Fallback to coordinates if API fails
            setAddress(`${Number(lat).toFixed(4)}, ${Number(lon).toFixed(4)}`);
        }
    };

    fetchAddress();
  }, [lat, lon]);

  return (
    <span className="ml-1 text-gray-600 truncate max-w-[200px] md:max-w-xs block sm:inline">
      {address || <span className="animate-pulse">Locating address...</span>}
    </span>
  );
};

export default AddressDisplay;