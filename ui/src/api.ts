

export function getAISettings(): { ai_provider: string; ai_api_key: string } {
  const provider = localStorage.getItem('artitude_ai_provider') || 'gpt4o';
  const key = provider === 'gemini'
    ? localStorage.getItem('artitude_gemini_key') || ''
    : localStorage.getItem('artitude_gpt4o_key') || '';
  return { ai_provider: provider, ai_api_key: key };
}

export interface ConsistencyFinding {
  element: string;
  status: 'consistent' | 'inconsistent' | 'needs_attention';
  detail: string;
  bounding_box?: [number, number, number, number];
}

export interface BrandConsistencySection {
  consistency_score: number;
  findings: ConsistencyFinding[];
}

export interface MarketCollisionItem {
  brand_name: string;
  similarity_aspect: string;
  risk_level: 'low' | 'medium' | 'high';
  detail: string;
}

export interface MarketCollisionSection {
  collisions: MarketCollisionItem[];
}

export interface EnhancementSuggestion {
  category: string;
  suggestion: string;
  impact: 'low' | 'medium' | 'high';
  bounding_box?: [number, number, number, number];
}

export interface EnhancementsSection {
  suggestions: EnhancementSuggestion[];
}

export interface DesignReview {
  brand_consistency: BrandConsistencySection;
  market_collision: MarketCollisionSection;
  enhancements: EnhancementsSection;
}

export interface AnalysisResponse {
  synthesis: string;
  design_review: DesignReview;
  evidence: Array<{
    chunk_id: string;
    source_file: string;
    page_number: string;
    section_title: string;
    score: number;
    content: string;
  }>;
  validation_passed: boolean;
  errors: string[];
}

export interface GuidelineFile {
  filename: string;
  size_bytes: number;
  modified_at: number;
}

export interface BrandKit {
  primary_colors: string[];
  secondary_colors: string[];
  typography: string[];
  clearance_rules: string;
  is_stale?: boolean;
}

export interface CompetitorKit {
  name: string;
  url: string;
  primary_colors: string[];
  secondary_colors: string[];
  typography: string[];
}



export interface Project {
  id: string;
  name: string;
  created_at: string;
}

// Define hosted Hugging Face Space URL here
const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? ''
  : 'https://david0dods-artitude-backend.hf.space';

export const getAuthToken = () => localStorage.getItem('artitude_auth_token') || '';
export const setAuthToken = (token: string) => localStorage.setItem('artitude_auth_token', token);
export const removeAuthToken = () => localStorage.removeItem('artitude_auth_token');

const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const register = async (username: string, password: string): Promise<{ access_token: string, username: string }> => {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to register');
  }
  const data = await res.json();
  setAuthToken(data.access_token);
  return data;
};

export const login = async (username: string, password: string): Promise<{ access_token: string, username: string }> => {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to log in');
  }
  const data = await res.json();
  setAuthToken(data.access_token);
  return data;
};

export const fetchCurrentUser = async (): Promise<{ id: string, username: string }> => {
  const res = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    removeAuthToken();
    throw new Error('Unauthorized');
  }
  return res.json();
};

export const createProject = async (name: string): Promise<Project> => {
  const res = await fetch(`${BASE_URL}/api/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to create project');
  return res.json();
};

export const renameProject = async (projectId: string, newName: string): Promise<Project> => {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ name: newName }),
  });
  if (!res.ok) throw new Error('Failed to rename project');
  return res.json();
};

export const deleteProject = async (projectId: string): Promise<void> => {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error('Failed to delete project');
};

export async function fetchProjects(): Promise<Project[]> {
  const response = await fetch(`${BASE_URL}/api/projects`, {
    headers: { ...getAuthHeaders() }
  });
  if (!response.ok) throw new Error('Failed to fetch projects');
  const data = await response.json();
  return data.projects;
}

export async function analyzeRequest(
  projectId: string,
  query: string,
  file: File | null,
  threadId: string | undefined,
  onToken: (token: string) => void,
  onFinal: (data: AnalysisResponse) => void
): Promise<void> {
  if (!projectId) throw new Error('No active project selected.');

  const formData = new FormData();
  formData.append('query', query);
  if (file) {
    formData.append('image', file);
  }
  if (threadId) {
    formData.append('thread_id', threadId);
  }

  // AI provider settings
  const aiSettings = getAISettings();
  formData.append('ai_provider', aiSettings.ai_provider);
  if (aiSettings.ai_api_key) {
    formData.append('ai_api_key', aiSettings.ai_api_key);
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/projects/${projectId}/analyze`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      body: formData,
    });
  } catch (err) {
    throw new Error('Failed to connect to the server. Make sure the backend is running.');
  }

  if (!response.ok) {
    let errorMessage = `API error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData?.errors?.join(', ') || errorData?.detail || errorMessage;
    } catch {
      const text = await response.text().catch(() => '');
      if (text) errorMessage = text;
    }
    throw new Error(errorMessage);
  }

  if (!response.body) {
    throw new Error('No response body stream.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.substring(6);
        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.type === 'token') {
            onToken(parsed.content);
          } else if (parsed.type === 'final') {
            onFinal(parsed.data);
          } else if (parsed.type === 'error') {
            throw new Error(parsed.error);
          }
        } catch (e) {
          if (e instanceof Error && e.message !== "Unexpected end of JSON input") {
            throw e;
          }
        }
      }
    }
  }
}

export async function ingestGuideline(projectId: string, file: File): Promise<{ status: string; message: string; filename: string }> {
  if (!projectId) throw new Error('No active project selected.');

  const formData = new FormData();
  formData.append('file', file);

  // AI provider settings
  const aiSettings = getAISettings();
  formData.append('ai_provider', aiSettings.ai_provider);
  if (aiSettings.ai_api_key) {
    formData.append('ai_api_key', aiSettings.ai_api_key);
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/projects/${projectId}/ingest`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      body: formData,
    });
  } catch (err) {
    throw new Error('Failed to connect to the server. Make sure the backend is running.');
  }

  if (!response.ok) {
    let errorMessage = `API error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData?.error || errorData?.detail || errorMessage;
    } catch {
      const text = await response.text().catch(() => '');
      if (text) errorMessage = text;
    }
    throw new Error(errorMessage);
  }

  try {
    return await response.json();
  } catch {
    throw new Error('Server returned an invalid response.');
  }
}

export async function fetchGuidelines(projectId: string): Promise<GuidelineFile[]> {
  if (!projectId) throw new Error('No active project selected.');

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/projects/${projectId}/guidelines`, {
      headers: { ...getAuthHeaders() }
    });
  } catch (err) {
    throw new Error('Failed to connect to the server. Make sure the backend is running.');
  }

  if (!response.ok) {
    let errorMessage = `API error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData?.error || errorData?.detail || errorMessage;
    } catch {
      const text = await response.text().catch(() => '');
      if (text) errorMessage = text;
    }
    throw new Error(errorMessage);
  }

  try {
    const data = await response.json();
    return data.guidelines;
  } catch {
    throw new Error('Server returned an invalid response.');
  }
}

export async function deleteGuideline(projectId: string, filename: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/projects/${projectId}/guidelines/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() }
  });
  if (!response.ok) {
    let errorMessage = 'Failed to delete guideline';
    try {
      const errorData = await response.json();
      errorMessage = errorData?.error || errorData?.detail || errorMessage;
    } catch {
      const text = await response.text().catch(() => '');
      if (text) errorMessage = text;
    }
    throw new Error(errorMessage);
  }
}

export async function fetchBrandKit(projectId: string): Promise<BrandKit | null> {
  if (!projectId) return null;
  const response = await fetch(`${BASE_URL}/api/projects/${projectId}/brand_kit`, {
    headers: { ...getAuthHeaders() }
  });
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Failed to fetch brand kit');
  }
  try {
    const data = await response.json();
    return data as BrandKit;
  } catch {
    throw new Error('Server returned an invalid response.');
  }
}

export async function fetchCompetitors(projectId: string): Promise<CompetitorKit[]> {
  if (!projectId) return [];
  const response = await fetch(`${BASE_URL}/api/projects/${projectId}/competitors`, {
    headers: { ...getAuthHeaders() }
  });
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error('Failed to fetch competitors');
  }
  try {
    const data = await response.json();
    return data.competitors as CompetitorKit[];
  } catch {
    throw new Error('Server returned an invalid response.');
  }
}

export async function scrapeWebsite(projectId: string, url: string): Promise<{ warning?: string }> {
  const aiSettings = getAISettings();
  const response = await fetch(`${BASE_URL}/api/projects/${projectId}/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ url, ...aiSettings }),
  });
  if (!response.ok) {
    throw new Error('Failed to scrape website');
  }
  return await response.json();
}

export async function resetDatabase(projectId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/projects/${projectId}/reset-db`, {
    method: 'POST',
    headers: { ...getAuthHeaders() }
  });
  if (!response.ok) {
    throw new Error('Failed to reset database');
  }
}

export async function fetchStats(projectId: string): Promise<DashboardStats> {
  if (!projectId) throw new Error('No active project selected.');

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/projects/${projectId}/stats`, {
      headers: { ...getAuthHeaders() }
    });
  } catch (err) {
    throw new Error('Failed to connect to the server. Make sure the backend is running.');
  }

  if (!response.ok) {
    let errorMessage = `API error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData?.error || errorData?.detail || errorMessage;
    } catch {
      const text = await response.text().catch(() => '');
      if (text) errorMessage = text;
    }
    throw new Error(errorMessage);
  }

  try {
    return await response.json();
  } catch {
    throw new Error('Server returned an invalid response.');
  }
}
export interface DashboardStats {
  active_guidelines: number;
  designs_reviewed: number;
  enhancements_suggested: number;
  brand_health_score: number;
  recent_scores?: number[];
  last_review?: {
    filename: string;
    top_issue: string;
    timestamp: number;
    review_id: string;
  } | null;
}