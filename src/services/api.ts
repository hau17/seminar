export async function fetchWithAuth(url: string, options: RequestInit = {}, token?: string | null) {
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Define default accept content type headers
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  return response;
}

export const apiService = {
  get: (url: string, token?: string | null) => fetchWithAuth(url, { method: 'GET' }, token),
  
  post: (url: string, body: any, token?: string | null) => 
    fetchWithAuth(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }, token),

  put: (url: string, body: any, token?: string | null) => 
    fetchWithAuth(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }, token),

  delete: (url: string, token?: string | null) => fetchWithAuth(url, { method: 'DELETE' }, token)
};
