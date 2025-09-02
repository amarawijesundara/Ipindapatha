/**
 * API utility functions for making authenticated requests
 */

/**
 * Makes an authenticated API request using cookies
 */
export async function apiRequest(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: 'include', // Always include cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

/**
 * Makes an authenticated GET request
 */
export async function apiGet(url: string): Promise<Response> {
  return apiRequest(url, { method: 'GET' })
}

/**
 * Makes an authenticated POST request
 */
export async function apiPost(url: string, data: any): Promise<Response> {
  return apiRequest(url, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Makes an authenticated PUT request
 */
export async function apiPut(url: string, data: any): Promise<Response> {
  return apiRequest(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/**
 * Makes an authenticated DELETE request
 */
export async function apiDelete(url: string): Promise<Response> {
  return apiRequest(url, { method: 'DELETE' })
}