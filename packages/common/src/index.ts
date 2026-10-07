export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}

export function createApiResponse<T>(data: T, message = "ok"): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

export interface ApiErrorBody {
  success: false;
  data: null;
  message: string;
  timestamp: string;
  path?: string;
  statusCode: number;
}
