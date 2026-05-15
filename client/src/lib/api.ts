import { supabase } from './supabase';

export async function apiFetch(url: string, options: RequestInit = {}) {
  console.log(`🚀 API Request: ${options.method || 'GET'} ${url}`);
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
    ...options.headers,
  };

  if (url.includes('undefined') || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && url.includes('localhost'))) {
    console.error(`❌ Invalid API URL detected: ${url}. Please check NEXT_PUBLIC_API_URL in your environment variables.`);
  }

  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401) {
    // Handle unauthorized (e.g., redirect to login or refresh token)
    console.error('Unauthorized access');
  }

  return response;
}
