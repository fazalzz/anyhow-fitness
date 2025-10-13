import type { 
  FrontendUser as User,
  FrontendWorkout as Workout,
  FrontendPost as Post,
  FrontendBodyWeightEntry as BodyWeightEntry,
  ApiResponse
} from './types';

type LoginSuccessPayload = { user: User; accessToken: string; refreshToken: string };
type LoginTwoFactorPayload = { twoFactorRequired: true; twoFactorToken: string; email: string; message?: string };

// @ts-ignore - Vite's env type  
// GOOGLE CLOUD RUN API URL (migrated from Firebase Functions)
// Replace with your actual Cloud Run URL after deploy if different
const normalizeApiRoot = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const withoutTrailingSlash = trimmed.replace(/\/$/, '');
  return withoutTrailingSlash.endsWith('/api')
    ? withoutTrailingSlash
    : `${withoutTrailingSlash}/api`;
};

// IMPORTANT: Direct access for Vite replacement at build time
// @ts-ignore - Vite will replace this at build time
const DEFAULT_API_URL = 'https://anyhow-fitness-api-236180381075.us-central1.run.app/api';
const API_URL = normalizeApiRoot(import.meta.env.VITE_API_URL) ?? DEFAULT_API_URL;
const DEFAULT_TIMEOUT = 10000; // 10 seconds

type UpdatePinOptions = {
  resetToken?: string;
};

// Optional quick health check helper
export const apiHealth = async () => {
  try {
    const res = await fetch(`${API_URL}/health`, { method: 'GET', credentials: 'omit' });
    const json = await res.json();
    console.log('API health:', json);
    return json;
  } catch (e) {
    console.warn('API health check failed:', e);
    return null;
  }
};

class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Get the auth tokens from localStorage
const getAuthToken = () => localStorage.getItem('accessToken');
const getRefreshToken = () => localStorage.getItem('refreshToken');

// Refresh the access token using the refresh token
const refreshAuthToken = async (): Promise<void> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken })
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  const data = await response.json();
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
};

// Common headers for all requests
const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Fetch with timeout
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = DEFAULT_TIMEOUT) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ApiError(408, 'Request Timeout', 'Request took too long to complete');
      }
    }
    throw error;
  }
};

// Handle API responses
const handleResponse = async (response: Response) => {
  let payload: any;
  try {
    payload = await response.json();
  } catch (error) {
    throw new ApiError(
      response.status,
      response.statusText,
      'Invalid JSON response from server'
    );
  }

  if (!response.ok) {
    console.error('API Error:', {
      status: response.status,
      statusText: response.statusText,
      data: payload
    });

    // Handle specific error cases
    switch (response.status) {
      case 401:
        if (getAuthToken()) {
          // Try to refresh the token
          const refreshToken = getRefreshToken();
          if (refreshToken) {
            try {
              await refreshAuthToken();
              // If refresh successful, let the caller retry
              return payload;
            } catch (refreshError) {
              // Refresh failed, clear tokens without forcing navigation
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
            }
          } else {
            // No refresh token; clear tokens
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
          }
        }
        throw new ApiError(401, 'Unauthorized', 'Authentication required');

      case 403:
        throw new ApiError(403, 'Forbidden', 'You do not have permission to perform this action');

      case 404:
        throw new ApiError(404, 'Not Found', 'The requested resource was not found');

      case 429:
        throw new ApiError(429, 'Too Many Requests', 'Please try again later');

      case 500:
        throw new ApiError(500, 'Internal Server Error', 'An unexpected error occurred');

      default:
        throw new ApiError(
          response.status,
          response.statusText,
          (payload && (payload.error || payload.message)) || 'An unexpected error occurred',
          payload
        );
    }
  }

  // Unwrap standard API envelope { success, data }
  if (payload && typeof payload === 'object' && 'success' in payload) {
    // If backend responded with success + data, return the inner data
    if (payload.success && 'data' in payload) {
      return payload.data;
    }
    // If success but no data field, return payload itself
    if (payload.success) {
      return payload;
    }
  }

  return payload;
};

// Create request options with common configuration
const createRequestOptions = (
  method: string = 'GET',
  body?: any,
): RequestInit => ({
  method,
  headers: getHeaders(),
  body: body ? JSON.stringify(body) : undefined,
  credentials: 'include',
  mode: 'cors',
  cache: method === 'GET' ? 'default' : 'no-cache'
});

// Generic API request function with retries
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit,
  retries: number = 2
): Promise<ApiResponse<T>> => {
  try {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetchWithTimeout(`${API_URL}${endpoint}`, options);
        const data = await handleResponse(response);
        return { success: true, data };
      } catch (error) {
        if (error instanceof ApiError) {
          // Don't retry client errors except timeout
          if (error.status < 500 && error.status !== 408) {
            // Return the error as a failed response instead of throwing
            return { 
              success: false, 
              error: error.message,
              status: error.status,
              data: error.data
            };
          }
          if (i === retries - 1) {
            // Last retry, return the error as a failed response
            return { 
              success: false, 
              error: error.message,
              status: error.status,
              data: error.data
            };
          }
        } else {
          throw error;
        }
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
    throw new Error('All retries failed');
  } catch (error) {
    if (error instanceof ApiError) {
      return { 
        success: false, 
        error: error.message,
        status: error.status,
        data: error.data
      };
    }
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
};

// AUTH ENDPOINTS
export const apiValidateToken = async (): Promise<ApiResponse<{ user: User }>> => {
  return apiRequest<{ user: User }>(
    '/auth/validate',
    createRequestOptions('GET')
  );
};

export const apiLogout = async (): Promise<ApiResponse<void>> => {
  return apiRequest<void>(
    '/auth/logout',
    createRequestOptions('POST')
  );
};

// Forgot Password API Functions
export const apiRequestResetCode = async (identifier: string): Promise<ApiResponse<{message: string; verificationCode?: string}>> => {
  return apiRequest<{message: string; verificationCode?: string}>(
    '/auth/forgot-pin/request-code',
    createRequestOptions('POST', { identifier, email: identifier })
  );
};

export const apiResetPin = async (
  identifier: string,
  code: string,
  newPin: string
): Promise<ApiResponse<{message: string}>> => {
  return apiRequest<{message: string}>(
    '/auth/forgot-pin/reset',
    createRequestOptions('POST', { identifier, email: identifier, code, newPin })
  );
};

export const login = async (
  name: string,
  pin: string,
  identifierOverride?: string
): Promise<ApiResponse<LoginSuccessPayload | LoginTwoFactorPayload>> => {
  // Backend selects searchValue = name || username || email
  // If identifierOverride is provided, send email directly
  const body: Record<string, any> = { pin };
  if (identifierOverride) {
    body.email = identifierOverride;
    body.username = identifierOverride;
  } else {
    body.name = name;
    if (name.includes('@')) {
      body.email = name;
    }
  }

  const result = await apiRequest<{user: User; accessToken: string; refreshToken: string}>(
    '/auth/login',
    createRequestOptions('POST', body)
  );
  
  if (result.success && result.data?.accessToken) {
    localStorage.setItem('accessToken', result.data.accessToken);
    localStorage.setItem('refreshToken', result.data.refreshToken);
  }

  return result;
};

export const apiVerifyTwoFactor = async (
  token: string,
  code: string
): Promise<ApiResponse<LoginSuccessPayload>> => {
  const payload = { token, code };
  const result = await apiRequest<LoginSuccessPayload>(
    '/auth/verify-2fa',
    createRequestOptions('POST', payload)
  );

  if (result.success && result.data?.accessToken) {
    localStorage.setItem('accessToken', result.data.accessToken);
    localStorage.setItem('refreshToken', result.data.refreshToken);
  }

  return result;
};

export const apiResendTwoFactor = async (
  token: string
): Promise<ApiResponse<{ twoFactorToken: string; email: string }>> => {
  return apiRequest<{ twoFactorToken: string; email: string }>(
    '/auth/resend-2fa',
    createRequestOptions('POST', { token })
  );
};

export const apiRegister = async (
  name: string,
  pin: string,
  email: string
): Promise<ApiResponse<{user: User; accessToken: string; refreshToken: string}>> => {
  const payload: Record<string, unknown> = {
    name,
    pin,
    email: email.trim(),
  };

  const result = await apiRequest<{user: User; accessToken: string; refreshToken: string}>(
    '/auth/register',
    createRequestOptions('POST', payload)
  );

  if (result.success && result.data?.accessToken) {
    localStorage.setItem('accessToken', result.data.accessToken);
    localStorage.setItem('refreshToken', result.data.refreshToken);
  }

  return result;
};

// USER ENDPOINTS
export const apiFindUserByName = async (name: string): Promise<ApiResponse<User>> => {
  return apiRequest<User>(
    `/users/search?name=${encodeURIComponent(name)}`,
    createRequestOptions('GET')
  );
};

export const apiUpdateUserPin = async (
  userId: string,
  newPin: string,
  options: UpdatePinOptions = {}
): Promise<ApiResponse<boolean>> => {
  const payload: Record<string, unknown> = { userId, newPin };

  if (options.resetToken) {
    payload.resetToken = options.resetToken;
  }

  return apiRequest<boolean>(
    '/auth/pin',
    createRequestOptions('PUT', payload)
  );
};

export const apiUpdateUser = async (
  updatedData: Partial<User>
): Promise<ApiResponse<User>> => {
  // Remove sensitive data
  const { pin, ...safeData } = updatedData;
  
  return apiRequest<User>(
    `/users/me`,
    createRequestOptions('PUT', safeData)
  );
};

export const apiChangePin = async (
  userId: string,
  currentPin: string,
  newPin: string
): Promise<ApiResponse<boolean>> => {
  return apiRequest<boolean>(
    '/auth/change-pin',
    createRequestOptions('PUT', { userId, currentPin, newPin })
  );
};

export const apiFetchUsers = async (): Promise<ApiResponse<User[]>> => {
  return apiRequest<User[]>(
    '/users',
    createRequestOptions('GET')
  );
};

// WORKOUTS ENDPOINTS
export const apiFetchWorkouts = async (): Promise<ApiResponse<Workout[]>> => {
  return apiRequest<Workout[]>(
    '/workouts',
    createRequestOptions('GET')
  );
};

export const apiAddWorkout = async (workout: Workout): Promise<ApiResponse<Workout>> => {
  return apiRequest<Workout>(
    '/workouts',
    createRequestOptions('POST', workout)
  );
};

export const apiUpdateWorkout = async (workoutId: string, workout: Workout): Promise<ApiResponse<Workout>> => {
  return apiRequest<Workout>(
    `/workouts/${workoutId}`,
    createRequestOptions('PUT', workout)
  );
};

export const apiDeleteWorkout = async (workoutId: string): Promise<ApiResponse<{ message: string; workoutId: string }>> => {
  return apiRequest<{ message: string; workoutId: string }>(
    `/workouts/${workoutId}`,
    createRequestOptions('DELETE')
  );
};

// POSTS ENDPOINTS
export const apiFetchPosts = async (): Promise<ApiResponse<Post[]>> => {
  return apiRequest<Post[]>(
    '/posts',
    createRequestOptions('GET')
  );
};

export const apiAddPost = async (post: Post): Promise<ApiResponse<Post>> => {
  return apiRequest<Post>(
    '/posts',
    createRequestOptions('POST', post)
  );
};

// BODY WEIGHT ENDPOINTS
export const apiFetchBodyWeightEntries = async (): Promise<ApiResponse<BodyWeightEntry[]>> => {
  return apiRequest<BodyWeightEntry[]>(
    '/bodyweight',
    createRequestOptions('GET')
  );
};

export const apiAddBodyWeightEntry = async (
  entry: BodyWeightEntry
): Promise<ApiResponse<BodyWeightEntry>> => {
  return apiRequest<BodyWeightEntry>(
    '/bodyweight',
    createRequestOptions('POST', entry)
  );
};

export const apiUpdateBodyWeightEntry = async (
  id: string,
  entry: Partial<BodyWeightEntry>
): Promise<ApiResponse<BodyWeightEntry>> => {
  return apiRequest<BodyWeightEntry>(
    `/bodyweight/${id}`,
    createRequestOptions('PUT', entry)
  );
};

export const apiDeleteBodyWeightEntry = async (
  id: string
): Promise<ApiResponse<{ message: string }>> => {
  return apiRequest<{ message: string }>(
    `/bodyweight/${id}`,
    createRequestOptions('DELETE')
  );
};

// Arkkies API methods
export const apiArkkiesLogin = async (credentials: { email: string; password: string }): Promise<ApiResponse<any>> => {
  return apiRequest<any>(
    '/arkkies/login',
    createRequestOptions('POST', credentials)
  );
};

export const apiArkkiesSessionStatus = async (): Promise<ApiResponse<any>> => {
  return apiRequest<any>(
    '/arkkies/session-status',
    createRequestOptions('GET')
  );
};

export const apiArkkiesOutlets = async (): Promise<ApiResponse<any>> => {
  return apiRequest<any>(
    '/arkkies/outlets',
    createRequestOptions('GET')
  );
};

export const apiArkkiesBookSession = async (bookingData: any): Promise<ApiResponse<any>> => {
  return apiRequest<any>(
    '/arkkies/book',
    createRequestOptions('POST', bookingData)
  );
};

export const apiArkkiesLogout = async (): Promise<ApiResponse<any>> => {
  return apiRequest<any>(
    '/arkkies/logout',
    createRequestOptions('POST')
  );
};

export const apiArkkiesBookAndAccess = async (bookingData: any): Promise<ApiResponse<any>> => {
  return apiRequest<any>(
    '/arkkies/book-and-access',
    createRequestOptions('POST', bookingData)
  );
};

export const apiArkkiesTestRealApi = async (): Promise<ApiResponse<any>> => {
  return apiRequest<any>(
    '/arkkies/test-real-api',
    createRequestOptions('POST')
  );
};

export const apiArkkiesTestEnhancedApi = async (data: any): Promise<ApiResponse<any>> => {
  return apiRequest<any>(
    '/arkkies/test-enhanced-api',
    createRequestOptions('POST', data)
  );
};

export const apiArkkiesAutomatedBooking = async (bookingData: any): Promise<ApiResponse<any>> => {
  return apiRequest<any>(
    '/arkkies/automated-booking',
    createRequestOptions('POST', bookingData)
  );
};

// Create an axios-like API object for compatibility with gym routes
export const api = {
  get: async (url: string) => {
    const response = await apiRequest(url, createRequestOptions('GET'));
    return { data: response.data };
  },
  post: async (url: string, data?: any) => {
    const response = await apiRequest(url, createRequestOptions('POST', data));
    return { data: response.data };
  },
  put: async (url: string, data?: any) => {
    const response = await apiRequest(url, createRequestOptions('PUT', data));
    return { data: response.data };
  },
  delete: async (url: string) => {
    const response = await apiRequest(url, createRequestOptions('DELETE'));
    return { data: response.data };
  }
};




