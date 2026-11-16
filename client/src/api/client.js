import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor to unwrap { success, data, pagination } shape
client.interceptors.response.use(
  (response) => {
    // Returns the unwrapped server payload (which contains { success, data, pagination })
    return response.data;
  },
  (error) => {
    const errorData = error.response?.data;
    let message = 'An unexpected network error occurred';

    if (errorData) {
      if (typeof errorData === 'string') {
        message = errorData;
      } else if (errorData.message) {
        message = errorData.message;
      } else if (errorData.error) {
        message = errorData.error;
      } else if (Array.isArray(errorData.errors) && errorData.errors.length > 0) {
        message = errorData.errors.map(e => e.msg || e.message || e).join(', ');
      }
    } else if (error.message) {
      message = error.message;
    }

    const customError = new Error(message);
    customError.status = error.response?.status;
    customError.data = errorData;
    customError.errors = errorData?.errors;
    return Promise.reject(customError);
  }
);

export default client;
