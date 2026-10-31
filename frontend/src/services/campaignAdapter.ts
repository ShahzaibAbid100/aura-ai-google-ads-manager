import type { AdAsset, AdCampaignDraft } from '../types';
import type { Campaign } from './api';
import { mediaUrl } from './api';

const allowedChannels = new Set(['Search', 'YouTube', 'Gmail', 'Maps', 'Discover', 'Display']);

export function toCampaignDraft(campaign: Campaign): AdCampaignDraft {
  const plan = campaign.plan || {};
  const copy = campaign.copy || {};
  const assets = campaign.assets || [];
  const targetRoas = Number(plan.target_roas_recommendation ?? plan.target_roas ?? 0);
  return {
    id: campaign.id,
    version: campaign.version,
    validation: campaign.validation,
    approvedVersion: campaign.approved_version,
    campaignName: campaign.name,
    goal: campaign.goal as AdCampaignDraft['goal'],
    targetRoas,
    dailyBudget: campaign.budget,
    businessName: String(plan.business_name || campaign.name),
    finalUrl: String(plan.landing_page_recommendation || ''),
    headlines: (copy.headlines || []).map((item) => item.text),
    descriptions: (copy.descriptions || []).map((item) => item.text),
    status: campaign.status,
    channels: (plan.channel_recommendations || []).filter((channel): channel is AdCampaignDraft['channels'][number] => allowedChannels.has(channel)),
    provider: copy.provider || String(plan.provider || 'mock'),
    simulated: copy.simulated ?? plan.provider === 'mock',
    backendAssets: assets.map(toAdAsset),
  };
}

export function toAdAsset(asset: Campaign['assets'][number]): AdAsset {
  const metadata = asset.metadata || {};
  const kind = asset.kind === 'video' ? 'video' : 'image';
  const width = Number(metadata.width || 0);
  const height = Number(metadata.height || 0);
  const ratio = String(metadata.aspect_ratio || (width && height ? `${width}:${height}` : 'Unknown ratio'));
  return {
    id: asset.id,
    type: kind,
    title: `${kind === 'video' ? 'Video' : 'Image'} asset`,
    format: ratio,
    url: mediaUrl(asset.uri),
    aspectRatio: ratio,
    status: String(metadata.status || 'review'),
    simulated: asset.provider === 'mock' || metadata.simulated === true || metadata.simulated === 'true',
    dimensions: width && height ? `${width} x ${height}` : undefined,
    duration: metadata.duration_seconds ? `${metadata.duration_seconds}s` : undefined,
  };
}
