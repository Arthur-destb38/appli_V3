import Constants from 'expo-constants';

// URL de l'API cloud (Render)
const CLOUD_API_URL = 'https://appli-v2.onrender.com';

export const getApiBaseUrl = () => {
  // 1. Variable d'environnement (pour développement local si besoin)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // 2. Config app.json
  const extraApi = (Constants.expoConfig as any)?.extra?.apiUrl;
  if (extraApi) {
    return extraApi;
  }
  
  // 3. Par défaut: API cloud
  return CLOUD_API_URL;
};

export const buildApiUrl = (path: string) => {
  const base = getApiBaseUrl();
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
};

export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  return headers;
};
