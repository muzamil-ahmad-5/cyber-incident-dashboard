const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('soc_access_token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errorMsg = `Request failed (${res.status})`;
      try {
        const errorData = await res.json();
        if (errorData.detail) {
          errorMsg = typeof errorData.detail === 'string' 
            ? errorData.detail 
            : JSON.stringify(errorData.detail);
        }
      } catch {
        // Fallback to text
        const text = await res.text();
        if (text) errorMsg = text;
      }
      throw new Error(errorMsg);
    }
    return res.json() as Promise<T>;
  } catch (err: any) {
    // Check if network failed or server is offline
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Unable to connect to the SOC backend API. Please ensure the backend server is running.');
    }
    throw err;
  }
}

export const api = {
  // Auth
  login: async (username: string, password: string) => {
    return request<{ access_token: string; token_type: string; username: string; role: 'admin' | 'analyst'; full_name: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  getProfile: async () => {
    return request<{ id: number; username: string; full_name: string; role: 'admin' | 'analyst'; is_active: boolean }>('/auth/me');
  },

  // Analytics
  getDashboardAnalytics: async (filters: Record<string, string> = {}) => {
    const query = new URLSearchParams(filters).toString();
    return request<any>(`/analytics/dashboard${query ? `?${query}` : ''}`);
  },

  // Incidents
  listIncidents: async (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '' && val !== 'All') {
        query.append(key, String(val));
      }
    });
    return request<any>(`/incidents?${query.toString()}`);
  },

  getIncident: async (incidentId: string) => {
    return request<any>(`/incidents/${incidentId}`);
  },

  createIncident: async (data: any) => {
    return request<any>('/incidents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateIncident: async (incidentId: string, data: any) => {
    return request<any>(`/incidents/${incidentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateIncidentStatus: async (incidentId: string, status: string, note: string = '') => {
    return request<any>(`/incidents/${incidentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    });
  },

  addIncidentNote: async (incidentId: string, note: string) => {
    return request<any>(`/incidents/${incidentId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  deleteIncident: async (incidentId: string) => {
    return request<any>(`/incidents/${incidentId}`, {
      method: 'DELETE',
    });
  },

  // Reports
  exportCSVUrl: (filters: Record<string, string> = {}) => {
    const query = new URLSearchParams(filters);
    return `${API_BASE}/reports/export/csv?${query.toString()}`;
  },

  downloadCSV: async (filters: Record<string, string> = {}) => {
    const query = new URLSearchParams(filters);
    const token = localStorage.getItem('soc_access_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/reports/export/csv?${query.toString()}`, { headers });
    if (!res.ok) throw new Error('Failed to download CSV export');
    
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soc_incidents_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  },

  getUnresolvedHighPriorityReport: async () => {
    return request<any>('/reports/unresolved-high-priority');
  },

  // Audit Logs
  listAuditLogs: async (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '' && val !== 'All') {
        query.append(key, String(val));
      }
    });
    return request<any>(`/audit-logs?${query.toString()}`);
  },

  // System
  getSystemHealth: async () => {
    return request<any>('/system/health');
  },
};
