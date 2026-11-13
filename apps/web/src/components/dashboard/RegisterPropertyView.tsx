// apps/web/src/components/dashboard/RegisterPropertyView.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { LocationPickerMapDynamic } from '@/components/map/LocationPickerMapDynamic';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { HotelCategory } from '@hbms/shared';
import {
  Building2,
  MapPin,
  Compass,
  LocateFixed,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Phone,
  FileText,
  Clock,
} from 'lucide-react';

interface CityPreset {
  name: string;
  city: string;
  country: string;
  state: string;
  lat: number;
  lng: number;
}

export interface CountryPhoneCode {
  country: string;
  code: string;
  flag: string;
  iso: string;
}

export const COUNTRY_PHONE_CODES: CountryPhoneCode[] = [
  { country: 'India', code: '+91', flag: '🇮🇳', iso: 'IN' },
  { country: 'United States', code: '+1', flag: '🇺🇸', iso: 'US' },
  { country: 'United Kingdom', code: '+44', flag: '🇬🇧', iso: 'GB' },
  { country: 'United Arab Emirates', code: '+971', flag: '🇦🇪', iso: 'AE' },
  { country: 'France', code: '+33', flag: '🇫🇷', iso: 'FR' },
  { country: 'Germany', code: '+49', flag: '🇩🇪', iso: 'DE' },
  { country: 'Japan', code: '+81', flag: '🇯🇵', iso: 'JP' },
  { country: 'Singapore', code: '+65', flag: '🇸🇬', iso: 'SG' },
  { country: 'Australia', code: '+61', flag: '🇦🇺', iso: 'AU' },
  { country: 'Canada', code: '+1', flag: '🇨🇦', iso: 'CA' },
  { country: 'Switzerland', code: '+41', flag: '🇨🇭', iso: 'CH' },
  { country: 'Indonesia', code: '+62', flag: '🇮🇩', iso: 'ID' },
  { country: 'Italy', code: '+39', flag: '🇮🇹', iso: 'IT' },
  { country: 'Spain', code: '+34', flag: '🇪🇸', iso: 'ES' },
  { country: 'Saudi Arabia', code: '+966', flag: '🇸🇦', iso: 'SA' },
  { country: 'Qatar', code: '+974', flag: '🇶🇦', iso: 'QA' },
  { country: 'Thailand', code: '+66', flag: '🇹🇭', iso: 'TH' },
  { country: 'Malaysia', code: '+60', flag: '🇲🇾', iso: 'MY' },
  { country: 'Netherlands', code: '+31', flag: '🇳🇱', iso: 'NL' },
  { country: 'New Zealand', code: '+64', flag: '🇳🇿', iso: 'NZ' },
  { country: 'South Africa', code: '+27', flag: '🇿🇦', iso: 'ZA' },
  { country: 'Brazil', code: '+55', flag: '🇧🇷', iso: 'BR' },
  { country: 'China', code: '+86', flag: '🇨🇳', iso: 'CN' },
  { country: 'Hong Kong', code: '+852', flag: '🇭🇰', iso: 'HK' },
  { country: 'Ireland', code: '+353', flag: '🇮🇪', iso: 'IE' },
  { country: 'Mexico', code: '+52', flag: '🇲🇽', iso: 'MX' },
  { country: 'Norway', code: '+47', flag: '🇳🇴', iso: 'NO' },
  { country: 'Sweden', code: '+46', flag: '🇸🇪', iso: 'SE' },
  { country: 'Turkey', code: '+90', flag: '🇹🇷', iso: 'TR' },
  { country: 'Vietnam', code: '+84', flag: '🇻🇳', iso: 'VN' },
  { country: 'Egypt', code: '+20', flag: '🇪🇬', iso: 'EG' },
  { country: 'Greece', code: '+30', flag: '🇬🇷', iso: 'GR' },
  { country: 'Portugal', code: '+351', flag: '🇵🇹', iso: 'PT' },
  { country: 'Austria', code: '+43', flag: '🇦🇹', iso: 'AT' },
  { country: 'Belgium', code: '+32', flag: '🇧🇪', iso: 'BE' },
  { country: 'Denmark', code: '+45', flag: '🇩🇰', iso: 'DK' },
  { country: 'Finland', code: '+358', flag: '🇫🇮', iso: 'FI' },
  { country: 'Poland', code: '+48', flag: '🇵🇱', iso: 'PL' },
  { country: 'South Korea', code: '+82', flag: '🇰🇷', iso: 'KR' },
  { country: 'Maldives', code: '+960', flag: '🇲🇻', iso: 'MV' },
  { country: 'Sri Lanka', code: '+94', flag: '🇱🇰', iso: 'LK' },
  { country: 'Nepal', code: '+977', flag: '🇳🇵', iso: 'NP' },
  { country: 'Oman', code: '+968', flag: '🇴🇲', iso: 'OM' },
  { country: 'Bahrain', code: '+973', flag: '🇧🇭', iso: 'BH' },
  { country: 'Kuwait', code: '+965', flag: '🇰🇼', iso: 'KW' },
];

const CITY_PRESETS: CityPreset[] = [
  { name: 'New Delhi', city: 'New Delhi', country: 'India', state: 'Delhi', lat: 28.6139, lng: 77.209 },
  { name: 'Mumbai', city: 'Mumbai', country: 'India', state: 'Maharashtra', lat: 19.076, lng: 72.8777 },
  { name: 'Bengaluru', city: 'Bengaluru', country: 'India', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { name: 'Dubai', city: 'Dubai', country: 'UAE', state: 'Dubai', lat: 25.1124, lng: 55.1389 },
  { name: 'Paris', city: 'Paris', country: 'France', state: 'Île-de-France', lat: 48.8566, lng: 2.3522 },
  { name: 'London', city: 'London', country: 'United Kingdom', state: 'Greater London', lat: 51.5074, lng: -0.1278 },
  { name: 'New York', city: 'New York', country: 'United States', state: 'New York', lat: 40.7128, lng: -74.006 },
  { name: 'Tokyo', city: 'Tokyo', country: 'Japan', state: 'Tokyo', lat: 35.6762, lng: 139.6503 },
];

export interface RegisterPropertyViewProps {
  onCancel?: () => void;
  onSuccess?: () => void;
}

export const RegisterPropertyView: React.FC<RegisterPropertyViewProps> = ({
  onCancel,
  onSuccess,
}) => {
  const { user } = useAuth();

  // Form Fields
  const [hotelName, setHotelName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [taxId, setTaxId] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('IN');
  const [phoneDigits, setPhoneDigits] = useState<string>('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('New Delhi');
  const [state, setState] = useState('Delhi');
  const [country, setCountry] = useState('India');
  const [postalCode, setPostalCode] = useState('110001');
  const [category, setCategory] = useState<HotelCategory>(HotelCategory.LUXURY);
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutTime, setCheckOutTime] = useState('11:00');
  const [description, setDescription] = useState('');

  // Coordinates State (supports Map, Current Location, and Direct Inputs)
  const [latitude, setLatitude] = useState('28.6139');
  const [longitude, setLongitude] = useState('77.2090');

  // UI state
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoSuccessMessage, setGeoSuccessMessage] = useState<string | null>(null);
  const [geoErrorMessage, setGeoErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Autofill manager email
  useEffect(() => {
    if (user?.email && !contactEmail) {
      setContactEmail(user.email);
    }
  }, [user, contactEmail]);

  // Coordinate Handler for Map interactions
  const handleMapCoordinateChange = (newLat: number, newLng: number) => {
    setLatitude(newLat.toString());
    setLongitude(newLng.toString());
    setGeoSuccessMessage(`Pin updated: ${newLat.toFixed(4)}°, ${newLng.toFixed(4)}°`);
    setGeoErrorMessage(null);
  };

  // Method 2: Use Current Location via Geolocation API
  const handleUseCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGeoErrorMessage('Geolocation is not supported by your current browser.');
      return;
    }

    setGeoLocating(true);
    setGeoErrorMessage(null);
    setGeoSuccessMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const detectedLat = Number(pos.coords.latitude.toFixed(6));
        const detectedLng = Number(pos.coords.longitude.toFixed(6));
        setLatitude(detectedLat.toString());
        setLongitude(detectedLng.toString());
        setGeoLocating(false);
        setGeoSuccessMessage(`Current position resolved: ${detectedLat}°, ${detectedLng}°`);
      },
      (err) => {
        setGeoLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoErrorMessage('Location permission was denied. Please allow location access or type coordinates.');
        } else {
          setGeoErrorMessage('Unable to retrieve current location. Please pick on the map or type coordinates.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Preset quick picker
  const handleApplyPreset = (preset: CityPreset) => {
    setCity(preset.city);
    setState(preset.state);
    setCountry(preset.country);
    setLatitude(preset.lat.toString());
    setLongitude(preset.lng.toString());
    setGeoSuccessMessage(`Coordinates set to ${preset.name}`);
    setGeoErrorMessage(null);

    // Auto-sync country code if available
    const matchedCountry = COUNTRY_PHONE_CODES.find(
      (c) =>
        c.country.toLowerCase() === preset.country.toLowerCase() ||
        preset.country.toLowerCase().includes(c.country.toLowerCase())
    );
    if (matchedCountry) {
      setSelectedCountryCode(matchedCountry.iso);
    }
  };

  // Selected country object
  const selectedCountry =
    COUNTRY_PHONE_CODES.find((c) => c.iso === selectedCountryCode) || COUNTRY_PHONE_CODES[0];

  // Submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhoneDigits = phoneDigits.replace(/\D/g, '');
    if (cleanPhoneDigits.length !== 10) {
      setError('Please provide a valid 10-digit contact phone number.');
      return;
    }

    const parsedLat = parseFloat(latitude);
    const parsedLng = parseFloat(longitude);

    if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      setError('Please provide a valid latitude between -90 and 90 degrees.');
      return;
    }

    if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      setError('Please provide a valid longitude between -180 and 180 degrees.');
      return;
    }

    const fullContactPhone = `${selectedCountry.code} ${cleanPhoneDigits}`;

    try {
      setSubmitting(true);
      await apiFetch('/applications', {
        method: 'POST',
        body: JSON.stringify({
          hotelName: hotelName.trim(),
          businessRegistrationNumber: regNumber.trim(),
          taxId: taxId.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: fullContactPhone,
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          country: country.trim(),
          postalCode: postalCode.trim(),
          latitude: parsedLat,
          longitude: parsedLng,
          category,
          checkInTime: checkInTime.trim() || '14:00',
          checkOutTime: checkOutTime.trim() || '11:00',
          description: description.trim() || undefined,
        }),
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to submit hotel application. Please verify all fields and retry.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const parsedLatNumber = !isNaN(parseFloat(latitude)) ? parseFloat(latitude) : 28.6139;
  const parsedLngNumber = !isNaN(parseFloat(longitude)) ? parseFloat(longitude) : 77.209;

  if (user?.hotelId || user?.hasActiveApplication) {
    return (
      <Card className="p-8 bg-white border-charcoal-200 text-center space-y-4 rounded-2xl max-w-xl mx-auto">
        <Building2 className="w-10 h-10 text-neutral-400 mx-auto" />
        <h3 className="text-base font-normal text-charcoal-900">Property Already Registered</h3>
        <p className="text-xs text-charcoal-500 font-normal max-w-md mx-auto">
          Managers may only register and operate a single property on the Voyage platform.
        </p>
        {onCancel && (
          <div className="pt-2">
            <Button variant="primary" size="sm" onClick={onCancel} className="text-xs font-normal">
              Return to Dashboard
            </Button>
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar within manager workspace */}
      <div className="p-5 rounded-2xl bg-white border border-charcoal-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="p-1.5 rounded-lg border border-charcoal-200 hover:bg-neutral-100 text-charcoal-700 transition-colors"
                title="Return to Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="text-xl font-normal text-charcoal-900">Register Hotel Property</h2>
            <Badge variant="neutral" className="font-mono text-[10px] px-2.5 py-0.5 font-normal">
              Property Dossier Submission
            </Badge>
          </div>
          <p className="text-xs text-charcoal-500 font-normal">
            Complete the verified property dossier for administrative onboarding. Room inventory, rates, and front desk operations will unlock upon approval.
          </p>
        </div>

        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="gap-1.5 text-xs font-normal"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Button>
        )}
      </div>

      {/* Form Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5 font-normal">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-normal text-red-800">Submission Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Comprehensive Two-Column Layout */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Multi-Section Registration Form (Col-span 7) */}
          <div className="lg:col-span-7 space-y-6">
            {/* SECTION 1: PROPERTY IDENTITY */}
            <Card className="p-6 bg-white border-charcoal-200 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 border-b border-charcoal-100 pb-3">
                <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-normal text-neutral-900">Property Identity</h3>
                  <p className="text-[11px] text-neutral-400 font-normal">Official brand name and classification</p>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label="Official Property Name"
                  placeholder="e.g. The Imperial Grand Heritage Hotel"
                  value={hotelName}
                  onChange={(e) => setHotelName(e.target.value)}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-normal uppercase tracking-wider text-neutral-600 mb-1.5 font-mono">
                      Property Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as HotelCategory)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-neutral-200 text-neutral-900 focus:outline-none focus:border-black font-normal"
                    >
                      <option value={HotelCategory.LUXURY}>LUXURY</option>
                      <option value={HotelCategory.BOUTIQUE}>BOUTIQUE</option>
                      <option value={HotelCategory.BUSINESS}>BUSINESS</option>
                      <option value={HotelCategory.RESORT}>RESORT</option>
                      <option value={HotelCategory.BUDGET}>BUDGET</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-normal uppercase tracking-wider text-neutral-600 mb-1.5 font-mono">
                      Operational Currency
                    </label>
                    <input
                      type="text"
                      value="INR (₹) — Indian Rupee"
                      disabled
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-600 font-mono font-normal cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Operating Hours: Standard Check-in and Check-out Times */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-neutral-50/70 border border-neutral-200/80">
                  <div>
                    <label className="block text-xs font-normal uppercase tracking-wider text-neutral-700 mb-1.5 font-mono">
                      Check-In Time (24h)
                    </label>
                    <div className="relative">
                      <Clock className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="time"
                        value={checkInTime}
                        onChange={(e) => setCheckInTime(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-neutral-200 text-neutral-900 focus:outline-none focus:border-black font-mono font-normal"
                        required
                      />
                    </div>
                    <span className="text-[10px] text-neutral-400 font-normal mt-1 block">
                      Guest arrival & room access time (default: 14:00)
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-normal uppercase tracking-wider text-neutral-700 mb-1.5 font-mono">
                      Check-Out Time (24h)
                    </label>
                    <div className="relative">
                      <Clock className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="time"
                        value={checkOutTime}
                        onChange={(e) => setCheckOutTime(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-neutral-200 text-neutral-900 focus:outline-none focus:border-black font-mono font-normal"
                        required
                      />
                    </div>
                    <span className="text-[10px] text-neutral-400 font-normal mt-1 block">
                      Departure & room turnover deadline (default: 11:00)
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-normal uppercase tracking-wider text-neutral-600 mb-1.5 font-mono">
                    Property Description & Editorial Summary
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the architectural heritage, guest amenities, dining offerings, and proximity to major city landmarks..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white border border-neutral-200 text-neutral-900 focus:outline-none focus:border-black font-normal leading-relaxed"
                  />
                </div>
              </div>
            </Card>

            {/* SECTION 2: LEGAL & REGULATORY DOSSIER */}
            <Card className="p-6 bg-white border-charcoal-200 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 border-b border-charcoal-100 pb-3">
                <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-normal text-neutral-900">Legal & Commercial Compliance</h3>
                  <p className="text-[11px] text-neutral-400 font-normal">Registered enterprise licenses for verification</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Business Registration Number"
                  placeholder="e.g. CIN-U55101DL2026PTC"
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value)}
                  required
                />

                <Input
                  label="Tax Identification / GST Number"
                  placeholder="e.g. 07AAAAA0000A1Z5"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  required
                />
              </div>
            </Card>

            {/* SECTION 3: MANAGEMENT & CONTACT CHANNELS */}
            <Card className="p-6 bg-white border-charcoal-200 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 border-b border-charcoal-100 pb-3">
                <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-normal text-neutral-900">Management & Guest Communications</h3>
                  <p className="text-[11px] text-neutral-400 font-normal">Designated front desk and administrative contacts</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Official Contact Email"
                  type="email"
                  placeholder="gm@imperialheritage.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  required
                />

                <div>
                  <label className="block text-xs font-normal uppercase tracking-wider text-neutral-600 mb-1.5 font-mono">
                    Direct Contact Phone (10-Digit)
                  </label>
                  <div className="flex rounded-xl shadow-xs border border-charcoal-200 focus-within:border-black transition-all overflow-hidden bg-white">
                    <select
                      value={selectedCountryCode}
                      onChange={(e) => setSelectedCountryCode(e.target.value)}
                      className="h-10 px-2.5 text-xs bg-neutral-50 border-r border-charcoal-200 text-neutral-900 focus:outline-none font-normal cursor-pointer hover:bg-neutral-100 transition-colors shrink-0 max-w-[175px]"
                      title="Select country flag and phone dial code"
                    >
                      {COUNTRY_PHONE_CODES.map((c) => (
                        <option key={c.iso} value={c.iso}>
                          {c.flag} {c.country} ({c.code})
                        </option>
                      ))}
                    </select>

                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      placeholder="e.g. 9876543210"
                      value={phoneDigits}
                      onChange={(e) => {
                        const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setPhoneDigits(onlyDigits);
                      }}
                      className="flex-1 h-10 px-3.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none font-mono font-normal bg-white"
                      required
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mt-1.5">
                    <span>
                      Paired: {selectedCountry.code} {phoneDigits ? phoneDigits : 'XXXXXXXXXX'}
                    </span>
                    <span
                      className={
                        phoneDigits.length === 10
                          ? 'text-neutral-900 font-normal'
                          : 'text-neutral-400 font-normal'
                      }
                    >
                      {phoneDigits.length}/10 digits
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* SECTION 4: PHYSICAL STREET ADDRESS */}
            <Card className="p-6 bg-white border-charcoal-200 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 border-b border-charcoal-100 pb-3">
                <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-normal text-neutral-900">Physical Location Address</h3>
                  <p className="text-[11px] text-neutral-400 font-normal">Municipal civic street address for guest arrival</p>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label="Street Address & Landmark"
                  placeholder="e.g. 1 Mansingh Road, Near India Gate"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Input
                    label="City"
                    placeholder="New Delhi"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />

                  <Input
                    label="State / Province"
                    placeholder="Delhi"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    required
                  />

                  <Input
                    label="Country"
                    placeholder="India"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    required
                  />

                  <Input
                    label="Postal Code"
                    placeholder="110011"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    required
                  />
                </div>
              </div>
            </Card>

            {/* SECTION 5: GEOSPATIAL LOCATION (MAP + CURRENT LOCATION + DIRECT LAT/LONG) */}
            <Card className="p-6 bg-white border-charcoal-200 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-charcoal-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-normal text-neutral-900">Geospatial Coordinates</h3>
                    <p className="text-[11px] text-neutral-400 font-normal">Pin your property via map, current location, or direct coordinates</p>
                  </div>
                </div>

                {/* Method 2: Use Current Location Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseCurrentLocation}
                  disabled={geoLocating}
                  className="gap-1.5 text-xs font-normal"
                >
                  <LocateFixed className={`w-3.5 h-3.5 ${geoLocating ? 'animate-spin' : ''}`} />
                  <span>{geoLocating ? 'Detecting GPS...' : 'Use My Current Location'}</span>
                </Button>
              </div>

              {/* Geolocation Notices */}
              {geoSuccessMessage && (
                <div className="p-2.5 rounded-lg bg-neutral-100 border border-neutral-200 text-xs text-neutral-800 flex items-center gap-2 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0" />
                  <span>{geoSuccessMessage}</span>
                </div>
              )}

              {geoErrorMessage && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2 font-mono">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>{geoErrorMessage}</span>
                </div>
              )}

              {/* Method 1: Interactive Map Picker */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-600 font-mono">
                  <span>Interactive Map Position</span>
                  <span className="text-[11px] text-neutral-400">Drag pin or click map anywhere</span>
                </div>
                <LocationPickerMapDynamic
                  latitude={parsedLatNumber}
                  longitude={parsedLngNumber}
                  onChange={handleMapCoordinateChange}
                />
              </div>

              {/* Method 3: Direct Lat and Long Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <Input
                  label="Latitude (Decimal Degrees)"
                  placeholder="28.6139"
                  value={latitude}
                  onChange={(e) => {
                    setLatitude(e.target.value);
                    setGeoSuccessMessage(null);
                    setGeoErrorMessage(null);
                  }}
                  required
                />

                <Input
                  label="Longitude (Decimal Degrees)"
                  placeholder="77.2090"
                  value={longitude}
                  onChange={(e) => {
                    setLongitude(e.target.value);
                    setGeoSuccessMessage(null);
                    setGeoErrorMessage(null);
                  }}
                  required
                />
              </div>

              {/* Quick Presets */}
              <div className="space-y-2 pt-2 border-t border-charcoal-100">
                <span className="text-[11px] font-mono text-neutral-500 block">
                  Or select a key hospitality destination hub:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {CITY_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-all ${
                        city.toLowerCase() === p.city.toLowerCase()
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN: Live Dossier Preview Card & Submission (Col-span 5) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
            {/* Live Preview Card */}
            <Card className="p-6 bg-white border-charcoal-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-charcoal-100 pb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                  Live Listing Preview
                </span>
                <Badge variant="pending" className="font-mono text-[10px] font-normal">
                  Pending Verification
                </Badge>
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-normal text-neutral-900 leading-snug">
                    {hotelName.trim() || 'Your Hotel Property Name'}
                  </h3>
                  <p className="text-xs text-neutral-500 font-normal mt-0.5">
                    {address.trim() ? `${address}, ` : ''}{city}, {country}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-800 text-[10px] font-mono uppercase">
                    {category}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-800 text-[10px] font-mono">
                    5-Star Standard
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-neutral-900 text-white text-[10px] font-mono">
                    ₹ INR Currency
                  </span>
                </div>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-neutral-600">
                    <span>Coordinates:</span>
                    <span className="text-neutral-900 font-normal">
                      {parsedLatNumber.toFixed(4)}°, {parsedLngNumber.toFixed(4)}°
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Business Reg:</span>
                    <span className="text-neutral-900 font-normal">
                      {regNumber.trim() || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Tax / GST ID:</span>
                    <span className="text-neutral-900 font-normal">
                      {taxId.trim() || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Contact Phone:</span>
                    <span className="text-neutral-900 font-normal">
                      {phoneDigits ? `${selectedCountry.code} ${phoneDigits}` : '—'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-neutral-500 font-normal leading-relaxed line-clamp-3">
                  {description.trim() ||
                    'No editorial summary provided yet. Add description details to highlight architectural notes, suite comforts, and hospitality offerings.'}
                </p>
              </div>
            </Card>

            {/* What Unlocks Upon Approval Card */}
            <Card className="p-6 bg-white border-charcoal-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-neutral-800" />
                <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-900">
                  What Unlocks Upon Approval
                </h4>
              </div>

              <ul className="space-y-2 text-xs text-neutral-600 font-normal">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0 mt-0.5" />
                  <span>Live booking availability across the global Voyage search portal</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0 mt-0.5" />
                  <span>Physical room configuration and room category rate plan setup</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0 mt-0.5" />
                  <span>Front desk reception console & housekeeping turnover dispatch</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0 mt-0.5" />
                  <span>Realized stay revenue & cash inflow financial analytics</span>
                </li>
              </ul>

              <div className="pt-2 border-t border-charcoal-100">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting}
                  className="w-full py-3 text-xs font-normal rounded-xl justify-center shadow-xs"
                >
                  {submitting ? 'Submitting Registration Dossier...' : 'Submit Property Registration Dossier'}
                </Button>
                <p className="text-[10px] text-neutral-400 text-center mt-2 font-mono">
                  By submitting, you certify that you are authorized to represent this hospitality property.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

