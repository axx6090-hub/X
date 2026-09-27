import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, ExternalLink, X } from 'lucide-react';
import { useStore } from './StoreContext';

export function validMapsUrl(value) {
  if (!value.trim()) return true;
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return false;
    if (u.hostname === 'maps.app.goo.gl' || u.hostname === 'maps.google.com') return true;
    if (u.hostname === 'goo.gl') return u.pathname.startsWith('/maps/');
    return ['google.com', 'www.google.com'].includes(u.hostname) && /^\/maps(?:\/|$)/.test(u.pathname);
  } catch { return false; }
}
export const locationUrl = location => 'https://www.google.com/maps/search/?api=1&query=' + location.lat + ',' + location.lng;
let mapsPromise;
function loadGoogleMaps(key) {
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = setTimeout(() => { mapsPromise = null; reject(new Error('تعذر تحميل الخريطة؛ استخدم رابط المشاركة')); }, 15000);
    window.__tokkmaMapsReady = () => { clearTimeout(timeout); resolve(window.google.maps); delete window.__tokkmaMapsReady; };
    script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(key) + '&v=weekly&callback=__tokkmaMapsReady';
    script.async = true;
    script.onerror = () => { clearTimeout(timeout); mapsPromise = null; reject(new Error('تعذر تحميل الخريطة؛ استخدم رابط المشاركة')); };
    document.head.appendChild(script);
  });
  return mapsPromise;
}
export default function LocationPicker({ value, onChange }) {
  const { settings } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showMap, setShowMap] = useState(false);
  const container = useRef(null); const mapRef = useRef(null); const markerRef = useRef(null);
  const changeRef = useRef(onChange);
  const locationRef = useRef(value.location); locationRef.current = value.location;
  const alive = useRef(true);
  const locationRequest = useRef(0);
  const choose = next => { locationRequest.current += 1; setBusy(false); onChange(next); };
  changeRef.current = choose;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!showMap || !settings.google_maps_api_key) return;
    let stopped = false; let listener;
    loadGoogleMaps(settings.google_maps_api_key).then(maps => {
      if (stopped || !container.current) return;
      const map = new maps.Map(container.current, { center: locationRef.current || { lat: 33.3152, lng: 44.3661 }, zoom: locationRef.current ? 16 : 7, streetViewControl: false, mapTypeControl: false });
      mapRef.current = map;
      markerRef.current = new maps.Marker({ map, position: locationRef.current || undefined });
      listener = map.addListener('click', e => {
        const location = { lat: Number(e.latLng.lat().toFixed(6)), lng: Number(e.latLng.lng().toFixed(6)) };
        markerRef.current.setPosition(location);
        changeRef.current({ location, maps_url: '' });
      });
    }).catch(e => { if (!stopped) setError(e.message); });
    return () => { stopped = true; listener?.remove(); markerRef.current?.setMap(null); markerRef.current = null; mapRef.current = null; };
  }, [showMap, settings.google_maps_api_key]);
  useEffect(() => {
    if (value.location) { markerRef.current?.setPosition(value.location); mapRef.current?.panTo(value.location); }
    else markerRef.current?.setPosition(null);
  }, [value.location]);
  const locate = () => {
    setError('');
    if (!navigator.geolocation) { setError('تحديد الموقع غير متاح؛ يمكنك إرفاق رابط من Google Maps'); return; }
    setBusy(true);
    const request = ++locationRequest.current;
    navigator.geolocation.getCurrentPosition(position => {
      if (!alive.current || request !== locationRequest.current) return;
      setBusy(false);
      onChange({ location: { lat: Number(position.coords.latitude.toFixed(6)), lng: Number(position.coords.longitude.toFixed(6)) }, maps_url: '' });
    }, () => { if (!alive.current || request !== locationRequest.current) return; setBusy(false); setError('لم نتمكن من تحديد الموقع. يمكنك إكمال الطلب بدونه أو إضافة رابط الخريطة'); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  };
  return <fieldset className="rounded-2xl border border-pink-200 bg-pink-50/40 p-4 space-y-3">
    <legend className="px-2 font-bold text-gray-800">موقع التوصيل على الخريطة (اختياري)</legend>
    <p className="text-sm text-gray-600">أضف موقعك لتسهيل التوصيل. لا نطلب موقعك إلا عند الضغط، ويمكن إكمال الطلب بدونه. الموقع المختار يرفق بالطلب المرسل للمتجر.</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={locate} disabled={busy} className="location-button"><Navigation size={16} />{busy ? 'جاري تحديد الموقع…' : 'استخدم موقعي الحالي'}</button>
      <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="location-button"><ExternalLink size={16} />اختيار موقع من Google Maps</a>
      {settings.google_maps_api_key && <button type="button" onClick={() => setShowMap(!showMap)} className="location-button"><MapPin size={16} />{showMap ? 'إغلاق الخريطة' : 'تحديد نقطة على الخريطة'}</button>}
    </div>
    {showMap && <><p className="text-xs text-gray-500">اضغط على مكان التوصيل. فتح الخريطة يحمّل خدمة Google Maps.</p><div ref={container} className="h-72 rounded-xl overflow-hidden" aria-label="خريطة اختيار موقع التوصيل" /></>}
    <label className="block text-sm" htmlFor="maps-link">أو الصق رابط الموقع من Google Maps ← مشاركة ← نسخ الرابط</label>
    <input id="maps-link" type="url" dir="ltr" value={value.maps_url} onChange={e => choose({ location: null, maps_url: e.target.value })} placeholder="https://maps.app.goo.gl/…" className="w-full rounded-xl border border-pink-200 p-3 bg-white text-sm" aria-invalid={!validMapsUrl(value.maps_url)} />
    {!validMapsUrl(value.maps_url) && <p role="alert" className="text-red-700 text-sm">استخدم رابط مشاركة صحيحاً من Google Maps، أو امسح الحقل للمتابعة بدونه.</p>}
    {value.location && <a className="flex items-center gap-2 text-sm font-bold text-green-700" href={locationUrl(value.location)} target="_blank" rel="noopener noreferrer"><MapPin size={17} />تم تحديد الموقع — عرض على خرائط Google</a>}
    {(value.location || value.maps_url) && <button className="text-sm text-gray-500 flex gap-1 items-center" type="button" onClick={() => choose({ location: null, maps_url: '' })}><X size={15} />إزالة الموقع</button>}
    {error && <p role="alert" className="text-sm text-amber-800">{error}</p>}
  </fieldset>;
}
