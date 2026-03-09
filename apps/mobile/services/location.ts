import * as Location from 'expo-location';
import { Platform } from 'react-native';

// Sri Lankan district boundary boxes
const DISTRICT_BOUNDS: Record<string, { lat: [number, number]; lng: [number, number] }> = {
  Colombo:       { lat: [6.80, 7.05], lng: [79.78, 80.00] },
  Kandy:         { lat: [7.15, 7.40], lng: [80.50, 80.75] },
  Kurunegala:    { lat: [7.35, 7.65], lng: [80.25, 80.55] },
  Anuradhapura:  { lat: [8.15, 8.50], lng: [80.20, 80.55] },
  Galle:         { lat: [5.95, 6.20], lng: [80.10, 80.35] },
  Matara:        { lat: [5.85, 6.10], lng: [80.45, 80.70] },
  Jaffna:        { lat: [9.50, 9.80], lng: [79.85, 80.20] },
  Puttalam:      { lat: [7.85, 8.25], lng: [79.65, 80.00] },
  Gampaha:       { lat: [6.95, 7.25], lng: [79.85, 80.20] },
  Kalutara:      { lat: [6.45, 6.75], lng: [79.85, 80.15] },
  Ratnapura:     { lat: [6.50, 6.90], lng: [80.25, 80.60] },
  Kegalle:       { lat: [7.10, 7.40], lng: [80.20, 80.50] },
  Badulla:       { lat: [6.85, 7.20], lng: [80.95, 81.25] },
  Hambantota:    { lat: [5.95, 6.35], lng: [80.95, 81.35] },
  'Nuwara Eliya':{ lat: [6.85, 7.15], lng: [80.65, 80.95] },
  Polonnaruwa:   { lat: [7.80, 8.15], lng: [80.85, 81.25] },
  Trincomalee:   { lat: [8.40, 8.80], lng: [81.05, 81.45] },
  Batticaloa:    { lat: [7.60, 7.90], lng: [81.55, 81.85] },
  Ampara:        { lat: [7.15, 7.50], lng: [81.50, 81.90] },
  Vavuniya:      { lat: [8.60, 8.95], lng: [80.35, 80.70] },
  Mannar:        { lat: [8.85, 9.20], lng: [79.75, 80.15] },
  Mullaitivu:    { lat: [9.10, 9.50], lng: [80.65, 81.05] },
  Kilinochchi:   { lat: [9.25, 9.60], lng: [80.25, 80.60] },
  Moneragala:    { lat: [6.70, 7.10], lng: [81.20, 81.60] },
  Matale:        { lat: [7.35, 7.70], lng: [80.50, 80.85] },
};

// Districts the ML model was trained on
const SUPPORTED_DISTRICTS = [
  'Kurunegala', 'Anuradhapura', 'Colombo', 'Kandy',
  'Galle', 'Matara', 'Jaffna', 'Puttalam',
];

// Nearest supported district for unsupported ones
const DISTRICT_MAPPING: Record<string, string> = {
  Gampaha:        'Colombo',
  Kalutara:       'Colombo',
  Ratnapura:      'Kurunegala',
  Kegalle:        'Kurunegala',
  Badulla:        'Kandy',
  Hambantota:     'Matara',
  'Nuwara Eliya': 'Kandy',
  Polonnaruwa:    'Anuradhapura',
  Trincomalee:    'Anuradhapura',
  Batticaloa:     'Anuradhapura',
  Ampara:         'Matara',
  Vavuniya:       'Anuradhapura',
  Mannar:         'Puttalam',
  Mullaitivu:     'Jaffna',
  Kilinochchi:    'Jaffna',
  Moneragala:     'Matara',
  Matale:         'Kandy',
};

export interface LocationResult {
  district: string;
  coordinates: { latitude: number; longitude: number };
  accuracy?: number;
}

export interface LocationError {
  code: 'PERMISSION_DENIED' | 'LOCATION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_FOUND' | 'UNKNOWN_ERROR';
  message: string;
}

function getDistrictCenter(bounds: { lat: [number, number]; lng: [number, number] }) {
  return {
    lat: (bounds.lat[0] + bounds.lat[1]) / 2,
    lng: (bounds.lng[0] + bounds.lng[1]) / 2,
  };
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function coordinatesToDistrict(latitude: number, longitude: number): string | null {
  // Exact bounding-box match first
  for (const [district, bounds] of Object.entries(DISTRICT_BOUNDS)) {
    if (
      latitude >= bounds.lat[0] && latitude <= bounds.lat[1] &&
      longitude >= bounds.lng[0] && longitude <= bounds.lng[1]
    ) {
      return district;
    }
  }
  // Haversine nearest-district fallback (≤ 100 km)
  let nearest: string | null = null;
  let minDist = Infinity;
  for (const [district, bounds] of Object.entries(DISTRICT_BOUNDS)) {
    const c = getDistrictCenter(bounds);
    const d = haversineKm(latitude, longitude, c.lat, c.lng);
    if (d < minDist) { minDist = d; nearest = district; }
  }
  return minDist <= 100 ? nearest : null;
}

export function isSupportedDistrict(district: string): boolean {
  return SUPPORTED_DISTRICTS.includes(district);
}

export function findNearestSupportedDistrict(district: string): string {
  return DISTRICT_MAPPING[district] ?? 'Kurunegala';
}

export async function detectFarmerLocation(): Promise<LocationResult | LocationError> {
  if (Platform.OS === 'web') {
    return { code: 'LOCATION_UNAVAILABLE', message: 'GPS not available on web. Please select your district manually.' };
  }

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { code: 'PERMISSION_DENIED', message: 'Location permission is required to auto-detect your district.' };
    }

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timed out')), 15000),
    );
    const location = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      timeoutPromise,
    ]);

    const { latitude, longitude, accuracy } = location.coords;

    // Validate inside Sri Lanka
    if (latitude < 5.9 || latitude > 9.9 || longitude < 79.6 || longitude > 81.9) {
      return {
        code: 'NOT_FOUND',
        message: `Location detected outside Sri Lanka (${latitude.toFixed(4)}, ${longitude.toFixed(4)}). Please select your district manually.`,
      };
    }

    const district = coordinatesToDistrict(latitude, longitude);
    if (!district) {
      return {
        code: 'NOT_FOUND',
        message: `Could not determine district from GPS. Please select manually.`,
      };
    }

    return { district, coordinates: { latitude, longitude }, accuracy: accuracy ?? undefined };
  } catch (err: any) {
    if (err.message?.includes('timed out')) {
      return { code: 'TIMEOUT', message: 'GPS timed out. Please try again or select your district manually.' };
    }
    if (err.code === 'E_LOCATION_SERVICES_DISABLED') {
      return { code: 'LOCATION_UNAVAILABLE', message: 'Location services are disabled. Please enable GPS.' };
    }
    return { code: 'UNKNOWN_ERROR', message: 'Could not detect location. Please select your district manually.' };
  }
}
