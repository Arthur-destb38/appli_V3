import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

export const getApiBaseUrl = () => {
  const extraApi = (Constants.expoConfig as any)?.extra?.apiUrl;
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (extraApi) {
    return extraApi;
  }

  const hostUri =
    Constants.expoGoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.hostUri ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const host = String(hostUri).split(':')[0];
    if (host) {
      return `http://${host}:8000`;
    }
  }

  return 'http://localhost:8000';
};

export const buildApiUrl = (path: string) => {
  const base = getApiBaseUrl();
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
};

export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const accessToken = await SecureStore.getItemAsync('access_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
};
