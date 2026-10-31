/** Typed AURA backend client. Secrets and Google credentials must never be placed in Vite config. */
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

export type ProviderName = 'mock' | 'local-real' | 'deterministic';
export type CampaignState = 'draft' | 'generated' | 'validated' | 'pending_approval' | 'approved' | 'rejected' | 'ready_to_publish';
export type CampaignGoal = 'conversions' | 'leads' | 'sales' | 'brand awareness' | 'store visits' | 'traffic';
export type AdChannel = 'Search' | 'YouTube' | 'Gmail' | 'Maps' | 'Discover' | 'Display';

export interface HealthResponse { status: string; environment: string }
export interface WebsiteAnalysis {
  url: string;
  business_name: string;
  description: string;
  products_services: string[];
  categories: string[];
  pricing: string[];
  logo_url: string | null;
  colors: string[];
  text: string;
  images: string[];
  landing_pages: string[];
  metadata: Record<string, unknown>;
  provider: string;
}
export interface CampaignPlanRequest {
  website_analysis?: Record<string, unknown>;
  business_name: string;
  product_details?: string;
  goal: CampaignGoal | string;
  audience?: string;
  location?: string;
  language?: string;
  daily_budget: number;
  currency?: string;
  target_roas?: number | null;
  channels?: AdChannel[];
}
export interface CampaignCreateRequest extends CampaignPlanRequest { name: string }
export interface CampaignPlan {
  is_recommendation: boolean;
  objective: string;
  recommended_campaign_type: string;
  audience: string;
  geographic_targeting: string;
  language: string;
  keyword_themes: string[];
  messaging: Record<string, unknown>;
  budget_recommendation: { daily_budget: number; currency: string };
  target_roas_recommendation?: number | null;
  channel_recommendations?: string[];
  landing_page_recommendation: string;
  required_creative_assets: string[];
  provider: string;
}
export interface CampaignAsset {
  id: string;
  kind: 'image' | 'video' | 'audio' | 'copy' | string;
  provider: string;
  uri: string;
  metadata: Record<string, unknown>;
}
export interface AdCopyItem { text: string; max_length?: number }
export interface CampaignCopy {
  provider?: string;
  simulated?: boolean;
  headlines?: AdCopyItem[];
  long_headlines?: AdCopyItem[];
  descriptions?: AdCopyItem[];
  calls_to_action?: string[];
  benefits?: string[];
}
export interface Campaign {
  id: string;
  name: string;
  status: CampaignState;
  version: number;
  goal: string;
  budget: number;
  currency: string;
  plan: CampaignPlan & Record<string, unknown>;
  copy: CampaignCopy;
  validation: Record<string, unknown>;
  approved_version: number | null;
  approved_at: string | null;
  assets: CampaignAsset[];
}
export interface CampaignUpdateRequest {
  name?: string;
  goal?: string;
  budget?: number;
  currency?: string;
  plan?: Record<string, unknown>;
  copy?: Record<string, unknown>;
}
export interface CopyRequest {
  product_name: string;
  benefits?: string[];
  verified_claims?: string[];
  variations?: number;
}
export interface AdCopyGenerationResponse {
  copy: CampaignCopy;
  issues: Array<Record<string, unknown>>;
  revision_attempts: number;
  simulated: boolean;
  provider: string;
}
export interface ValidationResponse {
  status: string;
  issues: Array<{ severity: string; code: string; message: string }>;
  deterministic_checks: boolean;
  model_judgments: Array<Record<string, unknown>>;
  revision_eligible: boolean;
}
export interface ApprovalRequest { actor: string; notes?: string }
export interface RejectRequest extends ApprovalRequest { reason: string }
export interface PublishResponse { status: 'dry_run' | 'blocked'; published: false; campaign_id: string; message: string }
export interface CampaignReport {
  source: string;
  simulated: boolean;
  period?: string | null;
  metrics: Record<string, number>;
}
export interface OptimizationResponse extends CampaignReport {
  recommendations: Array<{ area: string; recommendation: string; automatic_change?: string }>;
  applied: false;
}
export interface ModelStatusItem {
  key: string;
  repository: string;
  path: string;
  available: boolean;
  missing_files: string[];
  bytes_present: number;
  runtime_ready: boolean;
  python_version: string;
  python_requirement: string;
  python_compatible: boolean;
  missing_dependencies: string[];
  installed_versions: Record<string, string>;
  capability_dependencies: Record<string, string[]>;
  inference_tested: boolean;
  inference_test: { status: 'not_run' | 'passed' | 'stale'; tested_at: string | null; revision: string; test_name?: string | null };
  readiness: 'weights_missing' | 'weights_downloaded' | 'runtime_ready' | 'inference_verified';
  license: string;
  license_url: string;
  purpose: string;
  dependencies: string[];
  hardware_notes: string;
}
export interface ModelStatusResponse {
  models: ModelStatusItem[];
  providers: Record<string, string>;
}
export interface ModelCapabilitiesResponse { models: Array<Record<string, unknown>> }
export interface CampaignChatRequest {
  message: string;
  campaign_id?: string | null;
  action?: 'auto' | 'plan' | 'generate_copy' | 'validate' | 'report' | 'optimize';
  business_name?: string;
  product_name?: string;
  product_details?: string;
  goal?: string;
  audience?: string;
  location?: string;
  language?: string;
  daily_budget?: number;
  currency?: string;
  website_analysis?: Record<string, unknown>;
  benefits?: string[];
  verified_claims?: string[];
}
export interface CampaignChatResponse {
  reply: string;
  action: string;
  status: 'completed' | 'needs_details' | 'unavailable';
  provider: string;
  simulated: boolean;
  campaign_id: string | null;
  result: Record<string, unknown>;
  missing_fields: string[];
}
export interface ImageGenerateRequest { prompt: string; brand_name?: string; aspect_ratio?: '1:1' | '4:5' | '1.91:1' | '9:16' | '16:9'; variations?: number; campaign_id?: string | null }
export interface ImageGenerationResponse {
  provider: string;
  uri?: string | null;
  simulated: boolean;
  mime_type?: string | null;
  asset_id?: string | null;
  assets?: Array<{ asset_id?: string; provider: string; uri: string; simulated: boolean; mime_type: string; width?: number; height?: number; metadata?: Record<string, unknown> }>;
}
export interface VideoGenerateRequest { prompt: string; duration_seconds?: number; aspect_ratio?: '9:16' | '16:9' | '1:1'; image_asset_id?: string | null; campaign_id?: string | null }
export interface VideoGenerationResponse { job_id: string; status: string; result?: Record<string, unknown>; error?: string | null; simulated: boolean }
export interface JobResponse { id: string; kind: string; status: string; result: Record<string, unknown>; error: string }
export interface OAuthStartResponse { authorization_url: string; state: string }
export interface OAuthConnectionResponse { connected: boolean; account_label: string | null }

async function request<T>(path: string, options: RequestInit = {}, timeoutMs = 20000): Promise<T> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener('abort', onAbort, { once: true });
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
      ...options,
      signal: controller.signal,
      credentials: 'same-origin',
      headers: {
        ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
    const contentType = response.headers.get('content-type') || '';
    const body: unknown = response.status === 204 ? null : contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
      const details = body && typeof body === 'object' && 'detail' in body ? (body as { detail: unknown }).detail : body;
      // FastAPI 422 errors contain an array of field-validation issues.
      const message = typeof details === 'string'
        ? details
        : Array.isArray(details)
          ? details.map((item: { loc?: Array<string | number>; msg?: string }) =>
              `${(item.loc || []).join('.')}: ${item.msg || 'Invalid value'}`).join('; ')
          : `API request failed (HTTP ${response.status})`;
      throw new ApiError(response.status, message, details);
    }
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, error instanceof Error ? (error.name === 'AbortError' ? 'Request timed out' : error.message) : 'Backend unavailable');
  } finally {
    window.clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
  }
}

export function mediaUrl(uri: string): string {
  if (/^https?:\/\//i.test(uri)) return uri;
  // Providers return /media/files/filename, but FastAPI routes are under
  // /api/v1/media/files/filename. Include the configured API base so Vite's
  // /api proxy works for real and mock campaign assets.
  if (uri.startsWith('/media/')) return `${API_BASE}${uri}`;
  const apiOrigin = API_BASE.startsWith('http') ? new URL(API_BASE).origin : '';
  return `${apiOrigin}${uri.startsWith('/') ? uri : `/${uri}`}`;
}

export const backendApi = {
  health: () => request<{ status: string; environment: string }>('/health', {}, 5000),
  models: () => request<ModelStatusResponse>('/models/status', {}, 10000),
  analyzeWebsite: (url: string, signal?: AbortSignal) => request<WebsiteAnalysis>('/websites/analyze', { method: 'POST', body: JSON.stringify({ url }), signal } as RequestInit, 30000),
  planCampaign: (input: CampaignPlanRequest, signal?: AbortSignal) => request<CampaignPlan>('/campaigns/plan', { method: 'POST', body: JSON.stringify(input), signal } as RequestInit, 45000),
  createCampaign: (input: CampaignCreateRequest) => request<Campaign>('/campaigns', { method: 'POST', body: JSON.stringify(input) }),
  listCampaigns: () => request<Campaign[]>('/campaigns'),
  getCampaign: (id: string) => request<Campaign>(`/campaigns/${encodeURIComponent(id)}`),
  updateCampaign: (id: string, input: CampaignUpdateRequest) => request<Campaign>(`/campaigns/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) }),
  generateCopy: (id: string, input: CopyRequest) => request<AdCopyGenerationResponse>(`/campaigns/${encodeURIComponent(id)}/generate`, { method: 'POST', body: JSON.stringify(input) }, 60000),
  chat: (input: CampaignChatRequest) => request<CampaignChatResponse>('/campaigns/chat', { method: 'POST', body: JSON.stringify(input) }, 60000),
  validateCampaign: (id: string) => request<ValidationResponse>(`/campaigns/${encodeURIComponent(id)}/validate`, { method: 'POST' }),
  approveCampaign: (id: string, input: ApprovalRequest) => request<Campaign>(`/campaigns/${encodeURIComponent(id)}/approve`, { method: 'POST', body: JSON.stringify(input) }),
  rejectCampaign: (id: string, input: RejectRequest) => request<Campaign>(`/campaigns/${encodeURIComponent(id)}/reject`, { method: 'POST', body: JSON.stringify(input) }),
  preparePublish: (id: string) => request<PublishResponse>(`/campaigns/${encodeURIComponent(id)}/publish`, { method: 'POST' }),
  campaignReport: (id: string) => request<CampaignReport>(`/campaigns/${encodeURIComponent(id)}/report`),
  optimizeCampaign: (id: string) => request<OptimizationResponse>(`/campaigns/${encodeURIComponent(id)}/optimize`, { method: 'POST' }),
  generateImage: (input: ImageGenerateRequest) => request<ImageGenerationResponse>('/media/images/generate', { method: 'POST', body: JSON.stringify(input) }, 120000),
  generateVideo: (input: VideoGenerateRequest) => request<VideoGenerationResponse>('/media/videos/generate', { method: 'POST', body: JSON.stringify(input) }, 30000),
  getJob: (id: string) => request<JobResponse>(`/jobs/${encodeURIComponent(id)}`),
  analyzeAsset: (id: string, input: { expected_text?: string[]; prompt?: string }) => request<Record<string, unknown>>(`/media/assets/${encodeURIComponent(id)}/analyze`, { method: 'POST', body: JSON.stringify(input) }, 60000),
  googleAdsReport: (source: 'mock' | 'live' = 'mock') => request<CampaignReport>(`/google-ads/report?source=${source}`),
  oauthConnection: () => request<OAuthConnectionResponse>('/google-ads/connection'),
  oauthStart: () => request<OAuthStartResponse>('/google-ads/oauth/start'),
  disconnectGoogleAds: () => request<{ disconnected: boolean }>('/google-ads/connection', { method: 'DELETE' }),
  history: (id: string) => request<Array<Record<string, unknown>>>(`/campaigns/${encodeURIComponent(id)}/history`),
};

export async function pollJob(id: string, options: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal } = {}): Promise<JobResponse> {
  const intervalMs = options.intervalMs ?? 1000;
  const timeoutMs = options.timeoutMs ?? 120000;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (options.signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
    const job = await backendApi.getJob(id);
    if (job.status === 'completed' || job.status === 'failed') return job;
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(resolve, intervalMs);
      options.signal?.addEventListener('abort', () => { window.clearTimeout(timer); reject(new DOMException('Request cancelled', 'AbortError')); }, { once: true });
    });
  }
  throw new ApiError(408, 'Background job timed out while waiting for completion');
}
