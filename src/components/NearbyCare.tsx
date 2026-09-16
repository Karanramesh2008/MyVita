import { useState } from 'react';
import {
  MapPin,
  Navigation,
  Phone,
  Hospital,
  Stethoscope,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

type CareType = 'hospital' | 'doctor';

export function NearbyCare() {
  const [careType, setCareType] = useState<CareType>('hospital');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

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

        const search =
          careType === 'hospital'
            ? 'hospital'
            : 'doctor clinic';

        const mapsUrl =
          `https://www.google.com/maps/search/${encodeURIComponent(search)}` +
          `/@${latitude},${longitude},14z`;

        window.open(mapsUrl, '_blank', 'noopener,noreferrer');

        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);

        if (error.code === error.PERMISSION_DENIED) {
          setLocationError(
            'Location permission was denied. Please allow location access.'
          );
        } else if (error.code === error.TIMEOUT) {
          setLocationError(
            'Location request timed out. Please try again.'
          );
        } else {
          setLocationError('Unable to determine your location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-indigo-600" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Nearby Care
            </h2>

            <p className="text-sm text-slate-500">
              Find hospitals and doctors near your current location.
            </p>
          </div>
        </div>
      </div>

      {/* Emergency notice */}
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5" />

          <div>
            <p className="font-semibold text-rose-800">
              Emergency?
            </p>

            <p className="text-sm text-rose-700">
              If you need urgent medical attention, choose a nearby
              hospital and seek professional help immediately.
            </p>
          </div>
        </div>
      </div>

      {/* Search type */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">

        <p className="text-sm font-semibold text-slate-700 mb-3">
          What are you looking for?
        </p>

        <div className="grid grid-cols-2 gap-3">

          <button
            onClick={() => setCareType('hospital')}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition ${
              careType === 'hospital'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Hospital className="w-6 h-6" />

            <span className="font-semibold">
              Hospitals
            </span>
          </button>

          <button
            onClick={() => setCareType('doctor')}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition ${
              careType === 'doctor'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Stethoscope className="w-6 h-6" />

            <span className="font-semibold">
              Doctors
            </span>
          </button>

        </div>

        {/* Find button */}
        <button
          onClick={findNearbyCare}
          disabled={isLocating}
          className="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 px-5 rounded-xl flex items-center justify-center gap-2 transition"
        >
          {isLocating ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Finding nearby care...
            </>
          ) : (
            <>
              <Navigation className="w-5 h-5" />
              Find Nearby {careType === 'hospital' ? 'Hospitals' : 'Doctors'}
            </>
          )}
        </button>

        {locationError && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {locationError}
          </div>
        )}

      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <MapPin className="w-5 h-5 text-indigo-600 mb-2" />

          <h3 className="font-semibold text-slate-900">
            GPS Based
          </h3>

          <p className="text-sm text-slate-500 mt-1">
            Uses your current location to find nearby care.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <Navigation className="w-5 h-5 text-indigo-600 mb-2" />

          <h3 className="font-semibold text-slate-900">
            Directions
          </h3>

          <p className="text-sm text-slate-500 mt-1">
            Get directions directly through Google Maps.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <Phone className="w-5 h-5 text-indigo-600 mb-2" />

          <h3 className="font-semibold text-slate-900">
            Emergency Ready
          </h3>

          <p className="text-sm text-slate-500 mt-1">
            Quickly locate medical facilities during emergencies.
          </p>
        </div>

      </div>

    </div>
  );
}