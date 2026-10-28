import { demoDataService } from './demoDataService';

const ENV_API_URL = import.meta.env.VITE_API_URL as string | undefined;
const API_BASE = ENV_API_URL || '/api';

// Tracks whether the backend is live or whether we are in standalone mode
let isStandaloneMode = false;

export function getIsStandaloneMode(): boolean {
  return isStandaloneMode;
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('soc_access_token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

/**
 * Checks if a response is HTML (e.g., from Vercel SPA index.html rewrites or 404 HTML).
 */
function isHtmlResponse(contentType: string | null, textSnippet: string): boolean {
  if (contentType && contentType.includes('text/html')) return true;
  const trimmed = textSnippet.trimStart().toLowerCase();
  return trimmed.startsWith('<!doctype') || trimmed.startsWith('<html') || trimmed.startsWith('<head');
}

/**
 * Robust request executor with intelligent fallback to preloaded standalone dataset.
 */
async function requestWithFallback<T>(
  endpoint: string,
  options: RequestInit = {},
  fallbackHandler: () => Promise<T>
): Promise<T> {
  // If we already know the live backend is unavailable or not configured on Vercel
  if (isStandaloneMode && !ENV_API_URL) {
    return fallbackHandler();
  }

  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  const url = `${API_BASE}${endpoint}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const res = await fetch(url, { ...options, headers, signal: controller.signal });
    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type');
    const rawText = await res.text();

    // Check if server returned HTML (typical Vercel rewrite or proxy missing)
    if (isHtmlResponse(contentType, rawText)) {
      isStandaloneMode = true;
      return fallbackHandler();
    }

    if (!res.ok) {
      // If 404 or server error and no custom API URL, fallback
      if ((res.status === 404 || res.status >= 500) && !ENV_API_URL) {
        isStandaloneMode = true;
        return fallbackHandler();
      }

      let errorMsg = `Request failed (${res.status})`;
      try {
        const errorData = JSON.parse(rawText);
        if (errorData.detail) {
          errorMsg = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
        }
      } catch {
        if (rawText) errorMsg = rawText;
      }
      throw new Error(errorMsg);
    }

    // Attempt JSON parse
    try {
      return JSON.parse(rawText) as T;
    } catch {
      isStandaloneMode = true;
      return fallbackHandler();
    }
  } catch (err: any) {
    // If network error, abort timeout, or fetch failed, fallback to standalone store
    isStandaloneMode = true;
    return fallbackHandler();
  }
}

export const api = {
  // Mode Check
  isStandalone: () => isStandaloneMode,

  // Auth
  login: async (username: string, password: string) => {
    return requestWithFallback(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      },
      () => demoDataService.login(username, password)
    );
  },

  getProfile: async () => {
    return requestWithFallback('/auth/me', {}, () => demoDataService.getProfile());
  },

  // Analytics
  getDashboardAnalytics: async (filters: Record<string, string> = {}) => {
    const query = new URLSearchParams(filters).toString();
    return requestWithFallback(
      `/analytics/dashboard${query ? `?${query}` : ''}`,
      {},
      () => demoDataService.getDashboardAnalytics(filters)
    );
  },

  // Incidents
  listIncidents: async (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '' && val !== 'All') {
        query.append(key, String(val));
      }
    });
    return requestWithFallback(`/incidents?${query.toString()}`, {}, () => demoDataService.listIncidents(params));
  },

  getIncident: async (incidentId: string) => {
    return requestWithFallback(`/incidents/${incidentId}`, {}, () => demoDataService.getIncident(incidentId));
  },

  createIncident: async (data: any) => {
    return requestWithFallback(
      '/incidents',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      () => demoDataService.createIncident(data)
    );
  },

  updateIncident: async (incidentId: string, data: any) => {
    return requestWithFallback(
      `/incidents/${incidentId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
      () => demoDataService.updateIncident(incidentId, data)
    );
  },

  updateIncidentStatus: async (incidentId: string, status: string, note: string = '') => {
    return requestWithFallback(
      `/incidents/${incidentId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, note }),
      },
      () => demoDataService.updateIncidentStatus(incidentId, status as any, note)
    );
  },

  addIncidentNote: async (incidentId: string, note: string) => {
    return requestWithFallback(
      `/incidents/${incidentId}/notes`,
      {
        method: 'POST',
        body: JSON.stringify({ note }),
      },
      () => demoDataService.addIncidentNote(incidentId, note)
    );
  },

  deleteIncident: async (incidentId: string) => {
    return requestWithFallback(
      `/incidents/${incidentId}`,
      {
        method: 'DELETE',
      },
      () => demoDataService.deleteIncident(incidentId)
    );
  },

  // Reports
  exportCSVUrl: (filters: Record<string, string> = {}) => {
    const query = new URLSearchParams(filters);
    return `${API_BASE}/reports/export/csv?${query.toString()}`;
  },

  downloadCSV: async (filters: Record<string, string> = {}) => {
    if (isStandaloneMode || !ENV_API_URL) {
      await demoDataService.downloadCSV(filters);
      return;
    }

    try {
      const query = new URLSearchParams(filters);
      const token = localStorage.getItem('soc_access_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/reports/export/csv?${query.toString()}`, { headers });
      const contentType = res.headers.get('content-type');
      if (isHtmlResponse(contentType, '')) {
        await demoDataService.downloadCSV(filters);
        return;
      }

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
    } catch {
      await demoDataService.downloadCSV(filters);
    }
  },

  getUnresolvedHighPriorityReport: async () => {
    return requestWithFallback('/reports/unresolved-high-priority', {}, () =>
      demoDataService.getUnresolvedHighPriorityReport()
    );
  },

  // Audit Logs
  listAuditLogs: async (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '' && val !== 'All') {
        query.append(key, String(val));
      }
    });
    return requestWithFallback(`/audit-logs?${query.toString()}`, {}, () => demoDataService.listAuditLogs(params));
  },

  // System
  getSystemHealth: async () => {
    return requestWithFallback('/system/health', {}, () => demoDataService.getSystemHealth());
  },

  // ML Text Classifier
  classifyText: async (text: string, analystNotes?: string, reviewer?: string) => {
    return requestWithFallback(
      '/ml/classify',
      {
        method: 'POST',
        body: JSON.stringify({
          text,
          analyst_notes: analystNotes || '',
          reviewer: reviewer || 'SOC Analyst',
        }),
      },
      () => demoDataService.classifyText(text, analystNotes, reviewer)
    );
  },

  listMLRecords: async (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '' && val !== 'All') {
        query.append(key, String(val));
      }
    });
    return requestWithFallback(`/ml/records?${query.toString()}`, {}, () => demoDataService.listMLRecords(params));
  },

  getMLRecord: async (recordId: string) => {
    return requestWithFallback(`/ml/records/${recordId}`, {}, () => demoDataService.getMLRecord(recordId));
  },

  updateMLRecordStatus: async (
    recordId: string,
    data: { review_status?: string; analyst_confirmed_status?: string; analyst_notes?: string; reviewer?: string }
  ) => {
    return requestWithFallback(
      `/ml/records/${recordId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
      () => demoDataService.updateMLRecordStatus(recordId, data)
    );
  },

  getMLMetrics: async () => {
    return requestWithFallback('/ml/metrics', {}, () => demoDataService.getMLMetrics());
  },

  getMLSamples: async () => {
    return requestWithFallback('/ml/samples', {}, () => demoDataService.getMLSamples());
  },

  getCICIDSMetrics: async () => {
    return demoDataService.getCICIDSMetrics();
  },
};
