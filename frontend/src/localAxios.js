import staticAxios from './staticAxios';
import { api, STATIC_MODE } from './storeApi';
const get = async requestUrl => {
  if (STATIC_MODE) return staticAxios.get(requestUrl);
  const url = new URL(requestUrl, window.location.origin);
  return { data: await api(url.pathname.replace(/^\/api/, '') + url.search) };
};
export default { get };
