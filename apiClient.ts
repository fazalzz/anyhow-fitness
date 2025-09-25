import type { 
  FrontendUser as User,
  FrontendWorkout as Workout,
  FrontendPost as Post,
  FrontendBodyWeightEntry as BodyWeightEntry,
  ApiResponse
} from './types';

// @ts-ignore - Vite's env type
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const DEFAULT_TIMEOUT = 10000; // 10 seconds

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

// Get the auth token from localStorage
const getAuthToken = () => localStorage.getItem('authToken');

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
  let data;
  try {
    data = await response.json();
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
      data
    });
    
    // Handle specific error cases
    switch (response.status) {
      case 401:
        if (getAuthToken()) {
          localStorage.removeItem('authToken');
          window.location.href = '/login';
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
          data.error || 'An unexpected error occurred',
          data
        );
    }
  }

  return data;
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
            throw error;
          }
          if (i === retries - 1) throw error;
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

export const login = async (
  name: string,
  pin: string
): Promise<ApiResponse<{user: User; token: string}>> => {
  const result = await apiRequest<{user: User; token: string}>(
    '/auth/login',
    createRequestOptions('POST', { name, pin })
  );
  
  if (result.success && result.data?.token) {
    localStorage.setItem('authToken', result.data.token);
  }

  return result;
};export const apiRegister = async (
  name: string,
  pin: string,
  phoneNumber: string
): Promise<ApiResponse<{user: User; token: string}>> => {
  const result = await apiRequest<{user: User; token: string}>(
    '/auth/register',
    createRequestOptions('POST', { name, pin, phoneNumber })
  );
  
  if (result.success && result.data?.token) {
    localStorage.setItem('authToken', result.data.token);
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
  newPin: string
): Promise<ApiResponse<boolean>> => {
  return apiRequest<boolean>(
    '/auth/pin',
    createRequestOptions('PUT', { userId, newPin })
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
