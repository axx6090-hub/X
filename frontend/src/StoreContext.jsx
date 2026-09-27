import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, STATIC_MODE } from './storeApi';
import data from './staticData.json';
const defaults = { store_name: 'كليشة', whatsapp_number: '9647832882348', delivery_fee: 5000, announcement: 'توصيل لكل محافظات العراق • اطلب بسهولة عبر واتساب', google_maps_api_key: '' };
const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);
export function StoreProvider({ children }) {
  const [settings, setSettings] = useState(defaults);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    setError('');
    try {
      if (STATIC_MODE) {
        setCategories([{ id: 'best-selling', slug: 'best-selling', name: 'الأكثر طلباً' }, { id: 'offers', slug: 'offers', name: 'العروض الحصرية' }, ...data.categories]);
      } else {
        const [s, c] = await Promise.all([api('/settings'), api('/categories')]);
        setSettings(s); setCategories(c);
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);
  useEffect(() => { document.title = settings.store_name + ' | المتجر'; }, [settings.store_name]);
  return <StoreContext.Provider value={{ settings, categories, error, loading, refresh }}>{children}</StoreContext.Provider>;
}
