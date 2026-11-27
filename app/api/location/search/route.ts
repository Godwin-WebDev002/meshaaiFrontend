import { NextRequest, NextResponse } from 'next/server';

export interface LocationSearchResult {
  id: string;
  title: string;
  subtitle: string;
  fullAddress: string;
  lat: number;
  lng: number;
}

// Curated list of popular Abuja estates, districts, and major residential zones
const POPULAR_ABUJA_ESTATES = [
  {
    name: 'Efab City Estate',
    district: 'Lokogoma District, Abuja',
    lat: 8.9585,
    lng: 7.4642,
    aliases: ['efab city', 'efab city estate', 'efab lokogoma', 'efab'],
  },
  {
    name: 'Efab Sun City Estate',
    district: 'Galadimawa / Lokogoma, Abuja',
    lat: 8.9348,
    lng: 7.4945,
    aliases: ['efab sun city', 'sun city estate', 'efab sun city estate'],
  },
  {
    name: 'Efab Metropolis',
    district: 'Kaba / Bwari Road, Abuja',
    lat: 9.1550,
    lng: 7.3200,
    aliases: ['efab metropolis', 'efab kaba'],
  },
  {
    name: 'Gwarinpa Estate',
    district: 'Gwarinpa (1st - 7th Avenue), Abuja',
    lat: 9.1120,
    lng: 7.3980,
    aliases: ['gwarinpa', 'gwarinpa estate', '1st avenue', '2nd avenue', '3rd avenue', '4th avenue'],
  },
  {
    name: 'Games Village',
    district: 'Kaura District, Abuja',
    lat: 9.0250,
    lng: 7.4600,
    aliases: ['games village', 'kaura games village', 'games village kaura'],
  },
  {
    name: 'Prince & Princess Estate',
    district: 'Duboyi / Gaduwa, Abuja',
    lat: 9.0110,
    lng: 7.4420,
    aliases: ['prince and princess', 'prince and princess estate', 'p and p estate'],
  },
  {
    name: 'Sun City Estate',
    district: 'Galadimawa, Abuja',
    lat: 8.9720,
    lng: 7.4430,
    aliases: ['sun city', 'sun city estate galadimawa'],
  },
  {
    name: 'Apo Legislative Quarters',
    district: 'Apo District, Abuja',
    lat: 9.0050,
    lng: 7.5020,
    aliases: ['apo', 'apo legislative', 'apo resettlement', 'apo quarters'],
  },
  {
    name: 'Wuse 2',
    district: 'Wuse 2 (Aminu Kano / Adetokunbo Ademola), Abuja',
    lat: 9.0778,
    lng: 7.4819,
    aliases: ['wuse', 'wuse 2', 'wuse ii', 'aminu kano'],
  },
  {
    name: 'Maitama',
    district: 'Maitama District, Abuja',
    lat: 9.0882,
    lng: 7.4934,
    aliases: ['maitama', 'maitama district', 'agana street', 'ibile street'],
  },
  {
    name: 'Garki',
    district: 'Garki Area 1 - 11, Abuja',
    lat: 9.0326,
    lng: 7.4883,
    aliases: ['garki', 'garki 2', 'area 1', 'area 2', 'area 3', 'area 8', 'area 10', 'area 11'],
  },
  {
    name: 'Jabi',
    district: 'Jabi Lake / District, Abuja',
    lat: 9.0722,
    lng: 7.4265,
    aliases: ['jabi', 'jabi lake', 'jabi district'],
  },
  {
    name: 'Utako',
    district: 'Utako District, Abuja',
    lat: 9.0667,
    lng: 7.4430,
    aliases: ['utako', 'utako market', 'utako district'],
  },
  {
    name: 'Asokoro',
    district: 'Asokoro District, Abuja',
    lat: 9.0435,
    lng: 7.5312,
    aliases: ['asokoro', 'asokoro district'],
  },
  {
    name: 'Guzape',
    district: 'Guzape / Asokoro Extension, Abuja',
    lat: 9.0200,
    lng: 7.5180,
    aliases: ['guzape', 'guzape district', 'asokoro extension'],
  },
  {
    name: 'Life Camp',
    district: 'Life Camp / Gwarinpa Expressway, Abuja',
    lat: 9.0750,
    lng: 7.3950,
    aliases: ['life camp', 'lifecamp'],
  },
  {
    name: 'Lokogoma',
    district: 'Lokogoma District, Abuja',
    lat: 8.9650,
    lng: 7.4650,
    aliases: ['lokogoma', 'lokogoma district'],
  },
  {
    name: 'Lugbe',
    district: 'Lugbe / Airport Road, Abuja',
    lat: 8.9800,
    lng: 7.3700,
    aliases: ['lugbe', 'fha lugbe', 'airport road'],
  },
  {
    name: 'Central Business District',
    district: 'CBD, Abuja Municipal, FCT',
    lat: 9.0550,
    lng: 7.4900,
    aliases: ['cbd', 'central business district', 'central area'],
  },
];

/**
 * GET /api/location/search?q=adetokunbo+ademola+wuse
 * Autocomplete / place search proxy with OpenStreetMap Nominatim + Abuja estate index
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const queryLower = q.toLowerCase();

  // Extract any prefix like "House 20, 23 Crescent"
  let housePrefix = '';
  const matchHouse = q.match(/^(house\s+\d+[^,]*,\s*[^,]+)/i) || q.match(/^(plot\s+\d+[^,]*,\s*[^,]+)/i) || q.match(/^(\d+[^,]+,\s*[^,]+)/i);
  if (matchHouse) {
    housePrefix = matchHouse[1].trim();
  }

  const results: LocationSearchResult[] = [];
  const seenKeys = new Set<string>();

  // 1. Check curated Abuja estates first for instant, accurate matching
  for (const estate of POPULAR_ABUJA_ESTATES) {
    const isMatched = estate.aliases.some((alias) => queryLower.includes(alias) || alias.includes(queryLower));
    if (isMatched) {
      const key = `${estate.lat.toFixed(4)}_${estate.lng.toFixed(4)}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        const displayTitle = housePrefix ? `${housePrefix}, ${estate.name}` : estate.name;
        results.push({
          id: `curated-${estate.name.toLowerCase().replace(/\s+/g, '-')}`,
          title: displayTitle,
          subtitle: estate.district,
          fullAddress: `${displayTitle}, ${estate.district}`,
          lat: estate.lat,
          lng: estate.lng,
        });
      }
    }
  }

  // 2. Query OpenStreetMap Nominatim for live geographic coverage
  try {
    // Search query: if query doesn't specify Abuja or Nigeria, append Abuja to bias local results
    const nominatimQuery = queryLower.includes('abuja') || queryLower.includes('nigeria')
      ? q
      : `${q}, Abuja, Nigeria`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      nominatimQuery
    )}&countrycodes=ng&addressdetails=1&limit=6`;

    const res = await fetch(nominatimUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'MeeshaaiDeliveryApp/1.0 (info@meeshaai.com)',
        'Accept-Language': 'en',
      },
    }).finally(() => clearTimeout(timeoutId));

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        for (const item of data) {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          const key = `${lat.toFixed(4)}_${lng.toFixed(4)}`;

          if (!seenKeys.has(key)) {
            seenKeys.add(key);

            const addr = item.address || {};
            const primaryName = item.name || addr.road || addr.suburb || addr.neighbourhood || q;
            const districtOrCity = [addr.suburb, addr.neighbourhood, addr.city_district, addr.city || 'Abuja']
              .filter(Boolean)
              .join(', ');

            const title = housePrefix ? `${housePrefix}, ${primaryName}` : primaryName;
            const subtitle = districtOrCity || item.display_name.split(',').slice(1, 4).join(', ').trim();
            const fullAddress = `${title}, ${subtitle}`;

            results.push({
              id: `nom-${item.place_id}`,
              title,
              subtitle,
              fullAddress,
              lat,
              lng,
            });
          }
        }
      }
    }
  } catch (err) {
    // If Nominatim timed out or failed, curated results are still safely returned
    console.warn('[location/search] Nominatim query error:', err);
  }

  // 3. Fallback: If no results found yet (e.g. user entered "house 20, 23 crescent xyz"),
  // provide a default Abuja location option with the user's typed address so they are never blocked
  if (results.length === 0 && q.length >= 3) {
    results.push({
      id: 'custom-user-input',
      title: q,
      subtitle: 'Abuja, Federal Capital Territory, Nigeria',
      fullAddress: `${q}, Abuja, Nigeria`,
      lat: 9.0765, // Central Abuja default coordinates
      lng: 7.3986,
    });
  }

  return NextResponse.json({ results });
}
