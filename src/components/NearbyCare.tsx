import { useState } from 'react';
import {
  MapPin,
  Navigation,
  Phone,
  Hospital,
  Stethoscope,
  RefreshCw,
  AlertTriangle,
  Clock,
} from 'lucide-react';

type CareType = 'hospital' | 'doctor';

// Clearly labelled fictional/demo records for the hackathon UI.
const DEMO_HOSPITALS = [
  { name: 'MyVita General Hospital', specialty: 'Emergency & General Care', distance: '1.2 km', eta: '5 min', phone: '+91 90000 10001' },
  { name: 'CityCare Medical Centre', specialty: '24×7 Emergency', distance: '2.4 km', eta: '9 min', phone: '+91 90000 10002' },
  { name: 'Starlife Multispeciality Hospital', specialty: 'Cardiology & Emergency', distance: '3.8 km', eta: '14 min', phone: '+91 90000 10003' },
];

const DEMO_DOCTORS = [
  { name: 'Dr. A. Sharma', specialty: 'Cardiologist', distance: '1.5 km', eta: '6 min', phone: '+91 90000 20001' },
  { name: 'Dr. Meera Iyer', specialty: 'General Physician', distance: '2.1 km', eta: '8 min', phone: '+91 90000 20002' },
  { name: 'Dr. Rahul Menon', specialty: 'Internal Medicine', distance: '3.2 km', eta: '12 min', phone: '+91 90000 20003' },
];

export function NearbyCare() {
  const [careType, setCareType] = useState<CareType>('hospital');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  const careList = careType === 'hospital' ? DEMO_HOSPITALS : DEMO_DOCTORS;

  const findNearbyCare = () => {
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('GPS is not supported by this browser.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const search = careType === 'hospital' ? 'hospital' : 'doctor clinic';
        const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(search)}/@${latitude},${longitude},14z`;
        window.open(mapsUrl, '_blank', 'noopener,noreferrer');
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission was denied. Please allow location access.');
        } else if (error.code === error.TIMEOUT) {
          setLocationError('Location request timed out. Please try again.');
        } else {
          setLocationError('Unable to determine your location.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Nearby Care</h2>
            <p className="text-sm text-slate-500">Demo care data plus GPS-powered real-world search.</p>
          </div>
        </div>
      </div>

      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-800">Emergency?</p>
            <p className="text-sm text-rose-700">For urgent medical attention, use the GPS search to locate a nearby hospital and seek professional help immediately.</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <p className="text-sm font-semibold text-slate-700 mb-3">What are you looking for?</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setCareType('hospital')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition ${careType === 'hospital' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <Hospital className="w-6 h-6" />
            <span className="font-semibold">Hospitals</span>
          </button>
          <button onClick={() => setCareType('doctor')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition ${careType === 'doctor' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <Stethoscope className="w-6 h-6" />
            <span className="font-semibold">Doctors</span>
          </button>
        </div>

        <button onClick={findNearbyCare} disabled={isLocating} className="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 px-5 rounded-xl flex items-center justify-center gap-2 transition">
          {isLocating ? <><RefreshCw className="w-5 h-5 animate-spin" />Finding nearby care...</> : <><Navigation className="w-5 h-5" />Find Nearby {careType === 'hospital' ? 'Hospitals' : 'Doctors'}</>}
        </button>

        {locationError && <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{locationError}</div>}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
        <strong>Demo mode:</strong> the cards below use fictional sample data for testing the UI. The GPS button opens a live map search for your actual location.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {careList.map((care) => (
          <div key={care.name} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                {careType === 'hospital' ? <Hospital className="w-5 h-5 text-indigo-600" /> : <Stethoscope className="w-5 h-5 text-indigo-600" />}
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">Demo</span>
            </div>
            <h3 className="font-bold text-slate-900 mt-4">{care.name}</h3>
            <p className="text-sm text-slate-500 mt-1">{care.specialty}</p>
            <div className="mt-4 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-indigo-500" />{care.distance} away</div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-500" />Approx. {care.eta}</div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-500" />{care.phone}</div>
            </div>
            <button onClick={findNearbyCare} className="w-full mt-4 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
              <Navigation className="w-4 h-4" />Open live search
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <MapPin className="w-5 h-5 text-indigo-600 mb-2" />
          <h3 className="font-semibold text-slate-900">GPS Based</h3>
          <p className="text-sm text-slate-500 mt-1">Uses your current location to search for real nearby care.</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <Navigation className="w-5 h-5 text-indigo-600 mb-2" />
          <h3 className="font-semibold text-slate-900">Directions</h3>
          <p className="text-sm text-slate-500 mt-1">Open a live Google Maps search from your current position.</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <Phone className="w-5 h-5 text-indigo-600 mb-2" />
          <h3 className="font-semibold text-slate-900">Emergency Ready</h3>
          <p className="text-sm text-slate-500 mt-1">Quickly switch between hospitals and doctors when testing the workflow.</p>
        </div>
      </div>
    </div>
  );
}
