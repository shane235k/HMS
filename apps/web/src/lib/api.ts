// apps/web/src/lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export class ApiError extends Error {
  public code: string;
  public details?: any[];
  public status: number;

  constructor(message: string, code = 'API_ERROR', status = 500, details?: any[]) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('hbms_access_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    const errorInfo = data.error || {};
    let message = errorInfo.message || 'An unexpected request error occurred';

    // Format validation details so specific field issues are visible to the user
    if (Array.isArray(errorInfo.details) && errorInfo.details.length > 0) {
      const fieldDetails = errorInfo.details
        .map((d: any) => (d.field ? `${d.field}: ${d.message}` : d.message))
        .join('. ');
      if (fieldDetails) {
        message = message && message !== 'Validation failed' ? `${message} (${fieldDetails})` : fieldDetails;
      }
    }

    throw new ApiError(
      message,
      errorInfo.code || 'UNKNOWN_ERROR',
      response.status,
      errorInfo.details
    );
  }

  return data.data as T;
}

