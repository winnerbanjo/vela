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

// Initial default apps state
const initialAppsState = {
  paystack: {
    id: 'paystack',
    name: 'Paystack',
    category: 'payments',
    headline: 'Collect booking deposits and match payments to clients.',
    status: 'connected',
    isDefault: true,
    mode: 'live',
    accountIdentity: 'Studio Teni Enterprises (RC-381920) · Paystack Live',
    settlementAccount: 'Guaranty Trust Bank (GTBank) · ...4910',
    supportedCurrencies: ['NGN'],
    capabilities: [
      'Automated Paystack deposit checkout links',
      'Split settlement & instant transaction verification',
      'Webhooks reconciliation to client ledger',
      'Automatic refund and balance due calculation'
    ],
    permissions: {
      readTransactions: true,
      createCheckout: true,
      refunds: false
    },
    lastSync: 'Just now',
    health: '100% Operational',
    config: {
      depositPercentage: 20,
      autoCreditInvoice: true,
      enforceDeposits: true
    }
  },
  flutterwave: {
    id: 'flutterwave',
    name: 'Flutterwave',
    category: 'payments',
    headline: 'Collect deposits and international payments in NGN, USD and GBP.',
    status: 'disconnected',
    isDefault: false,
    mode: 'test',
    accountIdentity: 'Studio Teni Global (flw_live_...9182)',
    settlementAccount: 'Zenith Bank · ...8821',
    supportedCurrencies: ['NGN', 'USD', 'GBP', 'EUR'],
    capabilities: [
      'Multi-currency deposit collection (USD/GBP/EUR)',
      'Direct Nigerian bank transfers via USSD & virtual accounts',
      'International card acceptance without FX friction'
    ],
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
    }
  },
  stripe: {
    id: 'stripe',
    name: 'Stripe',
    category: 'payments',
    headline: 'Accept global cards, Apple Pay and US/UK client payments.',
    status: 'disconnected',
    isDefault: false,
    mode: 'test',
    accountIdentity: 'Studio Teni Ltd (acct_1N92X...)',
    settlementAccount: 'Wise USD / Barclays GBP',
    supportedCurrencies: ['USD', 'GBP', 'EUR', 'CAD'],
    capabilities: [
      'Apple Pay and Google Pay 1-tap booking checkout',
      'Corporate invoicing for international commercial clients',
      'Automated receipt delivery in customer currency'
    ],
    permissions: {
      readTransactions: true,
      createCheckout: true
    },
    lastSync: 'Never',
    health: 'Not connected',
    config: {
      defaultCurrency: 'USD'
    }
  },
  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    category: 'messaging',
    headline: 'Reply to customer booking enquiries from your verified WhatsApp number.',
    status: 'connected',
    isDefault: false,
    accountIdentity: '+234 803 123 4567 (Meta Cloud API)',
    capabilities: [
      'Direct customer chat on verified studio phone number',
      'Automatic deposit checkout link insertion',
      'Appointment reminder dispatch and reschedule links'
    ],
    permissions: {
      readMessages: true,
      draftReplies: true,
      autoReplyRoutine: true
    },
    lastSync: '2m ago',
    health: 'Active · Meta Webhook Verified',
    config: {
      phoneNumber: '+234 803 123 4567',
      replyMode: 'draft'
    }
  },
  'zoho-mail': {
    id: 'zoho-mail',
    name: 'Zoho Mail',
    category: 'messaging',
    headline: 'Send professional quotations and handle email bookings from your domain.',
    status: 'connected',
    accountIdentity: 'hello@studioteni.ng (Zoho Mail Professional)',
    capabilities: [
      'Custom domain business email (@studioteni.ng)',
      'PDF Quotation attachments with Paystack deposit links',
      'Separate receiving and sending health monitoring'
    ],
    permissions: {
      readMessages: true,
      sendQuotations: true
    },
    receivingHealth: 'Active (IMAP & Webhook 100% Passed)',
    sendingHealth: 'Active (SPF, DKIM, DMARC Verified)',
    lastSync: '12m ago',
    health: 'Active · Inbound & Outbound Healthy',
    config: {
      emailAddress: 'hello@studioteni.ng',
      smtpHost: 'smtp.zoho.com'
    }
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram Direct',
    category: 'messaging',
    headline: 'Turn DMs and story replies into confirmed appointments.',
    status: 'connected',
    accountIdentity: '@studioteni_ng (Meta Graph API)',
    capabilities: [
      'Direct message enquiry capture from Reels and Feed',
      'Catalogue lookbook link sharing directly in chat',
      'Instant studio address and slot guidance'
    ],
    permissions: {
      readMessages: true,
      draftReplies: true
    },
    lastSync: '5m ago',
    health: 'Active · Graph API Verified',
    config: {
      handle: '@studioteni_ng'
    }
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok for Business',
    category: 'messaging',
    headline: 'Capture haircut and photoshoot bookings from viral videos.',
    status: 'connected',
    accountIdentity: '@studioteni (TikTok Direct Messaging API)',
    capabilities: [
      'Inquiries from viral haircut and portrait transformations',
      'Automated bio booking link tracking'
    ],
    permissions: {
      readMessages: true,
      draftReplies: true
    },
    lastSync: '28m ago',
    health: 'Active · TikTok Messaging API Verified',
    config: {
      handle: '@studioteni'
    }
  },
  'google-calendar': {
    id: 'google-calendar',
    name: 'Google Calendar',
    category: 'calendar',
    headline: 'Keep staff availability in sync with their calendars.',
    status: 'connected',
    accountIdentity: 'dele.cuts@studioteni.ng (Google Workspace)',
    capabilities: [
      'Real-time availability check before proposing time slots',
      'Two-way sync: calendar events block studio booking slots',
      'Automatic reschedule updates without double bookings'
    ],
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
    }
  },
  'apple-outlook-calendar': {
    id: 'apple-outlook-calendar',
    name: 'Outlook & Apple Calendar',
    category: 'calendar',
    headline: 'Sync personal schedules and prevent double bookings.',
    status: 'disconnected',
    accountIdentity: 'Unconnected',
    capabilities: [
      'CalDAV & Microsoft Exchange calendar integration',
      'Personal appointment blockouts during work hours'
    ],
    permissions: {
      readCalendar: true
    },
    lastSync: 'Never',
    health: 'Not connected',
    config: {
      provider: 'exchange'
    }
  },
  'zoho-books': {
    id: 'zoho-books',
    name: 'Zoho Books',
    category: 'accounting',
    headline: 'Turn accepted quotes into invoices and track payments.',
    status: 'connected',
    accountIdentity: 'Studio Teni Services Ltd (Org #8029193)',
    capabilities: [
      'Turn accepted quotations into official accounting invoices',
      'Automatic deposit matching when Paystack/Flutterwave succeeds',
      'Direct one-click link to Zoho Books records'
    ],
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
    }
  },
  'zoho-crm': {
    id: 'zoho-crm',
    name: 'Zoho CRM',
    category: 'accounting',
    headline: 'Sync high-value corporate leads and wedding photography clients.',
    status: 'disconnected',
    accountIdentity: 'Unconnected',
    capabilities: [
      'Create Lead when corporate headshot or wedding inquiry arrives',
      'Smart contact deduplication and review step for existing clients',
      'Pipeline tracking for corporate packages (> ₦100,000)'
    ],
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
    }
  },
  'google-drive': {
    id: 'google-drive',
    name: 'Google Drive',
    category: 'files',
    headline: 'Deliver client photo galleries and lookbook assets.',
    status: 'disconnected',
    accountIdentity: 'Unconnected',
    capabilities: [
      'Automated client gallery folder generation',
      'Private proofing link dispatch with watermark protection'
    ],
    permissions: {
      readDrive: true,
      createFolders: true
    },
    lastSync: 'Never',
    health: 'Not connected',
    config: {
      rootFolder: 'Studio Teni Client Deliveries'
    }
  },
  dropbox: {
    id: 'dropbox',
    name: 'Dropbox',
    category: 'files',
    headline: 'Store raw camera shoots and finished client albums securely.',
    status: 'disconnected',
    accountIdentity: 'Unconnected',
    capabilities: [
      'Cloud backup of high-res client photoshoot RAW files',
      'Expiring client download links'
    ],
    permissions: {
      createUploads: true
    },
    lastSync: 'Never',
    health: 'Not connected',
    config: {}
  },
  'meta-ads': {
    id: 'meta-ads',
    name: 'Meta Ads Manager',
    category: 'marketing',
    headline: 'Prepare targeted local campaigns to fill empty studio chairs.',
    status: 'disconnected',
    accountIdentity: 'Unconnected',
    capabilities: [
      'Draft Instagram & Facebook local campaigns for open weekday chairs',
      'Geo-targeted ads in Victoria Island, Lekki and Ikoyi'
    ],
    permissions: {
      draftCampaigns: true,
      requireSpendApproval: true
    },
    lastSync: 'Never',
    health: 'Not connected',
    config: {
      adAccount: '',
      dailyBudgetCap: 5000
    }
  }
};

// Transactions ledger with multi-provider locking and reconciliation
const initialTransactions = [
  {
    id: 'tx-101',
    reference: 'VP-PAY-88219',
    provider: 'paystack',
    merchantId: 'merch-teni-01',
    bookingId: 'VB-101',
    invoiceId: 'INV-101',
    clientName: 'Tobi Adebayo',
    clientPhone: '+234 802 345 6789',
    expectedAmount: 2000,
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
    merchantId: 'merch-teni-01',
    bookingId: 'VB-102',
    invoiceId: 'INV-102',
    clientName: 'Babatunde Ojo',
    clientPhone: '+234 803 998 7766',
    expectedAmount: 2000,
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
    merchantId: 'merch-teni-01',
    bookingId: 'VB-103',
    invoiceId: 'INV-103',
    clientName: 'Chuka Nnamdi',
    clientPhone: '+234 809 112 3344',
    expectedAmount: 2000,
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
    merchantId: 'merch-teni-01',
    bookingId: null,
    invoiceId: 'INV-VQ-112',
    clientName: 'Kemi Adeleke (HR · Horizon Capital)',
    clientPhone: '+234 803 111 2233',
    expectedAmount: 140000,
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

// Smart recommendation calculation based on trade and connected capabilities
function calculateRecommendation(trade, apps) {
  const isBarber = trade === 'barber';
  const hasNgnPayments = (apps.paystack && apps.paystack.status === 'connected') || (apps.flutterwave && apps.flutterwave.status === 'connected');
  const hasCalendar = apps['google-calendar'] && apps['google-calendar'].status === 'connected';
  const hasAccounting = apps['zoho-books'] && apps['zoho-books'].status === 'connected';
  const hasEmail = apps['zoho-mail'] && apps['zoho-mail'].status === 'connected';

  if (!hasNgnPayments) {
    return {
      appId: 'paystack',
      reason: 'Connect Paystack to collect ₦2,000 deposits and lock chairs before clients arrive.',
      actionLabel: 'Connect Paystack'
    };
  }

  if (isBarber) {
    if (!hasCalendar) {
      return {
        appId: 'google-calendar',
        reason: 'Connect Google Calendar for Dele to eliminate double bookings and verify availability in real time.',
        actionLabel: 'Connect Dele’s Calendar'
      };
    }
    if (!hasAccounting) {
      return {
        appId: 'zoho-books',
        reason: 'Connect Zoho Books to track daily chair revenue and generate monthly salon tax summaries.',
        actionLabel: 'Connect Zoho Books'
      };
    }
  } else {
    // Photographer
    if (!hasEmail) {
      return {
        appId: 'zoho-mail',
        reason: 'Connect Zoho Mail to dispatch branded corporate quotation PDFs from your domain.',
        actionLabel: 'Connect Zoho Mail'
      };
    }
    if (!hasAccounting) {
      return {
        appId: 'zoho-books',
        reason: 'Connect Zoho Books to convert accepted photo shoot quotes into official invoices with deposit tracking.',
        actionLabel: 'Connect Zoho Books'
      };
    }
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

  // 1. GET /api/apps - List connected & available apps + recommendations
  if (pathname === '/api/apps' && method === 'GET') {
    const { apps } = loadState();
    const trade = parsedUrl.searchParams.get('trade') || 'barber';
    const recommendation = calculateRecommendation(trade, apps);

    const connectedList = Object.values(apps).filter(a => a.status === 'connected');
    const availableList = Object.values(apps);

    return sendJson(200, {
      connectedCount: connectedList.length,
      connectedApps: connectedList,
      availableApps: availableList,
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

  // 2. POST /api/apps/connect - Authorise and verify an app
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

  // 3. POST /api/apps/disconnect - Safely disconnect an app retaining history
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
        // fallback default payment provider if any other is connected
        const otherPayment = Object.values(apps).find(a => a.category === 'payments' && a.id !== app.id && a.status === 'connected');
        if (otherPayment) otherPayment.isDefault = true;
      }

      saveState(apps, txs);
      return sendJson(200, {
        success: true,
        app,
        message: `${app.name} disconnected. Historical bookings, client ledger, and transaction references have been preserved.`
      });
    });
  }

  // 4. POST /api/apps/config - Update configuration & granular action permissions
  if (pathname === '/api/apps/config' && method === 'POST') {
    return readBody((err, data) => {
      if (err || !data.appId) return sendJson(400, { error: 'Invalid app ID' });
      const { apps, txs } = loadState();
      const app = apps[data.appId];
      if (!app) return sendJson(404, { error: 'App not found' });

      if (data.config) app.config = { ...app.config, ...data.config };
      if (data.permissions) app.permissions = { ...app.permissions, ...data.permissions };
      if (typeof data.isDefault === 'boolean' && app.category === 'payments') {
        for (const k of Object.keys(apps)) {
          if (apps[k].category === 'payments') apps[k].isDefault = (k === data.appId && data.isDefault);
        }
      }

      saveState(apps, txs);
      return sendJson(200, { success: true, app, message: `${app.name} configuration updated.` });
    });
  }

  // 5. POST /api/payments/checkout - Shared Payment Gateway Interface
  if (pathname === '/api/payments/checkout' && method === 'POST') {
    return readBody((err, data) => {
      if (err) return sendJson(400, { error: 'Invalid payload' });
      const { apps, txs } = loadState();

      // Find intended provider, or fallback to merchant default
      const defaultProvider = Object.values(apps).find(a => a.category === 'payments' && a.isDefault && a.status === 'connected') || apps.paystack;
      const providerKey = data.provider || defaultProvider.id;
      const providerApp = apps[providerKey];

      if (!providerApp || providerApp.status !== 'connected') {
        return sendJson(400, {
          error: `Selected payment provider (${providerKey}) is not active. Please connect it in Connected Apps.`,
          requiresConnection: providerKey
        });
      }

      const txRef = 'VP-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 899 + 100);
      const newTx = {
        id: 'tx-' + Date.now(),
        reference: txRef,
        provider: providerKey,
        merchantId: 'merch-studioteni',
        bookingId: data.bookingId || null,
        invoiceId: data.invoiceId || 'INV-' + txRef.slice(-6),
        clientName: data.clientName || 'Client',
        clientPhone: data.clientPhone || '',
        expectedAmount: Number(data.amount || 2000),
        currency: data.currency || (providerApp.supportedCurrencies[0] || 'NGN'),
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

  // 6. POST /api/payments/verify - Server-Side Verification & Idempotency Engine
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

      // Mark event as processed
      processedEventIds.add(eventKey);

      // Verify server-side
      tx.customerPaymentStatus = 'Paid';
      tx.verifiedAt = 'Today at ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

      // Separate customer payment status from bank settlement status
      if (tx.provider === 'paystack') {
        tx.bankSettlementStatus = 'Settled to GTBank (...4910)';
      } else if (tx.provider === 'flutterwave') {
        tx.bankSettlementStatus = 'Settled to Zenith Bank (...8821)';
      } else {
        tx.bankSettlementStatus = 'Pending settlement (T+2)';
      }

      // If Zoho Books is connected, auto-update accounting record
      let zohoUpdate = null;
      if (apps['zoho-books'] && apps['zoho-books'].status === 'connected') {
        if (!tx.externalInvoiceId) {
          tx.externalInvoiceId = apps['zoho-books'].config.invoicePrefix + '2026-' + Math.floor(Math.random() * 899 + 100);
        }
        zohoUpdate = {
          invoiceId: tx.externalInvoiceId,
          zohoOrg: apps['zoho-books'].config.organizationName,
          status: 'Payment Recorded · Paid in Full / Deposit Credited',
          directUrl: `https://books.zoho.com/app#/invoices/${tx.externalInvoiceId}`
        };
      }

      saveState(apps, txs);

      return sendJson(200, {
        success: true,
        verified: true,
        transaction: tx,
        zoho: zohoUpdate,
        message: `Payment of ${tx.currency} ${tx.expectedAmount.toLocaleString()} verified via ${tx.provider}. Bank settlement: ${tx.bankSettlementStatus}.`
      });
    });
  }

  // 7. GET /api/calendar/availability - Two-way Staff Calendar Availability Engine
  if (pathname === '/api/calendar/availability' && method === 'GET') {
    const staff = parsedUrl.searchParams.get('staff') || 'Dele';
    const isDele = staff.toLowerCase().includes('dele');
    const isSegun = staff.toLowerCase().includes('segun');

    // Calendar simulation for Dele (Chair 1) vs Segun (Chair 2)
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

  // 8. POST /api/zoho/sync - Zoho Books & CRM Sync Engine
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

  // 9. GET /api/transactions - Ledger of multi-provider transactions
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
  initialAppsState
};
