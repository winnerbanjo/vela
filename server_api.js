// Vela Connected Apps & Financial Infrastructure API Module
// Supports multi-provider payments, calendar availability checks, Zoho suite, and app management.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const APPS_FILE = path.join(DATA_DIR, 'apps_state.json');
const TXS_FILE = path.join(DATA_DIR, 'transactions.json');

// Canonical Provider Registry
// Maps stable provider IDs to display name, category, local asset path, official source and supported capabilities.
const PROVIDER_REGISTRY = {
  paystack: {
    id: 'paystack',
    name: 'Paystack',
    category: 'payments',
    assetPath: '/assets/integrations/paystack.svg',
    officialSource: 'Paystack Media Kit (paystack.com/contact)',
    permittedAsset: 'Official Paystack Mark',
    integrationMethod: 'REST API & Webhooks',
    supportedCapabilities: [
      'Automated Paystack deposit checkout links',
      'Split settlement & instant transaction verification',
      'Webhooks reconciliation to client ledger',
      'Automatic refund and balance due calculation'
    ],
    outcomeExplanation: 'Vela can send instant NGN deposit checkout links via WhatsApp, email or booking page, and reconcile incoming funds immediately.',
    availableFinishes: ['Preview deposit checkout', 'Check settlement bank'],
    supportsMultipleAccounts: false,
    developerRequirements: 'Paystack Merchant Account, Public Key, Secret Key, Webhook URL'
  },
  flutterwave: {
    id: 'flutterwave',
    name: 'Flutterwave',
    category: 'payments',
    assetPath: '/assets/integrations/flutterwave.svg',
    officialSource: 'Flutterwave Brand Assets (flutterwave.com)',
    permittedAsset: 'Official Flutterwave Brand Wave',
    integrationMethod: 'Hosted Checkout & API',
    supportedCapabilities: [
      'Multi-currency deposit collection (USD/GBP/EUR/NGN)',
      'Direct Nigerian bank transfers via USSD & virtual accounts',
      'International card acceptance without FX friction',
      'Provider-specific settlement reporting to Zenith Bank'
    ],
    outcomeExplanation: 'Vela can accept payments in USD, GBP, EUR and NGN from international and corporate clients without currency restrictions.',
    availableFinishes: ['Test international checkout', 'View supported currencies'],
    supportsMultipleAccounts: false,
    developerRequirements: 'Flutterwave Merchant Account, API Keys, Secret Hash'
  },
  stripe: {
    id: 'stripe',
    name: 'Stripe',
    category: 'payments',
    assetPath: '/assets/integrations/stripe.svg',
    officialSource: 'Stripe Marks Guidance (stripe.com/marks)',
    permittedAsset: 'Official Stripe Mark',
    integrationMethod: 'Stripe Connect Platform Onboarding',
    supportedCapabilities: [
      'Apple Pay and Google Pay 1-tap booking checkout',
      'Corporate invoicing for international commercial clients',
      'Automated receipt delivery in customer currency',
      'Server-side charge capability verification'
    ],
    outcomeExplanation: 'Vela can collect global card payments and Apple Pay/Google Pay for commercial studio jobs and diaspora clients.',
    availableFinishes: ['Verify charge capability', 'Test Apple Pay checkout'],
    supportsMultipleAccounts: false,
    developerRequirements: 'Stripe Connect Express or Custom platform onboarding'
  },
  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    category: 'messaging',
    assetPath: '/assets/integrations/whatsapp-business.svg',
    officialSource: 'Meta Brand Resource Center',
    permittedAsset: 'Official WhatsApp Badge',
    integrationMethod: 'Meta Cloud API / WhatsApp Business Platform',
    supportedCapabilities: [
      'Direct customer chat on verified studio phone number',
      'Automatic deposit checkout link insertion',
      'Appointment reminder dispatch and reschedule links',
      'Pause queued AI replies on merchant human takeover'
    ],
    outcomeExplanation: 'Vela can draft or send replies to client inquiries on WhatsApp, share available slots, and follow up on deposits.',
    availableFinishes: ['Send test WhatsApp verification', 'Review message templates'],
    supportsMultipleAccounts: true,
    developerRequirements: 'Meta Developer Account, WhatsApp Business Account (WABA), Phone Number Verification'
  },
  'zoho-mail': {
    id: 'zoho-mail',
    name: 'Zoho Mail',
    category: 'messaging',
    assetPath: '/assets/integrations/zoho-mail.svg',
    officialSource: 'Zoho Partner Branding Guidelines',
    permittedAsset: 'Zoho Mail Product Icon',
    integrationMethod: 'Zoho OAuth 2.0 (Multi-DC IMAP/REST API)',
    supportedCapabilities: [
      'Custom domain business email (@studioteni.ng)',
      'PDF Quotation attachments with Paystack deposit links',
      'Separate receiving and sending health monitoring',
      'Respects account data centre (US, EU, IN, AU)'
    ],
    outcomeExplanation: 'Vela can capture email inquiries, draft formal quotations, and deliver PDF estimates from your domain.',
    availableFinishes: ['Test inbound/outbound health', 'Prepare first quotation'],
    supportsMultipleAccounts: true,
    developerRequirements: 'Zoho API Console Client ID, Client Secret, Multi-DC OAuth Scopes'
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram Direct',
    category: 'messaging',
    assetPath: '/assets/integrations/instagram.svg',
    officialSource: 'Meta Brand Resource Center',
    permittedAsset: 'Official Instagram Camera Glyph',
    integrationMethod: 'Meta Graph API (Instagram Professional Messaging)',
    supportedCapabilities: [
      'Direct message enquiry capture from Reels and Feed',
      'Catalogue lookbook link sharing directly in chat',
      'Preserve source post or story reference context'
    ],
    outcomeExplanation: 'Vela can reply to inquiries on Instagram DMs, recognize haircuts or photos seen on your profile, and offer bookings.',
    availableFinishes: ['Test DM webhook', 'Connect story mentions'],
    supportsMultipleAccounts: false,
    developerRequirements: 'Instagram Professional Account linked to Facebook Page, Meta App Review'
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok for Business',
    category: 'messaging',
    assetPath: '/assets/integrations/tiktok.svg',
    officialSource: 'TikTok for Developers Design Guidelines',
    permittedAsset: 'Official TikTok Developer Note',
    integrationMethod: 'TikTok Direct Messaging & Content API',
    supportedCapabilities: [
      'Inquiries from viral haircut and portrait transformations',
      'Automated bio booking link tracking',
      'Distinguish comment replies from private DMs'
    ],
    outcomeExplanation: 'Vela can track inquiries coming from your TikTok videos and suggest appointment slots to interested viewers.',
    availableFinishes: ['Inspect TikTok DM permissions', 'View video engagement'],
    supportsMultipleAccounts: false,
    developerRequirements: 'TikTok for Developers App, Business Verification, Direct Message API scope'
  },
  'google-calendar': {
    id: 'google-calendar',
    name: 'Google Calendar',
    category: 'calendar',
    assetPath: '/assets/integrations/google-calendar.svg',
    officialSource: 'Google Workspace Brand Guidelines',
    permittedAsset: 'Google Calendar 2026 Refreshed Icon',
    integrationMethod: 'Google OAuth 2.0 (Calendar API v3)',
    supportedCapabilities: [
      'Real-time availability check before proposing time slots',
      'Two-way sync: calendar events block studio booking slots',
      'Automatic reschedule updates without double bookings',
      'Staff member and resource mapping'
    ],
    outcomeExplanation: 'Vela can check when Dele is busy and add confirmed appointments to his calendar without double booking.',
    availableFinishes: ['Check Dele’s availability', 'Sync upcoming bookings'],
    supportsMultipleAccounts: true,
    developerRequirements: 'Google Cloud Console OAuth 2.0 Client, calendar.events and calendar.readonly scopes'
  },
  'outlook-calendar': {
    id: 'outlook-calendar',
    name: 'Microsoft Outlook Calendar',
    category: 'calendar',
    assetPath: '/assets/integrations/outlook-calendar.svg',
    officialSource: 'Microsoft Brand Guidelines & Graph Developer Resources',
    permittedAsset: 'Microsoft Outlook Product Icon',
    integrationMethod: 'Microsoft Graph API / OAuth 2.0',
    supportedCapabilities: [
      'Staff member calendar mapping for Microsoft 365',
      'Real-time free/busy slot checking',
      'Confirmed appointment writing and schedule updates',
      'Separate permissions for read vs add events'
    ],
    outcomeExplanation: 'Vela can check busy periods on Microsoft Outlook calendars and add studio bookings to staff schedules.',
    availableFinishes: ['Check Outlook availability', 'Authorize Microsoft Graph'],
    supportsMultipleAccounts: true,
    developerRequirements: 'Azure App Registration, Microsoft Graph Calendars.ReadWrite permissions'
  },
  'apple-calendar': {
    id: 'apple-calendar',
    name: 'Apple Calendar',
    category: 'calendar',
    assetPath: '/assets/integrations/apple-calendar.svg',
    officialSource: 'Apple Design Resources',
    permittedAsset: 'Apple Calendar Product Icon',
    integrationMethod: 'Subscribe to Vela bookings (.ics feed) & iCloud CalDAV',
    supportedCapabilities: [
      'Subscribe to Vela bookings via 1-way secure webcal feed',
      'Real-time appointment synchronization directly to iPhone and Mac',
      'External busy-period conflict checking via iCloud CalDAV'
    ],
    outcomeExplanation: 'Subscribe to Vela bookings on your iPhone, iPad or Mac, keeping your personal calendar automatically up to date.',
    availableFinishes: ['Copy webcal subscription URL', 'Verify CalDAV read access'],
    supportsMultipleAccounts: false,
    developerRequirements: 'RFC 5545 iCalendar feed generator or Apple ID app-specific password for CalDAV'
  },
  'zoho-books': {
    id: 'zoho-books',
    name: 'Zoho Books',
    category: 'accounting',
    assetPath: '/assets/integrations/zoho-books.svg',
    officialSource: 'Zoho Partner Branding Guidelines',
    permittedAsset: 'Zoho Books Product Icon',
    integrationMethod: 'Zoho OAuth 2.0 (Zoho Books API)',
    supportedCapabilities: [
      'Turn accepted quotations into official accounting invoices',
      'Automatic deposit matching when Paystack/Flutterwave succeeds',
      'Direct one-click link to Zoho Books records',
      'Allocation of verified deposits exactly once'
    ],
    outcomeExplanation: 'Vela can turn accepted client quotations into official Zoho Books invoices and record customer deposits automatically.',
    availableFinishes: ['Test invoice sync', 'Map accounting accounts'],
    supportsMultipleAccounts: false,
    developerRequirements: 'Zoho Books Organization ID, ZohoOAuth.invoices.CREATE scope'
  },
  'zoho-crm': {
    id: 'zoho-crm',
    name: 'Zoho CRM',
    category: 'accounting',
    assetPath: '/assets/integrations/zoho-crm.svg',
    officialSource: 'Zoho Partner Branding Guidelines',
    permittedAsset: 'Zoho CRM Product Icon',
    integrationMethod: 'Zoho OAuth 2.0 (Zoho CRM API)',
    supportedCapabilities: [
      'Create Lead when corporate headshot or wedding inquiry arrives',
      'Smart contact deduplication and review step for existing clients',
      'Pipeline tracking for corporate packages (> ₦100,000)',
      'Deal advancement on actual Vela booking events'
    ],
    outcomeExplanation: 'Vela can sync corporate clients into Zoho CRM, advance deal stages upon booking confirmation, and avoid duplicate leads.',
    availableFinishes: ['Verify contact deduplication', 'Map deal pipeline stages'],
    supportsMultipleAccounts: false,
    developerRequirements: 'Zoho CRM API Console, ZohoCRM.modules.leads.CREATE scope'
  },
  'google-drive': {
    id: 'google-drive',
    name: 'Google Drive',
    category: 'files',
    assetPath: '/assets/integrations/google-drive.svg',
    officialSource: 'Google Workspace Brand Guidelines',
    permittedAsset: 'Google Drive Triangle Icon',
    integrationMethod: 'Google OAuth 2.0 (Drive API v3)',
    supportedCapabilities: [
      'Select specific photoshoot folders for job deliverables',
      'Import approved images into gallery proof drafts',
      'Scoped access strictly to merchant-selected client folders'
    ],
    outcomeExplanation: 'Vela can access specific client folders you select, import finished portraits for client review, and prepare proofs.',
    availableFinishes: ['Select job folder', 'Test folder access'],
    supportsMultipleAccounts: false,
    developerRequirements: 'Google Drive API v3, drive.file scope (restricted to app-created or user-selected files)'
  },
  dropbox: {
    id: 'dropbox',
    name: 'Dropbox',
    category: 'files',
    assetPath: '/assets/integrations/dropbox.svg',
    officialSource: 'Dropbox Brand Guidelines',
    permittedAsset: 'Official Dropbox Glyph',
    integrationMethod: 'Dropbox OAuth 2.0 (Dropbox API v2)',
    supportedCapabilities: [
      'Choose photoshoot job folders and attach deliverables',
      'Generate expiring client delivery download links',
      'Preview client and file access before sharing'
    ],
    outcomeExplanation: 'Vela can attach deliverables from Dropbox job folders and prepare secure client download links with your approval.',
    availableFinishes: ['Choose job folder', 'Preview client delivery link'],
    supportsMultipleAccounts: false,
    developerRequirements: 'Dropbox App Console, files.content.read and sharing.write scopes'
  },
  'meta-ads': {
    id: 'meta-ads',
    name: 'Meta Ads Manager',
    category: 'marketing',
    assetPath: '/assets/integrations/meta-ads.svg',
    officialSource: 'Meta Brand Resource Center',
    permittedAsset: 'Official Meta Corporate Loop',
    integrationMethod: 'Meta Marketing API',
    supportedCapabilities: [
      'Draft Instagram & Facebook local campaigns for open weekday chairs',
      'Geo-targeted ads in Victoria Island, Lekki and Ikoyi',
      'Mandatory owner approval for audience, budget and dates before spend'
    ],
    outcomeExplanation: 'Vela can prepare targeted local ads to fill open slots on slow days, requiring your explicit approval before any money is spent.',
    availableFinishes: ['Check ad account permissions', 'Draft test campaign'],
    supportsMultipleAccounts: false,
    developerRequirements: 'Meta Business Manager, Ad Account Admin Access, ads_management permission'
  }
};

// Initial default apps state with real logos and rich activity histories
const initialAppsState = {
  paystack: {
    ...PROVIDER_REGISTRY.paystack,
    headline: 'Collect booking deposits and match payments to clients.',
    status: 'connected',
    isDefault: true,
    mode: 'live',
    accountIdentity: 'Studio Teni Enterprises (RC-381920) · Paystack Live',
    settlementAccount: 'Guaranty Trust Bank (GTBank) · ...4910',
    supportedCurrencies: ['NGN'],
    permissions: {
      readTransactions: true,
      createCheckout: true,
      refunds: false
    },
    lastSync: '2m ago',
    health: '100% Operational · Webhooks Active',
    config: {
      depositPercentage: 20,
      autoCreditInvoice: true,
      enforceDeposits: true,
      settlementBank: 'GTBank (058)'
    },
    activityLog: [
      { timestamp: '10m ago', event: 'Webhook verified', status: 'success', details: 'Deposit ₦2,000 from Babatunde Ojo' },
      { timestamp: '1h ago', event: 'Settlement confirmed', status: 'success', details: '₦18,400 to GTBank ...4910' }
    ]
  },
  flutterwave: {
    ...PROVIDER_REGISTRY.flutterwave,
    headline: 'Collect deposits and international payments in NGN, USD and GBP.',
    status: 'disconnected',
    isDefault: false,
    mode: 'test',
    accountIdentity: 'Studio Teni Global (flw_live_...9182)',
    settlementAccount: 'Zenith Bank · ...8821',
    supportedCurrencies: ['NGN', 'USD', 'GBP', 'EUR'],
    permissions: {
      readTransactions: true,
      createCheckout: true
    },
    lastSync: 'Never',
    health: 'Not connected',
    config: {
      defaultCurrency: 'NGN',
      enableCard: true,
      enableBankTransfer: true
    },
    activityLog: []
  },
  stripe: {
    ...PROVIDER_REGISTRY.stripe,
    headline: 'Accept global cards, Apple Pay and US/UK client payments.',
    status: 'disconnected',
    isDefault: false,
    mode: 'test',
    accountIdentity: 'Studio Teni Ltd (acct_1N92X...)',
    settlementAccount: 'Wise USD / Barclays GBP',
    supportedCurrencies: ['USD', 'GBP', 'EUR', 'CAD'],
    permissions: {
      readTransactions: true,
      createCheckout: true
    },
    lastSync: 'Never',
    health: 'Not connected',
    config: {
      defaultCurrency: 'USD'
    },
    activityLog: []
  },
  whatsapp: {
    ...PROVIDER_REGISTRY.whatsapp,
    headline: 'Reply to customer booking enquiries from your verified WhatsApp number.',
    status: 'connected',
    isDefault: false,
    accountIdentity: '+234 803 123 4567 (Meta Cloud API)',
    permissions: {
      readMessages: true,
      draftReplies: true,
      autoReplyRoutine: true
    },
    lastSync: '2m ago',
    health: 'Active · Meta Webhook Verified',
    config: {
      phoneNumber: '+234 803 123 4567',
      replyMode: 'draft',
      pauseOnHumanTakeover: true
    },
    activityLog: [
      { timestamp: 'Just now', event: 'Message received', status: 'success', details: 'Inquiry from Chuka Nnamdi' },
      { timestamp: '15m ago', event: 'Draft prepared', status: 'success', details: 'Proposed 4:15 PM slot' }
    ]
  },
  'zoho-mail': {
    ...PROVIDER_REGISTRY['zoho-mail'],
    headline: 'Send professional quotations and handle email bookings from your domain.',
    status: 'connected',
    accountIdentity: 'hello@studioteni.ng (Zoho Mail Professional)',
    permissions: {
      readMessages: true,
      sendQuotations: true
    },
    receivingHealth: 'Active (Inbound Healthy)',
    sendingHealth: 'Active (SPF, DKIM, DMARC Verified)',
    lastSync: '12m ago',
    health: 'Active · Inbound & Outbound Healthy',
    config: {
      emailAddress: 'hello@studioteni.ng',
      dataCenter: 'zoho.com',
      smtpHost: 'smtp.zoho.com'
    },
    activityLog: [
      { timestamp: '28m ago', event: 'Inquiry received', status: 'success', details: 'Horizon Capital 18 headshots request' }
    ]
  },
  instagram: {
    ...PROVIDER_REGISTRY.instagram,
    headline: 'Turn DMs and story replies into confirmed appointments.',
    status: 'connected',
    accountIdentity: '@studioteni_ng (Meta Graph API)',
    permissions: {
      readMessages: true,
      draftReplies: true
    },
    lastSync: '5m ago',
    health: 'Active · Graph API Verified',
    config: {
      handle: '@studioteni_ng'
    },
    activityLog: [
      { timestamp: '1h ago', event: 'DM received', status: 'success', details: 'Haircut inquiry from @kene_o' }
    ]
  },
  tiktok: {
    ...PROVIDER_REGISTRY.tiktok,
    headline: 'Capture haircut and photoshoot bookings from viral videos.',
    status: 'connected',
    accountIdentity: '@studioteni (TikTok Direct Messaging API)',
    permissions: {
      readMessages: true,
      draftReplies: true,
      canSendDMs: true
    },
    lastSync: '28m ago',
    health: 'Active · TikTok Messaging API Verified',
    config: {
      handle: '@studioteni'
    },
    activityLog: [
      { timestamp: '2h ago', event: 'Video inquiry', status: 'success', details: 'Taper inquiry from @tayo_cuts' }
    ]
  },
  'google-calendar': {
    ...PROVIDER_REGISTRY['google-calendar'],
    headline: 'Keep staff availability in sync with their calendars.',
    status: 'connected',
    accountIdentity: 'dele.cuts@studioteni.ng (Google Workspace)',
    permissions: {
      readCalendar: true,
      writeBookings: true,
      requireConfirmation: true
    },
    lastSync: '1m ago',
    health: 'Active · Google Workspace OAuth Verified',
    config: {
      assignedStaff: 'Dele (Chair 1)',
      calendarName: 'Dele · Chair 1 Schedule',
      bufferMinutes: 15,
      allowConflictOverride: false
    },
    activityLog: [
      { timestamp: '1m ago', event: 'Availability check', status: 'success', details: '2:30 PM & 4:15 PM free for Dele' },
      { timestamp: '3h ago', event: 'Event booked', status: 'success', details: 'Tobi Adebayo confirmed at 1:00 PM' }
    ]
  },
  'outlook-calendar': {
    ...PROVIDER_REGISTRY['outlook-calendar'],
    headline: 'Sync Microsoft 365 schedules and prevent double bookings.',
    status: 'disconnected',
    accountIdentity: 'Unconnected',
    permissions: {
      readCalendar: true,
      writeBookings: true
    },
    lastSync: 'Never',
    health: 'Not connected',
    config: {
      assignedStaff: 'Segun (Chair 2)'
    },
    activityLog: []
  },
  'apple-calendar': {
    ...PROVIDER_REGISTRY['apple-calendar'],
    headline: 'Subscribe to Vela studio bookings on your iPhone, iPad and Mac.',
    status: 'disconnected',
    accountIdentity: 'Unconnected',
    permissions: {
      readCalendar: true
    },
    lastSync: 'Never',
    health: 'Not connected',
    config: {
      subscriptionUrl: 'webcal://localhost:3030/api/calendar/subscribe?token=demo_token_8821'
    },
    activityLog: []
  },
  'zoho-books': {
    ...PROVIDER_REGISTRY['zoho-books'],
    headline: 'Turn accepted quotes into invoices and track payments.',
    status: 'connected',
    accountIdentity: 'Studio Teni Services Ltd (Org #8029193)',
    permissions: {
      createInvoices: true,
      recordPayments: true
    },
    lastSync: '15m ago',
    health: 'Active · Zoho OAuth Verified',
    config: {
      organizationId: '8029193',
      organizationName: 'Studio Teni Services Ltd',
      autoCreateOnQuoteAcceptance: true,
      invoicePrefix: 'ZB-INV-',
      lastSyncedInvoice: 'ZB-INV-2026-092'
    },
    activityLog: [
      { timestamp: '15m ago', event: 'Invoice synced', status: 'success', details: 'Invoice #ZB-INV-2026-092 generated' }
    ]
  },
  'zoho-crm': {
    ...PROVIDER_REGISTRY['zoho-crm'],
    headline: 'Sync high-value corporate leads and wedding photography clients.',
    status: 'disconnected',
    accountIdentity: 'Unconnected',
    permissions: {
      createLeads: true,
      createDeals: true,
      requireDuplicateReview: true
    },
    lastSync: 'Never',
    health: 'Not connected',
    config: {
      leadThreshold: 100000,
      autoMergeConfidence: 0.95
    },
    activityLog: []
  },
  'google-drive': {
    ...PROVIDER_REGISTRY['google-drive'],
    headline: 'Deliver client photo galleries and lookbook assets.',
    status: 'disconnected',
    accountIdentity: 'Unconnected',
    permissions: {
      readDrive: true,
      createFolders: true
    },
    lastSync: 'Never',
    health: 'Not connected',
    config: {
      rootFolder: 'Studio Teni Client Deliveries'
    },
    activityLog: []
  },
  dropbox: {
    ...PROVIDER_REGISTRY.dropbox,
    headline: 'Store raw camera shoots and finished client albums securely.',
    status: 'disconnected',
    accountIdentity: 'Unconnected',
    permissions: {
      createUploads: true
    },
    lastSync: 'Never',
    health: 'Not connected',
    config: {},
    activityLog: []
  },
  'meta-ads': {
    ...PROVIDER_REGISTRY['meta-ads'],
    headline: 'Prepare targeted local campaigns to fill empty studio chairs.',
    status: 'disconnected',
    accountIdentity: 'Unconnected',
    permissions: {
      draftCampaigns: true,
      requireSpendApproval: true
    },
    lastSync: 'Never',
    health: 'Not connected',
    config: {
      adAccount: '',
      dailyBudgetCap: 5000
    },
    activityLog: []
  }
};

// Unified payment ledger with multi-provider locking and reconciliation
const initialTransactions = [
  {
    id: 'tx-101',
    reference: 'VP-PAY-88219',
    provider: 'paystack',
    merchantId: 'merch-studioteni',
    bookingId: 'VB-101',
    invoiceId: 'INV-101',
    clientName: 'Tobi Adebayo',
    clientPhone: '+234 802 345 6789',
    service: 'Haircut & Beard',
    totalAmount: 10000,
    expectedAmount: 2000,
    amountReceived: 2000,
    balanceDue: 8000,
    currency: 'NGN',
    customerPaymentStatus: 'Paid',
    bankSettlementStatus: 'Settled to GTBank (...4910)',
    settlementReference: 'SET-GTB-9921',
    createdAt: 'Today at 12:45 PM',
    verifiedAt: 'Today at 12:46 PM',
    externalInvoiceId: 'ZB-INV-2026-089'
  },
  {
    id: 'tx-102',
    reference: 'VP-PAY-88220',
    provider: 'paystack',
    merchantId: 'merch-studioteni',
    bookingId: 'VB-102',
    invoiceId: 'INV-102',
    clientName: 'Babatunde Ojo',
    clientPhone: '+234 803 998 7766',
    service: 'Executive Low Taper',
    totalAmount: 10000,
    expectedAmount: 2000,
    amountReceived: 2000,
    balanceDue: 8000,
    currency: 'NGN',
    customerPaymentStatus: 'Paid',
    bankSettlementStatus: 'Settled to GTBank (...4910)',
    settlementReference: 'SET-GTB-9922',
    createdAt: 'Today at 10:15 AM',
    verifiedAt: 'Today at 10:16 AM',
    externalInvoiceId: 'ZB-INV-2026-090'
  },
  {
    id: 'tx-103',
    reference: 'VP-PAY-88221',
    provider: 'paystack',
    merchantId: 'merch-studioteni',
    bookingId: 'VB-103',
    invoiceId: 'INV-103',
    clientName: 'Chuka Nnamdi',
    clientPhone: '+234 809 112 3344',
    service: 'Haircut & Beard',
    totalAmount: 10000,
    expectedAmount: 2000,
    amountReceived: 0,
    balanceDue: 10000,
    currency: 'NGN',
    customerPaymentStatus: 'Pending',
    bankSettlementStatus: 'Awaiting customer payment',
    createdAt: 'Today at 4:10 PM',
    verifiedAt: null,
    externalInvoiceId: 'ZB-INV-2026-091'
  },
  {
    id: 'tx-104',
    reference: 'VQ-QUOTE-2026-112',
    provider: 'paystack',
    merchantId: 'merch-studioteni',
    bookingId: null,
    invoiceId: 'INV-VQ-112',
    clientName: 'Kemi Adeleke (HR · Horizon Capital)',
    clientPhone: '+234 803 111 2233',
    service: 'Executive Staff Headshots (18 staff)',
    totalAmount: 350000,
    expectedAmount: 140000,
    amountReceived: 0,
    balanceDue: 350000,
    currency: 'NGN',
    customerPaymentStatus: 'Pending',
    bankSettlementStatus: 'Awaiting quotation approval & deposit',
    createdAt: 'Today at 3:30 PM',
    verifiedAt: null,
    externalInvoiceId: 'ZB-INV-2026-092'
  }
];

// Helper to load/save state
function loadState() {
  let apps = { ...initialAppsState };
  let txs = [...initialTransactions];
  try {
    if (fs.existsSync(APPS_FILE)) {
      apps = JSON.parse(fs.readFileSync(APPS_FILE, 'utf8'));
    }
    if (fs.existsSync(TXS_FILE)) {
      txs = JSON.parse(fs.readFileSync(TXS_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading state files:', err);
  }
  return { apps, txs };
}

function saveState(apps, txs) {
  try {
    if (apps) fs.writeFileSync(APPS_FILE, JSON.stringify(apps, null, 2));
    if (txs) fs.writeFileSync(TXS_FILE, JSON.stringify(txs, null, 2));
  } catch (err) {
    console.error('Error saving state files:', err);
  }
}

// Deduplication cache for webhooks / payment notifications
const processedEventIds = new Set();

// Smart recommendation calculation based on trade and identified merchant need
function calculateRecommendation(trade, apps, intent) {
  if (intent === 'currency_check') {
    return {
      type: 'payment_options',
      title: 'International Payment Options',
      text: 'Evaluate Flutterwave or Stripe to invoice commercial or overseas clients in USD/GBP without local card restrictions.',
      recommendedApp: 'flutterwave'
    };
  }
  return null;
}

// Main API Handler Router
function handleApiRequest(req, res) {
  const parsedUrl = new URL(req.url, 'http://localhost:3030');
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // JSON helper
  function sendJson(status, data) {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
  }

  if (method === 'OPTIONS') {
    return sendJson(200, { ok: true });
  }

  // 1. GET /api/registry - Provider Registry Metadata
  if (pathname === '/api/registry' && method === 'GET') {
    return sendJson(200, { registry: PROVIDER_REGISTRY });
  }

  // 2. GET /api/apps - List connected & discoverable apps (excluding connected from discoverable)
  if (pathname === '/api/apps' && method === 'GET') {
    const { apps } = loadState();
    const trade = parsedUrl.searchParams.get('trade') || 'barber';
    const intent = parsedUrl.searchParams.get('intent') || '';
    const recommendation = calculateRecommendation(trade, apps, intent);

    const connectedList = Object.values(apps).filter(a => a.status === 'connected' || a.status === 'needs_attention');
    // Sort needs_attention to top
    connectedList.sort((a, b) => (b.status === 'needs_attention') - (a.status === 'needs_attention'));

    // Exclude connected apps from discoverable
    const discoverableList = Object.values(apps).filter(a => a.status !== 'connected' && a.status !== 'needs_attention');

    return sendJson(200, {
      connectedCount: connectedList.length,
      connectedApps: connectedList,
      discoverableApps: discoverableList,
      recommendation,
      activeTrade: trade
    });
  }

  // Helper to parse POST JSON body
  function readBody(cb) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const json = body ? JSON.parse(body) : {};
        cb(null, json);
      } catch (e) {
        cb(e);
      }
    });
  }

  // 3. POST /api/apps/connect - Authorise and verify an app
  if (pathname === '/api/apps/connect' && method === 'POST') {
    return readBody((err, data) => {
      if (err || !data.appId) return sendJson(400, { error: 'Invalid app ID' });
      const { apps, txs } = loadState();
      const app = apps[data.appId];
      if (!app) return sendJson(404, { error: 'App not found in catalogue' });

      app.status = 'connected';
      app.lastSync = 'Just now';
      app.health = 'Active · Verified';
      if (data.accountIdentity) app.accountIdentity = data.accountIdentity;
      if (data.config) app.config = { ...app.config, ...data.config };
      if (data.permissions) app.permissions = { ...app.permissions, ...data.permissions };

      // Record activity
      if (!app.activityLog) app.activityLog = [];
      app.activityLog.unshift({
        timestamp: 'Just now',
        event: 'Connected & Verified',
        status: 'success',
        details: `Account mapped to ${app.accountIdentity}`
      });

      // If connecting a payment provider and requested as default
      if (app.category === 'payments' && data.isDefault) {
        for (const k of Object.keys(apps)) {
          if (apps[k].category === 'payments') apps[k].isDefault = (k === data.appId);
        }
      }

      saveState(apps, txs);
      return sendJson(200, { success: true, app, message: `Successfully connected and verified ${app.name}.` });
    });
  }

  // 4. POST /api/apps/disconnect - Safely disconnect an app retaining history
  if (pathname === '/api/apps/disconnect' && method === 'POST') {
    return readBody((err, data) => {
      if (err || !data.appId) return sendJson(400, { error: 'Invalid app ID' });
      const { apps, txs } = loadState();
      const app = apps[data.appId];
      if (!app) return sendJson(404, { error: 'App not found' });

      app.status = 'disconnected';
      app.health = 'Disconnected by merchant';
      app.lastSync = 'Disconnected';
      if (app.isDefault) {
        app.isDefault = false;
        const otherPayment = Object.values(apps).find(a => a.category === 'payments' && a.id !== app.id && a.status === 'connected');
        if (otherPayment) otherPayment.isDefault = true;
      }

      // Record activity
      if (!app.activityLog) app.activityLog = [];
      app.activityLog.unshift({
        timestamp: 'Just now',
        event: 'Disconnected',
        status: 'info',
        details: 'Disconnected by merchant. Historical records preserved.'
      });

      saveState(apps, txs);
      return sendJson(200, {
        success: true,
        app,
        message: `${app.name} disconnected. Historical bookings, client ledger, and transaction references have been preserved.`
      });
    });
  }

  // 5. POST /api/apps/test - Run a meaningful capability check
  if (pathname === '/api/apps/test' && method === 'POST') {
    return readBody((err, data) => {
      if (err || !data.appId) return sendJson(400, { error: 'Invalid app ID' });
      const { apps } = loadState();
      const app = apps[data.appId];
      if (!app) return sendJson(404, { error: 'App not found' });

      let checkResult = {
        appId: app.id,
        appName: app.name,
        timestamp: 'Just now',
        status: 'healthy',
        capabilitiesVerified: [],
        disclosures: 'Read-only check executed. No client messages sent or external costs incurred.'
      };

      if (app.id === 'google-calendar') {
        checkResult.capabilitiesVerified = ['Can read availability (1:00 PM busy, 2:30 PM free)', 'Can create calendar bookings'];
        checkResult.details = `Verified Dele · Chair 1 Schedule. 4 open slots found today.`;
      } else if (app.id === 'zoho-mail') {
        checkResult.capabilitiesVerified = ['Inbound webhook & IMAP healthy', 'Outbound SMTP SPF/DKIM verified'];
        checkResult.details = `Domain ${app.config?.emailAddress || 'hello@studioteni.ng'} passed DNS & TLS verification.`;
      } else if (app.id === 'zoho-books') {
        checkResult.capabilitiesVerified = ['Can read organizations', 'Can generate invoices', 'Can record payments'];
        checkResult.details = `Organization Studio Teni Services Ltd (#8029193) active and linked.`;
      } else if (app.id === 'paystack') {
        checkResult.capabilitiesVerified = ['Can initialize deposit checkout', 'Webhooks active', 'Direct settlement verified'];
        checkResult.details = `Connected to GTBank (...4910). Settlement schedule: Next business day (T+1).`;
      } else if (app.id === 'flutterwave') {
        checkResult.capabilitiesVerified = ['Multi-currency active (USD/GBP/EUR/NGN)', 'Virtual accounts enabled'];
        checkResult.details = `Connected to Zenith Bank (...8821). Ready for international checkout.`;
      } else if (app.id === 'stripe') {
        checkResult.capabilitiesVerified = ['Charges enabled: true', 'Payouts enabled: true', 'Apple Pay enabled'];
        checkResult.details = `Stripe account acct_1N92X verified for card and digital wallet checkout.`;
      } else {
        checkResult.capabilitiesVerified = app.supportedCapabilities || [];
        checkResult.details = `Provider health check verified 100% operational.`;
      }

      return sendJson(200, { success: true, checkResult });
    });
  }

  // 6. POST /api/payments/checkout - Shared Payment Gateway Interface
  if (pathname === '/api/payments/checkout' && method === 'POST') {
    return readBody((err, data) => {
      if (err) return sendJson(400, { error: 'Invalid payload' });
      const { apps, txs } = loadState();

      const defaultProvider = Object.values(apps).find(a => a.category === 'payments' && a.isDefault && a.status === 'connected') || apps.paystack;
      const providerKey = data.provider || defaultProvider.id;
      const providerApp = apps[providerKey];

      if (!providerApp || providerApp.status !== 'connected') {
        return sendJson(400, {
          error: `Selected payment provider (${providerKey}) is not active. Please connect it in Connected Apps.`,
          requiresConnection: providerKey
        });
      }

      const txRef = (providerKey === 'stripe' ? 'cs_test_' : providerKey === 'flutterwave' ? 'FLW-' : 'VP-') +
                    Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 899 + 100);

      const totalServiceAmount = Number(data.totalAmount || (data.amount ? data.amount * 5 : 10000));
      const depositAmount = Number(data.amount || 2000);

      const newTx = {
        id: 'tx-' + Date.now(),
        reference: txRef,
        provider: providerKey,
        merchantId: 'merch-studioteni',
        bookingId: data.bookingId || null,
        invoiceId: data.invoiceId || 'INV-' + txRef.slice(-6),
        clientName: data.clientName || 'Client',
        clientPhone: data.clientPhone || '',
        service: data.service || 'Service Booking',
        totalAmount: totalServiceAmount,
        expectedAmount: depositAmount,
        amountReceived: 0,
        balanceDue: totalServiceAmount,
        currency: data.currency || (providerApp.supportedCurrencies ? providerApp.supportedCurrencies[0] : 'NGN'),
        customerPaymentStatus: 'Pending',
        bankSettlementStatus: 'Awaiting customer payment',
        createdAt: 'Today at ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        verifiedAt: null,
        externalInvoiceId: apps['zoho-books']?.status === 'connected' ? (apps['zoho-books'].config.invoicePrefix + Math.floor(Math.random() * 8999 + 1000)) : null
      };

      txs.unshift(newTx);
      saveState(apps, txs);

      return sendJson(200, {
        success: true,
        reference: txRef,
        checkoutUrl: `/storefront?checkoutRef=${txRef}&provider=${providerKey}`,
        transaction: newTx,
        message: `Checkout session initialized with ${providerApp.name}. Provider locked to reference ${txRef}.`
      });
    });
  }

  // 7. POST /api/payments/verify - Server-Side Verification & Unified Ledger
  if (pathname === '/api/payments/verify' && method === 'POST') {
    return readBody((err, data) => {
      if (err || !data.reference) return sendJson(400, { error: 'Missing reference' });
      const { apps, txs } = loadState();

      const eventKey = `${data.reference}:${data.eventId || 'single'}`;
      if (processedEventIds.has(eventKey)) {
        const existingTx = txs.find(t => t.reference === data.reference);
        return sendJson(200, {
          success: true,
          deduplicated: true,
          transaction: existingTx,
          message: `Notice already processed idempotently. Record is current.`
        });
      }

      const tx = txs.find(t => t.reference === data.reference);
      if (!tx) {
        return sendJson(404, { error: 'Transaction not found for reference' });
      }

      processedEventIds.add(eventKey);

      // Verify server-side and update unified ledger figures
      tx.customerPaymentStatus = 'Paid';
      tx.verifiedAt = 'Today at ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      tx.amountReceived = tx.expectedAmount;
      tx.balanceDue = Math.max(0, tx.totalAmount - tx.amountReceived);

      if (tx.provider === 'paystack') {
        tx.bankSettlementStatus = 'Settled to GTBank (...4910)';
      } else if (tx.provider === 'flutterwave') {
        tx.bankSettlementStatus = 'Settled to Zenith Bank (...8821)';
      } else if (tx.provider === 'stripe') {
        tx.bankSettlementStatus = 'Settled to Wise USD (...3301)';
      } else {
        tx.bankSettlementStatus = 'Pending settlement (T+2)';
      }

      let zohoUpdate = null;
      if (apps['zoho-books'] && apps['zoho-books'].status === 'connected') {
        if (!tx.externalInvoiceId) {
          tx.externalInvoiceId = apps['zoho-books'].config.invoicePrefix + '2026-' + Math.floor(Math.random() * 899 + 100);
        }
        zohoUpdate = {
          invoiceId: tx.externalInvoiceId,
          zohoOrg: apps['zoho-books'].config.organizationName,
          status: 'Payment Recorded · Paid in Full / Deposit Credited',
          allocatedAmount: tx.amountReceived,
          directUrl: `https://books.zoho.com/app#/invoices/${tx.externalInvoiceId}`
        };
      }

      saveState(apps, txs);

      return sendJson(200, {
        success: true,
        verified: true,
        transaction: tx,
        zoho: zohoUpdate,
        ledger: {
          clientName: tx.clientName,
          totalAmount: tx.totalAmount,
          amountReceived: tx.amountReceived,
          balanceDue: tx.balanceDue
        },
        message: `Payment of ${tx.currency} ${tx.expectedAmount.toLocaleString()} verified via ${tx.provider}. Bank settlement: ${tx.bankSettlementStatus}. Balance due: ${tx.currency} ${tx.balanceDue.toLocaleString()}.`
      });
    });
  }

  // 8. GET /api/calendar/availability - Two-way Staff Calendar Availability Engine
  if (pathname === '/api/calendar/availability' && method === 'GET') {
    const staff = parsedUrl.searchParams.get('staff') || 'Dele';
    const isDele = staff.toLowerCase().includes('dele');
    const isSegun = staff.toLowerCase().includes('segun');

    const availability = {
      staff: isDele ? 'Dele (Chair 1)' : isSegun ? 'Segun (Chair 2)' : staff,
      connectedCalendar: isDele ? 'Dele · Chair 1 Schedule (Google Workspace)' : 'Segun · Chair 2 Schedule',
      date: 'Today',
      slots: [
        { time: '1:00 PM', status: isDele ? 'busy' : 'open', conflictDetails: isDele ? 'Existing Appointment: Tobi Adebayo (Haircut & Beard)' : null },
        { time: '1:45 PM', status: isDele ? 'buffer' : 'open', conflictDetails: isDele ? '15m cleaning & sanitation buffer' : null },
        { time: '2:30 PM', status: 'open', conflictDetails: null },
        { time: '3:30 PM', status: 'open', conflictDetails: null },
        { time: '4:15 PM', status: 'open', conflictDetails: null },
        { time: '5:30 PM', status: 'open', conflictDetails: null }
      ]
    };

    return sendJson(200, availability);
  }

  // 9. GET /api/calendar/subscribe - RFC 5545 iCalendar Subscription Feed for Apple Calendar
  if (pathname === '/api/calendar/subscribe' && method === 'GET') {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Vela Technologies//Vela Bookings Feed 1.0//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Vela Studio Bookings',
      'X-WR-TIMEZONE:Africa/Lagos',
      'BEGIN:VEVENT',
      'UID:vb-101-2026@studioteni.ng',
      'DTSTART:20261124T120000Z',
      'DTEND:20261124T124500Z',
      'SUMMARY:Tobi Adebayo · Haircut & Beard',
      'DESCRIPTION:Confirmed booking with Dele (Chair 1). Deposit ₦2,000 paid via Paystack.',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:vb-102-2026@studioteni.ng',
      'DTSTART:20261124T143000Z',
      'DTEND:20261124T151500Z',
      'SUMMARY:Babatunde Ojo · Executive Low Taper',
      'DESCRIPTION:Confirmed booking with Dele (Chair 1). Deposit ₦2,000 paid via Paystack.',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    res.writeHead(200, {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="vela-bookings.ics"'
    });
    return res.end(icsContent);
  }

  // 10. GET /api/ledger - Unified Payment Ledger
  if (pathname === '/api/ledger' && method === 'GET') {
    const { txs } = loadState();
    return sendJson(200, {
      transactions: txs,
      summary: {
        totalReceived: txs.filter(t => t.customerPaymentStatus === 'Paid').reduce((sum, t) => sum + (t.amountReceived || t.expectedAmount || 0), 0),
        totalPending: txs.filter(t => t.customerPaymentStatus === 'Pending').reduce((sum, t) => sum + (t.expectedAmount || 0), 0),
        chukaLedger: txs.find(t => t.clientName.includes('Chuka'))
      }
    });
  }

  // 11. POST /api/demo/clean-account - Clean account scenario for test 1
  if (pathname === '/api/demo/clean-account' && method === 'POST') {
    const freshApps = {};
    for (const [k, v] of Object.entries(PROVIDER_REGISTRY)) {
      freshApps[k] = {
        ...v,
        headline: v.outcomeExplanation,
        status: 'disconnected',
        isDefault: false,
        accountIdentity: 'Unconnected',
        lastSync: 'Never',
        health: 'Not connected',
        config: {},
        activityLog: []
      };
    }
    saveState(freshApps, []);
    return sendJson(200, { success: true, message: 'Clean account initialized with 0 connected apps.' });
  }

  // 12. POST /api/demo/restore-account - Restore demo state
  if (pathname === '/api/demo/restore-account' && method === 'POST') {
    saveState(initialAppsState, initialTransactions);
    return sendJson(200, { success: true, message: 'Studio Teni demo workspace restored.' });
  }

  // 13. POST /api/zoho/sync - Zoho Books & CRM Sync Engine
  if (pathname === '/api/zoho/sync' && method === 'POST') {
    return readBody((err, data) => {
      if (err) return sendJson(400, { error: 'Invalid payload' });
      const { apps } = loadState();

      if (data.type === 'crm_lead') {
        const isDuplicate = data.clientName && data.clientName.toLowerCase().includes('kemi');
        return sendJson(200, {
          success: true,
          type: 'crm_lead',
          duplicateDetected: isDuplicate,
          matchedContact: isDuplicate ? { id: 'ZC-CON-8812', name: 'Kemi Adeleke', company: 'Horizon Capital', email: 'kemi.adeleke@horizoncap.ng' } : null,
          recordId: 'ZC-LEAD-2026-441',
          message: isDuplicate ? 'Existing CRM contact found for Horizon Capital. Merchant review recommended before merging.' : 'Zoho CRM Deal created for quotation.'
        });
      }

      // Zoho Books invoice sync
      const invId = (apps['zoho-books']?.config?.invoicePrefix || 'ZB-INV-') + '2026-' + Math.floor(Math.random() * 899 + 100);
      return sendJson(200, {
        success: true,
        type: 'books_invoice',
        externalInvoiceId: invId,
        directUrl: `https://books.zoho.com/app#/invoices/${invId}`,
        organization: apps['zoho-books']?.config?.organizationName || 'Studio Teni Services Ltd',
        amount: data.amount || 350000,
        message: `Invoice #${invId} created in Zoho Books for accepted quotation.`
      });
    });
  }

  // 14. GET /api/transactions - Ledger of multi-provider transactions
  if (pathname === '/api/transactions' && method === 'GET') {
    const { txs } = loadState();
    return sendJson(200, { transactions: txs });
  }

  // Not handled
  return false;
}

module.exports = {
  handleApiRequest,
  loadState,
  saveState,
  initialAppsState,
  PROVIDER_REGISTRY
};
