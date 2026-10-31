/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { HomePage } from './components/HomePage';
import { StudioWorkspace } from './components/StudioWorkspace';
import { CreditsModal } from './components/CreditsModal';
import { SettingsModal } from './components/SettingsModal';
import { VoiceModal } from './components/VoiceModal';
import { NewCampaignModal } from './components/NewCampaignModal';
import { BackendStatus } from './components/BackendStatus';
import { ChatSession, AdCampaignDraft, AutonomyLevel } from './types';
import { backendApi, Campaign, CampaignChatResponse } from './services/api';
import { toAdAsset, toCampaignDraft } from './services/campaignAdapter';

const welcomeSession = (): ChatSession => ({
  id: 'welcome',
  title: 'New campaign strategy',
  agentName: 'AURA',
  lastActive: 'Ready',
  assets: [],
  messages: [{
    id: 'welcome-message',
    sender: 'aura',
    text: 'I can create a campaign recommendation, draft ad copy, validate a saved campaign, or show clearly labeled report data. Tell me the business, objective, and budget to start.',
    timestamp: 'Ready',
  }],
});

const sessionFromCampaign = (campaign: Campaign): ChatSession => {
  const draft = toCampaignDraft(campaign);
  return {
    id: campaign.id,
    title: campaign.name,
    agentName: 'AURA',
    lastActive: 'Saved campaign',
    activeDraft: draft,
    assets: campaign.assets.map(toAdAsset),
    backendCampaignId: campaign.id,
    messages: [{
      id: `campaign-${campaign.id}`,
      sender: 'aura',
      text: `Loaded saved campaign ${campaign.name}. Backend status: ${campaign.status}, version ${campaign.version}. Provider: ${draft.provider || 'not yet used'}${draft.simulated ? ' (simulated)' : ''}. No campaign is live from this screen.`,
      timestamp: 'Loaded from backend',
      campaignDraft: draft,
    }],
  };
};

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'studio'>('home');
  const [sessions, setSessions] = useState<ChatSession[]>([welcomeSession()]);
  const [activeSessionId, setActiveSessionId] = useState<string>('welcome');

  // Global State
  const credits = 240; // Display-only demo credits; no billing or entitlement backend exists.
  const [autonomy, setAutonomy] = useState<AutonomyLevel>('always_ask');

  // Modal States
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    let active = true;
    backendApi.listCampaigns().then((campaigns) => {
      if (!active) return;
      const saved = campaigns.map(sessionFromCampaign);
      setSessions(saved.length ? saved : [welcomeSession()]);
      if (saved.length) setActiveSessionId(saved[0].id);
    }).catch(() => {
      if (active) setSessions([welcomeSession()]);
    });
    return () => { active = false; };
  }, []);

  // Create Campaign from Wizard
  const handleCreateCampaign = (newDraft: AdCampaignDraft) => {
    const newSessionId = newDraft.id;
    const newSession: ChatSession = {
      id: newSessionId,
      title: newDraft.campaignName,
      agentName: 'AURA',
      lastActive: 'Saved now',
      activeDraft: newDraft,
      assets: newDraft.backendAssets || [],
      backendCampaignId: newDraft.id,
      messages: [
        {
          id: `msg_${newDraft.id}_intro`,
          sender: 'aura',
          text: `Campaign draft saved by the backend with ID ${newDraft.id}. Status: ${newDraft.status}. Planning provider: ${newDraft.provider || 'unknown'}${newDraft.simulated ? ' (simulated recommendation)' : ''}. Copy and media have not been generated unless returned by the backend.`,
          timestamp: 'Saved now',
          campaignDraft: newDraft,
          suggestedActions: ['Generate ad copy for this campaign', 'Validate this campaign', 'Show report status']
        }
      ]
    };

    setSessions((previous) => [newSession, ...previous.filter((session) => session.id !== newSessionId)]);
    setActiveSessionId(newSessionId);
    setCurrentView('studio');
  };

  // Start new empty chat
  const handleNewChat = () => {
    const session = welcomeSession();
    session.id = `chat_${Date.now()}`;
    session.title = 'New strategy session';
    setSessions((previous) => [session, ...previous]);
    setActiveSessionId(session.id);
  };

  const updateSessionCampaign = (campaign: Campaign) => {
    const draft = toCampaignDraft(campaign);
    setSessions((previous) => previous.map((session) => session.id === campaign.id ? {
      ...session,
      title: campaign.name,
      lastActive: 'Updated from backend',
      activeDraft: draft,
      backendCampaignId: campaign.id,
      assets: campaign.assets.map(toAdAsset),
    } : session));
    return draft;
  };

  const handleChatMessage = async (sessionId: string, text: string, draft?: AdCampaignDraft): Promise<CampaignChatResponse> => {
    const result = await backendApi.chat({
      message: text,
      campaign_id: draft?.id || null,
      business_name: draft?.businessName,
      product_name: draft?.businessName,
      product_details: '',
      goal: draft?.goal,
      daily_budget: draft?.dailyBudget,
      currency: 'USD',
      website_analysis: draft?.finalUrl ? { url: draft.finalUrl } : {},
    });
    if (result.campaign_id) {
      const saved = await backendApi.getCampaign(result.campaign_id);
      updateSessionCampaign(saved);
    }
    setSessions((previous) => previous.map((session) => session.id === sessionId ? {
      ...session,
      lastActive: 'Just now',
      messages: [...session.messages,
        { id: `user-${Date.now()}`, sender: 'user', text, timestamp: 'Just now' },
        { id: `agent-${Date.now()}`, sender: 'aura', text: `${result.reply}${result.missing_fields.length ? `\n\nRequired details: ${result.missing_fields.join(', ')}.` : ''}${result.simulated ? '\n\nThis result is simulated; no real model inference was performed.' : ''}`, timestamp: 'Just now' },
      ],
    } : session));
    return result;
  };

  const handleApproval = async (campaignId: string) => {
    const validation = await backendApi.validateCampaign(campaignId);
    if (validation.status === 'failed') throw new Error('Backend validation failed. Review campaign issues before approval.');
    const approved = await backendApi.approveCampaign(campaignId, { actor: 'frontend-user', notes: 'Approved from campaign studio' });
    return updateSessionCampaign(approved);
  };

  const handleSaveCampaign = async (draft: AdCampaignDraft) => {
    // PATCH replaces plan/copy JSON in the current backend, so preserve the fields
    // generated by the planner instead of losing keywords, audience and provenance.
    const original = await backendApi.getCampaign(draft.id);
    const saved = await backendApi.updateCampaign(draft.id, {
      name: draft.campaignName,
      budget: draft.dailyBudget,
      goal: draft.goal,
      plan: {
        ...original.plan,
        target_roas_recommendation: draft.targetRoas,
        landing_page_recommendation: draft.finalUrl,
        channel_recommendations: draft.channels,
      },
      copy: {
        ...original.copy,
        headlines: draft.headlines.map((text) => ({ text, max_length: 30 })),
        descriptions: draft.descriptions.map((text) => ({ text, max_length: 90 })),
      },
    });
    updateSessionCampaign(saved);
    return updateSessionCampaign(saved);
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-[#f1f3f9] flex flex-col">
      {/* Main Content Area */}
      <div className="flex-1">
        {currentView === 'home' ? (
          <HomePage
            onHireAgent={() => setCurrentView('studio')}
            onOpenCreate={() => setIsCreateModalOpen(true)}
          />
        ) : (
          <StudioWorkspace
            sessions={sessions}
            activeSessionId={activeSessionId}
            setActiveSessionId={setActiveSessionId}
            onNewChat={handleNewChat}
            credits={credits}
            onOpenCredits={() => setIsCreditsModalOpen(true)}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            onOpenVoice={() => setIsVoiceModalOpen(true)}
            onReturnHome={() => setCurrentView('home')}
            autonomy={autonomy}
            onChatMessage={handleChatMessage}
            onApproveCampaign={handleApproval}
            onSaveCampaign={handleSaveCampaign}
            onRefreshCampaign={async (id) => updateSessionCampaign(await backendApi.getCampaign(id))}
          />
        )}
      </div>

      <BackendStatus />

      {/* Modals & Dialogs */}
      <CreditsModal
        isOpen={isCreditsModalOpen}
        onClose={() => setIsCreditsModalOpen(false)}
        currentCredits={credits}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        autonomy={autonomy}
        setAutonomy={setAutonomy}
      />

      <VoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
      />

      <NewCampaignModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateCampaign={handleCreateCampaign}
      />
    </div>
  );
}
