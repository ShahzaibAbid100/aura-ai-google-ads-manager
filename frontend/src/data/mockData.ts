import { ChatSession, AdAsset, AdCampaignDraft } from '../types';

export const INITIAL_CAMPAIGN: AdCampaignDraft = {
  id: 'cmp_pmax_01',
  campaignName: 'AURA Performance Max - Spring Accelerator',
  goal: 'conversions',
  targetRoas: 480,
  dailyBudget: 150,
  businessName: 'Veloce Footwear & Apparel',
  finalUrl: 'https://veloce.design/shop/spring-collection',
  headlines: [
    'Engineered For Pure Speed',
    'Next-Gen Responsive Cushioning',
    'Handcrafted Italian Craftsmanship',
    'Try Risk-Free for 30 Days',
    'Free Express Shipping Worldwide'
  ],
  descriptions: [
    'Discover aerospace-grade lightweight knit sneakers engineered for peak daily performance.',
    'Over 14,000 verified 5-star runner reviews. Experience unmatched arch support and style.',
    'Direct to consumer luxury comfort. Complimentary returns and 2-year durability guarantee.'
  ],
  adStrength: 'Excellent',
  adStrengthScore: 94,
  status: 'draft_paused',
  channels: ['Search', 'YouTube', 'Gmail', 'Maps', 'Discover', 'Display']
};

export const INITIAL_ASSETS: AdAsset[] = [
  {
    id: 'asset_1',
    type: 'image',
    title: 'Minimalist Sneaker Showcase',
    format: 'Landscape (1.91:1)',
    url: '/assets/images/ad_search_mobile_1792474059750.jpg',
    aspectRatio: '1.91:1',
    dimensions: '1200 x 628',
    status: 'approved'
  },
  {
    id: 'asset_2',
    type: 'video',
    title: '4K TV In-Stream Commercial (15s)',
    format: 'Landscape Video (16:9)',
    url: '/assets/images/ad_youtube_screen_1792474060627.jpg',
    aspectRatio: '16:9',
    duration: '0:15',
    status: 'approved'
  },
  {
    id: 'asset_3',
    type: 'image',
    title: 'Google Shopping Holographic Shelf',
    format: 'Square (1:1)',
    url: '/assets/images/ad_shopping_showcase_1792475114334.jpg',
    aspectRatio: '1:1',
    dimensions: '1080 x 1080',
    status: 'approved'
  },
  {
    id: 'asset_4',
    type: 'image',
    title: 'YouTube Shorts High-Energy Vertical Ad',
    format: 'Vertical Story (9:16)',
    url: '/assets/images/ad_shorts_vertical_1792475115634.jpg',
    aspectRatio: '9:16',
    dimensions: '1080 x 1920',
    status: 'approved'
  },
  {
    id: 'asset_5',
    type: 'image',
    title: 'Omnichannel Display Night Runner Banner',
    format: 'Wide Banner (16:9)',
    url: '/assets/images/ad_display_banner_1792475115328.jpg',
    aspectRatio: '16:9',
    dimensions: '1920 x 1080',
    status: 'approved'
  },
  {
    id: 'asset_6',
    type: 'image',
    title: 'Boutique Storefront Geolocation Pin',
    format: 'Square (1:1)',
    url: '/assets/images/ad_maps_store_1792474060709.jpg',
    aspectRatio: '1:1',
    dimensions: '1080 x 1080',
    status: 'approved'
  },
  {
    id: 'asset_7',
    type: 'image',
    title: 'Autonomous AI PMax Engine Core',
    format: 'Square (1:1)',
    url: '/assets/images/ad_ai_optimization_1792475115982.jpg',
    aspectRatio: '1:1',
    dimensions: '1080 x 1080',
    status: 'approved'
  }
];

export const INITIAL_SESSIONS: ChatSession[] = [
  {
    id: 'session_new',
    title: 'New Campaign Strategy',
    agentName: 'AURA',
    lastActive: 'Just now',
    assets: INITIAL_ASSETS,
    activeDraft: INITIAL_CAMPAIGN,
    messages: [
      {
        id: 'msg_1',
        sender: 'aura',
        text: `Hello, I'm Aura.

Think of me as the senior Google Ads director on your team. I build your campaigns, engineer high-converting creatives, and report back in plain business terms.

I focus on Performance Max and Full-Funnel campaigns. That means I can help you orchestrate a complete set of images, video, and copy, ensure every asset meets Google's strict requirements, and hold everything in a paused state for your review.

When you're ready, we can start with your offer, your landing page, or a target CPA/ROAS goal you have in mind.`,
        timestamp: 'Just now',
        campaignDraft: INITIAL_CAMPAIGN,
        suggestedActions: [
          'Connect Google Ads account & audit live performance',
          'Draft Performance Max campaign for my online store',
          'Generate high-converting headlines & image assets',
          'Calculate ideal Target ROAS & daily budget'
        ]
      }
    ]
  },
  {
    id: 'session_sneakers',
    title: 'Cyber Sneaker PMax Launch',
    agentName: 'AURA',
    lastActive: '12m ago',
    assets: INITIAL_ASSETS.slice(0, 4),
    activeDraft: INITIAL_CAMPAIGN,
    messages: [
      {
        id: 'msg_old_1',
        sender: 'aura',
        text: 'Initial creative audit complete: Added 5 responsive search headlines and 4 high-contrast multi-format images. Ad strength is currently Excellent (94%). Ready for your final go-ahead.',
        timestamp: '12m ago'
      }
    ]
  },
  {
    id: 'session_saas',
    title: 'SaaS Free Trial Lead Gen',
    agentName: 'AURA',
    lastActive: '2h ago',
    assets: [],
    messages: [
      {
        id: 'msg_saas_1',
        sender: 'aura',
        text: 'Analyzing B2B search intent. High intent keywords identified: "automated ad manager", "google ads AI copilot". Generating landing page audit.',
        timestamp: '2h ago'
      }
    ]
  }
];

export const CAPABILITIES_DATA = [
  {
    id: 'cap_setup',
    title: 'Your Google Ads, set up in seconds',
    desc: 'Already have a Google Ads account? Link it in 1 click. Need a new one? Aura configures one in your company name with automatic payment card routing.',
    iconName: 'UserCheck'
  },
  {
    id: 'cap_omni',
    title: 'One campaign, all of Google',
    desc: 'A single high-octane campaign reaches buyers across Search, YouTube, Maps, Gmail, Discover, and Display with responsive asset placement.',
    iconName: 'Layers'
  },
  {
    id: 'cap_excellent',
    title: 'Built to "Excellent" Ad Strength',
    desc: 'Google ranks every ad from Poor to Excellent. Aura builds to 94%+ Excellent, which Google certifies drives an average of 6% more conversions.',
    iconName: 'Sparkles'
  },
  {
    id: 'cap_brand',
    title: 'Made from your real business DNA',
    desc: 'Aura reads your real website, scans photos, extracts color tokens and customer reviews, generating only authentic high-converting creative.',
    iconName: 'Scan'
  },
  {
    id: 'cap_quality',
    title: 'Inspects every image & hook first',
    desc: 'A smeared label, low contrast text, or off-brand color? Aura flags it, optimizes resolution, and auto-remakes it before launch.',
    iconName: 'ShieldCheck'
  },
  {
    id: 'cap_approval',
    title: 'You approve the whole plan',
    desc: 'Every image, video, headline, link, and daily budget is laid out transparently in your dashboard. Campaigns always start in a paused review state.',
    iconName: 'CheckCircle2'
  },
  {
    id: 'cap_insights',
    title: 'Numbers with a decisive next move',
    desc: 'Aura sets up conversion tracking with one snippet, then leads every report with clear actions in plain English and your local currency.',
    iconName: 'TrendingUp'
  },
  {
    id: 'cap_autonomous',
    title: 'Stays vigilant after launch',
    desc: 'Aura continuously monitors learning phases, shifts budget from underperforming ad groups to top converters, and shields your spend.',
    iconName: 'RefreshCw'
  }
];

export const USE_CASES_DATA = [
  {
    id: 'search',
    title: 'Be the first result on Search',
    desc: 'When potential customers actively search for what you sell, your ad appears at the very top with compelling copy tailored to high intent.',
    image: '/assets/images/ad_search_mobile_1792474059750.jpg',
    badge: 'High Intent Search'
  },
  {
    id: 'shopping',
    title: 'Dominate Google Shopping feeds',
    desc: 'Showcase your physical products with verified seller badges, pricing, and 5-star ratings right when buyers are ready to checkout.',
    image: '/assets/images/ad_shopping_showcase_1792475114334.jpg',
    badge: 'Direct E-Commerce'
  },
  {
    id: 'youtube',
    title: 'Play on YouTube, even on TV screens',
    desc: 'Aura scripts and generates cinematic video hooks for your product, placing them right before high-retention viewers in your target demographic.',
    image: '/assets/images/ad_youtube_screen_1792474060627.jpg',
    badge: 'TV & Video Ads'
  },
  {
    id: 'shorts',
    title: 'Engage on YouTube Shorts & Reels',
    desc: 'Vertical 9:16 high-energy creative clips that stop scrolling with rhythmic captions and bold 1-click buy buttons.',
    image: '/assets/images/ad_shorts_vertical_1792475115634.jpg',
    badge: 'Vertical Video'
  },
  {
    id: 'display',
    title: 'Command attention on Google Display',
    desc: 'Atmospheric lifestyle banners that retarget visitors across millions of websites and apps with custom typography.',
    image: '/assets/images/ad_display_banner_1792475115328.jpg',
    badge: 'Omni Display'
  },
  {
    id: 'maps',
    title: 'Get discovered nearby on Google Maps',
    desc: 'Your physical store or venue appears with an eye-catching sponsored pin and 1-tap driving directions for customers in your neighborhood.',
    image: '/assets/images/ad_maps_store_1792474060709.jpg',
    badge: 'Local Foot Traffic'
  }
];
