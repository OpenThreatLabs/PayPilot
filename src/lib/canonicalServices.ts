export interface SubscriptionTier {
  name: string;
  amount: string;
  cycle: 'MONTHLY' | 'YEARLY' | 'QUARTERLY';
  features: string;
}

export interface CuratedService {
  name: string;
  vendor: string;
  category: 'PRODUCTIVITY' | 'DEV_TOOLS' | 'AI_AND_ML' | 'CLOUD_INFRA' | 'DESIGN_CREATIVE' | 'STREAMING_MEDIA';
  regionalPlans: {
    INR?: SubscriptionTier[];
    USD?: SubscriptionTier[];
    EUR?: SubscriptionTier[];
    GBP?: SubscriptionTier[];
    [key: string]: SubscriptionTier[] | undefined;
  };
}

export const CANONICAL_SUBSCRIPTION_REGISTRY: CuratedService[] = [
  {
    name: 'Zomato',
    vendor: 'Zomato Ltd',
    category: 'PRODUCTIVITY',
    regionalPlans: {
      INR: [
        { name: 'Zomato Gold (3 Months)', amount: '99', cycle: 'QUARTERLY', features: 'Free delivery up to 10km, VIP dining discounts up to 40%' },
        { name: 'Zomato Gold (Annual)', amount: '299', cycle: 'YEARLY', features: '1-year free delivery across restaurants, peak hours surge waiver' },
      ],
      USD: [
        { name: 'Zomato Gold Pass', amount: '4.99', cycle: 'MONTHLY', features: 'Dining privileges & delivery discounts' },
      ],
    },
  },
  {
    name: 'Swiggy',
    vendor: 'Bundl Technologies (Swiggy)',
    category: 'PRODUCTIVITY',
    regionalPlans: {
      INR: [
        { name: 'Swiggy One (3 Months)', amount: '149', cycle: 'QUARTERLY', features: 'Unlimited free delivery on Food & Instamart' },
        { name: 'Swiggy One (Annual)', amount: '499', cycle: 'YEARLY', features: '1-year free delivery on Food, Instamart & Dineout extra discounts' },
      ],
    },
  },
  {
    name: 'Netflix',
    vendor: 'Netflix Inc',
    category: 'STREAMING_MEDIA',
    regionalPlans: {
      INR: [
        { name: 'Mobile', amount: '149', cycle: 'MONTHLY', features: '480p on 1 mobile phone or tablet' },
        { name: 'Basic', amount: '199', cycle: 'MONTHLY', features: '720p HD on phone, tablet, computer or TV' },
        { name: 'Standard', amount: '499', cycle: 'MONTHLY', features: '1080p Full HD • 2 screens simultaneous' },
        { name: 'Premium 4K', amount: '649', cycle: 'MONTHLY', features: '4K Ultra HD + HDR, spatial audio, 4 screens' },
      ],
      USD: [
        { name: 'Standard with Ads', amount: '6.99', cycle: 'MONTHLY', features: '1080p Full HD • 2 devices' },
        { name: 'Standard (Ad-free)', amount: '15.49', cycle: 'MONTHLY', features: '1080p Full HD • Ad-free • 2 devices' },
        { name: 'Premium 4K Ultra HD', amount: '22.99', cycle: 'MONTHLY', features: '4K Ultra HD + HDR • Spatial Audio • 4 devices' },
      ],
      GBP: [
        { name: 'Standard with Ads', amount: '4.99', cycle: 'MONTHLY', features: '1080p Full HD' },
        { name: 'Standard', amount: '10.99', cycle: 'MONTHLY', features: '1080p Full HD • Ad-free' },
        { name: 'Premium 4K', amount: '17.99', cycle: 'MONTHLY', features: '4K Ultra HD + HDR' },
      ],
      EUR: [
        { name: 'Standard with Ads', amount: '5.99', cycle: 'MONTHLY', features: '1080p Full HD' },
        { name: 'Standard', amount: '13.99', cycle: 'MONTHLY', features: '1080p Full HD' },
        { name: 'Premium 4K', amount: '19.99', cycle: 'MONTHLY', features: '4K Ultra HD + HDR' },
      ],
    },
  },
  {
    name: 'Spotify',
    vendor: 'Spotify AB',
    category: 'STREAMING_MEDIA',
    regionalPlans: {
      INR: [
        { name: 'Student', amount: '59', cycle: 'MONTHLY', features: 'Discount for eligible college students' },
        { name: 'Individual', amount: '119', cycle: 'MONTHLY', features: '1 ad-free account • offline downloads' },
        { name: 'Duo', amount: '149', cycle: 'MONTHLY', features: '2 Premium accounts for couples living together' },
        { name: 'Family', amount: '179', cycle: 'MONTHLY', features: 'Up to 6 family accounts • Spotify Kids' },
      ],
      USD: [
        { name: 'Student Plan', amount: '5.99', cycle: 'MONTHLY', features: '1 account • Verified student discount' },
        { name: 'Individual Plan', amount: '11.99', cycle: 'MONTHLY', features: '1 ad-free account • Offline downloads' },
        { name: 'Duo (2 Accounts)', amount: '16.99', cycle: 'MONTHLY', features: '2 Premium accounts for couples under one roof' },
        { name: 'Family Plan', amount: '19.99', cycle: 'MONTHLY', features: 'Up to 6 accounts • Family mix & explicit block' },
      ],
      GBP: [
        { name: 'Individual', amount: '11.99', cycle: 'MONTHLY', features: '1 ad-free account' },
        { name: 'Duo', amount: '16.99', cycle: 'MONTHLY', features: '2 accounts' },
        { name: 'Family', amount: '19.99', cycle: 'MONTHLY', features: 'Up to 6 accounts' },
      ],
    },
  },
  {
    name: 'YouTube',
    vendor: 'Google LLC',
    category: 'STREAMING_MEDIA',
    regionalPlans: {
      INR: [
        { name: 'Student', amount: '89', cycle: 'MONTHLY', features: 'Ad-free videos, background play, YouTube Music' },
        { name: 'Individual', amount: '149', cycle: 'MONTHLY', features: 'Ad-free playback, background play & offline downloads' },
        { name: 'Family Plan', amount: '299', cycle: 'MONTHLY', features: 'Up to 5 family members (ages 13+) in household' },
        { name: 'Annual Individual', amount: '1490', cycle: 'YEARLY', features: 'Prepaid annual commitment discount' },
      ],
      USD: [
        { name: 'Individual Premium', amount: '13.99', cycle: 'MONTHLY', features: 'Ad-free playback, offline downloads, YouTube Music' },
        { name: 'Family Premium', amount: '22.99', cycle: 'MONTHLY', features: 'Up to 5 family members (ages 13+) in household' },
        { name: 'Student Premium', amount: '7.99', cycle: 'MONTHLY', features: 'Verified college student rate' },
        { name: 'Annual Individual', amount: '139.99', cycle: 'YEARLY', features: 'Prepaid 12-month access' },
      ],
    },
  },
  {
    name: 'Canva',
    vendor: 'Canva Pty Ltd',
    category: 'DESIGN_CREATIVE',
    regionalPlans: {
      INR: [
        { name: 'Canva Pro', amount: '499', cycle: 'MONTHLY', features: '100M+ stock assets, Brand Kit, Magic Studio AI tools' },
        { name: 'Canva Pro (Annual)', amount: '3999', cycle: 'YEARLY', features: 'Prepaid 1-year Pro commitment with 33% discount' },
        { name: 'Canva for Teams', amount: '998', cycle: 'MONTHLY', features: 'Team workflows, shared asset controls, approval chains' },
      ],
      USD: [
        { name: 'Canva Pro', amount: '14.99', cycle: 'MONTHLY', features: '100M+ premium assets, Brand Kit, Magic Studio' },
        { name: 'Canva Pro (Annual)', amount: '119.99', cycle: 'YEARLY', features: 'Prepaid 1-year Pro commitment' },
        { name: 'Canva for Teams', amount: '29.99', cycle: 'MONTHLY', features: 'Team collaboration, first 5 members included' },
      ],
      EUR: [
        { name: 'Canva Pro', amount: '11.99', cycle: 'MONTHLY', features: '100M+ premium assets, Brand Kit' },
        { name: 'Canva Pro (Annual)', amount: '109.99', cycle: 'YEARLY', features: 'Prepaid 1-year commitment' },
      ],
    },
  },
  {
    name: 'ChatGPT',
    vendor: 'OpenAI',
    category: 'AI_AND_ML',
    regionalPlans: {
      INR: [
        { name: 'ChatGPT Plus', amount: '1999', cycle: 'MONTHLY', features: 'GPT-4o, DALL-E, Voice Mode, Advanced Data Analysis' },
        { name: 'ChatGPT Pro', amount: '19999', cycle: 'MONTHLY', features: 'Unlimited o1 reasoning model, deep research mode' },
        { name: 'Team Workspace', amount: '2499', cycle: 'MONTHLY', features: 'Per user/month billed annually • Admin workspace' },
      ],
      USD: [
        { name: 'ChatGPT Plus', amount: '20.00', cycle: 'MONTHLY', features: 'GPT-4o, DALL-E, Voice Mode, Advanced Data Analysis' },
        { name: 'ChatGPT Pro', amount: '200.00', cycle: 'MONTHLY', features: 'Unlimited o1, o1-pro mode, deep research reasoning' },
        { name: 'Team Workspace', amount: '25.00', cycle: 'MONTHLY', features: 'Per seat billed annually • Admin console & workspace' },
      ],
    },
  },
  {
    name: 'Claude',
    vendor: 'Anthropic',
    category: 'AI_AND_ML',
    regionalPlans: {
      INR: [
        { name: 'Claude Pro', amount: '1999', cycle: 'MONTHLY', features: 'Claude 3.5 Sonnet, Projects, 5x standard usage limits' },
        { name: 'Claude Team', amount: '2499', cycle: 'MONTHLY', features: 'Per seat • Minimum 5 users • Admin workspace' },
      ],
      USD: [
        { name: 'Claude Pro', amount: '20.00', cycle: 'MONTHLY', features: 'Claude 3.5 Sonnet, Projects, 5x usage limits' },
        { name: 'Claude Team', amount: '25.00', cycle: 'MONTHLY', features: 'Per user • Minimum 5 seats • Early feature access' },
      ],
    },
  },
  {
    name: 'Cursor',
    vendor: 'Anysphere Inc',
    category: 'DEV_TOOLS',
    regionalPlans: {
      INR: [
        { name: 'Cursor Pro', amount: '1750', cycle: 'MONTHLY', features: '500 fast requests/mo, unlimited slow requests, Cursor Tab' },
        { name: 'Cursor Business', amount: '3500', cycle: 'MONTHLY', features: 'Enforced privacy mode, centralized admin, SAML/SSO' },
      ],
      USD: [
        { name: 'Cursor Pro', amount: '20.00', cycle: 'MONTHLY', features: '500 fast requests/mo, unlimited slow requests, Cursor Tab' },
        { name: 'Cursor Business', amount: '40.00', cycle: 'MONTHLY', features: 'Enforced privacy mode, centralized admin, SAML/SSO' },
      ],
    },
  },
  {
    name: 'GitHub Copilot',
    vendor: 'Microsoft / GitHub',
    category: 'DEV_TOOLS',
    regionalPlans: {
      INR: [
        { name: 'Individual', amount: '850', cycle: 'MONTHLY', features: 'Code completions, CLI assistance, multi-editor support' },
        { name: 'Business Seat', amount: '1600', cycle: 'MONTHLY', features: 'Organization management, policy controls, enterprise proxy' },
      ],
      USD: [
        { name: 'Individual', amount: '10.00', cycle: 'MONTHLY', features: 'Code completions, CLI assistance, multi-editor support' },
        { name: 'Business Seat', amount: '19.00', cycle: 'MONTHLY', features: 'Organization management, policy controls, enterprise proxy' },
        { name: 'Enterprise Plan', amount: '39.00', cycle: 'MONTHLY', features: 'Custom fine-tuned models, PR summaries, Bing web search' },
      ],
    },
  },
  {
    name: 'Disney+ Hotstar',
    vendor: 'The Walt Disney Company / JioStar',
    category: 'STREAMING_MEDIA',
    regionalPlans: {
      INR: [
        { name: 'Super (With Ads)', amount: '899', cycle: 'YEARLY', features: 'Full HD 1080p, 2 devices, full library with ads' },
        { name: 'Premium Monthly', amount: '299', cycle: 'MONTHLY', features: '4K Ultra HD, Dolby 5.1, 4 devices, ad-free' },
        { name: 'Premium Annual', amount: '1499', cycle: 'YEARLY', features: '4K Ultra HD, Dolby 5.1, 4 devices, 1-year commitment' },
      ],
    },
  },
  {
    name: 'Amazon Prime',
    vendor: 'Amazon',
    category: 'STREAMING_MEDIA',
    regionalPlans: {
      INR: [
        { name: 'Prime Monthly', amount: '299', cycle: 'MONTHLY', features: 'Prime Video, free 1-day delivery, Prime Music' },
        { name: 'Prime Annual', amount: '1499', cycle: 'YEARLY', features: '1-year all Prime benefits, fast delivery, video & music' },
        { name: 'Prime Lite', amount: '799', cycle: 'YEARLY', features: 'Free 2-day delivery, Prime Video on mobile/TV with ads' },
      ],
      USD: [
        { name: 'Prime Video Only', amount: '8.99', cycle: 'MONTHLY', features: 'Prime Video streaming with limited ads' },
        { name: 'Amazon Prime Monthly', amount: '14.99', cycle: 'MONTHLY', features: 'Full Amazon Prime, shipping, video & music' },
        { name: 'Amazon Prime Annual', amount: '139.00', cycle: 'YEARLY', features: 'Prepaid 1-year Prime commitment' },
      ],
    },
  },
  {
    name: 'Apple One',
    vendor: 'Apple Inc',
    category: 'STREAMING_MEDIA',
    regionalPlans: {
      INR: [
        { name: 'Individual', amount: '195', cycle: 'MONTHLY', features: 'Apple Music, TV+, Arcade, 50GB iCloud+' },
        { name: 'Family', amount: '365', cycle: 'MONTHLY', features: 'Share with up to 5 people • 200GB iCloud+' },
      ],
      USD: [
        { name: 'Individual', amount: '19.95', cycle: 'MONTHLY', features: 'Apple Music, TV+, Arcade, 50GB iCloud+' },
        { name: 'Family', amount: '25.95', cycle: 'MONTHLY', features: 'Share with up to 5 people • 200GB iCloud+' },
        { name: 'Premier', amount: '37.95', cycle: 'MONTHLY', features: 'Includes News+, Fitness+, and 2TB iCloud+' },
      ],
    },
  },
  {
    name: 'Notion',
    vendor: 'Notion Labs',
    category: 'PRODUCTIVITY',
    regionalPlans: {
      USD: [
        { name: 'Plus Plan', amount: '10.00', cycle: 'MONTHLY', features: 'Unlimited blocks, file uploads, 100 guests' },
        { name: 'Plus + Notion AI', amount: '20.00', cycle: 'MONTHLY', features: 'Unlimited AI Q&A, autofill, translation in docs' },
        { name: 'Business Plan', amount: '18.00', cycle: 'MONTHLY', features: 'SAML SSO, private teamspaces, 250 guests' },
      ],
      INR: [
        { name: 'Plus Plan', amount: '850', cycle: 'MONTHLY', features: 'Unlimited blocks, file uploads, 100 guests' },
        { name: 'Plus + Notion AI', amount: '1700', cycle: 'MONTHLY', features: 'Unlimited AI Q&A, autofill, translation in docs' },
      ],
    },
  },
  {
    name: 'Figma',
    vendor: 'Figma Inc',
    category: 'DESIGN_CREATIVE',
    regionalPlans: {
      USD: [
        { name: 'Professional Seat', amount: '15.00', cycle: 'MONTHLY', features: 'Unlimited files, team libraries, Dev Mode access' },
        { name: 'Organization Seat', amount: '45.00', cycle: 'MONTHLY', features: 'Design system analytics, private plugins, SSO' },
      ],
      INR: [
        { name: 'Professional Seat', amount: '1300', cycle: 'MONTHLY', features: 'Unlimited files, team libraries, Dev Mode access' },
      ],
    },
  },
  {
    name: 'Midjourney',
    vendor: 'Midjourney Inc',
    category: 'AI_AND_ML',
    regionalPlans: {
      USD: [
        { name: 'Basic Plan', amount: '10.00', cycle: 'MONTHLY', features: '3.3 hr/mo Fast GPU time, commercial terms' },
        { name: 'Standard Plan', amount: '30.00', cycle: 'MONTHLY', features: '15 hr/mo Fast GPU, unlimited Relax generations' },
        { name: 'Pro Plan', amount: '60.00', cycle: 'MONTHLY', features: '30 hr/mo Fast GPU, Stealth generation mode' },
      ],
      INR: [
        { name: 'Basic Plan', amount: '850', cycle: 'MONTHLY', features: '3.3 hr/mo Fast GPU time, commercial terms' },
        { name: 'Standard Plan', amount: '2550', cycle: 'MONTHLY', features: '15 hr/mo Fast GPU, unlimited Relax generations' },
      ],
    },
  },
  {
    name: 'Slack',
    vendor: 'Salesforce',
    category: 'PRODUCTIVITY',
    regionalPlans: {
      USD: [
        { name: 'Pro', amount: '8.75', cycle: 'MONTHLY', features: 'Unlimited message history, apps, canvas' },
        { name: 'Business+', amount: '15.00', cycle: 'MONTHLY', features: 'SAML SSO, 99.99% uptime, compliance exports' },
      ],
      INR: [
        { name: 'Pro', amount: '720', cycle: 'MONTHLY', features: 'Unlimited message history, apps, canvas' },
        { name: 'Business+', amount: '1250', cycle: 'MONTHLY', features: 'SAML SSO, 99.99% uptime, compliance exports' },
      ],
    },
  },
  {
    name: 'Vercel',
    vendor: 'Vercel Inc',
    category: 'CLOUD_INFRA',
    regionalPlans: {
      USD: [
        { name: 'Pro Seat', amount: '20.00', cycle: 'MONTHLY', features: 'Per member/mo • 1TB bandwidth • Preview comments' },
        { name: 'Enterprise', amount: '150.00', cycle: 'MONTHLY', features: 'Custom limits, 99.99% SLA, compute credits' },
      ],
      INR: [
        { name: 'Pro Seat', amount: '1700', cycle: 'MONTHLY', features: 'Per member/mo • 1TB bandwidth • Preview comments' },
      ],
    },
  },
];
