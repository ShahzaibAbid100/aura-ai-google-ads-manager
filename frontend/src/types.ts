export type AutonomyLevel = 'always_ask' | 'balanced' | 'full';

export interface AdAsset {
  id: string;
  type: 'image' | 'video' | 'audio' | 'copy';
  title: string;
  format: string;
  url: string;
  aspectRatio: string;
  status: string; // API may report other persisted review/job statuses
  dimensions?: string;
  duration?: string;
  simulated?: boolean;
}

export interface AdCampaignDraft {
  id: string;
  version?: number;
  validation?: Record<string, unknown>;
  approvedVersion?: number | null;
  campaignName: string;
  goal: string;
  targetRoas: number;
  dailyBudget: number;
  headlines: string[];
  descriptions: string[];
  finalUrl: string;
  businessName: string;
  adStrength?: 'Poor' | 'Average' | 'Good' | 'Excellent';
  adStrengthScore?: number;
  status: 'draft' | 'draft_paused' | 'generated' | 'validated' | 'pending_approval' | 'approved' | 'approved_ready' | 'rejected' | 'ready_to_publish' | 'live';
  channels: ('Search' | 'YouTube' | 'Gmail' | 'Maps' | 'Discover' | 'Display')[];
  provider?: string;
  simulated?: boolean;
  backendAssets?: AdAsset[];
}

export interface ChatMessage {
  id: string;
  sender: 'aura' | 'user';
  text: string;
  timestamp: string;
  campaignDraft?: AdCampaignDraft;
  suggestedActions?: string[];
  creditNotice?: {
    required: number;
    options: { credits: number; price: number }[];
  };
}

export interface ChatSession {
  id: string;
  title: string;
  agentName: string;
  lastActive: string;
  messages: ChatMessage[];
  assets: AdAsset[];
  activeDraft?: AdCampaignDraft;
  backendCampaignId?: string;
}

export interface UserCredits {
  balance: number;
  tier: 'Free' | 'Growth' | 'Ultra';
  autoReload: boolean;
}

export type PreviewTab = 'search' | 'shopping' | 'youtube' | 'shorts' | 'gmail' | 'maps';
