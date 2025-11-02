const BASE_URL = 'https://staging.fastor.ai';
const toFormBody = (obj) =>
  Object.entries(obj)
    .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
    .join('&');

export const registerPhone = async (phone, dialCode = '+91') => {
  const res = await fetch('https://staging.fastor.ai/v1/pwa/user/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', Accept: 'application/json' },
    body: toFormBody({ phone, dial_code: dialCode }),
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
};

export const loginWithOTP = async (phone, otp, dialCode = '+91') => {
  const res = await fetch('https://staging.fastor.ai/v1/pwa/user/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', Accept: 'application/json' },
    body: toFormBody({ phone, otp, dial_code: dialCode }),
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  const headers = {};
  ;['authorization','token','bearer','x-auth-token'].forEach(k => { const v = res.headers.get(k); if (v) headers[k] = v; });
  return { status: res.status, data, headers };
};

export const fetchRestaurants = async (cityId = 118, token) => {
  const res = await fetch(`https://staging.fastor.ai/v1/m/restaurant?city_id=118`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return res;
};

export default { registerPhone, loginWithOTP, fetchRestaurants };
