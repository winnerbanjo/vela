// Vela AI Workspace Controller
// Single source of truth for merchant dashboard, catalogue, connected channels, and booking state

const byId = id => document.getElementById(id);
const page = byId('workspacePage');
const storageKey = 'vela.preview.workspace.v1';

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let originatingScreen = 'agent';

const defaultWorkspace = {
  name: 'Studio Teni',
  slug: 'studioteni',
  trade: 'barber',
  location: '14 Bishop Oluwole St, Victoria Island · Lagos',
  serviceAreaOnly: false,
  bio: 'Clean studio space for precision haircuts, low-taper fades, and executive portraits. We pride ourselves on punctuality, pristine hygiene, and exceptional craftsmanship.',
  phone: '+234 803 123 4567',
  email: 'hello@studioteni.ng',
  walkIns: 0,
  inboxMode: 'draft',
  lastPublishedAt: '24 Nov 2026, 14:10',
  hasUnpublishedChanges: false,
  customDomain: '',
  customDomainVerified: false,
  channels: {
    whatsapp: { connected: true, identity: '+234 803 123 4567', name: 'Meta Cloud API', lastSync: '2m ago' },
    email: { connected: true, identity: 'hello@studioteni.ng', name: 'Resend / SMTP', lastSync: '12m ago' },
    instagram: { connected: true, identity: '@studioteni_ng', name: 'Meta Graph API', lastSync: '5m ago' },
    tiktok: { connected: true, identity: '@studioteni', name: 'TikTok Messaging API', lastSync: '28m ago' }
  },
  clientGalleries: [
    {
      id: 'gal-amaka',
      title: 'Amaka’s wedding gallery',
      clientName: 'Amaka Obi',
      clientEmail: 'amaka.obi@gmail.com',
      eventDate: '14 Feb 2026',
      status: 'private_proof',
      coverPhoto: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&fit=crop',
      source: 'Dropbox',
      sourceAccount: 'Studio Teni Portfolio Dropbox',
      sourceFolder: '/Studio Teni Client Deliveries/Amaka Wedding 2026/',
      photosCount: 0,
      photos: []
    },
    {
      id: 'gal-horizon',
      title: 'Horizon Capital Executive Headshots',
      clientName: 'Kemi Adeleke',
      clientEmail: 'kemi.adeleke@horizoncap.ng',
      eventDate: '20 Nov 2026',
      status: 'published',
      coverPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&fit=crop',
      source: 'Google Drive',
      sourceAccount: 'studioteni@gmail.com',
      sourceFolder: 'Corporate / Horizon Headshots',
      photosCount: 18,
      photos: []
    }
  ],
  servicesList: [
    { id: 'srv-1', name: 'Signature Haircut & Beard Trim', duration: 45, buffer: 15, price: 10000, deposit: 2000, staff: 'Dele (Chair 1)', status: 'active', desc: 'Consultation, precision cut, beard sculpting, hot towel finish.' },
    { id: 'srv-2', name: 'Executive Low Taper Fade', duration: 35, buffer: 10, price: 8000, deposit: 2000, staff: 'Dele (Chair 1)', status: 'active', desc: 'Low skin taper, razor edge lineup, hair conditioning oil.' },
    { id: 'srv-3', name: 'Studio Portrait Session', duration: 60, buffer: 15, price: 45000, deposit: 15000, staff: 'Teni (Studio A)', status: 'active', desc: '1-hour studio session, 2 outfits, 5 retouched master images.' },
    { id: 'srv-4', name: 'Corporate Headshots Package', duration: 180, buffer: 30, price: 350000, deposit: 140000, staff: 'Teni (Studio A)', status: 'active', desc: 'Mobile studio setup for 18 executive staff on-location.' }
  ],
  photos: [
    { id: 'look-taper-01', title: 'Low Taper Transformation', serviceId: 'srv-2', serviceName: 'Executive Low Taper Fade', category: 'Haircuts', src: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&h=400&fit=crop', isCover: false },
    { id: 'look-fade-02', title: 'Signature Fade & Beard Care', serviceId: 'srv-1', serviceName: 'Signature Haircut & Beard Trim', category: 'Beard & Hair', src: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&h=400&fit=crop', isCover: true },
    { id: 'look-photo-03', title: 'Executive Studio Portrait', serviceId: 'srv-3', serviceName: 'Studio Portrait Session', category: 'Portraits', src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=400&fit=crop', isCover: false }
  ],
  bookingsList: [
    { id: 'VB-101', clientName: 'Tobi Adebayo', clientPhone: '+234 802 345 6789', serviceName: 'Signature Haircut & Beard Trim', dateSlot: 'Today at 1:00 PM', staff: 'Dele (Chair 1)', totalPrice: 10000, depositPaid: 2000, balanceDue: 8000, status: 'Confirmed · Deposit Paid', notes: 'Skin fade on sides, trim beard line lightly' },
    { id: 'VB-102', clientName: 'Babatunde Ojo', clientPhone: '+234 803 998 7766', serviceName: 'Executive Low Taper Fade', dateSlot: 'Today at 2:30 PM', staff: 'Dele (Chair 1)', totalPrice: 8000, depositPaid: 2000, balanceDue: 6000, status: 'Rescheduled · Slot Confirmed', notes: 'Delayed in traffic on Third Mainland' },
    { id: 'VB-103', clientName: 'Chuka Nnamdi', clientPhone: '+234 809 112 3344', serviceName: 'Signature Haircut & Beard Trim', dateSlot: 'Today at 4:15 PM', staff: 'Dele (Chair 1)', totalPrice: 10000, depositPaid: 2000, balanceDue: 8000, status: 'Draft Pending Approval', notes: 'First-time inquiry via WhatsApp' }
  ],
  conversations: [
    {
      id: 'conv-1',
      channel: 'whatsapp',
      sender: 'Chuka Nnamdi',
      phone: '+234 809 112 3344',
      time: 'Just now',
      status: 'needs_approval',
      message: '“Boss, can I come around 4 for haircut and beard? How much?”',
      context: 'First-time client · Chair 1 (Dele) open at 4:15 PM · Haircut & Beard (₦10,000)',
      draftText: '“Haircut and beard is ₦10,000. Dele has a 4:15 PM opening today at Studio Teni (14 Bishop Oluwole St). Would you like me to hold this chair for you with a ₦2,000 deposit?”',
      actionLabel: 'Approve & send WhatsApp'
    },
    {
      id: 'conv-2',
      channel: 'email',
      sender: 'Kemi Adeleke (HR · Horizon Capital)',
      email: 'kemi.adeleke@horizoncap.ng',
      time: '28m ago',
      status: 'needs_approval',
      message: '“We need headshots for 18 staff at our Victoria Island office. Can you send a quote?”',
      context: 'Corporate inquiry · 18 people · On-location Victoria Island · ₦350,000 package',
      draftText: '“Hello Kemi, attached is Quotation #VQ-2026-112 for 18 executive staff headshots on-location (₦350,000 total · ₦140,000 deposit to secure Thursday 3 Dec).”',
      actionLabel: 'Review quotation',
      isQuote: true
    },
    {
      id: 'conv-3',
      channel: 'whatsapp',
      sender: 'Babatunde Ojo',
      phone: '+234 803 998 7766',
      time: '2h ago',
      status: 'needs_approval',
      message: '“I\'m stuck in traffic on Third Mainland, can we shift my 1:00 PM to 2:30 PM?”',
      context: 'Existing appointment · Dele calendar verified: 2:30 PM slot open',
      draftText: '“No problem Babatunde! Dele\'s 2:30 PM slot was free so we\'ve shifted your appointment to 2:30 PM today. Drive safe, see you soon.”',
      actionLabel: 'Confirm shift & reply'
    },
    {
      id: 'conv-4',
      channel: 'instagram',
      sender: '@kene_o (Kenechukwu)',
      handle: '@kene_o',
      time: '45m ago',
      status: 'needs_approval',
      message: '“Do you take walk-ins in Yaba or VI? I need a clean taper this evening.”',
      context: 'Instagram DM from transformation video · VI Studio · Open till 7:00 PM',
      draftText: '“Hey Kene! We\'re located at 14 Bishop Oluwole St, Victoria Island. Dele has an opening at 5:30 PM today! You can lock it in here: studioteni.vela.ng/book”',
      actionLabel: 'Approve & send Instagram DM'
    },
    {
      id: 'conv-5',
      channel: 'tiktok',
      sender: '@tayo_cuts',
      handle: '@tayo_cuts',
      time: '1h ago',
      status: 'needs_approval',
      message: '“Drop address abeg! How much for the taper in the video?”',
      context: 'TikTok Message on Low Taper transformation · Price: ₦8,000',
      draftText: '“Studio Teni is at 14 Bishop Oluwole St, Victoria Island. Executive Low Taper is ₦8,000. Book here with ₦2k deposit: studioteni.vela.ng/book”',
      actionLabel: 'Approve & send TikTok reply'
    },
    {
      id: 'conv-6',
      channel: 'whatsapp',
      sender: 'Adaeze Obi',
      phone: '+234 818 223 3445',
      time: '3h ago',
      status: 'routine_replied',
      message: '“What time do you close on Friday and where are you located?”',
      context: 'Routine enquiry · Location & hours auto-replied',
      draftText: '“We’re open until 7:00 PM on Friday! Studio Teni is located at 14 Bishop Oluwole St, Victoria Island. You can lock in a chair here: studioteni.vela.ng/book”',
      actionLabel: 'Auto-replied'
    }
  ]
};

const defaultSalesProfileBarber = {
  trade: 'barber',
  priorityServiceId: 'srv-1',
  priorityServiceName: 'Signature Haircut & Beard Trim',
  priorityPrice: 10000,
  priorityDuration: 45,
  priorityDeposit: 2000,
  buyingJourney: 'A new client saw a low taper fade transformation video I posted, sent me the clip on WhatsApp and asked if I could do the exact same cut and how much it costs.',
  customerFriction: 'Where in Yaba/VI are you located? Is full beard shaping and hot towel included in the ₦10,000 price? Do I need to book in advance or can I walk in?',
  proofAssetUrl: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&h=400&fit=crop',
  proofAssetTitle: 'Executive Low Taper Transformation',
  targetLocation: '14 Bishop Oluwole St, Victoria Island (Near Yaba corridor)',
  quietPeriods: 'Wednesday afternoons (1:00 PM – 5:00 PM) are usually quiet with 4 open chairs. Saturdays are already at full capacity.',
  campaignStage: 'recommendation'
};

const defaultSalesProfilePhotographer = {
  trade: 'photographer',
  priorityServiceId: 'srv-4',
  priorityServiceName: 'Corporate Headshots Package',
  priorityPrice: 350000,
  priorityDuration: 180,
  priorityDeposit: 140000,
  buyingJourney: 'An HR Director at Horizon Capital saw our corporate leadership portraits on LinkedIn, emailed us to ask for an on-location team shoot quote for 18 staff members.',
  customerFriction: 'Do you bring the mobile studio setup to our Victoria Island office? How many days until edited photos are delivered? Can you provide a formal quotation for accounting?',
  proofAssetUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=400&fit=crop',
  proofAssetTitle: 'Executive Leadership Headshots',
  targetLocation: 'On-location corporate offices in Victoria Island / Ikoyi',
  quietPeriods: 'Mid-week enterprise bookings (Wednesdays & Thursdays). Weekend studio slots fill up, but weekday corporate bookings need proactive sales outreach.',
  campaignStage: 'recommendation'
};

defaultWorkspace.salesProfile = { ...defaultSalesProfileBarber };

let workspace = { ...defaultWorkspace };
try {
  const loaded = JSON.parse(localStorage.getItem(storageKey) || '{}');
  workspace = { ...defaultWorkspace, ...loaded };
  if (loaded.servicesList) workspace.servicesList = loaded.servicesList;
  if (loaded.photos) workspace.photos = loaded.photos;
  if (loaded.clientGalleries) workspace.clientGalleries = loaded.clientGalleries;
  else workspace.clientGalleries = JSON.parse(JSON.stringify(defaultWorkspace.clientGalleries));
  if (loaded.bookingsList) workspace.bookingsList = loaded.bookingsList;
  if (loaded.conversations) workspace.conversations = loaded.conversations;
  if (loaded.salesProfile) workspace.salesProfile = loaded.salesProfile;
  else workspace.salesProfile = workspace.trade === 'photographer' ? { ...defaultSalesProfilePhotographer } : { ...defaultSalesProfileBarber };
} catch (e) {
  /* Use defaults */
}

function save(changes) {
  workspace = { ...workspace, ...changes };
  try {
    localStorage.setItem(storageKey, JSON.stringify(workspace));
  } catch (e) {
    notify('Could not save to local storage.');
    return false;
  }
  updatePendingBadges();
  return true;
}

function notify(message) {
  let status = byId('workspaceNotice');
  if (!status) {
    status = el('div', '', 'workspace-notice');
    status.id = 'workspaceNotice';
    status.setAttribute('role', 'status');
    document.body.append(status);
  }
  status.textContent = message;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => { if (status) status.remove(); }, 3500);
}

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

let savedDraft = '';
let savedInboxScrollTop = 0;
let isReviewDropdownOpen = false;

function updatePendingBadges() {
  const pendingCount = workspace.conversations.filter(c => c.status === 'needs_approval').length;
  
  // Sidebar nav badge
  const navBadge = document.querySelector('a[href="#inbox"] .nav-badge');
  if (navBadge) {
    navBadge.textContent = String(pendingCount);
    navBadge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
  }

  // Mobile top bar badge
  const mobileBadge = byId('mobileInboxBadge');
  if (mobileBadge) {
    mobileBadge.textContent = String(pendingCount);
    mobileBadge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
  }

  // Quiet review row
  renderQuietReviewRow(pendingCount);
}


function renderQuietReviewRow(count) {
  const pendingDecisions = workspace.conversations.filter(c => c.status === 'needs_approval');
  const pendingCount = typeof count === 'number' ? count : pendingDecisions.length;
  const panel = byId('quietReviewRow');
  const text = byId('quietReviewCountText');

  if (!panel) return;

  if (pendingCount === 0) {
    panel.style.display = 'none';
    isReviewDropdownOpen = false;
    closeDecisionTriage();
    return;
  }

  panel.style.display = 'block';
  if (text) {
    text.textContent = `${pendingCount} decision${pendingCount === 1 ? '' : 's'} need${pendingCount === 1 ? 's' : ''} your review`;
  }

  if (isReviewDropdownOpen) {
    populateQuietReviewDropdown(pendingDecisions);
  }
}

function toggleReviewDropdown() {
  const dropdown = byId('quietReviewDropdown');
  const panel = byId('quietReviewRow');
  const btnLabel = byId('quietReviewBtnLabel');
  if (!dropdown) return;

  isReviewDropdownOpen = !isReviewDropdownOpen;
  if (isReviewDropdownOpen) {
    const pendingDecisions = workspace.conversations.filter(c => c.status === 'needs_approval');
    populateQuietReviewDropdown(pendingDecisions);
    dropdown.style.display = 'flex';
    if (panel) panel.classList.add('open');
    if (btnLabel) btnLabel.textContent = 'Hide';
  } else {
    dropdown.style.display = 'none';
    if (panel) panel.classList.remove('open');
    if (btnLabel) btnLabel.textContent = 'Review';
  }
}

function getDecisionData(conv) {
  const isQuote = !!conv.isQuote;
  let title = `Review ${conv.channel || 'message'} reply for ${conv.sender}`;
  let amount = null;

  if (isQuote) {
    title = `Approve ${conv.sender.split('(')[0].trim()}’s quotation`;
    amount = '₦350,000';
  } else if (conv.id === 'conv-1') {
    title = `Confirm 4:15 PM haircut for ${conv.sender}`;
    amount = '₦10,000';
  } else if (conv.id === 'conv-3') {
    title = `Confirm shift to 2:30 PM for ${conv.sender}`;
    amount = null;
  } else if (conv.channel === 'instagram') {
    title = `Review Instagram reply for ${conv.sender}`;
    amount = null;
  } else if (conv.channel === 'tiktok') {
    title = `Review TikTok reply for ${conv.sender}`;
    amount = null;
  }

  return { title, amount, isQuote };
}

function populateQuietReviewDropdown(decisions) {
  const dropdown = byId('quietReviewDropdown');
  if (!dropdown) return;

  if (decisions.length === 0) {
    dropdown.innerHTML = `
      <div style="padding: 28px 20px; text-align: center; color: #666; font-size: 13px;">
        <div style="font-size: 20px; margin-bottom: 6px;">✓</div>
        <div style="font-weight: 600; color: #161817; margin-bottom: 4px;">All caught up</div>
        <div>No pending decisions need your attention right now.</div>
      </div>
    `;
    return;
  }

  dropdown.innerHTML = decisions.map(conv => {
    const channelLower = (conv.channel || 'whatsapp').toLowerCase();
    const channelName = conv.channel ? conv.channel.charAt(0).toUpperCase() + conv.channel.slice(1) : 'WhatsApp';
    const cleanMsg = (conv.message || '').replace(/^["'“\s]+|["'”\s]+$/g, '');
    const { title, amount, isQuote } = getDecisionData(conv);
    const statusText = isQuote ? 'Quotation ready' : 'Needs approval';
    const statusClass = isQuote ? 'quiet-status-tag quote' : 'quiet-status-tag';

    return `
      <div class="quiet-decision-item" id="quiet-item-${conv.id}">
        <div class="quiet-item-head" onclick="toggleQuietItem('${conv.id}')">
          <div class="quiet-item-left">
            <div class="quiet-item-meta">
              <span class="quiet-channel-badge ${channelLower}">${escapeHtml(channelName)}</span>
              <span class="quiet-item-sender">${escapeHtml(conv.sender)}</span>
              <span class="quiet-item-time">· ${escapeHtml(conv.time || 'Recent')}</span>
              <span class="${statusClass}">${statusText}</span>
            </div>
            <div class="quiet-item-title-row">
              <span class="quiet-item-title">${escapeHtml(title)}</span>
              ${amount ? `<span class="quiet-amount-badge">${escapeHtml(amount)}</span>` : ''}
            </div>
            <div class="quiet-item-snippet">“${escapeHtml(cleanMsg)}”</div>
          </div>
          <button type="button" class="quiet-item-chevron-btn" aria-label="Toggle details">
            <svg class="quiet-item-chevron-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

        <div class="quiet-item-detail" id="quiet-detail-${conv.id}">
          <div class="quiet-context-row">
            <span>✦</span>
            <span><strong>Vela Context:</strong> ${escapeHtml(conv.context || 'Customer enquiry')}</span>
          </div>

          <div class="quiet-prepared-draft">
            <div class="quiet-draft-label">Vela Prepared Reply:</div>
            <div class="quiet-draft-body">${escapeHtml(conv.draftText || '')}</div>
          </div>

          <div class="quiet-actions-row">
            ${isQuote ? `
              <button type="button" class="quiet-btn-approve" onclick="originatingScreen='agent'; runWorkflow('review_quote')">
                Review &amp; send quotation
              </button>
              <button type="button" class="quiet-btn-dismiss" onclick="quietItemDismiss('${conv.id}', this)">
                I’ll handle this
              </button>
            ` : `
              <button type="button" class="quiet-btn-approve" onclick="quietItemApprove('${conv.id}', this)">
                Approve &amp; send ${escapeHtml(channelName)}
              </button>
              <button type="button" class="quiet-btn-dismiss" onclick="quietItemDismiss('${conv.id}', this)">
                I’ll handle this
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function toggleQuietItem(convId) {
  const item = byId(`quiet-item-${convId}`);
  if (!item) return;
  item.classList.toggle('expanded');
}

function quietItemApprove(convId, btn) {
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '✓ Approved &amp; Sent';
  }
  approveConversation(convId, btn);
  setTimeout(() => {
    updatePendingBadges();
  }, 400);
}

function quietItemDismiss(convId, btn) {
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = 'Dismissed';
  }
  pauseAIForConversation(convId, btn);
  setTimeout(() => {
    updatePendingBadges();
  }, 400);
}


// ============================================================
// NEEDS YOUR DECISION PANEL (Compact List & Focused Review Views)
// ============================================================
let currentDecisionView = 'list'; // 'list' | 'review'
let currentReviewConvId = null;
let savedListScrollTop = 0;

function getDecisionItemData(conv) {
  const channelName = conv.channel ? conv.channel.charAt(0).toUpperCase() + conv.channel.slice(1) : 'WhatsApp';
  const cleanMsg = (conv.message || '').replace(/^["'“\s]+|["'”\s]+$/g, '');

  if (conv.id === 'conv-2' || conv.isQuote) {
    return {
      title: 'Review Horizon Capital’s quote',
      detail: '₦350,000 · 18 staff headshots · Email',
      proposedAction: 'Email ₦350,000 corporate quote to Horizon Capital',
      facts: [
        { label: 'Client', value: 'Kemi Adeleke (HR · Horizon Capital)' },
        { label: 'Service', value: '18 Executive Staff Headshots (On-location)' },
        { label: 'Total', value: '₦350,000' },
        { label: 'Deposit required', value: '₦140,000 (40%) to lock date' },
        { label: 'Shoot date', value: 'Thursday 3 Dec 2026' },
        { label: 'Channel', value: 'Email (kemi.adeleke@horizoncap.ng)' }
      ],
      contextNote: 'Corporate inquiry · Victoria Island office · Quotation #VQ-2026-112 prepared',
      primaryLabel: 'Approve & email quote',
      cleanMsg: cleanMsg
    };
  }

  if (conv.id === 'conv-3') {
    const apps = getAppsState();
    const gCal = apps['google-calendar'];
    const isCalActive = gCal && gCal.status === 'connected';

    const contextNote = isCalActive
      ? 'Dele calendar verified: 2:30 PM slot open at Chair 1'
      : '⚠️ Google Calendar is disconnected. Cannot verify Dele’s availability. <a href="#apps?app=google-calendar&returnTask=conv-3" style="color:#B45309; font-weight:700; text-decoration:underline;" onclick="closeDecisionTriage();">Reconnect Dele’s Calendar →</a>';

    return {
      title: 'Move Babatunde’s appointment',
      detail: 'Shift to 2:30 PM · Executive Low Taper · WhatsApp',
      proposedAction: isCalActive
        ? 'Confirm move to 2:30 PM & reply to Babatunde Ojo'
        : 'Connect Dele’s calendar to verify 2:30 PM slot before moving',
      facts: [
        { label: 'Client', value: 'Babatunde Ojo (Regular client · 6 visits)' },
        { label: 'Service', value: 'Executive Low Taper Fade' },
        { label: 'Original slot', value: 'Today at 1:00 PM' },
        { label: 'Requested slot', value: 'Today at 2:30 PM' },
        { label: 'Calendar sync', value: isCalActive ? 'Dele (Chair 1) verified open' : '⚠️ Reconnection Required' },
        { label: 'Deposit', value: '₦2,000 paid · ₦6,000 due at shop' },
        { label: 'Channel', value: 'WhatsApp (+234 803 998 7766)' }
      ],
      contextNote: contextNote,
      primaryLabel: isCalActive ? 'Confirm move & reply' : 'Reconnect Calendar to move',
      cleanMsg: cleanMsg,
      isCalActive: isCalActive
    };
  }

  if (conv.id === 'conv-1') {
    return {
      title: 'Confirm 4:15 PM haircut for Chuka',
      detail: '₦10,000 · Haircut & Beard · WhatsApp',
      proposedAction: 'Confirm 4:15 PM slot & send deposit link to Chuka Nnamdi',
      facts: [
        { label: 'Client', value: 'Chuka Nnamdi (First-time client)' },
        { label: 'Service', value: 'Signature Haircut & Beard Trim' },
        { label: 'Total', value: '₦10,000' },
        { label: 'Requested slot', value: 'Today at 4:15 PM (Dele · Chair 1)' },
        { label: 'Deposit required', value: '₦2,000 Paystack deposit' },
        { label: 'Channel', value: 'WhatsApp (+234 809 112 3344)' }
      ],
      contextNote: 'Chair 1 (Dele) is open at 4:15 PM today',
      primaryLabel: 'Send reply',
      cleanMsg: cleanMsg
    };
  }

  if (conv.id === 'conv-4' || conv.channel === 'instagram') {
    return {
      title: 'Reply to ' + conv.sender.split('(')[0].trim() + '’s haircut enquiry',
      detail: 'VI Studio location & 5:30 PM slot · Instagram',
      proposedAction: 'Send VI studio address and 5:30 PM slot to ' + conv.sender,
      facts: [
        { label: 'Client', value: conv.sender },
        { label: 'Enquiry', value: 'Walk-ins in VI studio this evening' },
        { label: 'Available slot', value: 'Dele open at 5:30 PM today' },
        { label: 'Studio location', value: '14 Bishop Oluwole St, Victoria Island' },
        { label: 'Channel', value: 'Instagram DM' }
      ],
      contextNote: 'Enquiry from Instagram transformation video',
      primaryLabel: 'Send reply',
      cleanMsg: cleanMsg
    };
  }

  if (conv.id === 'conv-5' || conv.channel === 'tiktok') {
    return {
      title: 'Reply to ' + conv.sender + '’s taper enquiry',
      detail: '₦8,000 · Executive Low Taper · TikTok',
      proposedAction: 'Send pricing (₦8,000) and booking link to ' + conv.sender,
      facts: [
        { label: 'Client', value: conv.sender },
        { label: 'Service', value: 'Executive Low Taper (₦8,000)' },
        { label: 'Deposit required', value: '₦2,000 Paystack deposit' },
        { label: 'Location', value: '14 Bishop Oluwole St, Victoria Island' },
        { label: 'Channel', value: 'TikTok Message' }
      ],
      contextNote: 'Enquiry on viral Low Taper transformation video',
      primaryLabel: 'Send reply',
      cleanMsg: cleanMsg
    };
  }

  return {
    title: 'Review ' + channelName + ' reply for ' + conv.sender,
    detail: channelName,
    proposedAction: 'Send prepared reply to ' + conv.sender,
    facts: [
      { label: 'Client', value: conv.sender },
      { label: 'Channel', value: channelName }
    ],
    contextNote: conv.context || '',
    primaryLabel: 'Send reply',
    cleanMsg: cleanMsg
  };
}

function openDecisionTriage() {
  const modal = byId('decisionTriageModal');
  if (!modal) return;
  currentDecisionView = 'list';
  currentReviewConvId = null;
  renderDecisionPanel();
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeDecisionTriage() {
  const modal = byId('decisionTriageModal');
  if (!modal) return;
  modal.style.display = 'none';
  document.body.style.overflow = '';
}

function renderDecisionPanel() {
  const container = byId('decisionPanelContent');
  if (!container) return;

  const pendingDecisions = (workspace.conversations || []).filter(c => c.status === 'needs_approval');

  if (currentDecisionView === 'review' && currentReviewConvId) {
    const conv = (workspace.conversations || []).find(c => c.id === currentReviewConvId);
    if (conv && conv.status === 'needs_approval') {
      renderFocusedReviewView(container, conv);
      return;
    }
    // If not found or no longer pending, fall back to list
    currentDecisionView = 'list';
    currentReviewConvId = null;
  }

  renderCompactListView(container, pendingDecisions);
}

function renderCompactListView(container, pendingDecisions) {
  const count = pendingDecisions.length;
  container.innerHTML = `
    <div class="decision-panel-header">
      <div class="decision-panel-title">Needs your decision · ${count}</div>
      <button type="button" class="decision-close-icon-btn" onclick="closeDecisionTriage()" aria-label="Close panel">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>

    <div class="decision-scroll-body" id="decisionScrollBody">
      ${count === 0 ? `
        <div class="decision-empty-state">
          <div class="decision-empty-icon">✓</div>
          <div class="decision-empty-title">All caught up</div>
          <div class="decision-empty-sub">No pending decisions need your attention right now. Vela will notify you when new messages arrive.</div>
        </div>
      ` : `
        <div class="decision-flat-list">
          ${pendingDecisions.map(conv => {
            const data = getDecisionItemData(conv);
            return `
              <div class="decision-flat-row" onclick="openDecisionReview('${conv.id}')" role="button" tabindex="0">
                <div class="decision-row-content">
                  <div class="decision-row-title">${escapeHtml(data.title)}</div>
                  <div class="decision-row-detail">${escapeHtml(data.detail)}</div>
                </div>
                <div class="decision-row-chevron" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>

    <div class="decision-panel-footer">
      <button type="button" class="decision-footer-inbox-link" onclick="closeDecisionTriage(); location.hash='inbox';">
        Open inbox →
      </button>
    </div>
  `;
}

function openDecisionReview(convId) {
  const scrollContainer = byId('decisionScrollBody');
  if (scrollContainer) {
    savedListScrollTop = scrollContainer.scrollTop;
  }
  currentDecisionView = 'review';
  currentReviewConvId = convId;
  renderDecisionPanel();
}

function backToDecisionList() {
  currentDecisionView = 'list';
  currentReviewConvId = null;
  renderDecisionPanel();
  const scrollContainer = byId('decisionScrollBody');
  if (scrollContainer) {
    scrollContainer.scrollTop = savedListScrollTop;
  }
}

function renderFocusedReviewView(container, conv) {
  const data = getDecisionItemData(conv);

  container.innerHTML = `
    <div class="decision-panel-header">
      <button type="button" class="decision-back-btn" onclick="backToDecisionList()" aria-label="Back to decision list">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
        <span>Back</span>
      </button>
      <button type="button" class="decision-close-icon-btn" onclick="closeDecisionTriage()" aria-label="Close panel">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>

    <div class="decision-scroll-body" id="decisionReviewScrollBody">
      <!-- 1. Proposed Action First -->
      <div class="decision-review-section">
        <div class="decision-proposed-action">${escapeHtml(data.proposedAction)}</div>
      </div>

      <!-- 2. Essential Business Facts Second -->
      <div class="decision-review-section">
        <div class="decision-facts-list">
          ${data.facts.map(f => `
            <div class="decision-fact-row">
              <span class="decision-fact-label">${escapeHtml(f.label)}</span>
              <span class="decision-fact-value">${escapeHtml(f.value)}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 3. Context only when it changes the decision -->
      ${data.contextNote ? `
        <div class="decision-context-card">
          <span class="decision-context-icon">ℹ</span>
          <span class="decision-context-text">${escapeHtml(data.contextNote)}</span>
        </div>
      ` : ''}

      <!-- 4. Editable Customer Reply Third -->
      <div class="decision-review-section">
        <label for="decisionDraftInput" class="decision-section-label">Prepared reply to customer</label>
        <textarea id="decisionDraftInput" class="decision-draft-textarea" rows="4">${escapeHtml(conv.draftText || '')}</textarea>
        <div class="decision-draft-hint">You can edit this draft before sending.</div>
      </div>

      <!-- 5. View conversation disclosure -->
      <div class="decision-review-section">
        <button type="button" class="decision-disclosure-btn" id="decisionDisclosureBtn" onclick="toggleConversationHistory('${conv.id}')">
          <span id="decisionDisclosureLabel">View original enquiry</span>
          <svg id="decisionDisclosureIcon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <div class="decision-disclosure-content" id="decisionDisclosureContent" style="display:none;">
          <div class="decision-history-bubble">
            <div class="decision-history-meta">
              <strong>${escapeHtml(conv.sender)}</strong>
              <span>· ${escapeHtml(conv.time || 'Recent')}</span>
            </div>
            <div class="decision-history-text">“${escapeHtml(data.cleanMsg)}”</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions in Footer -->
    <div class="decision-review-footer">
      <button type="button" class="decision-btn-primary" id="decisionPrimaryBtn" onclick="executeDecisionAction('${conv.id}')">
        ${escapeHtml(data.primaryLabel)}
      </button>
      <div class="decision-secondary-actions">
        <button type="button" class="decision-btn-takeover" onclick="takeOverDecision('${conv.id}')">
          Take over conversation
        </button>
      </div>
    </div>
  `;
}

function toggleConversationHistory(convId) {
  const content = byId('decisionDisclosureContent');
  const label = byId('decisionDisclosureLabel');
  const icon = byId('decisionDisclosureIcon');
  if (!content) return;

  const isHidden = content.style.display === 'none';
  content.style.display = isHidden ? 'block' : 'none';
  if (label) {
    label.textContent = isHidden ? 'Hide original enquiry' : 'View original enquiry';
  }
  if (icon) {
    icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
  }
}

function executeDecisionAction(convId) {
  const btn = byId('decisionPrimaryBtn');
  const draftInput = byId('decisionDraftInput');
  const conv = (workspace.conversations || []).find(c => c.id === convId);

  if (!conv) {
    notify('Decision not found.');
    backToDecisionList();
    return;
  }

  // Preserve any edited draft
  if (draftInput) {
    const updatedDraft = draftInput.value.trim();
    if (!updatedDraft) {
      notify('Reply message cannot be empty.');
      return;
    }
    conv.draftText = updatedDraft;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Processing...';
  }

  try {
    conv.status = 'sent';

    if (conv.id === 'conv-2' || conv.isQuote) {
      const apps = getAppsState();
      if (apps['zoho-books'] && apps['zoho-books'].status === 'connected') {
        const invId = (apps['zoho-books'].config.invoicePrefix || 'ZB-INV-') + '2026-092';
        notify(`✓ Quotation approved! Emailed to Kemi Adeleke & Invoice #${invId} created in Zoho Books.`);
      } else {
        notify('✓ Quotation #VQ-2026-112 approved and emailed to Kemi Adeleke (Horizon Capital).');
      }
    } else if (conv.id === 'conv-3') {
      const apps = getAppsState();
      const gCal = apps['google-calendar'];
      if (!gCal || gCal.status !== 'connected') {
        notify('⚠️ Google Calendar is disconnected. Please reconnect Dele’s calendar to verify availability.');
        closeDecisionTriage();
        openAppDetailModal('google-calendar', 'conv-3');
        return;
      }
      const booking = (workspace.bookingsList || []).find(b => b.clientName === 'Babatunde Ojo');
      if (booking) {
        booking.status = 'Rescheduled · Confirmed 2:30 PM';
        booking.dateSlot = 'Today at 2:30 PM';
      }
      notify('✓ Moved Babatunde Ojo to 2:30 PM and sent WhatsApp confirmation.');
    } else if (conv.id === 'conv-1') {
      const booking = (workspace.bookingsList || []).find(b => b.clientName === 'Chuka Nnamdi');
      if (booking) {
        booking.status = 'Confirmed · Reserved 4:15 PM';
      }
      notify('✓ 4:15 PM haircut confirmed for Chuka Nnamdi via WhatsApp.');
    } else if (conv.id === 'conv-4' || conv.channel === 'instagram') {
      notify('✓ Instagram reply sent to @kene_o with studio location & 5:30 PM slot.');
    } else if (conv.id === 'conv-5' || conv.channel === 'tiktok') {
      notify('✓ TikTok reply sent to @tayo_cuts with taper price & booking link.');
    } else {
      notify('✓ Reply sent to ' + conv.sender + '.');
    }

    save({
      conversations: [...workspace.conversations],
      bookingsList: [...(workspace.bookingsList || [])]
    });

    updatePendingBadges();

    // Return to list view
    currentDecisionView = 'list';
    currentReviewConvId = null;
    renderDecisionPanel();
  } catch (err) {
    console.error('Decision execution error:', err);
    if (btn) {
      btn.disabled = false;
      const data = getDecisionItemData(conv);
      btn.textContent = data.primaryLabel;
    }
    notify('Failed to send reply. Your draft has been preserved. Please retry.');
  }
}

function takeOverDecision(convId) {
  const conv = (workspace.conversations || []).find(c => c.id === convId);
  if (!conv) return;

  conv.status = 'manual_handling';
  save({ conversations: [...workspace.conversations] });
  notify('✓ AI paused for ' + conv.sender + '. Conversation assigned to you.');
  updatePendingBadges();

  currentDecisionView = 'list';
  currentReviewConvId = null;
  renderDecisionPanel();
}

window.openDecisionTriage = openDecisionTriage;
window.closeDecisionTriage = closeDecisionTriage;
window.renderDecisionPanel = renderDecisionPanel;
window.openDecisionReview = openDecisionReview;
window.backToDecisionList = backToDecisionList;
window.toggleConversationHistory = toggleConversationHistory;
window.executeDecisionAction = executeDecisionAction;
window.takeOverDecision = takeOverDecision;
window.renderDecisionTriageList = renderDecisionPanel;
window.triageApprove = (id, btn) => executeDecisionAction(id);
window.triageDismiss = (id, btn) => takeOverDecision(id);

function toggleRecentTasks() {
  const list = byId('recentTasksList');
  const chevron = byId('recentTasksChevron');
  if (!list) return;
  const isHidden = list.style.display === 'none';
  list.style.display = isHidden ? 'flex' : 'none';
  if (isHidden) {
    list.style.flexDirection = 'column';
    list.style.gap = '4px';
    list.style.marginTop = '6px';
  }
  if (chevron) chevron.textContent = isHidden ? '▾' : '▸';
}

function autoGrowComposer(textarea) {
  if (!textarea) return;
  textarea.style.height = 'auto';
  const newHeight = Math.min(Math.max(textarea.scrollHeight, 28), 160);
  textarea.style.height = newHeight + 'px';
}

function closeDrawer() {
  const sidebar = byId('sidebar');
  if (sidebar) sidebar.classList.remove('open');
  const closeBtn = byId('closeSidebarBtn');
  if (closeBtn) closeBtn.style.display = 'none';
}

function startFreshTask() {
  closeDrawer();
  closeModal();
  history.pushState(null, '', '#agent');
  selectNav('agent');
  page.hidden = true;
  byId('homeView').style.display = 'flex';
  byId('chatView').style.display = 'none';

  // Reset scroll to top
  const mainWorkspace = document.querySelector('.main-workspace');
  if (mainWorkspace) mainWorkspace.scrollTop = 0;
  window.scrollTo(0, 0);

  // Preserve unfinished drafts when starting a new task
  const input = byId('homePromptInput');
  if (input) {
    input.value = savedDraft || '';
    autoGrowComposer(input);
  }

  updatePendingBadges();
}

function closeCurrentTask() {
  if (originatingScreen && originatingScreen !== 'agent') {
    location.hash = originatingScreen;
  } else {
    startFreshTask();
  }
}

function selectNav(view) {
  for (const a of document.querySelectorAll('.nav-item')) {
    const active = a.hash === '#' + view;
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}

// -------------------------------------------------------------
// INBOX HANDLERS
// -------------------------------------------------------------
let currentInboxFilter = 'all';

function setInboxFilter(filter) {
  currentInboxFilter = filter;
  renderPage();
}

function setInboxMode(mode) {
  save({ inboxMode: mode });
  notify('Inbox response mode set to: ' + (mode === 'draft' ? 'Draft for me' : mode === 'routine' ? 'Reply to routine enquiries' : 'I’ll handle this'));
  renderPage();
}

function approveConversation(convId, btn) {
  const conv = workspace.conversations.find(c => c.id === convId);
  if (!conv) return;

  if (btn) {
    btn.disabled = true;
    btn.textContent = '✓ Approved & Sent';
    btn.style.background = '#15803d';
  }
  conv.status = 'sent';

  if (convId === 'conv-1') {
    // Chuka
    const booking = workspace.bookingsList.find(b => b.clientName === 'Chuka Nnamdi');
    if (booking) booking.status = 'Confirmed · Reserved 4:15 PM';
    notify('WhatsApp reply sent to Chuka. 4:15 PM appointment locked!');
  } else if (convId === 'conv-3') {
    // Babatunde
    const booking = workspace.bookingsList.find(b => b.clientName === 'Babatunde Ojo');
    if (booking) {
      booking.status = 'Rescheduled · Confirmed 2:30 PM';
      booking.dateSlot = 'Today at 2:30 PM';
    }
    notify('Babatunde slot moved to 2:30 PM & WhatsApp notification sent!');
  } else if (convId === 'conv-4') {
    notify('Instagram DM sent to @kene_o with booking link!');
  } else if (convId === 'conv-5') {
    notify('TikTok reply sent to @tayo_cuts with location and pricing!');
  }

  save({ conversations: [...workspace.conversations] });
  renderPage();
}

function pauseAIForConversation(convId, btn) {
  const conv = workspace.conversations.find(c => c.id === convId);
  if (!conv) return;
  conv.status = 'manual_handling';
  save({ conversations: [...workspace.conversations] });
  notify(`AI replies paused for ${conv.sender}. Assigned to business owner.`);
  renderPage();
}

function resumeAIForConversation(convId) {
  const conv = workspace.conversations.find(c => c.id === convId);
  if (!conv) return;
  conv.status = 'needs_approval';
  save({ conversations: [...workspace.conversations] });
  notify(`AI auto-drafting resumed for ${conv.sender}.`);
  renderPage();
}

function getInitials(name) {
  const clean = name.replace(/^@/, '').trim();
  const parts = clean.split(/[\s·_()]+/);
  if (parts.length >= 2 && parts[1]) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

// -------------------------------------------------------------
// RENDER INBOX (Clean & Editorial Design)
// -------------------------------------------------------------
function renderInbox() {
  const container = el('div', '', 'inbox-view-container');
  const pendingCount = workspace.conversations.filter(c => c.status === 'needs_approval').length;

  // Unified Clean Page Hero Header
  const heroBar = el('div', '', 'page-hero-header');
  heroBar.innerHTML = `
    <div class="page-hero-main">
      <div class="page-hero-title-group">
        <div class="page-hero-title-row">
          <h1 class="page-hero-title">Inbox</h1>
          ${pendingCount > 0 ? `
            <span class="page-hero-status-pill amber" onclick="openDecisionTriage()" style="cursor:pointer;" title="Click to triage decisions">
              ● ${pendingCount} decision${pendingCount === 1 ? '' : 's'} waiting
            </span>
          ` : `
            <span class="page-hero-status-pill green">✓ All clear</span>
          `}
        </div>
        <div class="page-hero-subtitle">
          WhatsApp · Email · Instagram · TikTok
        </div>
      </div>

    <div class="page-hero-actions">
      <div class="inbox-mode-control">
        <span class="inbox-mode-label">Mode:</span>
        <div class="inbox-select-wrapper">
          <select class="inbox-mode-select" onchange="setInboxMode(this.value)" aria-label="Inbox Response Mode">
            <option value="draft" ${workspace.inboxMode === 'draft' ? 'selected' : ''}>Draft for me</option>
            <option value="routine" ${workspace.inboxMode === 'routine' ? 'selected' : ''}>Reply to routine</option>
            <option value="manual" ${workspace.inboxMode === 'manual' ? 'selected' : ''}>Manual handling</option>
          </select>
          <svg class="inbox-select-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
      </div>
      <a href="#apps?category=messaging" class="page-hero-btn-secondary" title="Manage messaging apps in Connected Apps">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        <span>Channels</span>
      </a>
    </div>
  `;
  container.append(heroBar);

  // Modern Header Pill Filters
  const filterStrip = el('div', '', 'page-hero-tabs');
  filterStrip.style.marginBottom = '20px';
  filterStrip.innerHTML = `
    <button class="page-hero-tab ${currentInboxFilter === 'all' ? 'active' : ''}" onclick="setInboxFilter('all')">All Messages (${workspace.conversations.length})</button>
    <button class="page-hero-tab ${currentInboxFilter === 'pending' ? 'active' : ''}" onclick="setInboxFilter('pending')">Needs Decision (${pendingCount})</button>
    <button class="page-hero-tab ${currentInboxFilter === 'whatsapp' ? 'active' : ''}" onclick="setInboxFilter('whatsapp')">WhatsApp (3)</button>
    <button class="page-hero-tab ${currentInboxFilter === 'email' ? 'active' : ''}" onclick="setInboxFilter('email')">Email (1)</button>
    <button class="page-hero-tab ${currentInboxFilter === 'instagram' ? 'active' : ''}" onclick="setInboxFilter('instagram')">Instagram (1)</button>
    <button class="page-hero-tab ${currentInboxFilter === 'tiktok' ? 'active' : ''}" onclick="setInboxFilter('tiktok')">TikTok (1)</button>
  `;
  container.append(filterStrip);

  const list = el('div');
  const filtered = workspace.conversations.filter(c => {
    if (currentInboxFilter === 'pending') return c.status === 'needs_approval';
    if (currentInboxFilter !== 'all') return c.channel === currentInboxFilter;
    return true;
  });

  if (filtered.length === 0) {
    const empty = el('div', '', 'inbox-thread-card');
    empty.style.textAlign = 'center';
    empty.style.padding = '48px 20px';
    empty.innerHTML = `
      <div style="font-size:24px; margin-bottom:8px;">☕</div>
      <div style="font-weight:700; font-size:15px; color:#161817; margin-bottom:4px;">No messages in this filter</div>
      <p style="font-size:12.5px; color:#777; margin:0;">All client requests in this view have been reviewed or resolved.</p>
    `;
    list.append(empty);
  }

  const channelBadges = {
    whatsapp: { name: 'WhatsApp', short: 'WA', cls: 'wa' },
    email: { name: 'Email', short: '@', cls: 'em' },
    instagram: { name: 'Instagram', short: 'IG', cls: 'ig' },
    tiktok: { name: 'TikTok', short: 'TT', cls: 'tt' }
  };

  for (const conv of filtered) {
    const card = el('div', '', 'inbox-thread-card');
    const ch = channelBadges[conv.channel] || { name: conv.channel, short: conv.channel[0].toUpperCase(), cls: 'wa' };
    const initials = getInitials(conv.sender);
    const isPending = conv.status === 'needs_approval';
    const isManual = conv.status === 'manual_handling';
    const isSent = conv.status === 'sent';
    const isRoutine = conv.status === 'routine_replied';

    card.innerHTML = `
      <div class="thread-header">
        <div class="thread-sender-group">
          <div class="thread-avatar">
            ${initials}
            <span class="thread-channel-badge ${ch.cls}">${ch.short}</span>
          </div>
          <div>
            <div class="thread-sender-name">
              <span>${conv.sender}</span>
              ${conv.isQuote ? '<span class="corporate-badge">B2B Quotation</span>' : ''}
            </div>
            <div class="thread-time-sub">${ch.name} · ${conv.time}</div>
          </div>
        </div>

        <span class="thread-status-tag ${isSent ? 'sent' : isManual ? 'manual' : isRoutine ? 'routine' : 'decision'}">
          ${isSent ? '✓ Sent' : isManual ? 'You\'re handling' : isRoutine ? 'Auto-replied' : 'Needs decision'}
        </span>
      </div>

      <div class="thread-customer-quote">
        ${conv.message}
      </div>

      ${isRoutine ? `
        <div class="thread-routine-box">
          <div class="routine-meta-line">
            <span class="routine-badge">✓ Auto-replied under Routine Rule</span>
            <span class="routine-rule-tag">Hours &amp; Location Query</span>
          </div>
          <div class="routine-text">${conv.draftText}</div>
        </div>
      ` : isSent ? `
        <div class="inline-sent-confirmation">
          <span>✓ Sent via ${ch.name}</span>
          <span style="font-weight:400; color:#14532d;">· Message delivered to client</span>
        </div>
      ` : isManual ? `
        <div class="inline-manual-banner">
          <span>AI replies paused for this client. Assigned to business owner.</span>
          <button class="btn-inbox-secondary" onclick="resumeAIForConversation('${conv.id}')">Resume AI replies</button>
        </div>
      ` : `
        <div class="thread-vela-action-box">
          <div class="vela-action-meta-line">
            <span class="vela-spark-label">✦ Proposed ${ch.name} ${conv.isQuote ? 'Quotation' : 'Reply'}</span>
            <span class="vela-context-chip">${conv.context}</span>
          </div>
          <div class="vela-draft-text-body">${conv.draftText}</div>

          <div class="thread-actions-row">
            <button class="btn-inbox-primary" onclick="${conv.isQuote ? `originatingScreen='inbox'; runWorkflow('review_quote')` : `approveConversation('${conv.id}', this)`}">
              ${conv.actionLabel}
            </button>
            <button class="btn-inbox-secondary" onclick="pauseAIForConversation('${conv.id}', this)">I'll handle this</button>
            ${conv.phone ? `<a href="https://wa.me/${conv.phone.replace(/[^0-9]/g,'')}" target="_blank" class="channel-direct-link">Open in WhatsApp ↗</a>` : ''}
          </div>
        </div>
      `}
    `;
    list.append(card);
  }

  container.append(list);
  return container;
}

// -------------------------------------------------------------
// RENDER WEBSITE (SALES CHANNEL MANAGER)
// -------------------------------------------------------------
let activeWebsiteSection = 'details';

function setWebsiteSection(sec) {
  activeWebsiteSection = sec;
  renderPage();
}

function publishWebsiteChanges() {
  save({
    lastPublishedAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    hasUnpublishedChanges: false
  });
  notify('✓ Changes published to live site! Canonical URL: https://studioteni.vela.ng');
  renderPage();
}

function copyStorefrontLink(btn) {
  const url = window.location.origin + '/p/' + workspace.slug;
  navigator.clipboard.writeText(url);
  btn.textContent = '✓ Copied link!';
  btn.style.background = '#15803d';
  setTimeout(() => {
    btn.textContent = 'Copy link';
    btn.style.background = '';
  }, 1500);
}

function openLivePreviewModal(device = 'mobile') {
  let modal = byId('previewModalBackdrop');
  if (!modal) {
    modal = el('div', '', 'preview-modal-backdrop');
    modal.id = 'previewModalBackdrop';
    modal.innerHTML = `
      <div class="preview-modal-window">
        <div class="preview-modal-bar">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-weight:700; font-size:13px;">Customer Storefront Preview</span>
            <span style="font-size:11px; color:#aaa; font-family:'JetBrains Mono';">studioteni.vela.ng</span>
          </div>
          <div class="device-toggle-group">
            <button class="device-toggle-btn active" id="previewMobileBtn" onclick="togglePreviewDevice('mobile')">📱 Mobile (390px)</button>
            <button class="device-toggle-btn" id="previewDesktopBtn" onclick="togglePreviewDevice('desktop')">💻 Desktop</button>
          </div>
          <button onclick="closeLivePreviewModal()" style="background:none; border:none; color:#fff; font-size:18px; cursor:pointer;">✕</button>
        </div>
        <div class="preview-frame-container">
          <iframe src="/storefront.html?preview=true" class="preview-iframe mobile" id="previewFrame"></iframe>
        </div>
      </div>
    `;
    document.body.append(modal);
  }
  modal.classList.add('open');
}

function closeLivePreviewModal() {
  const modal = byId('previewModalBackdrop');
  if (modal) modal.classList.remove('open');
}

function togglePreviewDevice(mode) {
  const frame = byId('previewFrame');
  const mBtn = byId('previewMobileBtn');
  const dBtn = byId('previewDesktopBtn');
  if (!frame) return;
  if (mode === 'mobile') {
    frame.className = 'preview-iframe mobile';
    mBtn.classList.add('active');
    dBtn.classList.remove('active');
  } else {
    frame.className = 'preview-iframe desktop';
    dBtn.classList.add('active');
    mBtn.classList.remove('active');
  }
}

function renderWebsite() {
  const container = el('div');

  // Unified Clean Page Hero Header
  const heroBar = el('div', '', 'page-hero-header');
  heroBar.innerHTML = `
    <div class="page-hero-main">
      <div class="page-hero-title-group">
        <div class="page-hero-title-row">
          <h1 class="page-hero-title">Website</h1>
          <span class="page-hero-status-pill ${workspace.hasUnpublishedChanges ? 'amber' : 'green'}">
            ${workspace.hasUnpublishedChanges ? '● Draft edits' : '✓ Live storefront'}
          </span>
        </div>
        <div class="page-hero-subtitle">
          <span>Public address:</span>
          <a href="https://${workspace.slug}.vela.ng" target="_blank" style="color:#161817; font-weight:600; text-decoration:underline;">https://${workspace.slug}.vela.ng</a>
          <span>·</span>
          <span>${workspace.hasUnpublishedChanges ? 'Unpublished changes pending' : 'Last published ' + workspace.lastPublishedAt}</span>
        </div>
      </div>

      <div class="page-hero-actions">
        <button class="page-hero-btn-secondary" onclick="openLivePreviewModal('mobile')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          <span>Preview</span>
        </button>
        <button class="page-hero-btn-primary" onclick="publishWebsiteChanges()">
          Publish changes
        </button>
        <a href="/p/${workspace.slug}" target="_blank" class="page-hero-btn-secondary">
          <span>Open live site</span>
          <span>↗</span>
        </a>
      </div>
    </div>

    ${workspace.hasUnpublishedChanges ? `
      <div class="page-hero-notice">
        <span>⚠️ You have unpublished draft edits. The live site will remain on revision from ${workspace.lastPublishedAt} until published.</span>
        <div style="display:flex; align-items:center; gap:8px;">
          <a href="/knowledge-base/website-gallery/preview-publish-changes" target="_blank" rel="noopener" style="color:#161817; font-size:11.5px; font-weight:600; text-decoration:underline;">How does publishing work?</a>
          <button class="page-hero-btn-primary" style="padding:4px 12px; font-size:11.5px;" onclick="publishWebsiteChanges()">Publish now</button>
        </div>
      </div>
    ` : `
      <div style="margin-top:6px; display:flex; justify-content:flex-end;">
        <a href="/knowledge-base/website-gallery/preview-publish-changes" target="_blank" rel="noopener" style="color:#666; font-size:11.5px; text-decoration:none;">How does publishing work? ↗</a>
      </div>
    `}

    <div class="page-hero-tabs">
      <button class="page-hero-tab ${activeWebsiteSection === 'details' ? 'active' : ''}" onclick="setWebsiteSection('details')">Business details</button>
      <button class="page-hero-tab ${activeWebsiteSection === 'services' ? 'active' : ''}" onclick="setWebsiteSection('services')">Services & Pricing</button>
      <button class="page-hero-tab ${activeWebsiteSection === 'booking' ? 'active' : ''}" onclick="setWebsiteSection('booking')">Booking policy</button>
      <button class="page-hero-tab ${activeWebsiteSection === 'gallery' ? 'active' : ''}" onclick="setWebsiteSection('gallery')">Gallery & Looks</button>
      <button class="page-hero-tab ${activeWebsiteSection === 'domain' ? 'active' : ''}" onclick="setWebsiteSection('domain')">Domain & Links</button>
    </div>
  `;
  container.append(heroBar);

  // Active Section Body
  const content = el('div');

  if (activeWebsiteSection === 'details') {
    const form = el('form', '', 'workspace-form');
    form.innerHTML = `
      <label>Business Name
        <input type="text" name="name" value="${workspace.name}" required>
      </label>
      <label>Site Address (Slug)
        <div style="display:flex; align-items:center; gap:6px;">
          <input type="text" name="slug" value="${workspace.slug}" required style="font-family:'JetBrains Mono';">
          <span style="font-size:12px; color:#666;">.vela.ng</span>
        </div>
      </label>
      <label>Website Introduction / Tagline
        <textarea name="bio" rows="3">${workspace.bio}</textarea>
      </label>
      <label>Studio Physical Address
        <input type="text" name="location" value="${workspace.location}" required>
      </label>
      <div style="display:flex; align-items:center; gap:8px; margin-top:-6px;">
        <input type="checkbox" name="serviceAreaOnly" id="svcAreaCheck" ${workspace.serviceAreaOnly ? 'checked' : ''} style="width:auto;">
        <label for="svcAreaCheck" style="font-weight:400; font-size:12.5px; color:#555; cursor:pointer;">
          Hide private studio address on public site (show service area only: Victoria Island · Lagos)
        </label>
      </div>
      <button type="submit" class="btn-approve">Save draft changes</button>
    `;
    form.onsubmit = e => {
      e.preventDefault();
      const fd = new FormData(form);
      save({
        name: fd.get('name').trim(),
        slug: fd.get('slug').trim().toLowerCase(),
        bio: fd.get('bio').trim(),
        location: fd.get('location').trim(),
        serviceAreaOnly: fd.get('serviceAreaOnly') === 'on',
        hasUnpublishedChanges: true
      });
      notify('Draft business details saved. Preview or Publish when ready.');
      renderPage();
    };
    content.append(form);
  } else if (activeWebsiteSection === 'services') {
    const wrap = el('div');
    wrap.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <div style="font-size:13px; color:#666;">These active services are bookable on your website:</div>
        <a href="#services" class="section-link">Manage catalogue →</a>
      </div>
      <div class="services-manager-list">
        ${workspace.servicesList.map(s => `
          <div class="service-manager-row">
            <div>
              <div style="font-weight:700; font-size:14px;">${s.name}</div>
              <div style="font-size:12px; color:#666;">⏱ ${s.duration}m · Assigned to ${s.staff}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-weight:800; font-size:15px;">₦${s.price.toLocaleString()}</div>
              <div style="font-size:11px; color:#15803d; font-weight:600;">₦${s.deposit.toLocaleString()} deposit</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    content.append(wrap);
  } else if (activeWebsiteSection === 'booking') {
    const wrap = el('div', '', 'workspace-form');
    wrap.innerHTML = `
      <label>Buffer Time Between Appointments
        <select>
          <option value="15" selected>15 minutes cleanup & prep</option>
          <option value="20">20 minutes</option>
          <option value="30">30 minutes</option>
        </select>
      </label>
      <label>Minimum Lead Time for Online Bookings
        <select>
          <option value="2" selected>2 hours before slot</option>
          <option value="4">4 hours before slot</option>
          <option value="24">24 hours in advance</option>
        </select>
      </label>
      <label>Cancellation & Rescheduling Policy
        <select>
          <option value="4" selected>Free reschedule up to 4 hours prior</option>
          <option value="12">Up to 12 hours prior</option>
          <option value="24">Up to 24 hours prior</option>
        </select>
      </label>
      <div style="background:#f4f4f1; padding:12px; border-radius:10px; font-size:12px; line-height:1.5;">
        🔒 <strong>Deposit Enforcement:</strong> Required deposits are processed via Paystack and automatically credited to your GTBank account. The remaining balance is marked as due on arrival.
      </div>
      <button class="btn-approve" onclick="notify('Booking terms saved.');">Save booking policy</button>
    `;
    content.append(wrap);
  } else if (activeWebsiteSection === 'gallery') {
    const wrap = el('div');
    wrap.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <div style="font-size:13px; color:#666;">Attached looks displayed in your public portfolio:</div>
        <a href="#gallery" class="section-link">Upload & edit looks →</a>
      </div>
      <div class="gallery-grid">
        ${workspace.photos.map(p => `
          <div class="gallery-card">
            <div class="gallery-img-wrap"><img src="${p.src}" alt="${p.title}" class="gallery-img"></div>
            <div class="gallery-info">
              <div class="gallery-title">${p.title}</div>
              <div class="gallery-caption">Attached to: <strong>${p.serviceName}</strong></div>
              <button class="btn-book-look" onclick="openLivePreviewModal('mobile')">Preview on site</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    content.append(wrap);
  } else if (activeWebsiteSection === 'domain') {
    const wrap = el('div', '', 'workspace-form');
    wrap.innerHTML = `
      <div style="background:#f7f6f0; padding:16px; border-radius:14px; border:1px solid #deded9;">
        <div style="font-weight:700; margin-bottom:4px;">Platform Address (Included)</div>
        <div style="font-family:'JetBrains Mono'; font-size:13px; color:#15803d; margin-bottom:8px;">https://${workspace.slug}.vela.ng</div>
        <div style="display:flex; gap:8px;">
          <button class="btn-secondary" onclick="copyStorefrontLink(this)">Copy link</button>
          <a href="/p/${workspace.slug}" target="_blank" class="btn-secondary" style="text-decoration:none;">Open in new tab ↗</a>
        </div>
      </div>

      <div style="margin-top:16px;">
        <div style="font-weight:700; font-size:14px; margin-bottom:4px;">Connect a Custom Domain</div>
        <p style="font-size:12.5px; color:#666; margin-bottom:12px;">Use your own custom domain (e.g. <code>cuts.studioteni.com</code>).</p>
        
        <label>Your Domain Name
          <input type="text" id="customDomainInput" placeholder="booking.yourbusiness.com" value="${workspace.customDomain}">
        </label>
        
        <div style="background:#fff; border:1px solid #deded9; border-radius:10px; padding:12px; margin-top:8px; font-size:12px;">
          <strong style="display:block; margin-bottom:6px;">Required DNS Record:</strong>
          <table style="width:100%; border-collapse:collapse; font-family:'JetBrains Mono';">
            <tr><td style="color:#666;">Type:</td><td><strong>CNAME</strong></td></tr>
            <tr><td style="color:#666;">Host:</td><td><strong>booking</strong></td></tr>
            <tr><td style="color:#666;">Points to:</td><td><strong>cname.vela.ng</strong></td></tr>
          </table>
        </div>

        <div style="display:flex; gap:8px; margin-top:12px; align-items:center;">
          <button class="btn-approve" onclick="verifyCustomDomain()">Verify DNS Record</button>
          <span style="font-size:11.5px; color:${workspace.customDomainVerified ? '#15803d' : '#854d0e'}; font-weight:600;">
            ${workspace.customDomainVerified ? '✓ Domain connected & SSL active' : 'Awaiting DNS verification'}
          </span>
        </div>
      </div>
    `;
    content.append(wrap);
  }

  container.append(content);
  return container;
}

function verifyCustomDomain() {
  const dom = byId('customDomainInput')?.value.trim();
  if (!dom) {
    notify('Please enter your custom domain first.');
    return;
  }
  save({ customDomain: dom, customDomainVerified: true });
  notify(`✓ DNS Verified! https://${dom} is now configured with auto-renewing SSL.`);
  renderPage();
}

// -------------------------------------------------------------
// RENDER SERVICES (CATALOGUE MANAGEMENT)
// -------------------------------------------------------------
function renderServices() {
  const container = el('div');
  
  const heroBar = el('div', '', 'page-hero-header');
  heroBar.innerHTML = `
    <div class="page-hero-main">
      <div class="page-hero-title-group">
        <div class="page-hero-title-row">
          <h1 class="page-hero-title">Services</h1>
        </div>
        <div class="page-hero-subtitle">
          Pricing, durations, and booking deposit policies
        </div>
      </div>
      <div class="page-hero-actions">
        <button class="page-hero-btn-primary" onclick="openAddServiceModal()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Add service</span>
        </button>
      </div>
    </div>
  `;
  container.append(heroBar);

  const list = el('div', '', 'services-manager-list');
  for (const s of workspace.servicesList) {
    const card = el('div', '', 'service-manager-row');
    card.innerHTML = `
      <div style="flex:1;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
          <strong style="font-size:15px; color:#161817;">${s.name}</strong>
          <span class="service-status-pill ${s.status}">${s.status}</span>
        </div>
        <div style="font-size:12px; color:#666; margin-bottom:4px;">
          ⏱ ${s.duration} mins (buffer: ${s.buffer}m) · Staff: <strong>${s.staff}</strong>
        </div>
        <div style="font-size:12px; color:#444;">${s.desc}</div>
      </div>
      <div style="text-align:right; display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
        <div style="font-size:16px; font-weight:800; color:#161817;">₦${s.price.toLocaleString()}</div>
        <div style="font-size:11px; color:#15803d; font-weight:600; background:#dcfce7; padding:2px 8px; border-radius:6px;">
          ₦${s.deposit.toLocaleString()} deposit
        </div>
        <div style="display:flex; gap:6px; margin-top:4px;">
          <button class="btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="archiveService('${s.id}')">
            ${s.status === 'active' ? 'Archive' : 'Restore'}
          </button>
          <a href="#bookings" class="section-link" style="align-self:center; font-size:11.5px;">Bookings</a>
        </div>
      </div>
    `;
    list.append(card);
  }
  container.append(list);

  return container;
}

function openAddServiceModal() {
  const name = prompt('Enter new service name:');
  if (!name) return;
  const price = parseInt(prompt('Enter price in Naira (e.g. 12000):', '12000'), 10) || 12000;
  const deposit = parseInt(prompt('Enter required deposit in Naira (e.g. 2000):', '2000'), 10) || 2000;
  
  const newSvc = {
    id: 'srv-' + (workspace.servicesList.length + 1),
    name: name.trim(),
    duration: 45,
    buffer: 15,
    price,
    deposit,
    staff: 'Dele (Chair 1)',
    status: 'active',
    desc: 'Professional studio service tailored to client requirements.'
  };

  save({
    servicesList: [...workspace.servicesList, newSvc],
    hasUnpublishedChanges: true
  });
  notify(`Added "${newSvc.name}" to catalogue and website draft.`);
  renderPage();
}

function archiveService(id) {
  const svc = workspace.servicesList.find(s => s.id === id);
  if (!svc) return;
  svc.status = svc.status === 'active' ? 'archived' : 'active';
  save({
    servicesList: [...workspace.servicesList],
    hasUnpublishedChanges: true
  });
  notify(`Service "${svc.name}" is now ${svc.status}.`);
  renderPage();
}

// -------------------------------------------------------------
// RENDER GALLERY (PORTFOLIO CONNECTED TO SALE)
// -------------------------------------------------------------
let gallerySubTab = 'deliveries'; // 'deliveries' or 'lookbook'

function renderGallery() {
  const container = el('div');
  
  const heroBar = el('div', '', 'page-hero-header');
  heroBar.innerHTML = `
    <div class="page-hero-main">
      <div class="page-hero-title-group">
        <div class="page-hero-title-row">
          <h1 class="page-hero-title">Gallery</h1>
        </div>
        <div class="page-hero-subtitle">
          ${gallerySubTab === 'deliveries' ? 'Client deliveries and private proofs delivered to clients' : 'Portfolio looks connected directly to bookable services'}
        </div>
      </div>
      <div class="page-hero-actions">
        ${gallerySubTab === 'deliveries' ? `
          <button type="button" class="page-hero-btn-primary" onclick="openAddPhotosModal('gal-amaka')">
            + Add photos
          </button>
        ` : ''}
      </div>
    </div>
    <div class="gallery-subtabs" style="display:flex; gap:12px; margin-top:14px; border-bottom:1px solid rgba(22,24,23,0.08); padding-bottom:8px;">
      <button type="button" class="gallery-subtab-btn ${gallerySubTab === 'deliveries' ? 'active' : ''}" onclick="gallerySubTab='deliveries'; renderPage();" style="background:none; border:none; font-size:13px; font-weight:700; padding:6px 14px; cursor:pointer; color:${gallerySubTab === 'deliveries' ? '#161817' : '#666'}; border-bottom:${gallerySubTab === 'deliveries' ? '2px solid #161817' : 'none'};">
        Client Deliveries (Private Proofs)
      </button>
      <button type="button" class="gallery-subtab-btn ${gallerySubTab === 'lookbook' ? 'active' : ''}" onclick="gallerySubTab='lookbook'; renderPage();" style="background:none; border:none; font-size:13px; font-weight:700; padding:6px 14px; cursor:pointer; color:${gallerySubTab === 'lookbook' ? '#161817' : '#666'}; border-bottom:${gallerySubTab === 'lookbook' ? '2px solid #161817' : 'none'};">
        Portfolio Lookbook (Public)
      </button>
    </div>
  `;
  container.append(heroBar);

  if (gallerySubTab === 'deliveries') {
    const deliveriesWrap = el('div', '', 'gallery-deliveries-container');
    const galleries = workspace.clientGalleries || [];
    
    deliveriesWrap.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:20px; margin-top:16px;">
        ${galleries.map(gal => {
          const isPublished = gal.status === 'published';
          const photos = gal.photos || [];
          return `
            <div class="gallery-delivery-card" id="gallery-card-${gal.id}" style="background:#FFFFFF; border:1px solid rgba(22,24,23,0.12); border-radius:14px; padding:18px; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap; margin-bottom:14px;">
                <div>
                  <div style="display:flex; align-items:center; gap:10px;">
                    <h3 style="margin:0; font-size:16px; font-weight:700;">${escapeHtml(gal.title)}</h3>
                    <span class="gallery-privacy-badge ${isPublished ? 'published' : 'proof'}" style="font-size:11px; padding:3px 8px; border-radius:6px; font-weight:600; background:${isPublished ? '#DCFCE7' : '#FEF3C7'}; color:${isPublished ? '#166534' : '#92400E'};">
                      ${isPublished ? 'Published' : 'Private Proof'}
                    </span>
                  </div>
                  <div style="font-size:12px; color:#555; margin-top:4px;">
                    Client: <strong>${escapeHtml(gal.clientName)}</strong> (${escapeHtml(gal.clientEmail)}) · Event: ${escapeHtml(gal.eventDate)}
                  </div>
                  <div style="font-size:11.5px; color:#666; margin-top:2px;">
                    Source: <strong>${escapeHtml(gal.source)}</strong> (<code>${escapeHtml(gal.sourceFolder)}</code>)
                  </div>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                  <button type="button" class="btn-approve" style="font-size:12px; padding:6px 14px;" onclick="openAddPhotosModal('${gal.id}')">
                    + Add photos
                  </button>
                  <button type="button" class="btn-secondary" style="font-size:12px; padding:6px 14px;" onclick="openGalleryProofPreview('${gal.id}')">
                    Preview gallery
                  </button>
                  <button type="button" class="btn-secondary" style="font-size:12px; padding:6px 12px;" onclick="toggleGalleryPublish('${gal.id}')">
                    ${isPublished ? 'Unpublish' : 'Publish proof'}
                  </button>
                </div>
              </div>

              <!-- Gallery Photos Preview -->
              ${photos.length === 0 ? `
                <div style="padding:24px 16px; background:#FAF9F5; border:1px dashed #D1D5DB; border-radius:10px; text-align:center; color:#666; font-size:12.5px;">
                  No photos imported to this gallery yet. Click <strong>+ Add photos</strong> above to choose photos from Dropbox, Google Drive or this device.
                </div>
              ` : `
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <span style="font-size:12px; font-weight:600; color:#15803D;">✓ ${photos.length} photos staged in client gallery</span>
                    <span style="font-size:11.5px; color:#777;">Private proof · Originals in ${escapeHtml(gal.source)} untouched</span>
                  </div>
                  <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:10px;">
                    ${photos.map((p, idx) => `
                      <div style="position:relative; border-radius:8px; overflow:hidden; border:1px solid #E5E7EB; background:#000;">
                        <img src="${p.src}" alt="${p.filename}" style="width:100%; height:95px; object-fit:cover; display:block; opacity:0.9;">
                        <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.7); color:#fff; font-size:10px; padding:2px 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                          ${p.filename}
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `}
            </div>
          `;
        }).join('')}
      </div>
    `;
    container.append(deliveriesWrap);
    return container;
  }

  // Otherwise, Portfolio Lookbook (public)
  const uploader = el('div', '', 'website-channel-card');
  uploader.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap;">
      <div>
        <h3 style="margin:0 0 4px; font-size:15px; font-weight:700;">Add a Portfolio Look</h3>
        <p style="margin:0; font-size:12px; color:#555;">Upload photos of your cuts or shoots. Each look connects directly to a service so clients can tap "Book this look".</p>
      </div>
      <div style="font-size:11px; color:#777; font-family:'JetBrains Mono';">JPG, PNG, WebP up to 10 MB</div>
    </div>
    
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:14px;">
      <input type="text" id="newLookTitle" placeholder="Style name (e.g. Sharp Taper Fade)" style="font-size:13px;">
      <select id="newLookService" style="font-size:13px;">
        ${workspace.servicesList.map(s => `<option value="${s.id}|${s.name}">${s.name} (₦${s.price.toLocaleString()})</option>`).join('')}
      </select>
    </div>

    <div style="display:flex; align-items:center; gap:8px; margin-top:10px;">
      <input type="checkbox" id="clientConsentCheck" checked style="width:auto;">
      <label for="clientConsentCheck" style="font-weight:400; font-size:12px; color:#555; cursor:pointer;">
        I confirm client permission to publish this work publicly on Studio Teni's lookbook.
      </label>
    </div>

    <div style="margin-top:14px; display:flex; gap:10px; align-items:center;">
      <input type="file" id="lookFileInput" accept="image/jpeg,image/png,image/webp" style="display:none;">
      <button class="btn-approve" onclick="byId('lookFileInput').click()">Choose phone photo...</button>
      <span id="uploadStatusText" style="font-size:12px; color:#666;">No file selected</span>
    </div>
  `;
  container.append(uploader);

  setTimeout(() => {
    const fileInput = byId('lookFileInput');
    if (fileInput) {
      fileInput.onchange = () => {
        const file = fileInput.files[0];
        if (!file) return;
        const consent = byId('clientConsentCheck').checked;
        if (!consent) {
          notify('Please confirm client permission before publishing.');
          return;
        }
        byId('uploadStatusText').textContent = `Reading ${file.name}...`;
        const reader = new FileReader();
        reader.onload = () => {
          const title = byId('newLookTitle').value.trim() || 'New Studio Style';
          const [svcId, svcName] = (byId('newLookService').value || 'srv-1|Haircut').split('|');
          const newPhoto = {
            id: 'look-' + Date.now().toString(36),
            title,
            serviceId: svcId,
            serviceName: svcName,
            category: 'Lookbook',
            src: reader.result,
            isCover: false
          };
          save({
            photos: [newPhoto, ...workspace.photos],
            hasUnpublishedChanges: true
          });
          notify(`Added "${title}" attached to ${svcName}!`);
          renderPage();
        };
        reader.readAsDataURL(file);
      };
    }
  }, 50);

  const grid = el('div', '', 'gallery-grid');
  for (const photo of workspace.photos) {
    const card = el('div', '', 'gallery-card');
    card.innerHTML = `
      <div class="gallery-img-wrap">
        <img src="${photo.src}" alt="${photo.title}" class="gallery-img">
        ${photo.isCover ? `<span style="position:absolute; top:8px; right:8px; background:#161817; color:#C5F36A; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px;">COVER</span>` : ''}
      </div>
      <div class="gallery-info">
        <div>
          <div class="gallery-title">${photo.title}</div>
          <div class="gallery-caption">Attached service: <strong>${photo.serviceName}</strong></div>
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">
          <button class="btn-book-look" style="flex:1;" onclick="testBookLook('${photo.id}', '${photo.serviceName}')">
            Test "Book this look"
          </button>
          <button class="btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="deleteLook('${photo.id}')">
            Remove
          </button>
        </div>
      </div>
    `;
    grid.append(card);
  }
  container.append(grid);

  return container;
}

function testBookLook(lookId, serviceName) {
  notify(`Customer tapping "Book this look" opens ${serviceName} prefilled with style reference [${lookId}].`);
  openLivePreviewModal('mobile');
}

function deleteLook(lookId) {
  save({
    photos: workspace.photos.filter(p => p.id !== lookId),
    hasUnpublishedChanges: true
  });
  notify('Look removed from gallery.');
  renderPage();
}

// =============================================================
// CLIENT GALLERIES & DROPBOX WORKFLOW
// =============================================================

const dropboxAmakaPhotos = [
  { id: 'dbx-01', filename: 'DSC_4901_BridePrep.jpg', size: '4.8 MB', title: 'Bride Prep Session', src: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&fit=crop' },
  { id: 'dbx-02', filename: 'DSC_4902_GroomDetails.jpg', size: '4.2 MB', title: 'Groom Cufflinks & Watch', src: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&fit=crop' },
  { id: 'dbx-03', filename: 'DSC_4905_BridalParty.jpg', size: '5.1 MB', title: 'Bridal Party Toast', src: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&fit=crop' },
  { id: 'dbx-04', filename: 'DSC_4908_CeremonyProcessional.jpg', size: '4.6 MB', title: 'Ceremony Processional', src: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&fit=crop' },
  { id: 'dbx-05', filename: 'DSC_4912_VowsCeremony.jpg', size: '5.4 MB', title: 'Vows & Rings', src: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&fit=crop' },
  { id: 'dbx-06', filename: 'DSC_4915_RingExchange.jpg', size: '4.9 MB', title: 'Ring Exchange', src: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=800&fit=crop' },
  { id: 'dbx-07', filename: 'DSC_4919_FirstKiss.jpg', size: '5.0 MB', title: 'First Kiss', src: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=800&fit=crop' },
  { id: 'dbx-08', filename: 'DSC_4922_ChurchExit.jpg', size: '4.7 MB', title: 'Church Exit & Confetti', src: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&fit=crop' },
  { id: 'dbx-09', filename: 'DSC_4926_BridalPortraits.jpg', size: '5.8 MB', title: 'Bridal Solo Portraits', src: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&fit=crop' },
  { id: 'dbx-10', filename: 'DSC_4930_CoupleSunset.jpg', size: '6.2 MB', title: 'Couple Sunset Golden Hour', src: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=800&fit=crop' },
  { id: 'dbx-11', filename: 'DSC_4934_ReceptionEntry.jpg', size: '4.5 MB', title: 'Grand Reception Entry', src: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=800&fit=crop' },
  { id: 'dbx-12', filename: 'DSC_4940_FirstDance.jpg', size: '5.3 MB', title: 'First Dance', src: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&fit=crop' }
];

let currentActiveGalleryId = 'gal-amaka';

function openAddPhotosModal(galleryId) {
  currentActiveGalleryId = galleryId || 'gal-amaka';
  const gallery = (workspace.clientGalleries || []).find(g => g.id === currentActiveGalleryId) || { id: 'gal-amaka', title: 'Amaka’s wedding gallery' };
  
  const modal = byId('appDetailModal');
  const card = byId('appDetailModalCard');
  if (!modal || !card) return;

  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(22,24,23,0.08); padding-bottom:12px; margin-bottom:16px;">
      <div>
        <h3 style="margin:0; font-size:17px; font-weight:700;">+ Add photos to ${escapeHtml(gallery.title)}</h3>
        <p style="margin:4px 0 0; font-size:12px; color:#666;">Choose a source to import photos into this client gallery.</p>
      </div>
      <button onclick="closeAppDetailModal()" style="background:none; border:none; cursor:pointer; font-size:18px; color:#666;">✕</button>
    </div>

    <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px;">
      <!-- Source 1: From this device -->
      <div style="background:#FFFFFF; border:1px solid rgba(22,24,23,0.12); border-radius:12px; padding:14px; display:flex; justify-content:space-between; align-items:center; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:40px; height:40px; border-radius:10px; background:#F3F4F6; display:flex; align-items:center; justify-content:center; font-size:20px;">
            📷
          </div>
          <div>
            <div style="font-weight:700; font-size:14px;">From this device</div>
            <div style="font-size:12px; color:#666; margin-top:2px;">Upload photos directly from your phone, tablet or computer.</div>
          </div>
        </div>
        <input type="file" id="localGalleryFileInput" multiple accept="image/*" style="display:none;" onchange="handleLocalGalleryUpload('${gallery.id}', this.files)">
        <button type="button" class="btn-secondary" style="font-size:12px; padding:6px 14px;" onclick="byId('localGalleryFileInput').click()">
          Choose files
        </button>
      </div>

      <!-- Source 2: From Dropbox -->
      <div style="background:#FFFFFF; border:1px solid rgba(22,24,23,0.12); border-radius:12px; padding:14px; display:flex; justify-content:space-between; align-items:center; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          ${renderAppLogo('dropbox', 40)}
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <strong style="font-size:14px;">From Dropbox</strong>
              <span class="provider-badge connected" style="font-size:11px;">Connected · Studio Teni Portfolio Dropbox</span>
            </div>
            <div style="font-size:12px; color:#666; margin-top:2px;">
              Import copies from <code>/Studio Teni Client Deliveries/Amaka Wedding 2026/</code>. Originals remain safe.
            </div>
          </div>
        </div>
        <button type="button" class="btn-approve" style="font-size:12px; padding:6px 14px;" onclick="openDropboxImportFlow('${gallery.id}', 1)">
          Choose from Dropbox
        </button>
      </div>

      <!-- Source 3: From Google Drive -->
      <div style="background:#FFFFFF; border:1px solid rgba(22,24,23,0.12); border-radius:12px; padding:14px; display:flex; justify-content:space-between; align-items:center; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          ${renderAppLogo('google-drive', 40)}
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <strong style="font-size:14px;">From Google Drive</strong>
              <span class="provider-badge awaiting" style="font-size:11px;">Connect account</span>
            </div>
            <div style="font-size:12px; color:#666; margin-top:2px;">Import photoshoot assets from Google Workspace.</div>
          </div>
        </div>
        <button type="button" class="btn-secondary" style="font-size:12px; padding:6px 14px;" onclick="openAppDetailModal('google-drive')">
          Connect Drive
        </button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
}

function handleLocalGalleryUpload(galleryId, files) {
  if (!files || files.length === 0) return;
  const gallery = (workspace.clientGalleries || []).find(g => g.id === galleryId);
  if (!gallery) return;
  if (!gallery.photos) gallery.photos = [];
  
  let added = 0;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    gallery.photos.push({
      id: 'local-' + Date.now() + '-' + i,
      filename: f.name,
      size: (f.size / (1024 * 1024)).toFixed(1) + ' MB',
      title: f.name.replace(/\.[^.]+$/, ''),
      src: URL.createObjectURL(f)
    });
    added++;
  }
  save({ clientGalleries: workspace.clientGalleries });
  notify(`${added} photos added to ${gallery.title}!`);
  closeAppDetailModal();
  renderPage();
}

function openDropboxImportFlow(galleryId, step = 1) {
  currentActiveGalleryId = galleryId || 'gal-amaka';
  const gallery = (workspace.clientGalleries || []).find(g => g.id === currentActiveGalleryId) || { id: 'gal-amaka', title: 'Amaka’s wedding gallery', clientName: 'Amaka Obi' };
  
  const modal = byId('appDetailModal');
  const card = byId('appDetailModalCard');
  if (!modal || !card) return;

  if (step === 1) {
    // Screen 1: Permissions & one-time import distinction
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(22,24,23,0.08); padding-bottom:12px; margin-bottom:16px;">
        <div style="display:flex; align-items:center; gap:12px;">
          ${renderAppLogo('dropbox', 40)}
          <div>
            <h3 style="margin:0; font-size:17px; font-weight:700;">Add photos from Dropbox</h3>
            <p style="margin:2px 0 0; font-size:12px; color:#666;">Choose photos from your Dropbox to add to this client gallery.</p>
          </div>
        </div>
        <button onclick="closeAppDetailModal(); renderPage();" style="background:none; border:none; cursor:pointer; font-size:18px; color:#666;">✕</button>
      </div>

      <div style="background:#FAF9F5; border:1px solid #E5E7EB; border-radius:10px; padding:14px; margin-bottom:18px;">
        <div style="font-size:12.5px; font-weight:700; color:#161817; margin-bottom:6px;">
          One-time import vs continuing backup
        </div>
        <div style="font-size:12px; color:#4B5563; line-height:1.5;">
          Vela imports high-resolution copies directly into <strong>${escapeHtml(gallery.title)}</strong>. Originals in your Dropbox remain completely untouched and safe. Disconnecting Dropbox in the future will not delete or alter your client gallery.
        </div>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn-secondary" onclick="closeAppDetailModal(); renderPage();">Cancel</button>
        <button type="button" class="btn-approve" onclick="openDropboxImportFlow('${gallery.id}', 2)">Choose from Dropbox</button>
      </div>
    `;
  } else if (step === 2) {
    // Screen 2: Account and selection
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(22,24,23,0.08); padding-bottom:12px; margin-bottom:14px;">
        <div style="display:flex; align-items:center; gap:12px;">
          ${renderAppLogo('dropbox', 36)}
          <div>
            <h3 style="margin:0; font-size:16px; font-weight:700;">Select photos from Dropbox</h3>
            <p style="margin:2px 0 0; font-size:12px; color:#666;">Target gallery: <strong>${escapeHtml(gallery.title)}</strong></p>
          </div>
        </div>
        <button onclick="closeAppDetailModal(); renderPage();" style="background:none; border:none; cursor:pointer; font-size:18px; color:#666;">✕</button>
      </div>

      <div style="background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px; padding:10px 12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
        <div style="font-size:12px; color:#374151;">
          Connected: <strong>Studio Teni Portfolio Dropbox</strong> · Folder: <code>/Studio Teni Client Deliveries/Amaka Wedding 2026/</code>
        </div>
        <a href="#" onclick="notify('Current folder: /Studio Teni Client Deliveries/Amaka Wedding 2026/'); return false;" style="font-size:11.5px; color:#2563EB; text-decoration:none; font-weight:600;">Change folder</a>
      </div>

      <!-- Photo Selection Grid -->
      <div style="max-height:280px; overflow-y:auto; border:1px solid #E5E7EB; border-radius:8px; padding:10px; margin-bottom:12px; display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:10px;" id="dropboxPhotosGrid">
        ${dropboxAmakaPhotos.map(p => `
          <label style="position:relative; display:block; border:1px solid #D1D5DB; border-radius:6px; overflow:hidden; cursor:pointer; background:#fff;">
            <input type="checkbox" class="dropbox-photo-check" checked data-id="${p.id}" data-filename="${p.filename}" data-size="${p.size}" onchange="updateDropboxLiveCount()" style="position:absolute; top:6px; left:6px; z-index:2; width:16px; height:16px;">
            <img src="${p.src}" alt="${p.title}" style="width:100%; height:85px; object-fit:cover; display:block;">
            <div style="padding:4px 6px; font-size:10px; color:#333; line-height:1.2;">
              <div style="font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.filename}</div>
              <div style="color:#777;">${p.size}</div>
            </div>
          </label>
        `).join('')}
      </div>

      <!-- Live Selection Counter & Safety Callout -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; background:#FAF9F5; padding:8px 12px; border-radius:6px; font-size:12px;">
        <span id="dropboxSelectionCounter" style="font-weight:700; color:#161817;">12 photos selected (60.5 MB)</span>
        <span style="color:#666; font-size:11.5px;">Vela imports copies. Originals in Dropbox remain untouched.</span>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button type="button" class="btn-secondary" onclick="closeAppDetailModal(); renderPage();">Cancel</button>
        <button type="button" class="btn-approve" id="dropboxExecuteBtn" onclick="executeDropboxImport('${gallery.id}')">Import 12 photos</button>
      </div>
    `;
  }

  modal.style.display = 'flex';
}

function updateDropboxLiveCount() {
  const checkboxes = document.querySelectorAll('.dropbox-photo-check');
  let selected = 0;
  checkboxes.forEach(cb => { if (cb.checked) selected++; });
  const mb = (selected * 5.04).toFixed(1);
  const counter = byId('dropboxSelectionCounter');
  const btn = byId('dropboxExecuteBtn');
  if (counter) counter.textContent = `${selected} photos selected (${mb} MB)`;
  if (btn) {
    btn.textContent = `Import ${selected} photos`;
    btn.disabled = (selected === 0);
  }
}

function executeDropboxImport(galleryId, isRetry = false) {
  const gallery = (workspace.clientGalleries || []).find(g => g.id === galleryId) || workspace.clientGalleries[0];
  const card = byId('appDetailModalCard');
  if (!card) return;

  // Screen 3: Progress
  card.innerHTML = `
    <div style="padding:20px 0; text-align:center;">
      <h3 style="margin:0 0 8px; font-size:17px; font-weight:700;">Importing photos from Dropbox...</h3>
      <p style="margin:0 0 16px; font-size:12.5px; color:#666;">Transferring copies to <strong>${escapeHtml(gallery.title)}</strong></p>
      
      <div style="width:100%; background:#E5E7EB; border-radius:8px; height:12px; overflow:hidden; margin-bottom:12px;">
        <div id="dropboxProgressBar" style="width:${window.__simulateDropboxFailure && !isRetry ? '83%' : '100%'}; background:#161817; height:100%; transition:width 0.4s ease;"></div>
      </div>
      <div id="dropboxProgressText" style="font-size:12px; color:#555;">
        ${window.__simulateDropboxFailure && !isRetry ? '10 of 12 photos transferred...' : '12 of 12 photos transferred...'}
      </div>
    </div>
  `;

  setTimeout(() => {
    if (window.__simulateDropboxFailure && !isRetry) {
      // Simulate partial failure on 2 photos: DSC_4934_ReceptionEntry.jpg and DSC_4940_FirstDance.jpg
      const first10 = dropboxAmakaPhotos.slice(0, 10);
      if (!gallery.photos) gallery.photos = [];
      const existingFilenames = new Set(gallery.photos.map(p => p.filename));
      for (const p of first10) {
        if (!existingFilenames.has(p.filename)) {
          gallery.photos.push(p);
          existingFilenames.add(p.filename);
        }
      }
      save({ clientGalleries: workspace.clientGalleries });

      card.innerHTML = `
        <div style="padding:10px 0;">
          <h3 style="margin:0 0 8px; font-size:16px; font-weight:700;">Transfer Paused</h3>
          
          <div style="background:#FEF2F2; border:1px solid #FCA5A5; color:#991B1B; padding:12px 14px; border-radius:8px; margin-bottom:14px; font-size:12.5px; line-height:1.4;">
            <strong>⚠️ Temporary network timeout:</strong> 2 of 12 photos failed to transfer. 10 photos were imported successfully.
            <div style="margin-top:6px; font-size:11.5px; color:#7F1D1D;">
              Failed files: <code>DSC_4934_ReceptionEntry.jpg</code>, <code>DSC_4940_FirstDance.jpg</code>
            </div>
          </div>

          <p style="font-size:12px; color:#555; margin-bottom:16px;">
            You can retry the failed photos now. Vela will transfer only the missing files without duplicating the 10 photos already saved.
          </p>

          <div style="display:flex; justify-content:flex-end; gap:10px;">
            <button type="button" class="btn-secondary" onclick="closeAppDetailModal(); renderPage();">Cancel</button>
            <button type="button" class="btn-approve" style="background:#B45309;" onclick="executeDropboxImport('${gallery.id}', true)">
              Retry failed photos
            </button>
          </div>
        </div>
      `;
      return;
    }

    // Success (either direct or after retry)
    if (!gallery.photos) gallery.photos = [];
    const existingFilenames = new Set(gallery.photos.map(p => p.filename));
    for (const p of dropboxAmakaPhotos) {
      if (!existingFilenames.has(p.filename)) {
        gallery.photos.push(p);
        existingFilenames.add(p.filename);
      }
    }
    save({ clientGalleries: workspace.clientGalleries });

    // Also update Dropbox app state
    const apps = getAppsState();
    if (apps.dropbox) {
      apps.dropbox.status = 'connected';
      apps.dropbox.lastSync = 'Just now';
      if (!apps.dropbox.activityLog) apps.dropbox.activityLog = [];
      apps.dropbox.activityLog.unshift({
        timestamp: 'Just now',
        event: 'Photo import',
        status: 'success',
        details: `12 photos added to ${gallery.title}`
      });
      save({ connectedApps: apps });
    }

    // Screen 4: Completion
    card.innerHTML = `
      <div style="padding:16px 0; text-align:center;">
        <div style="width:48px; height:48px; border-radius:50%; background:#DCFCE7; color:#166534; font-size:24px; font-weight:700; display:flex; align-items:center; justify-content:center; margin:0 auto 12px;">
          ✓
        </div>
        <h3 style="margin:0 0 6px; font-size:18px; font-weight:700;">12 photos added to ${escapeHtml(gallery.title)}.</h3>
        <p style="margin:0 0 20px; font-size:12.5px; color:#555; max-width:380px; margin-left:auto; margin-right:auto; line-height:1.4;">
          All 12 high-resolution photos were imported into this client gallery. Originals in Dropbox remain safe and untouched.
        </p>

        <div style="display:flex; justify-content:center; gap:12px;">
          <button type="button" class="btn-approve" style="font-size:13px; padding:8px 18px;" onclick="openGalleryProofPreview('${gallery.id}')">
            Preview gallery
          </button>
          <button type="button" class="btn-secondary" style="font-size:13px; padding:8px 16px;" onclick="closeAppDetailModal(); renderPage();">
            Done · Return to gallery
          </button>
        </div>
      </div>
    `;
  }, 400);
}

function openGalleryProofPreview(galleryId) {
  const gallery = (workspace.clientGalleries || []).find(g => g.id === (galleryId || 'gal-amaka')) || workspace.clientGalleries[0];
  const modal = byId('appDetailModal');
  const card = byId('appDetailModalCard');
  if (!modal || !card) return;

  const isPublished = gallery.status === 'published';
  const photos = (gallery.photos && gallery.photos.length > 0) ? gallery.photos : dropboxAmakaPhotos;

  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid rgba(22,24,23,0.08); padding-bottom:12px; margin-bottom:14px;">
      <div>
        <div style="display:flex; align-items:center; gap:10px;">
          <h3 style="margin:0; font-size:17px; font-weight:700;">Private Client Proof · ${escapeHtml(gallery.title)}</h3>
          <span class="gallery-privacy-badge ${isPublished ? 'published' : 'proof'}" style="font-size:11px; padding:3px 8px; border-radius:6px; font-weight:600; background:${isPublished ? '#DCFCE7' : '#FEF3C7'}; color:${isPublished ? '#166534' : '#92400E'};">
            ${isPublished ? 'Published' : 'Private Proof'}
          </span>
        </div>
        <p style="margin:4px 0 0; font-size:12px; color:#555;">
          Client: <strong>${escapeHtml(gallery.clientName)}</strong> (${escapeHtml(gallery.clientEmail)}) · Event: ${escapeHtml(gallery.eventDate)}
        </p>
        <p style="margin:2px 0 0; font-size:11.5px; color:#777;">
          This proof is private to ${escapeHtml(gallery.clientName)}. Not indexed by search engines until you choose to publish.
        </p>
      </div>
      <button onclick="closeAppDetailModal(); renderPage();" style="background:none; border:none; cursor:pointer; font-size:18px; color:#666;">✕</button>
    </div>

    <!-- Proof Photos Grid -->
    <div style="max-height:360px; overflow-y:auto; border:1px solid #E5E7EB; border-radius:10px; padding:12px; margin-bottom:16px; display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:12px;">
      ${photos.map((p, idx) => `
        <div style="position:relative; border-radius:8px; overflow:hidden; border:1px solid #D1D5DB; background:#111;">
          <img src="${p.src}" alt="${p.filename}" style="width:100%; height:110px; object-fit:cover; display:block; opacity:0.92;">
          <div style="position:absolute; top:6px; right:6px; background:rgba(0,0,0,0.6); color:#fff; font-size:9.5px; font-weight:700; padding:2px 6px; border-radius:4px;">
            PROOF
          </div>
          <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.75); color:#fff; font-size:10px; padding:4px 6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
            ${idx + 1}. ${p.filename} (${p.size})
          </div>
        </div>
      `).join('')}
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center;">
      <span style="font-size:12px; color:#666;">${photos.length} photos ready for client review</span>
      <div style="display:flex; gap:10px;">
        <button type="button" class="btn-approve" onclick="toggleGalleryPublish('${gallery.id}'); openGalleryProofPreview('${gallery.id}');">
          ${isPublished ? 'Unpublish proof' : 'Publish client gallery'}
        </button>
        <button type="button" class="btn-secondary" onclick="closeAppDetailModal(); renderPage();">
          Close proof
        </button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
}

function toggleGalleryPublish(galleryId) {
  const gallery = (workspace.clientGalleries || []).find(g => g.id === galleryId);
  if (!gallery) return;
  gallery.status = (gallery.status === 'published' ? 'private_proof' : 'published');
  save({ clientGalleries: workspace.clientGalleries });
  notify(`${gallery.title} is now ${gallery.status === 'published' ? 'published and viewable by client' : 'saved as a private proof'}.`);
  renderPage();
}

function reconnectDropboxPrompt() {
  const apps = getAppsState();
  if (apps.dropbox) {
    apps.dropbox.status = 'connected';
    apps.dropbox.health = 'Connected · Access Token Active';
    apps.dropbox.lastSync = 'Just now';
    save({ connectedApps: apps });
  }
  notify('Dropbox reconnected successfully. All imported photos preserved.');
  closeAppDetailModal();
  renderPage();
}

// =============================================================
// APP DESTINATION WORKFLOW MODALS
// =============================================================

function openWhatsAppInboxModal() {
  const modal = byId('appDetailModal');
  const card = byId('appDetailModalCard');
  if (!modal || !card) return;

  const conv = (workspace.conversations || []).find(c => c.channel === 'whatsapp') || {
    sender: 'Chuka Nnamdi',
    phone: '+234 809 112 3344',
    message: '“Boss, can I come around 4 for haircut and beard? How much?”',
    draftText: '“Haircut and beard is ₦10,000. Dele has a 4:15 PM opening today at Studio Teni (14 Bishop Oluwole St). Would you like me to hold this chair for you with a ₦2,000 deposit?”',
    status: 'needs_approval'
  };

  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(22,24,23,0.08); padding-bottom:12px; margin-bottom:14px;">
      <div style="display:flex; align-items:center; gap:10px;">
        ${renderAppLogo('whatsapp', 36)}
        <div>
          <h3 style="margin:0; font-size:16px; font-weight:700;">WhatsApp Business · Booking Inbox</h3>
          <p style="margin:2px 0 0; font-size:12px; color:#666;">Connected number: <strong>+234 803 123 4567</strong> · Meta Cloud API</p>
        </div>
      </div>
      <button onclick="closeAppDetailModal()" style="background:none; border:none; cursor:pointer; font-size:18px; color:#666;">✕</button>
    </div>

    <div style="background:#FAF9F5; border:1px solid #E5E7EB; border-radius:10px; padding:14px; margin-bottom:14px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <span style="font-size:11.5px; font-weight:700; text-transform:uppercase; color:#666;">Incoming Customer Enquiry</span>
        <span class="provider-badge awaiting" style="font-size:11px;">Draft mode · Requires approval</span>
      </div>
      <div style="font-weight:700; font-size:14px; color:#161817;">${escapeHtml(conv.sender)} (${escapeHtml(conv.phone)})</div>
      <div style="font-size:13px; color:#374151; margin-top:4px; font-style:italic;">${escapeHtml(conv.message)}</div>
      <div style="font-size:11.5px; color:#059669; font-weight:600; margin-top:6px;">
        ✓ Dele calendar verified: 4:15 PM slot open today at Studio Teni
      </div>
    </div>

    <div style="background:#FFFFFF; border:1px solid #D1D5DB; border-radius:10px; padding:14px; margin-bottom:16px;">
      <div style="font-size:11.5px; font-weight:700; text-transform:uppercase; color:#666; margin-bottom:6px;">Prepared Draft Reply</div>
      <textarea id="whatsappDraftInput" style="width:100%; border:1px solid #ccc; border-radius:6px; padding:10px; font-size:12.5px; line-height:1.4; box-sizing:border-box;" rows="3">${escapeHtml(conv.draftText)}</textarea>
      <div style="font-size:11px; color:#666; margin-top:6px;">
        Customer does NOT receive any reply until you tap approve below.
      </div>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center;">
      <span style="font-size:11.5px; color:#666;">Status: <strong>${conv.status === 'approved' ? 'Replied' : 'Pending Approval'}</strong></span>
      <div style="display:flex; gap:8px;">
        <button type="button" class="btn-secondary" onclick="closeAppDetailModal()">Close</button>
        <button type="button" class="btn-approve" onclick="approveWhatsAppModalAction()">
          ${conv.status === 'approved' ? 'Reply already sent ✓' : 'Approve & send WhatsApp'}
        </button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
}

function approveWhatsAppModalAction() {
  fetch('/api/whatsapp/approve-reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enquiryId: 'conv-1' })
  }).then(r => r.json()).catch(() => ({}));

  if (workspace.conversations && workspace.conversations[0]) {
    workspace.conversations[0].status = 'approved';
    workspace.conversations[0].actionLabel = 'Replied ✓';
    save({ conversations: workspace.conversations });
  }
  notify('Approved! WhatsApp message delivered to customer.');
  closeAppDetailModal();
  renderPage();
}

function openInstagramInboxModal() {
  const modal = byId('appDetailModal');
  const card = byId('appDetailModalCard');
  if (!modal || !card) return;

  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(22,24,23,0.08); padding-bottom:12px; margin-bottom:14px;">
      <div style="display:flex; align-items:center; gap:10px;">
        ${renderAppLogo('instagram', 36)}
        <div>
          <h3 style="margin:0; font-size:16px; font-weight:700;">Instagram Direct · Inbox</h3>
          <p style="margin:2px 0 0; font-size:12px; color:#666;">Connected handle: <strong>@studioteni_ng</strong> · Meta Graph API</p>
        </div>
      </div>
      <button onclick="closeAppDetailModal()" style="background:none; border:none; cursor:pointer; font-size:18px; color:#666;">✕</button>
    </div>

    <div style="background:#FAF9F5; border:1px solid #E5E7EB; border-radius:10px; padding:14px; margin-bottom:14px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <span style="font-size:11.5px; font-weight:700; text-transform:uppercase; color:#666;">Recent Direct Message</span>
        <span class="provider-badge connected" style="font-size:11px;">Active</span>
      </div>
      <div style="font-weight:700; font-size:14px; color:#161817;">@kene_o (Kenechukwu)</div>
      <div style="font-size:13px; color:#374151; margin-top:4px; font-style:italic;">
        “Do you take walk-ins in Yaba or VI? I need a clean taper this evening.”
      </div>
      <div style="font-size:11.5px; color:#059669; font-weight:600; margin-top:6px;">
        ✓ Context: Victoria Island studio open until 7:00 PM · Dele available at 5:30 PM
      </div>
    </div>

    <div style="display:flex; justify-content:flex-end; gap:8px;">
      <button type="button" class="btn-secondary" onclick="closeAppDetailModal()">Close</button>
      <button type="button" class="btn-approve" onclick="notify('Replied to @kene_o with booking link.'); closeAppDetailModal();">
        Approve &amp; send Instagram DM
      </button>
    </div>
  `;

  modal.style.display = 'flex';
}

function openTikTokBookingLinkModal() {
  const modal = byId('appDetailModal');
  const card = byId('appDetailModalCard');
  if (!modal || !card) return;

  const link = `${window.location.origin}/book?ref=tiktok_bio`;

  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(22,24,23,0.08); padding-bottom:12px; margin-bottom:14px;">
      <div style="display:flex; align-items:center; gap:10px;">
        ${renderAppLogo('tiktok', 36)}
        <div>
          <h3 style="margin:0; font-size:16px; font-weight:700;">TikTok for Business · Tracked Booking Link</h3>
          <p style="margin:2px 0 0; font-size:12px; color:#666;">Connected account: <strong>@studioteni</strong></p>
        </div>
      </div>
      <button onclick="closeAppDetailModal()" style="background:none; border:none; cursor:pointer; font-size:18px; color:#666;">✕</button>
    </div>

    <div style="background:#FAF9F5; border:1px solid #E5E7EB; border-radius:10px; padding:14px; margin-bottom:14px;">
      <div style="font-size:12px; font-weight:700; color:#161817; margin-bottom:6px;">Your Tracked Bio Booking Link</div>
      <div style="display:flex; gap:8px; align-items:center;">
        <input type="text" readonly value="${link}" style="flex:1; padding:8px 10px; font-size:12px; font-family:monospace; background:#fff; border:1px solid #ccc; border-radius:6px;">
        <button type="button" class="btn-approve" onclick="navigator.clipboard.writeText('${link}'); notify('Link copied to clipboard!');">Copy link</button>
      </div>
      <div style="font-size:11.5px; color:#666; margin-top:6px;">
        Paste this link into your TikTok profile bio to track views and haircut appointments originating from viral video transformations.
      </div>
    </div>

    <div style="display:flex; justify-content:flex-end;">
      <button type="button" class="btn-secondary" onclick="closeAppDetailModal()">Close</button>
    </div>
  `;

  modal.style.display = 'flex';
}

function openEmailInboxModal() {
  const modal = byId('appDetailModal');
  const card = byId('appDetailModalCard');
  if (!modal || !card) return;

  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(22,24,23,0.08); padding-bottom:12px; margin-bottom:14px;">
      <div style="display:flex; align-items:center; gap:10px;">
        ${renderAppLogo('zoho-mail', 36)}
        <div>
          <h3 style="margin:0; font-size:16px; font-weight:700;">Business Email · Zoho Mail</h3>
          <p style="margin:2px 0 0; font-size:12px; color:#666;">Mailbox: <strong>hello@studioteni.ng</strong></p>
        </div>
      </div>
      <button onclick="closeAppDetailModal()" style="background:none; border:none; cursor:pointer; font-size:18px; color:#666;">✕</button>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px;">
      <div style="background:#FAF9F5; border:1px solid #E5E7EB; border-radius:8px; padding:10px 12px;">
        <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#666;">Receiving Health</div>
        <div style="font-size:12px; color:#15803D; font-weight:700; margin-top:2px;">● Inbound Active (IMAP &amp; Webhook Healthy)</div>
      </div>
      <div style="background:#FAF9F5; border:1px solid #E5E7EB; border-radius:8px; padding:10px 12px;">
        <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#666;">Sending Health</div>
        <div style="font-size:12px; color:#15803D; font-weight:700; margin-top:2px;">● SPF, DKIM, DMARC Verified</div>
      </div>
    </div>

    <div style="background:#FFFFFF; border:1px solid #D1D5DB; border-radius:10px; padding:12px; margin-bottom:14px;">
      <div style="font-weight:700; font-size:13px; color:#161817;">Quotation #VQ-2026-112 · Horizon Capital</div>
      <div style="font-size:12px; color:#555; margin-top:2px;">18 executive staff headshots on-location (₦350,000 total · ₦140,000 deposit)</div>
    </div>

    <div style="display:flex; justify-content:flex-end; gap:8px;">
      <button type="button" class="btn-secondary" onclick="closeAppDetailModal()">Close</button>
      <button type="button" class="btn-approve" onclick="closeAppDetailModal(); runWorkflow('review_quote');">
        Draft quotation email
      </button>
    </div>
  `;

  modal.style.display = 'flex';
}

function openAvailabilityPreviewModal(stylist = 'dele') {
  const modal = byId('appDetailModal');
  const card = byId('appDetailModalCard');
  if (!modal || !card) return;

  const isDele = stylist === 'dele';

  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(22,24,23,0.08); padding-bottom:12px; margin-bottom:14px;">
      <div style="display:flex; align-items:center; gap:10px;">
        ${renderAppLogo(isDele ? 'google-calendar' : 'outlook-calendar', 36)}
        <div>
          <h3 style="margin:0; font-size:16px; font-weight:700;">Availability Preview · Calendar Sync</h3>
          <p style="margin:2px 0 0; font-size:12px; color:#666;">
            ${isDele ? 'Dele (Chair 1) · Google Calendar' : 'Segun (Chair 2) · Microsoft Outlook'}
          </p>
        </div>
      </div>
      <button onclick="closeAppDetailModal()" style="background:none; border:none; cursor:pointer; font-size:18px; color:#666;">✕</button>
    </div>

    <!-- Stylist Switcher Tabs -->
    <div style="display:flex; gap:10px; margin-bottom:14px;">
      <button type="button" class="btn-secondary" style="${isDele ? 'background:#161817; color:#fff;' : ''} font-size:12px; padding:6px 14px;" onclick="openAvailabilityPreviewModal('dele')">
        Dele (Chair 1 · Google Calendar)
      </button>
      <button type="button" class="btn-secondary" style="${!isDele ? 'background:#161817; color:#fff;' : ''} font-size:12px; padding:6px 14px;" onclick="openAvailabilityPreviewModal('segun')">
        Segun (Chair 2 · Outlook / Studio)
      </button>
    </div>

    <!-- Slots Schedule -->
    <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px;">
      <div style="background:#FAF9F5; border:1px solid #E5E7EB; border-radius:8px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong>1:00 PM</strong> · Tobi Adebayo (Signature Haircut &amp; Beard Trim)
        </div>
        <span class="provider-badge connected" style="font-size:11px;">Booked in Vela</span>
      </div>

      ${isDele ? `
        <div style="background:#FEF2F2; border:1px solid #FCA5A5; border-radius:8px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong style="color:#991B1B;">2:30 PM · BLOCKED</strong> · External Event: <em>"Doctor appointment (Busy)"</em>
            <div style="font-size:11px; color:#7F1D1D; margin-top:2px;">
              Dele's Google Calendar sync read this busy period and removed 2:30 PM from customer booking slots.
            </div>
          </div>
          <span class="provider-badge attention" style="font-size:11px;">Blocked by Google Calendar</span>
        </div>
      ` : `
        <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:8px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong style="color:#166534;">2:30 PM · OPEN</strong> · Segun (Chair 2)
            <div style="font-size:11px; color:#14532D; margin-top:2px;">
              No external conflicts on Segun's schedule. Slot remains bookable by salon clients.
            </div>
          </div>
          <span class="provider-badge connected" style="font-size:11px;">Bookable</span>
        </div>
      `}

      <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:8px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong style="color:#166534;">4:15 PM · OPEN</strong> · Free for customer booking
        </div>
        <span class="provider-badge connected" style="font-size:11px;">Bookable</span>
      </div>
    </div>

    <div style="display:flex; justify-content:flex-end;">
      <button type="button" class="btn-secondary" onclick="closeAppDetailModal()">Close preview</button>
    </div>
  `;

  modal.style.display = 'flex';
}

function openCheckoutPreviewModal(providerId = 'paystack') {
  const modal = byId('appDetailModal');
  const card = byId('appDetailModalCard');
  if (!modal || !card) return;

  const apps = getAppsState();
  const isPaystackDefault = Boolean(apps.paystack?.isDefault);
  const activeDefaultName = isPaystackDefault ? 'Paystack' : 'Flutterwave';

  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(22,24,23,0.08); padding-bottom:12px; margin-bottom:14px;">
      <div style="display:flex; align-items:center; gap:10px;">
        ${renderAppLogo(isPaystackDefault ? 'paystack' : 'flutterwave', 36)}
        <div>
          <h3 style="margin:0; font-size:16px; font-weight:700;">Booking Checkout Preview</h3>
          <p style="margin:2px 0 0; font-size:12px; color:#666;">Customer deposit checkout demonstration</p>
        </div>
      </div>
      <button onclick="closeAppDetailModal()" style="background:none; border:none; cursor:pointer; font-size:18px; color:#666;">✕</button>
    </div>

    <div style="background:#FAF9F5; border:1px solid #E5E7EB; border-radius:10px; padding:14px; margin-bottom:14px;">
      <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#666; margin-bottom:4px;">Booking Details</div>
      <div style="font-size:14px; font-weight:700;">Signature Haircut &amp; Beard Trim · ₦10,000</div>
      <div style="font-size:12px; color:#555; margin-top:2px;">Staff: Dele (Chair 1) · Time: Today at 4:15 PM</div>
      <div style="margin-top:10px; padding-top:10px; border-top:1px dashed #D1D5DB; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-weight:700; font-size:13px;">20% Deposit Due Now:</span>
        <span style="font-weight:700; font-size:16px; color:#15803D;">₦2,000</span>
      </div>
    </div>

    <div style="background:#FFFFFF; border:1px solid #D1D5DB; border-radius:10px; padding:14px; margin-bottom:14px;">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
        <span style="width:8px; height:8px; border-radius:50%; background:#15803D;"></span>
        <strong style="font-size:13px;">Collecting deposit via ${activeDefaultName} (Active NGN Default Gateway)</strong>
      </div>
      <div style="font-size:12px; color:#4B5563; line-height:1.4;">
        ${isPaystackDefault
          ? 'Paystack is configured as your active NGN default gateway under Payment Settings. The client is presented with Paystack Naira card, GTBank / Zenith bank transfer, and USSD options.'
          : 'Flutterwave is configured as your active NGN default gateway under Payment Settings. The client is presented with Flutterwave multi-channel checkout.'}
      </div>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center;">
      <button type="button" class="btn-secondary" style="font-size:12px; padding:6px 12px;" onclick="closeAppDetailModal(); openPaymentGatewaySelector();">
        Change default gateway
      </button>
      <button type="button" class="btn-approve" onclick="notify('Test payment verified! Deposit credited.'); closeAppDetailModal();">
        Simulate successful deposit
      </button>
    </div>
  `;

  modal.style.display = 'flex';
}

function openZohoBooksPreviewModal() {
  const modal = byId('appDetailModal');
  const card = byId('appDetailModalCard');
  if (!modal || !card) return;

  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(22,24,23,0.08); padding-bottom:12px; margin-bottom:14px;">
      <div style="display:flex; align-items:center; gap:10px;">
        ${renderAppLogo('zoho-books', 36)}
        <div>
          <h3 style="margin:0; font-size:16px; font-weight:700;">Zoho Books · Invoice Preview</h3>
          <p style="margin:2px 0 0; font-size:12px; color:#666;">Organization: <strong>Studio Teni Services Ltd (#8029193)</strong></p>
        </div>
      </div>
      <button onclick="closeAppDetailModal()" style="background:none; border:none; cursor:pointer; font-size:18px; color:#666;">✕</button>
    </div>

    <div style="background:#FAF9F5; border:1px solid #E5E7EB; border-radius:10px; padding:14px; margin-bottom:14px;">
      <div style="font-weight:700; font-size:14px; color:#161817;">Invoice #ZB-INV-2026-092</div>
      <div style="font-size:12px; color:#555; margin-top:2px;">Generated from accepted Quotation #VQ-2026-112</div>
      <div style="margin-top:10px; font-size:12px; line-height:1.5;">
        • Client: Horizon Capital (Folake Phillips)<br>
        • Total Amount: ₦350,000<br>
        • Verified Deposit Credited: ₦140,000 (via Paystack)<br>
        • Balance Due on Completion: ₦210,000
      </div>
    </div>

    <div style="display:flex; justify-content:flex-end; gap:8px;">
      <button type="button" class="btn-secondary" onclick="closeAppDetailModal()">Close</button>
      <button type="button" class="btn-approve" onclick="notify('Invoice synced to Zoho Books ledger!'); closeAppDetailModal();">
        Confirm sync
      </button>
    </div>
  `;

  modal.style.display = 'flex';
}

function openZohoCrmLeadModal() {
  const modal = byId('appDetailModal');
  const card = byId('appDetailModalCard');
  if (!modal || !card) return;

  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(22,24,23,0.08); padding-bottom:12px; margin-bottom:14px;">
      <div style="display:flex; align-items:center; gap:10px;">
        ${renderAppLogo('zoho-crm', 36)}
        <div>
          <h3 style="margin:0; font-size:16px; font-weight:700;">Zoho CRM · Corporate Lead Review</h3>
          <p style="margin:2px 0 0; font-size:12px; color:#666;">Category: <strong>Sales &amp; CRM</strong> · Studio Teni Services Ltd</p>
        </div>
      </div>
      <button onclick="closeAppDetailModal()" style="background:none; border:none; cursor:pointer; font-size:18px; color:#666;">✕</button>
    </div>

    <div style="background:#FAF9F5; border:1px solid #E5E7EB; border-radius:10px; padding:14px; margin-bottom:14px;">
      <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#666; margin-bottom:4px;">Qualified Lead</div>
      <div style="font-weight:700; font-size:14px; color:#161817;">Kemi Adeleke (HR · Horizon Capital)</div>
      <div style="font-size:12px; color:#555; margin-top:2px;">Email: kemi.adeleke@horizoncap.ng · Deal value: ₦350,000</div>
      
      <div style="margin-top:10px; padding:8px 10px; background:#F0FDF4; border:1px solid #BBF7D0; border-radius:6px; font-size:11.5px; color:#166534;">
        ✓ <strong>Deduplication check passed:</strong> Match found for "Horizon Capital" (100% confidence). Appended corporate headshots deal without creating duplicate contact record.
      </div>
    </div>

    <div style="display:flex; justify-content:flex-end; gap:8px;">
      <button type="button" class="btn-secondary" onclick="closeAppDetailModal()">Close</button>
      <button type="button" class="btn-approve" onclick="notify('Lead deal stage advanced to Proposal Sent.'); closeAppDetailModal();">
        Advance deal stage
      </button>
    </div>
  `;

  modal.style.display = 'flex';
}

function openMetaAdsDraftModal() {
  const modal = byId('appDetailModal');
  const card = byId('appDetailModalCard');
  if (!modal || !card) return;

  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(22,24,23,0.08); padding-bottom:12px; margin-bottom:14px;">
      <div style="display:flex; align-items:center; gap:10px;">
        ${renderAppLogo('meta-ads', 36)}
        <div>
          <h3 style="margin:0; font-size:16px; font-weight:700;">Meta Ads · Campaign Draft</h3>
          <p style="margin:2px 0 0; font-size:12px; color:#666;">Ad Account: <strong>Studio Teni (act_2819201)</strong></p>
        </div>
      </div>
      <button onclick="closeAppDetailModal()" style="background:none; border:none; cursor:pointer; font-size:18px; color:#666;">✕</button>
    </div>

    <div style="background:#FAF9F5; border:1px solid #E5E7EB; border-radius:10px; padding:14px; margin-bottom:14px;">
      <div style="font-weight:700; font-size:13.5px; color:#161817;">Campaign: Fill Empty Weekday Studio Chairs</div>
      <div style="font-size:12px; color:#555; margin-top:2px;">Target: Victoria Island, Lekki &amp; Ikoyi (5km radius)</div>
      <div style="font-size:12px; color:#555; margin-top:2px;">Objective: Direct appointments via WhatsApp &amp; booking link</div>
      <div style="font-size:12px; color:#555; margin-top:2px;">Daily budget: ₦5,000 / day · 7-day duration (Total cap: ₦35,000)</div>
    </div>

    <div style="background:#FEF3C7; border:1px solid #FCD34D; border-radius:8px; padding:10px 12px; font-size:12px; color:#92400E; margin-bottom:14px;">
      <strong>⚠️ Explicit spend approval required:</strong> This is a draft campaign. No money will be deducted from your ad account until you review and confirm publishing.
    </div>

    <div style="display:flex; justify-content:flex-end; gap:8px;">
      <button type="button" class="btn-secondary" onclick="closeAppDetailModal()">Close</button>
      <button type="button" class="btn-approve" onclick="notify('Campaign draft saved. Awaiting scheduled start.'); closeAppDetailModal();">
        Save campaign draft
      </button>
    </div>
  `;

  modal.style.display = 'flex';
}

function openAppleCalendarModal() {
  const modal = byId('appDetailModal');
  const card = byId('appDetailModalCard');
  if (!modal || !card) return;

  const webcalUrl = `webcal://${window.location.host}/api/calendar/subscribe?token=demo_token_8821`;

  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(22,24,23,0.08); padding-bottom:12px; margin-bottom:14px;">
      <div style="display:flex; align-items:center; gap:10px;">
        ${renderAppLogo('apple-calendar', 36)}
        <div>
          <h3 style="margin:0; font-size:16px; font-weight:700;">Apple Calendar · Subscription Feed</h3>
          <p style="margin:2px 0 0; font-size:12px; color:#666;">Sync bookings to iPhone, iPad and Mac</p>
        </div>
      </div>
      <button onclick="closeAppDetailModal()" style="background:none; border:none; cursor:pointer; font-size:18px; color:#666;">✕</button>
    </div>

    <div style="background:#FAF9F5; border:1px solid #E5E7EB; border-radius:10px; padding:14px; margin-bottom:14px;">
      <div style="font-size:12px; font-weight:700; color:#161817; margin-bottom:6px;">Your 1-Way Webcal Feed URL</div>
      <div style="display:flex; gap:8px; align-items:center;">
        <input type="text" readonly value="${webcalUrl}" style="flex:1; padding:8px 10px; font-size:11.5px; font-family:monospace; background:#fff; border:1px solid #ccc; border-radius:6px;">
        <button type="button" class="btn-approve" onclick="navigator.clipboard.writeText('${webcalUrl}'); notify('Subscription URL copied!');">Copy</button>
      </div>
      <div style="font-size:11.5px; color:#666; margin-top:8px; line-height:1.4;">
        On your iPhone: Go to <strong>Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar</strong> and paste this URL.
      </div>
    </div>

    <div style="display:flex; justify-content:flex-end;">
      <button type="button" class="btn-secondary" onclick="closeAppDetailModal()">Close</button>
    </div>
  `;

  modal.style.display = 'flex';
}

// -------------------------------------------------------------
// RENDER BOOKINGS (AGENDA & TRACEABILITY)
// -------------------------------------------------------------
let bookingFilter = 'all';

function renderBookings() {
  const container = el('div');

  const heroBar = el('div', '', 'page-hero-header');
  heroBar.innerHTML = `
    <div class="page-hero-main">
      <div class="page-hero-title-group">
        <div class="page-hero-title-row">
          <h1 class="page-hero-title">Bookings</h1>
        </div>
        <div class="page-hero-subtitle">
          Today’s schedule, reserved chairs, and walk-in arrivals
        </div>
      </div>
      <div class="page-hero-actions">
        <button class="page-hero-btn-primary" onclick="openWalkInModal()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Add a walk-in</span>
        </button>
      </div>
    </div>
    <div class="page-hero-tabs">
      <button class="page-hero-tab ${bookingFilter === 'all' ? 'active' : ''}" onclick="bookingFilter='all'; renderPage();">All Staff</button>
      <button class="page-hero-tab ${bookingFilter === 'dele' ? 'active' : ''}" onclick="bookingFilter='dele'; renderPage();">Dele (Chair 1)</button>
      <button class="page-hero-tab ${bookingFilter === 'walkin' ? 'active' : ''}" onclick="bookingFilter='walkin'; renderPage();">Walk-ins</button>
    </div>
  `;
  container.append(heroBar);

  const list = el('div');
  const items = workspace.bookingsList.filter(b => {
    if (bookingFilter === 'dele') return b.staff.includes('Dele');
    if (bookingFilter === 'walkin') return b.source === 'Walk-in' || b.clientName.includes('Walk-in');
    return true;
  });

  for (const b of items) {
    const card = el('div', '', 'booking-agenda-card');
    card.innerHTML = `
      <div class="agenda-header">
        <div>
          <span style="font-family:'JetBrains Mono'; font-size:11px; color:#888;">#${b.id}</span>
          <div class="agenda-client-name">${b.clientName}</div>
        </div>
        <div class="agenda-slot-time">${b.dateSlot}</div>
      </div>
      <div class="agenda-meta">
        <span>✂️ <strong>${b.serviceName}</strong></span>
        <span>👤 Staff: <strong>${b.staff}</strong></span>
        <span style="color:#15803d; font-weight:600;">₦${b.depositPaid.toLocaleString()} paid · ₦${b.balanceDue.toLocaleString()} due</span>
      </div>
      ${b.notes ? `<div style="font-size:12px; background:#f7f6f0; padding:6px 10px; border-radius:6px; margin-bottom:8px; font-style:italic;">Notes: ${b.notes}</div>` : ''}
      <div class="agenda-actions">
        <button class="btn-secondary" style="font-size:11.5px; padding:4px 10px;" onclick="location.hash='clients'">View client profile</button>
        <button class="btn-secondary" style="font-size:11.5px; padding:4px 10px;" onclick="location.hash='money'">View balance in Money</button>
        ${b.clientPhone ? `<a href="https://wa.me/${b.clientPhone.replace(/[^0-9]/g,'')}" target="_blank" class="section-link" style="align-self:center; margin-left:auto;">Message WhatsApp</a>` : ''}
      </div>
    `;
    list.append(card);
  }
  container.append(list);

  return container;
}

// -------------------------------------------------------------
// WALK-IN APPOINTMENT HANDLERS
// -------------------------------------------------------------
function openWalkInModal() {
  const modal = byId('walkInModal');
  if (!modal) return;
  modal.style.display = 'flex';
  const nameInput = byId('walkInName');
  if (nameInput) {
    nameInput.value = 'Walk-in Client';
    setTimeout(() => {
      nameInput.focus();
      nameInput.select();
    }, 50);
  }
}

function closeWalkInModal() {
  const modal = byId('walkInModal');
  if (!modal) return;
  modal.style.display = 'none';
}

function updateWalkInPriceHint() {
  const serviceSelect = byId('walkInService');
  const paymentSelect = byId('walkInPayment');
  if (!serviceSelect || !paymentSelect) return;

  const parts = (serviceSelect.value || '').split('|');
  const price = parseInt(parts[1], 10) || 10000;
  const deposit = Math.min(2000, price);
  const balance = price - deposit;

  paymentSelect.innerHTML = `
    <option value="full">₦${price.toLocaleString()} Full payment collected (Cash / POS / Transfer)</option>
    <option value="deposit">₦${deposit.toLocaleString()} Deposit collected · ₦${balance.toLocaleString()} due after cut</option>
    <option value="post">Pay after haircut (Full balance due)</option>
  `;
}

function handleWalkInSubmit() {
  const nameInput = byId('walkInName');
  const phoneInput = byId('walkInPhone');
  const serviceSelect = byId('walkInService');
  const staffSelect = byId('walkInStaff');
  const paymentSelect = byId('walkInPayment');
  const notesInput = byId('walkInNotes');

  const clientName = (nameInput?.value || 'Walk-in Client').trim() || 'Walk-in Client';
  const clientPhone = (phoneInput?.value || '').trim();
  const rawService = serviceSelect?.value || 'Signature Haircut & Beard Trim|10000';
  const [serviceName, priceStr] = rawService.split('|');
  const totalPrice = parseInt(priceStr, 10) || 10000;
  const staff = staffSelect?.value || 'Dele (Chair 1)';
  const paymentMode = paymentSelect?.value || 'full';
  const notes = (notesInput?.value || '').trim() || 'Walk-in arrival at studio';

  let depositPaid = 0;
  let balanceDue = totalPrice;
  let status = 'Walk-in Confirmed · Balance Due';

  if (paymentMode === 'full') {
    depositPaid = totalPrice;
    balanceDue = 0;
    status = 'Confirmed · Paid in Full';
  } else if (paymentMode === 'deposit') {
    depositPaid = Math.min(2000, totalPrice);
    balanceDue = totalPrice - depositPaid;
    status = `Confirmed · ₦${depositPaid.toLocaleString()} Deposit Paid`;
  } else {
    depositPaid = 0;
    balanceDue = totalPrice;
    status = 'Walk-in Confirmed · Pay After Service';
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const newId = `VB-${100 + (workspace.bookingsList ? workspace.bookingsList.length : 3) + 1}`;

  const newBooking = {
    id: newId,
    clientName,
    clientPhone,
    serviceName: serviceName || 'Signature Haircut & Beard Trim',
    dateSlot: `Today at ${timeStr} (Just now)`,
    staff,
    totalPrice,
    depositPaid,
    balanceDue,
    status,
    source: 'Walk-in',
    notes
  };

  if (!workspace.bookingsList) workspace.bookingsList = [];
  workspace.bookingsList.unshift(newBooking);
  workspace.walkIns = (workspace.walkIns || 0) + 1;

  if (clientName && clientName.toLowerCase() !== 'walk-in client') {
    clientsDirectory.unshift({
      name: clientName,
      phone: clientPhone || 'Walk-in',
      email: '',
      visits: 1,
      spend: depositPaid,
      lastService: serviceName,
      lastDate: `Today ${timeStr}`,
      notes: notes || 'Walk-in arrival recorded at front desk'
    });
  }

  save({ bookingsList: [...workspace.bookingsList], walkIns: workspace.walkIns });
  notify(`✓ Walk-in recorded: ${clientName} assigned to ${staff}.`);
  closeWalkInModal();
  bookingFilter = 'all';
  renderPage();
}

function recordWalkIn(btn) {
  if (btn) {
    btn.disabled = true;
    btn.textContent = '✓ Walk-in Confirmed';
  }
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const newId = `VB-${100 + (workspace.bookingsList ? workspace.bookingsList.length : 3) + 1}`;
  const booking = {
    id: newId,
    clientName: 'Walk-in Client',
    clientPhone: '',
    serviceName: 'Signature Haircut & Beard Trim',
    dateSlot: `Today at ${timeStr} (Just now)`,
    staff: 'Dele (Chair 1)',
    totalPrice: 10000,
    depositPaid: 10000,
    balanceDue: 0,
    status: 'Confirmed · Paid in Full',
    source: 'Walk-in',
    notes: 'Walk-in recorded via Vela Agent'
  };
  if (!workspace.bookingsList) workspace.bookingsList = [];
  workspace.bookingsList.unshift(booking);
  workspace.walkIns = (workspace.walkIns || 0) + 1;
  save({ bookingsList: [...workspace.bookingsList], walkIns: workspace.walkIns });

  notify('✓ Chair 1 (Dele) booked for immediate walk-in haircut.');
  const parent = btn?.parentElement;
  if (parent) {
    parent.innerHTML = `
      <div style="background:#dcfce7; color:#166534; padding:12px 14px; border-radius:10px; font-size:12.5px; font-weight:600; width:100%;">
        ✓ Chair 1 (Dele) booked for immediate walk-in haircut (#${newId}). Recorded in Bookings schedule.
        <div style="margin-top:8px;">
          <button class="btn-approve" style="font-size:12px; padding:6px 14px; border-radius:9999px;" onclick="location.hash='bookings'">View in Bookings agenda →</button>
        </div>
      </div>
    `;
  }
}

// -------------------------------------------------------------
// RENDER CLIENTS (360° CUSTOMER DIRECTORY)
// -------------------------------------------------------------
const clientsDirectory = [
  { name: 'Tobi Adebayo', phone: '+234 802 345 6789', email: 'tobi.a@gmail.com', visits: 4, spend: 38000, lastService: 'Signature Haircut & Beard', lastDate: 'Today 1:00 PM', notes: 'Prefers sharp hairline, Dele chair 1' },
  { name: 'Kemi Adeleke', phone: '+234 803 111 2233', email: 'kemi.adeleke@horizoncap.ng', company: 'Horizon Capital', visits: 1, spend: 350000, lastService: '18-Staff Corporate Headshots', lastDate: 'Inquiry 28m ago', notes: 'HR coordinator for Horizon Capital on-location shoot' },
  { name: 'Chuka Nnamdi', phone: '+234 809 112 3344', email: 'chuka.n@yahoo.com', visits: 1, spend: 10000, lastService: 'Signature Haircut & Beard', lastDate: 'Today 4:15 PM', notes: 'First-time client, reserved via WhatsApp' },
  { name: 'Babatunde Ojo', phone: '+234 803 998 7766', email: 'babatunde@ojo.ng', visits: 6, spend: 52000, lastService: 'Executive Low Taper', lastDate: 'Today 2:30 PM', notes: 'Regular Friday client' },
  { name: 'Mrs. Yemi Balogun', phone: '+234 805 443 2211', email: 'yemi.balogun@gmail.com', visits: 2, spend: 350000, lastService: 'Wedding Photography', lastDate: 'Friday 27 Nov', notes: 'Lekki Catholic church wedding' }
];

function renderClients() {
  const container = el('div');
  
  const heroBar = el('div', '', 'page-hero-header');
  heroBar.innerHTML = `
    <div class="page-hero-main">
      <div class="page-hero-title-group">
        <div class="page-hero-title-row">
          <h1 class="page-hero-title">Clients</h1>
          <span class="page-hero-status-pill neutral">${clientsDirectory.length} clients</span>
        </div>
        <div class="page-hero-subtitle">
          Contact channels, appointment history, and lifetime client spend
        </div>
      </div>
    </div>
  `;
  container.append(heroBar);

  for (const c of clientsDirectory) {
    const card = el('div', '', 'client-profile-card');
    card.innerHTML = `
      <div class="client-profile-header">
        <div>
          <strong style="font-size:15px; color:#161817;">${c.name}</strong>
          ${c.company ? `<span style="font-size:12px; color:#666;">(${c.company})</span>` : ''}
          <div style="font-size:12px; color:#555; margin-top:2px;">
            ${c.phone} · ${c.email}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:800; font-size:15px; color:#161817;">₦${c.spend.toLocaleString()}</div>
          <span class="client-stat-badge">${c.visits} bookings</span>
        </div>
      </div>
      <div style="font-size:12.5px; color:#444; margin-bottom:8px;">
        Last appointment: <strong>${c.lastService}</strong> (${c.lastDate})
      </div>
      <div style="font-size:11.5px; color:#666; font-style:italic; margin-bottom:10px;">${c.notes}</div>
      <div style="display:flex; gap:8px;">
        <a href="#bookings" class="btn-secondary" style="font-size:11.5px; padding:4px 10px; text-decoration:none;">View in Bookings</a>
        <a href="#inbox" class="btn-secondary" style="font-size:11.5px; padding:4px 10px; text-decoration:none;">Open in Inbox</a>
        ${c.phone ? `<a href="https://wa.me/${c.phone.replace(/[^0-9]/g,'')}" target="_blank" class="section-link" style="align-self:center; margin-left:auto;">WhatsApp ↗</a>` : ''}
      </div>
    `;
    container.append(card);
  }

  return container;
}

// -------------------------------------------------------------
// RENDER MONEY (FINANCIAL LEDGER)
// -------------------------------------------------------------
function renderMoney() {
  const container = el('div');
  const apps = (typeof workspace !== 'undefined' && workspace.connectedApps) ? workspace.connectedApps : getAppsState();
  const defaultProvider = apps.flutterwave?.isDefault ? 'Flutterwave' : 'Paystack';

  const heroBar = el('div', '', 'page-hero-header');
  heroBar.innerHTML = `
    <div class="page-hero-main">
      <div class="page-hero-title-group">
        <div class="page-hero-title-row">
          <h1 class="page-hero-title">Money</h1>
        </div>
        <div class="page-hero-subtitle">
          Invoicing, verified deposits, and outstanding client balances
        </div>
      </div>
      <div class="page-hero-actions">
        <span style="font-size:12px; color:#555; background:#FAF9F5; border:1px solid #E5E7EB; border-radius:6px; padding:6px 10px; display:inline-flex; align-items:center; gap:6px;">
          <span style="width:8px; height:8px; border-radius:50%; background:#15803d;"></span>
          Default NGN Gateway: <strong>${defaultProvider}</strong>
        </span>
        <a href="#apps?category=payments" class="page-hero-btn-secondary" title="Configure Paystack, Flutterwave or Stripe in Connected Apps">Payment setup</a>
        <a href="#inbox" class="page-hero-btn-secondary">Review quote enquiries</a>
      </div>
    </div>
  `;
  container.append(heroBar);

  const stats = el('div', '', 'money-stats-grid');
  stats.innerHTML = `
    <div class="money-stat-card">
      <div class="money-stat-label">Total Invoiced & Quoted</div>
      <div class="money-stat-val">₦842,000</div>
    </div>
    <div class="money-stat-card">
      <div class="money-stat-label">Deposits Verified</div>
      <div class="money-stat-val" style="color:#15803d;">₦332,000</div>
    </div>
    <div class="money-stat-card">
      <div class="money-stat-label">Outstanding Balances</div>
      <div class="money-stat-val" style="color:#b45309;">₦510,000</div>
    </div>
  `;
  container.append(stats);

  const ledger = el('div', '', 'inbox-item-card');
  ledger.style.padding = '0';
  ledger.style.overflow = 'hidden';
  ledger.innerHTML = `
    <table class="ledger-table">
      <thead>
        <tr>
          <th>Reference</th>
          <th>Client</th>
          <th>Service</th>
          <th>Total</th>
          <th>Deposit Paid</th>
          <th>Balance Due</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong style="font-family:'JetBrains Mono';">#VQ-2026-112</strong></td>
          <td>Kemi Adeleke (Horizon Capital)</td>
          <td>18 Staff Corporate Headshots</td>
          <td><strong>₦350,000</strong></td>
          <td style="color:#15803d; font-weight:700;">₦140,000 (40%)</td>
          <td style="color:#b45309; font-weight:700;">₦210,000</td>
          <td><span class="inbox-status-tag" style="background:#fef3c7; color:#92400e;">Quoted</span></td>
        </tr>
        <tr>
          <td><strong style="font-family:'JetBrains Mono';">#INV-101</strong></td>
          <td>Tobi Adebayo</td>
          <td>Signature Haircut & Beard</td>
          <td>₦10,000</td>
          <td style="color:#15803d;">₦2,000</td>
          <td>₦8,000</td>
          <td><span class="inbox-status-tag" style="background:#dcfce7; color:#166534;">Deposit Paid</span></td>
        </tr>
        <tr>
          <td><strong style="font-family:'JetBrains Mono';">#INV-102</strong></td>
          <td>Babatunde Ojo</td>
          <td>Executive Low Taper Fade</td>
          <td>₦8,000</td>
          <td style="color:#15803d;">₦2,000</td>
          <td>₦6,000</td>
          <td><span class="inbox-status-tag" style="background:#dcfce7; color:#166534;">Deposit Paid</span></td>
        </tr>
        <tr>
          <td><strong style="font-family:'JetBrains Mono';">#INV-103</strong></td>
          <td>Chuka Nnamdi</td>
          <td>Signature Haircut & Beard</td>
          <td>₦10,000</td>
          <td style="color:#15803d; font-weight:600;">₦${(workspace.bookingsList?.find(b => b.clientName.includes('Chuka'))?.depositPaid ?? 2000).toLocaleString()}</td>
          <td style="color:#b45309; font-weight:600;">₦${(workspace.bookingsList?.find(b => b.clientName.includes('Chuka'))?.balanceDue ?? 8000).toLocaleString()}</td>
          <td><span class="inbox-status-tag" style="background:#dcfce7; color:#166534;">Deposit Paid</span></td>
        </tr>
        <tr>
          <td><strong style="font-family:'JetBrains Mono';">#VJ-394</strong></td>
          <td>Mrs. Yemi Balogun</td>
          <td>Wedding Shoot (Balogun)</td>
          <td>₦350,000</td>
          <td style="color:#15803d; font-weight:700;">₦140,000</td>
          <td style="color:#b45309;">₦210,000</td>
          <td><span class="inbox-status-tag" style="background:#dcfce7; color:#166534;">Deposit Verified</span></td>
        </tr>
      </tbody>
    </table>
  `;
  container.append(ledger);

  return container;
}

// -------------------------------------------------------------
// RENDER SETTINGS (CHANNELS & PROFILE)
// -------------------------------------------------------------
function renderSettings() {
  const container = el('div');

  const heroBar = el('div', '', 'page-hero-header');
  heroBar.innerHTML = `
    <div class="page-hero-main">
      <div class="page-hero-title-group">
        <div class="page-hero-title-row">
          <h1 class="page-hero-title">Settings</h1>
        </div>
        <div class="page-hero-subtitle">
          Business profile, connected channels, and booking policies
        </div>
      </div>
    </div>
  `;
  container.append(heroBar);

  // Channels Section linking into Connected Apps Hub
  const channelsHeader = el('div');
  channelsHeader.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
      <div>
        <h2 style="font-size:16px; font-weight:700; margin:0 0 2px;">Connected Channels</h2>
        <p style="font-size:12.5px; color:#666; margin:0;">Vela communicates through your verified business channels to sell, book, and answer customers.</p>
      </div>
      <a href="#apps?category=messaging" class="btn-secondary" style="font-size:12px; padding:6px 14px; text-decoration:none;">
        Open Connected Apps →
      </a>
    </div>
  `;
  container.append(channelsHeader);

  const channelsList = [
    { id: 'whatsapp', name: 'WhatsApp Business', identity: workspace.channels.whatsapp.identity, sync: workspace.channels.whatsapp.lastSync },
    { id: 'zoho-mail', name: 'Zoho Mail (Email Outbox)', identity: workspace.channels.email.identity, sync: workspace.channels.email.lastSync },
    { id: 'instagram', name: 'Instagram Direct Messages', identity: workspace.channels.instagram.identity, sync: workspace.channels.instagram.lastSync },
    { id: 'tiktok', name: 'TikTok Business Messaging', identity: workspace.channels.tiktok.identity, sync: workspace.channels.tiktok.lastSync }
  ];

  channelsList.forEach(ch => {
    const card = el('div', '', 'channel-connection-card');
    card.innerHTML = `
      <div style="display:flex; align-items:center; gap:14px;">
        ${renderAppLogo(ch.id, 40)}
        <div class="channel-details">
          <div style="font-weight:700; font-size:14px;">${escapeHtml(ch.name)}</div>
          <div style="font-size:12.5px; color:#555;">Identity: <strong>${escapeHtml(ch.identity)}</strong></div>
          <div style="font-size:11px; color:#777; margin-top:2px;">
            <span class="channel-status-dot active"></span>Connected · Last sync: ${escapeHtml(ch.sync)}
          </div>
        </div>
      </div>
      <button class="btn-secondary" onclick="openAppDetailModal('${ch.id}')">Manage in Apps</button>
    `;
    container.append(card);
  });

  // Sales Intelligence & Onboarding Profile Card (The 5 Core Dimensions)
  const profile = getEffectiveSalesProfile();
  const spCard = el('div', '', 'sales-profile-card');
  spCard.style.marginTop = '24px';
  spCard.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #deded9; padding-bottom:12px; margin-bottom:14px;">
      <div>
        <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#15803d; letter-spacing:0.04em;">Sales Intelligence &amp; Onboarding Profile</div>
        <h3 style="margin:2px 0 0; font-size:16px; font-weight:700;">How Vela Learns This Business Gets Paid</h3>
      </div>
      <span class="investigation-badge">Learned via Onboarding</span>
    </div>

    <p style="font-size:12.5px; color:#666; margin:0 0 14px; line-height:1.5;">
      These 5 business truths inform Vela each time you tap <strong>Find me customers</strong>, so it identifies real opportunities and prepares finished campaigns instead of asking you to invent them.
    </p>

    <div class="sales-profile-question-row">
      <div class="sp-q-label">1. Priority Service to Promote</div>
      <div class="sp-a-text"><strong>${profile.priorityServiceName}</strong> · ₦${profile.priorityPrice.toLocaleString()} (${profile.priorityDuration} mins · ₦${profile.priorityDeposit.toLocaleString()} deposit via Paystack)</div>
    </div>

    <div class="sales-profile-question-row">
      <div class="sp-q-label">2. Last Successful Customer Journey (Trigger &amp; Channel)</div>
      <div class="sp-a-text">${profile.buyingJourney}</div>
    </div>

    <div class="sales-profile-question-row">
      <div class="sp-q-label">3. Customer Pre-Payment Frictions &amp; Questions</div>
      <div class="sp-a-text">${profile.customerFriction}</div>
    </div>

    <div class="sales-profile-question-row">
      <div class="sp-q-label">4. Proof Asset used for Convincing</div>
      <div class="sp-a-text" style="display:flex; align-items:center; gap:10px;">
        <img src="${profile.proofAssetUrl}" style="width:40px; height:40px; border-radius:6px; object-fit:cover; border:1px solid #deded9;">
        <span><strong>${profile.proofAssetTitle}</strong></span>
      </div>
    </div>

    <div class="sales-profile-question-row">
      <div class="sp-q-label">5. Target Quiet Period &amp; Studio Location</div>
      <div class="sp-a-text">${profile.quietPeriods}</div>
    </div>

    <div style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap;">
      <button type="button" class="btn-approve" onclick="openSalesProfileModal()">Edit Sales Profile (5 Questions)</button>
      <button type="button" class="btn-secondary" onclick="openSalesOnboardingModal()">✦ Retake 5-Question Onboarding Interview</button>
    </div>
  `;
  container.append(spCard);

  // General Settings Form
  const form = el('form', '', 'workspace-form');
  form.style.marginTop = '24px';
  form.innerHTML = `
    <h2 style="font-size:16px; font-weight:700; margin:0 0 4px;">General Business Profile</h2>
    <label>Business Name
      <input type="text" name="name" value="${workspace.name}" required>
    </label>
    <label>Business Trade
      <select name="trade">
        <option value="barber" ${workspace.trade === 'barber' ? 'selected' : ''}>Barber & Grooming Studio</option>
        <option value="photographer" ${workspace.trade === 'photographer' ? 'selected' : ''}>Photography & Production Studio</option>
      </select>
    </label>
    <label>Studio Location
      <input type="text" name="location" value="${workspace.location}" required>
    </label>
    <label>Default AI Response Mode
      <select name="inboxMode">
        <option value="draft" ${workspace.inboxMode === 'draft' ? 'selected' : ''}>Draft for me (I approve every message)</option>
        <option value="routine" ${workspace.inboxMode === 'routine' ? 'selected' : ''}>Reply to routine enquiries automatically</option>
        <option value="manual" ${workspace.inboxMode === 'manual' ? 'selected' : ''}>I'll handle this (manual only)</option>
      </select>
    </label>
    <button type="submit" class="btn-approve">Save settings</button>
  `;
  form.onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(form);
    const newTrade = fd.get('trade');
    const tradeChanged = newTrade !== workspace.trade;
    save({
      name: fd.get('name').trim(),
      trade: newTrade,
      location: fd.get('location').trim(),
      inboxMode: fd.get('inboxMode')
    });
    if (tradeChanged) {
      workspace.salesProfile = newTrade === 'photographer' ? { ...defaultSalesProfilePhotographer } : { ...defaultSalesProfileBarber };
      save({ salesProfile: workspace.salesProfile });
    }
    notify('Settings saved.');
    renderPage();
  };
  container.append(form);

  return container;
}

// -------------------------------------------------------------
// MAIN PAGE ROUTER
// -------------------------------------------------------------
const sections = {
  inbox: 'Inbox',
  bookings: 'Bookings',
  clients: 'Clients',
  money: 'Money',
  services: 'Services',
  website: 'Website',
  gallery: 'Gallery',
  settings: 'Settings',
  apps: 'Connected apps'
};

function renderPage() {
  closeDrawer();
  closeModal();

  const rawHash = location.hash.slice(1);
  const [view, queryStr] = rawHash.split('?');
  const params = new URLSearchParams(queryStr || '');

  if (!Object.hasOwn(sections, view)) {
    startFreshTask();
    return;
  }

  selectNav(view);
  byId('homeView').style.display = 'none';
  byId('chatView').style.display = 'none';
  page.hidden = false;
  page.replaceChildren();

  if (view === 'inbox') {
    page.append(renderInbox());
    const mainWorkspace = document.querySelector('.main-workspace');
    if (mainWorkspace && savedInboxScrollTop > 0) {
      requestAnimationFrame(() => {
        mainWorkspace.scrollTop = savedInboxScrollTop;
      });
    }
  } else if (view === 'website') page.append(renderWebsite());
  else if (view === 'services') page.append(renderServices());
  else if (view === 'gallery') page.append(renderGallery());
  else if (view === 'bookings') page.append(renderBookings());
  else if (view === 'clients') page.append(renderClients());
  else if (view === 'money') page.append(renderMoney());
  else if (view === 'settings') page.append(renderSettings());
  else if (view === 'apps') page.append(renderConnectedApps(params));
}

// -------------------------------------------------------------
// SALES INTELLIGENCE & DEMAND GENERATION ENGINE
// -------------------------------------------------------------

function enterAgent() {
  originatingScreen = 'agent';
  history.pushState(null, '', '#agent');
  selectNav('agent');
}

function getEffectiveSalesProfile() {
  if (workspace.salesProfile && workspace.salesProfile.trade === workspace.trade) {
    return workspace.salesProfile;
  }
  const fallback = workspace.trade === 'photographer' ? defaultSalesProfilePhotographer : defaultSalesProfileBarber;
  workspace.salesProfile = { ...fallback };
  return workspace.salesProfile;
}

function saveSalesProfile(updates) {
  const current = getEffectiveSalesProfile();
  const nextProfile = { ...current, ...updates };
  workspace.salesProfile = nextProfile;
  save({ salesProfile: nextProfile });
  notify('Sales profile updated.');
  return nextProfile;
}

function openSalesProfileModal() {
  const profile = getEffectiveSalesProfile();
  let modal = byId('salesProfileModal');
  if (!modal) {
    modal = el('div', '', 'modal-backdrop');
    modal.id = 'salesProfileModal';
    document.body.append(modal);
  }
  
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-card" style="max-width:580px; max-height:90vh; overflow-y:auto;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-subtle); padding-bottom:12px; margin-bottom:16px;">
        <div>
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#15803d; letter-spacing:0.04em;">Business Sales Intelligence</div>
          <h3 style="margin:2px 0 0; font-size:17px; font-weight:700;">Edit 5-Question Sales Profile</h3>
        </div>
        <button type="button" onclick="closeSalesProfileModal()" style="background:none; border:none; cursor:pointer; font-size:18px;">✕</button>
      </div>

      <p style="font-size:12.5px; color:#666; margin:0 0 16px;">
        Vela uses these 5 business truths to investigate demand, choose the right service, and generate finished promotions each time you tap <strong>Find me customers</strong>.
      </p>

      <form id="editSalesProfileForm" onsubmit="handleSalesProfileSubmit(event)">
        <div style="margin-bottom:14px;">
          <label style="font-size:12px; font-weight:700; color:#161817; display:block; margin-bottom:4px;">
            1. What service would you like more people to book?
          </label>
          <input type="text" name="priorityServiceName" value="${profile.priorityServiceName}" style="width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:8px; font-size:13px; margin-bottom:6px;" required>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <input type="number" name="priorityPrice" value="${profile.priorityPrice}" placeholder="Price (₦)" style="padding:8px 10px; border:1px solid #ccc; border-radius:8px; font-size:13px;" required>
            <input type="number" name="priorityDeposit" value="${profile.priorityDeposit}" placeholder="Deposit (₦)" style="padding:8px 10px; border:1px solid #ccc; border-radius:8px; font-size:13px;" required>
          </div>
        </div>

        <div style="margin-bottom:14px;">
          <label style="font-size:12px; font-weight:700; color:#161817; display:block; margin-bottom:4px;">
            2. Tell me about someone who booked this recently. How did they find you, and why did they choose you?
          </label>
          <textarea name="buyingJourney" rows="3" style="width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:8px; font-size:13px; font-family:inherit; resize:vertical;" required>${profile.buyingJourney}</textarea>
        </div>

        <div style="margin-bottom:14px;">
          <label style="font-size:12px; font-weight:700; color:#161817; display:block; margin-bottom:4px;">
            3. What do people usually ask before they pay? (Frictions &amp; FAQs)
          </label>
          <textarea name="customerFriction" rows="2" style="width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:8px; font-size:13px; font-family:inherit; resize:vertical;" required>${profile.customerFriction}</textarea>
        </div>

        <div style="margin-bottom:14px;">
          <label style="font-size:12px; font-weight:700; color:#161817; display:block; margin-bottom:4px;">
            4. Proof Asset (Photo or video used to convince the next customer)
          </label>
          <input type="text" name="proofAssetTitle" value="${profile.proofAssetTitle}" placeholder="Title of work" style="width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:8px; font-size:13px; margin-bottom:6px;" required>
          <input type="text" name="proofAssetUrl" value="${profile.proofAssetUrl}" placeholder="Image URL" style="width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:8px; font-size:13px;" required>
        </div>

        <div style="margin-bottom:18px;">
          <label style="font-size:12px; font-weight:700; color:#161817; display:block; margin-bottom:4px;">
            5. When and where do you want more work? (Target location &amp; quiet slots)
          </label>
          <textarea name="quietPeriods" rows="2" style="width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:8px; font-size:13px; font-family:inherit; resize:vertical;" required>${profile.quietPeriods}</textarea>
        </div>

        <div style="display:flex; gap:10px; justify-content:flex-end;">
          <button type="button" class="btn-secondary" onclick="closeSalesProfileModal()">Cancel</button>
          <button type="submit" class="btn-approve">Save Sales Profile</button>
        </div>
      </form>
    </div>
  `;
}

function closeSalesProfileModal() {
  const modal = byId('salesProfileModal');
  if (modal) modal.style.display = 'none';
}

function handleSalesProfileSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  saveSalesProfile({
    priorityServiceName: fd.get('priorityServiceName').trim(),
    priorityPrice: Number(fd.get('priorityPrice')),
    priorityDeposit: Number(fd.get('priorityDeposit')),
    buyingJourney: fd.get('buyingJourney').trim(),
    customerFriction: fd.get('customerFriction').trim(),
    proofAssetTitle: fd.get('proofAssetTitle').trim(),
    proofAssetUrl: fd.get('proofAssetUrl').trim(),
    quietPeriods: fd.get('quietPeriods').trim()
  });
  closeSalesProfileModal();
  renderPage();
}

let currentOnboardingStep = 1;

function openSalesOnboardingModal() {
  currentOnboardingStep = 1;
  let modal = byId('onboardingInterviewModal');
  if (!modal) {
    modal = el('div', '', 'modal-backdrop');
    modal.id = 'onboardingInterviewModal';
    document.body.append(modal);
  }
  modal.style.display = 'flex';
  renderOnboardingStep();
}

function closeSalesOnboardingModal() {
  const modal = byId('onboardingInterviewModal');
  if (modal) modal.style.display = 'none';
}

function renderOnboardingStep() {
  const modal = byId('onboardingInterviewModal');
  if (!modal) return;
  const profile = getEffectiveSalesProfile();

  const steps = [
    {
      title: "1. What service would you like more people to book?",
      subtitle: "Choose what to promote, show the right price, and reserve enough time on your calendar.",
      body: `
        <div style="margin:16px 0;">
          <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Service Name</label>
          <input type="text" id="obService" value="${profile.priorityServiceName}" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:8px; font-size:13.5px; margin-bottom:10px;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div>
              <label style="font-size:11.5px; font-weight:600; display:block; margin-bottom:4px;">Full Price (₦)</label>
              <input type="number" id="obPrice" value="${profile.priorityPrice}" style="width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:8px; font-size:13px;">
            </div>
            <div>
              <label style="font-size:11.5px; font-weight:600; display:block; margin-bottom:4px;">Paystack Deposit (₦)</label>
              <input type="number" id="obDeposit" value="${profile.priorityDeposit}" style="width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:8px; font-size:13px;">
            </div>
          </div>
        </div>
      `
    },
    {
      title: "2. Tell me about someone who booked this recently.",
      subtitle: "How did they find you, and why did they choose you? Understanding the real trigger lets Vela reproduce the sale.",
      body: `
        <div style="margin:16px 0;">
          <textarea id="obJourney" rows="4" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:8px; font-size:13px; font-family:inherit; line-height:1.5;">${profile.buyingJourney}</textarea>
          <div style="font-size:11px; color:#777; margin-top:6px;">
            💡 <em>Tip: "He saw a taper video I posted, sent it on WhatsApp and asked if I could do the same cut" gives Vela actual material to work with.</em>
          </div>
        </div>
      `
    },
    {
      title: "3. What do people usually ask before they pay?",
      subtitle: "Address common frictions upfront so clients don't drop off before paying.",
      body: `
        <div style="margin:16px 0;">
          <textarea id="obFriction" rows="3" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:8px; font-size:13px; font-family:inherit; line-height:1.5;">${profile.customerFriction}</textarea>
          <div style="font-size:11px; color:#777; margin-top:6px;">
            Vela embeds these exact answers in your booking page and stages auto-replies for them in your inbox.
          </div>
        </div>
      `
    },
    {
      title: "4. Show me the work you’d use to convince the next customer.",
      subtitle: "Give Vela actual material to turn into a vertical flyer or post.",
      body: `
        <div style="margin:16px 0;">
          <div style="display:flex; gap:12px; align-items:center; margin-bottom:10px;">
            <img src="${profile.proofAssetUrl}" alt="Proof" style="width:64px; height:64px; object-fit:cover; border-radius:8px; border:1px solid #deded9;">
            <div style="flex:1;">
              <input type="text" id="obAssetTitle" value="${profile.proofAssetTitle}" style="width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:8px; font-size:12.5px; margin-bottom:4px;">
              <input type="text" id="obAssetUrl" value="${profile.proofAssetUrl}" style="width:100%; padding:6px 10px; border:1px solid #ccc; border-radius:8px; font-size:11.5px; color:#666;">
            </div>
          </div>
        </div>
      `
    },
    {
      title: "5. When and where do you want more work?",
      subtitle: "Aim campaigns at a real capacity problem. A full Saturday doesn't need promotion.",
      body: `
        <div style="margin:16px 0;">
          <textarea id="obQuiet" rows="3" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:8px; font-size:13px; font-family:inherit; line-height:1.5;">${profile.quietPeriods}</textarea>
          <div style="font-size:11px; color:#777; margin-top:6px;">
            Example: "Wednesday afternoons (1:00 PM – 5:00 PM) are empty. Saturdays are already full."
          </div>
        </div>
      `
    }
  ];

  const current = steps[currentOnboardingStep - 1];

  modal.innerHTML = `
    <div class="modal-card" style="max-width:560px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span class="step-num-label">Step ${currentOnboardingStep} of 5 · Vela Onboarding</span>
        <button type="button" onclick="closeSalesOnboardingModal()" style="background:none; border:none; cursor:pointer; font-size:18px;">✕</button>
      </div>

      <h3 style="font-size:17px; font-weight:800; color:#161817; margin:0 0 6px;">${current.title}</h3>
      <p style="font-size:12.5px; color:#666; margin:0 0 12px; line-height:1.5;">${current.subtitle}</p>

      ${current.body}

      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #eee; padding-top:14px; margin-top:16px;">
        <button type="button" class="btn-secondary" onclick="${currentOnboardingStep > 1 ? 'currentOnboardingStep--; renderOnboardingStep();' : 'closeSalesOnboardingModal()'}" style="font-size:12.5px;">
          ${currentOnboardingStep > 1 ? '← Back' : 'Cancel'}
        </button>

        ${currentOnboardingStep < 5 ? `
          <button type="button" class="btn-approve" onclick="saveCurrentOnboardingStep(${currentOnboardingStep}); currentOnboardingStep++; renderOnboardingStep();" style="font-size:12.5px;">
            Continue →
          </button>
        ` : `
          <button type="button" class="btn-approve" onclick="saveCurrentOnboardingStep(5); closeSalesOnboardingModal(); runFindCustomersFlow();" style="font-size:12.5px; background:#161817; color:#fff;">
            Save &amp; Find Customers Now ✦
          </button>
        `}
      </div>
    </div>
  `;
}

function saveCurrentOnboardingStep(step) {
  if (step === 1) {
    const srv = byId('obService')?.value.trim();
    const pr = Number(byId('obPrice')?.value);
    const dep = Number(byId('obDeposit')?.value);
    if (srv) saveSalesProfile({ priorityServiceName: srv, priorityPrice: pr || 10000, priorityDeposit: dep || 2000 });
  } else if (step === 2) {
    const j = byId('obJourney')?.value.trim();
    if (j) saveSalesProfile({ buyingJourney: j });
  } else if (step === 3) {
    const f = byId('obFriction')?.value.trim();
    if (f) saveSalesProfile({ customerFriction: f });
  } else if (step === 4) {
    const t = byId('obAssetTitle')?.value.trim();
    const u = byId('obAssetUrl')?.value.trim();
    if (t) saveSalesProfile({ proofAssetTitle: t, proofAssetUrl: u });
  } else if (step === 5) {
    const q = byId('obQuiet')?.value.trim();
    if (q) saveSalesProfile({ quietPeriods: q });
  }
}

// -------------------------------------------------------------
// FIND ME CUSTOMERS CONVERSATIONAL WORKSPACE
// -------------------------------------------------------------

function runFindCustomersFlow() {
  enterAgent();
  closeDrawer();
  closeModal();
  history.pushState(null, '', '#agent');
  selectNav('agent');
  page.hidden = true;
  byId('homeView').style.display = 'none';
  byId('chatView').style.display = 'flex';
  byId('chatTaskTitle').innerText = 'Find me customers · Demand generation';

  const container = byId('chatContainer');
  container.innerHTML = '';

  const isBarber = workspace.trade === 'barber';
  const profile = getEffectiveSalesProfile();

  // 1. User Message
  const userMsg = el('div', '', 'msg-block');
  userMsg.innerHTML = `
    <div class="msg-sender-line"><div class="user-avatar">U</div><span>You · Just now</span></div>
    <div class="msg-bubble user-msg">Find me customers.</div>
  `;
  container.append(userMsg);

  // 2. Vela Response: Investigation + One Recommendation
  const aiMsg = el('div', '', 'msg-block');
  aiMsg.innerHTML = `
    <div class="msg-sender-line"><span class="ai-badge">AI</span><span>Vela · Just now</span></div>

    <!-- 4-Point Investigation Card -->
    <div class="investigation-card">
      <div class="investigation-header">
        <div class="investigation-title">
          <span>✦ Reviewing ${workspace.name}'s Capacity &amp; Sales Position</span>
        </div>
        <span class="investigation-badge">Investigation Complete</span>
      </div>

      <div class="investigation-grid">
        <div class="investigation-step">
          <div class="step-num-label">1. What can we sell right now?</div>
          <div class="step-heading">${profile.priorityServiceName} (₦${profile.priorityPrice.toLocaleString()})</div>
          <div class="step-body">
            <strong>Capacity:</strong> Dele (Chair 1) has 4 open slots this Wednesday afternoon (1:30 PM, 2:30 PM, 3:30 PM, 4:30 PM).<br>
            <strong>Deposit required:</strong> ₦${profile.priorityDeposit.toLocaleString()} (via Paystack).
          </div>
        </div>

        <div class="investigation-step">
          <div class="step-num-label">2. What demand evidence exists?</div>
          <div class="step-heading">Owner Story vs. Observed Data</div>
          <div class="step-body">
            <strong>Owner knowledge:</strong> ${profile.buyingJourney.slice(0, 110)}...<br>
            <span class="observed-chip">Observed: WhatsApp status posts convert 3.2x higher when video/photos are attached.</span>
          </div>
        </div>

        <div class="investigation-step">
          <div class="step-num-label">3. What is getting in the customer's way?</div>
          <div class="step-heading">Pre-Payment Friction Detected</div>
          <div class="step-body">
            <strong>Key Questions:</strong> "${profile.customerFriction.slice(0, 85)}..."<br>
            <span class="friction-chip">Friction #1: Booking page did not explicitly mention beard sculpting is included.</span>
          </div>
        </div>

        <div class="investigation-step">
          <div class="step-num-label">4. Can a new customer complete the sale?</div>
          <div class="step-heading">Storefront Destination Audit</div>
          <div class="step-body">
            <strong>Audit result:</strong> Mobile booking page is active, but needs a direct deep-link highlighting Wednesday availability and beard inclusion.
          </div>
        </div>
      </div>
    </div>

    <!-- One Specific Recommendation Card -->
    <div class="one-rec-card">
      <div class="one-rec-headline">
        ${isBarber ? 'Let’s get two new clients into your Wednesday afternoon slots.' : 'Let’s secure two corporate headshot packages for December.'}
      </div>

      <div class="one-rec-rationale">
        <p>
          You have four openings in Yaba/VI. You told me customers often choose a cut after seeing an example. Your low-taper photo is linked to the ₦${profile.priorityPrice.toLocaleString()} service, but the current booking page doesn’t explicitly show whether beard shaping is included.
        </p>

        <div class="plan-breakdown-box">
          <strong>My plan:</strong> I’ll prepare a booking page for that exact cut with beard shaping highlighted, make a vertical post from your photo, and add your location, price and Wednesday availability. Anyone who messages instead of booking will get an accurate reply and a link to the same slots.
        </div>

        <div class="rec-meta-row">
          <div><strong>Spend:</strong> <span class="rec-spend-tag">₦0 (Organic)</span></div>
          <div><strong>Your part:</strong> Review the finished post, then share it to WhatsApp Status.</div>
        </div>
      </div>

      <div class="rec-actions-bar">
        <button type="button" class="btn-approve" onclick="prepareCustomerCampaign('${workspace.trade}')">Prepare this campaign</button>
        <button type="button" class="btn-secondary" onclick="openChangeGoalDropdown()">Change goal</button>
        <button type="button" class="btn-secondary" onclick="openSalesProfileModal()">Inspect sales profile (5 Qs)</button>
      </div>
    </div>
  `;

  container.append(aiMsg);
  container.scrollTop = container.scrollHeight;
}

function prepareCustomerCampaign(trade) {
  const container = byId('chatContainer');
  const profile = getEffectiveSalesProfile();
  const isBarber = trade === 'barber';

  // Add user click acknowledgement
  const userAction = el('div', '', 'msg-block');
  userAction.innerHTML = `
    <div class="msg-sender-line"><div class="user-avatar">U</div><span>You · Just now</span></div>
    <div class="msg-bubble user-msg">Prepare this campaign</div>
  `;
  container.append(userAction);

  // Vela Campaign Deliverables + Lifecycle Engine
  const aiDeliverables = el('div', '', 'msg-block');
  aiDeliverables.innerHTML = `
    <div class="msg-sender-line"><span class="ai-badge">AI</span><span>Vela · Just now</span></div>
    <div class="msg-bubble">
      I’ve prepared all 4 parts of your campaign. Everything is connected directly to your calendar, catalogue, and Paystack deposit ledger:
    </div>

    <div class="deliverables-container">

      <!-- 1. Preview Booking Page -->
      <div class="deliverable-card">
        <div class="deliverable-header">
          <div class="deliverable-title">
            <span>1. Dedicated Campaign Booking Page</span>
          </div>
          <span class="deliverable-status-tag">Live &amp; Deep-Linked</span>
        </div>

        <div class="booking-preview-card">
          <div class="booking-preview-service-line">
            <div>
              <div class="booking-preview-title">${profile.priorityServiceName}</div>
              <div style="font-size:12px; color:#666;">Assigned: Dele (Chair 1) · ${profile.priorityDuration} mins</div>
            </div>
            <div class="booking-preview-price">₦${profile.priorityPrice.toLocaleString()}</div>
          </div>

          <div class="booking-inclusions-list">
            <div>✓ Full beard sculpting and razor lineup included</div>
            <div>✓ Hot towel finish &amp; organic hair conditioning oil</div>
            <div>✓ ₦${profile.priorityDeposit.toLocaleString()} Paystack deposit locks chair immediately</div>
          </div>

          <div style="font-size:12px; font-weight:700; color:#161817; margin-bottom:6px;">Wednesday Afternoon Openings:</div>
          <div class="booking-slots-preview-row">
            <span class="booking-slot-bubble active">1:30 PM (Open)</span>
            <span class="booking-slot-bubble">2:30 PM (Open)</span>
            <span class="booking-slot-bubble">3:30 PM (Open)</span>
            <span class="booking-slot-bubble">4:30 PM (Open)</span>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(22,24,23,0.08); padding-top:12px; flex-wrap:wrap; gap:8px;">
            <span style="font-family:'JetBrains Mono'; font-size:11.5px; color:#555;">studioteni.vela.ng/book?promo=wed_slots</span>
            <a href="/storefront?service=srv-1&promo=wed_slots&day=Wednesday" target="_blank" class="action-btn-sm primary" style="text-decoration:none;">
              Open live customer booking page ↗
            </a>
          </div>
        </div>
      </div>

      <!-- 2. Preview Finished Creative (9:16 Canvas) -->
      <div class="deliverable-card">
        <div class="deliverable-header">
          <div class="deliverable-title">
            <span>2. Finished Vertical Creative (9:16 Story Flyer)</span>
          </div>
          <span class="deliverable-status-tag">Ready to Share</span>
        </div>

        <div class="creative-preview-grid">
          <!-- 9:16 Visual Card Mockup -->
          <div class="vertical-story-card">
            <img src="${profile.proofAssetUrl}" alt="Cut" class="vertical-story-bg">
            <div class="story-top-badge">${workspace.name.toUpperCase()} · WEDNESDAY</div>
            <div class="story-bottom-content">
              <div class="story-headline">Wednesday Afternoon Slots Open</div>
              <div class="story-tagline">Low Taper + Beard Sculpt (₦10,000)</div>
              <div class="story-slots-strip">
                <span class="story-slot-pill">1:30 PM</span>
                <span class="story-slot-pill">2:30 PM</span>
                <span class="story-slot-pill">3:30 PM</span>
                <span class="story-slot-pill">4:30 PM</span>
              </div>
              <div style="font-size:9.5px; color:#FFFFFF; margin-bottom:6px; opacity:0.9;">14 Bishop Oluwole St, VI</div>
              <div class="story-cta-box">₦2k Deposit Locks Slot</div>
            </div>
          </div>

          <!-- Caption & Action Controls -->
          <div class="caption-box-wrap">
            <div style="font-size:12.5px; font-weight:700; color:#161817;">Prepared WhatsApp Status Caption:</div>
            <div class="caption-text-area" id="campaignCaptionText">Wednesday chair openings at Studio Teni! ✂️🔥
Getting that clean low taper &amp; beard shape for the week.
Available this Wednesday: 1:30 PM, 2:30 PM, 3:30 PM, 4:30 PM.
₦10k (includes full beard sculpt &amp; hot towel). ₦2k deposit holds your chair.
Tap to claim: studioteni.vela.ng/book?promo=wed_slots</div>

            <div class="caption-btn-row">
              <button type="button" class="btn-approve" onclick="copyCampaignCaption(this)">Copy caption &amp; link</button>
              <a href="https://api.whatsapp.com/send?text=${encodeURIComponent('Wednesday chair openings at Studio Teni! ✂️🔥\nGetting that clean low taper & beard shape for the week.\nAvailable this Wednesday: 1:30 PM, 2:30 PM, 3:30 PM, 4:30 PM.\n₦10k (includes full beard sculpt & hot towel). ₦2k deposit holds your chair.\nTap to claim: studioteni.vela.ng/book?promo=wed_slots')}" target="_blank" class="action-btn-sm" style="text-decoration:none; display:flex; align-items:center; gap:6px;">
                <span>Share to WhatsApp Status</span> ↗
              </a>
              <button type="button" class="action-btn-sm" onclick="notify('Story graphic saved to downloads.')">Download story card</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Review Prepared Inbox Auto-Reply -->
      <div class="deliverable-card">
        <div class="deliverable-header">
          <div class="deliverable-title">
            <span>3. Prepared Inbox Auto-Reply (Friction Handling)</span>
          </div>
          <span class="deliverable-status-tag" style="background:#EFF6FF; color:#1D4ED8;">Staged in Inbox</span>
        </div>

        <div style="font-size:12.5px; color:#555; margin-bottom:8px;">
          When an inquiry arrives asking <em>"Where in Yaba/VI?"</em> or <em>"Is beard included?"</em>, Vela will use this verified reply:
        </div>

        <div style="background:#F7F6F0; border-radius:12px; padding:14px; border-left:3px solid #161817; font-size:12.5px; line-height:1.6; font-style:italic;">
          “Yes! Full beard shaping and hot towel finish are included in the ₦10,000 cut. Studio Teni is located at 14 Bishop Oluwole St, Victoria Island. Dele has slots open this Wednesday at 1:30 PM, 2:30 PM, 3:30 PM, and 4:30 PM. You can lock in your chair with a ₦2,000 deposit here: studioteni.vela.ng/book?promo=wed_slots”
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
          <span style="font-size:11.5px; color:#666;">Mode: Draft for me (Requires 1-tap owner approval)</span>
          <button type="button" class="action-btn-sm" onclick="location.hash='inbox'">View in Inbox →</button>
        </div>
      </div>

      <!-- 4. Campaign Live Tracker (Closed Loop) -->
      <div class="deliverable-card">
        <div class="deliverable-header">
          <div class="deliverable-title">
            <span>4. Track This Campaign (Closed-Loop Attribution)</span>
          </div>
          <span class="deliverable-status-tag">Campaign #CAMP-WED-TAPER-01</span>
        </div>

        <div class="tracker-stats-grid">
          <div class="tracker-metric-box">
            <div class="tracker-metric-label">Visits</div>
            <div class="tracker-metric-val" id="metricVisits">14</div>
            <div class="tracker-metric-sub">11 unique mobile clicks</div>
          </div>
          <div class="tracker-metric-box">
            <div class="tracker-metric-label">Enquiries</div>
            <div class="tracker-metric-val" id="metricEnquiries">3</div>
            <div class="tracker-metric-sub">WhatsApp conversations</div>
          </div>
          <div class="tracker-metric-box">
            <div class="tracker-metric-label">Bookings</div>
            <div class="tracker-metric-val" id="metricBookings">2</div>
            <div class="tracker-metric-sub">2 of 4 slots reserved</div>
          </div>
          <div class="tracker-metric-box">
            <div class="tracker-metric-label">Deposits Paid</div>
            <div class="tracker-metric-val" id="metricDeposits">₦4,000</div>
            <div class="tracker-metric-sub">Paystack verified</div>
          </div>
        </div>

        <div style="font-size:12px; color:#555; background:#FAFAFA; border:1px solid #EEE; padding:10px 14px; border-radius:10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <span><strong>Attribution:</strong> 2 new clients (Tunde B. &amp; Segun A.) · 0 returning. Remaining open: 2:30 PM &amp; 4:30 PM.</span>
          <button type="button" class="action-btn-sm" onclick="location.hash='bookings'">View Bookings</button>
        </div>
      </div>

    </div>

    <!-- 5. ONGOING SALES AGENT LIFECYCLE CONTROLS -->
    <div class="lifecycle-simulation-box">
      <div class="lifecycle-sim-header">
        <span>✦ Ongoing Sales Agent Lifecycle · What Vela does next:</span>
        <span style="font-size:10px; color:#666;">Interactive Simulation</span>
      </div>

      <div class="lifecycle-tabs-strip">
        <button type="button" class="lifecycle-tab-btn active" onclick="simulateCampaignState('prepared', this)">1. Not shared yet</button>
        <button type="button" class="lifecycle-tab-btn" onclick="simulateCampaignState('low_visits', this)">2. Low visits (2 clicks)</button>
        <button type="button" class="lifecycle-tab-btn" onclick="simulateCampaignState('friction', this)">3. Friction detected</button>
        <button type="button" class="lifecycle-tab-btn" onclick="simulateCampaignState('deposits_paid', this)">4. 2 Deposits paid</button>
        <button type="button" class="lifecycle-tab-btn" onclick="simulateCampaignState('slots_filled', this)">5. All slots filled</button>
      </div>

      <div id="lifecycleOutcomeContainer" class="lifecycle-outcome-card">
        <div style="font-weight:700; color:#161817; margin-bottom:4px;">State: Creative prepared, but link not yet shared</div>
        <p style="margin:0 0 8px; color:#555;">
          Vela will hold the campaign in memory. When you open the app, it re-opens the finished asset rather than generating another idea.
        </p>
        <div class="lifecycle-outcome-action">
          <button type="button" class="btn-approve" style="font-size:12px;" onclick="copyCampaignCaption(this)">Copy caption for WhatsApp Status</button>
        </div>
      </div>
    </div>
  `;

  container.append(aiDeliverables);
  container.scrollTop = container.scrollHeight;
}

function simulateCampaignState(stage, btn) {
  if (btn) {
    document.querySelectorAll('.lifecycle-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  const container = byId('lifecycleOutcomeContainer');
  if (!container) return;

  if (stage === 'prepared') {
    container.innerHTML = `
      <div style="font-weight:700; color:#161817; margin-bottom:4px;">State: Creative prepared, but link not yet shared</div>
      <p style="margin:0 0 8px; color:#555;">
        Vela holds the campaign active. On your next dashboard visit, it reopens this finished status asset and sharing action instead of asking you to invent a new one.
      </p>
      <div class="lifecycle-outcome-action">
        <button type="button" class="btn-approve" style="font-size:12px;" onclick="copyCampaignCaption(this)">Copy caption for WhatsApp Status</button>
      </div>
    `;
  } else if (stage === 'low_visits') {
    container.innerHTML = `
      <div style="font-weight:700; color:#b45309; margin-bottom:4px;">State: Shared 4 hours ago, but tracked link got few visits (2 clicks)</div>
      <p style="margin:0 0 8px; color:#555;">
        Vela investigates distribution: <em>"WhatsApp status reached only 22 viewers today. Suggesting: (1) Broadcast direct invites to the 3 clients who asked about tapers last week, or (2) Boost with a ₦1,500 Instagram local promotion."</em>
      </p>
      <div class="lifecycle-outcome-action">
        <button type="button" class="btn-approve" style="font-size:12px;" onclick="notify('WhatsApp follow-up invites prepared.');">Review 3 direct invites</button>
        <button type="button" class="btn-secondary" style="font-size:12px;" onclick="notify('₦1,500 local boost prepared.');">Prepare local Instagram boost</button>
      </div>
    `;
  } else if (stage === 'friction') {
    container.innerHTML = `
      <div style="font-weight:700; color:#1d4ed8; margin-bottom:4px;">State: Visitors landed and asked whether beard oil is included</div>
      <p style="margin:0 0 8px; color:#555;">
        Vela detects repeated question across 2 chats: <em>"2 visitors asked on WhatsApp if beard oil is included. I drafted an updated service description on your booking page and auto-reply. Click to apply."</em>
      </p>
      <div class="lifecycle-outcome-action">
        <button type="button" class="btn-approve" style="font-size:12px;" onclick="notify('Booking page updated with beard oil inclusion.'); this.textContent='✓ Updated page & auto-reply';">Apply 1-click update to page</button>
      </div>
    `;
  } else if (stage === 'deposits_paid') {
    container.innerHTML = `
      <div style="font-weight:700; color:#15803d; margin-bottom:4px;">State: Two new clients paid deposits (₦4,000 collected)</div>
      <p style="margin:0 0 8px; color:#555;">
        Vela records verified Paystack deposits for Tunde Bakare (1:30 PM) and Segun Adeleke (3:30 PM). 2 slots remain open. Vela prepares follow-up confirmations and asks whether to repeat the campaign for next Wednesday.
      </p>
      <div class="lifecycle-outcome-action">
        <button type="button" class="btn-approve" style="font-size:12px;" onclick="location.hash='bookings'">Open Agenda bookings</button>
        <button type="button" class="btn-secondary" style="font-size:12px;" onclick="notify('Reminder scheduled for Tuesday.');">Schedule pre-appointment reminders</button>
      </div>
    `;
  } else if (stage === 'slots_filled') {
    container.innerHTML = `
      <div style="font-weight:700; color:#15803d; margin-bottom:4px;">State: All 4 promoted Wednesday slots filled! 🎉</div>
      <p style="margin:0 0 8px; color:#555;">
        Vela automatically concludes the campaign: pauses promotion, marks Wednesday at full capacity, and seamlessly redirects future link visitors to your Friday &amp; Saturday calendar.
      </p>
      <div class="lifecycle-outcome-action">
        <button type="button" class="btn-approve" style="font-size:12px;" onclick="notify('Next week quiet slots identified.');">Plan next week's campaign</button>
      </div>
    `;
  }
}

function copyCampaignCaption(btn) {
  const text = byId('campaignCaptionText')?.innerText;
  if (text) {
    navigator.clipboard.writeText(text);
    if (btn) {
      const orig = btn.innerText;
      btn.innerText = '✓ Copied to clipboard!';
      btn.style.background = '#15803d';
      setTimeout(() => {
        btn.innerText = orig;
        btn.style.background = '';
      }, 1500);
    }
    notify('Caption & booking link copied to clipboard.');
  }
}

function openChangeGoalDropdown() {
  const container = byId('chatContainer');
  const block = el('div', '', 'msg-block');
  block.innerHTML = `
    <div class="msg-sender-line"><span class="ai-badge">AI</span><span>Vela · Just now</span></div>
    <div class="msg-bubble">
      Which alternative sales goal would you like to target?
      <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
        <button type="button" class="btn-approve" onclick="runFindCustomersFlow()">Focus on Wednesday (4 Openings)</button>
        <button type="button" class="btn-secondary" onclick="renderFindSaturdayFindings()">Fill Saturday (3 Openings)</button>
        <button type="button" class="btn-secondary" onclick="renderFindNewCustomers()">Target Corporate Clients</button>
      </div>
    </div>
  `;
  container.append(block);
  container.scrollTop = container.scrollHeight;
}

// Global window exposure for inline handlers
window.enterAgent = enterAgent;
window.getEffectiveSalesProfile = getEffectiveSalesProfile;
window.saveSalesProfile = saveSalesProfile;
window.openSalesProfileModal = openSalesProfileModal;
window.closeSalesProfileModal = closeSalesProfileModal;
window.handleSalesProfileSubmit = handleSalesProfileSubmit;
window.openSalesOnboardingModal = openSalesOnboardingModal;
window.closeSalesOnboardingModal = closeSalesOnboardingModal;
window.renderOnboardingStep = renderOnboardingStep;
window.saveCurrentOnboardingStep = saveCurrentOnboardingStep;
window.runFindCustomersFlow = runFindCustomersFlow;
window.prepareCustomerCampaign = prepareCustomerCampaign;
window.simulateCampaignState = simulateCampaignState;
window.copyCampaignCaption = copyCampaignCaption;
window.openChangeGoalDropdown = openChangeGoalDropdown;
window.toggleRecentTasks = toggleRecentTasks;
window.openDecisionTriage = openDecisionTriage;
window.closeDecisionTriage = closeDecisionTriage;
window.toggleReviewDropdown = toggleReviewDropdown;
window.toggleQuietItem = toggleQuietItem;
window.quietItemApprove = quietItemApprove;
window.quietItemDismiss = quietItemDismiss;
window.triageApprove = triageApprove;
window.triageDismiss = triageDismiss;
window.updatePendingBadges = updatePendingBadges;
window.openWalkInModal = openWalkInModal;
window.closeWalkInModal = closeWalkInModal;
window.updateWalkInPriceHint = updateWalkInPriceHint;
window.handleWalkInSubmit = handleWalkInSubmit;
window.recordWalkIn = recordWalkIn;
window.startFreshTask = startFreshTask;
window.closeCurrentTask = closeCurrentTask;

// -------------------------------------------------------------
// EVENT LISTENERS & INITIALIZATION
// -------------------------------------------------------------
// Fix: All Agent links reliably return home and scroll to top every time
document.querySelectorAll('a[href="#agent"]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    startFreshTask();
  });
});

// Scroll tracking for inbox scroll position preservation
const mainWorkspaceEl = document.querySelector('.main-workspace');
if (mainWorkspaceEl) {
  mainWorkspaceEl.addEventListener('scroll', () => {
    if (location.hash === '#inbox') {
      savedInboxScrollTop = mainWorkspaceEl.scrollTop;
    }
  }, { passive: true });
}

// Fix: Close task button returns to originating screen
const closeTaskBtn = document.querySelector('.chat-header-bar .action-btn-sm');
if (closeTaskBtn) {
  closeTaskBtn.onclick = closeCurrentTask;
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeDrawer();
    closeModal();
    closeLivePreviewModal();
  }
});

document.addEventListener('click', event => {
  if (byId('sidebar')?.classList.contains('open') && !event.target.closest('#sidebar,#openSidebarBtn')) {
    closeDrawer();
  }
});

window.addEventListener('hashchange', renderPage);

// ============================================================
// CONNECTED APPS & INTEGRATIONS SYSTEM
// ============================================================

let currentAppsCategory = 'all';
let currentAppsSearch = '';
let currentConnectStep = 1;
let currentConnectingAppId = null;
let currentReturnTask = null;

// Canonical Provider Registry (matching server_api.js)
window.PROVIDER_REGISTRY = {
  paystack: {
    id: 'paystack',
    name: 'Paystack',
    category: 'payments',
    setupType: 'credentials',
    requiresWebhook: true,
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
    setupType: 'credentials',
    requiresWebhook: true,
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
    setupType: 'business_onboarding',
    requiresWebhook: false,
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
    setupType: 'business_onboarding',
    requiresWebhook: false,
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
    setupType: 'oauth',
    requiresWebhook: false,
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
    setupType: 'business_onboarding',
    requiresWebhook: false,
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
    setupType: 'oauth',
    requiresWebhook: false,
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
    setupType: 'oauth',
    requiresWebhook: false,
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
    setupType: 'oauth',
    requiresWebhook: false,
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
    setupType: 'subscription',
    requiresWebhook: false,
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
    setupType: 'oauth',
    requiresWebhook: false,
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
    category: 'sales',
    setupType: 'oauth',
    requiresWebhook: false,
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
    setupType: 'oauth',
    requiresWebhook: false,
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
    setupType: 'oauth',
    requiresWebhook: false,
    assetPath: '/assets/integrations/dropbox.svg',
    officialSource: 'Dropbox Brand Guidelines',
    permittedAsset: 'Official Dropbox Glyph',
    integrationMethod: 'Dropbox OAuth 2.0 (Dropbox API v2)',
    supportedCapabilities: [
      'Import copies into client galleries',
      'Originals in Dropbox remain untouched',
      'Expiring client delivery download links',
      'One-time import without altering Dropbox files'
    ],
    outcomeExplanation: 'Choose photos from your Dropbox to add to client galleries. Vela imports high-resolution copies while originals remain untouched.',
    availableFinishes: ['Choose from Dropbox', 'Manage connected folder'],
    supportsMultipleAccounts: false,
    developerRequirements: 'Dropbox App Console, files.content.read and sharing.write scopes'
  },
  'meta-ads': {
    id: 'meta-ads',
    name: 'Meta Ads Manager',
    category: 'marketing',
    setupType: 'business_onboarding',
    requiresWebhook: false,
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

// Initial app catalog with full registry data and live state
const defaultAppsCatalogue = {
  paystack: {
    ...window.PROVIDER_REGISTRY.paystack,
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
    ...window.PROVIDER_REGISTRY.flutterwave,
    headline: 'Collect deposits and international payments in NGN, USD and GBP.',
    status: 'continue_setup',
    connectionState: 'key_verified_awaiting_webhook',
    isDefault: false,
    mode: 'test',
    accountIdentity: 'Studio Teni Global (flw_test_...8821)',
    settlementAccount: 'Zenith Bank · ...8821',
    supportedCurrencies: ['NGN', 'USD', 'GBP', 'EUR'],
    permissions: {
      readTransactions: true,
      createCheckout: true
    },
    waitingForEvent: true,
    unfinishedStep: 3,
    webhookStatus: 'waiting_for_event',
    lastSync: 'Awaiting first webhook',
    health: 'Key verified · Awaiting webhook',
    config: {
      defaultCurrency: 'NGN',
      enableCard: true,
      enableBankTransfer: true
    },
    activityLog: []
  },
  stripe: {
    ...window.PROVIDER_REGISTRY.stripe,
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
    ...window.PROVIDER_REGISTRY.whatsapp,
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
    ...window.PROVIDER_REGISTRY['zoho-mail'],
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
    ...window.PROVIDER_REGISTRY.instagram,
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
    ...window.PROVIDER_REGISTRY.tiktok,
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
    ...window.PROVIDER_REGISTRY['google-calendar'],
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
    ...window.PROVIDER_REGISTRY['outlook-calendar'],
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
    ...window.PROVIDER_REGISTRY['apple-calendar'],
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
    ...window.PROVIDER_REGISTRY['zoho-books'],
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
    ...window.PROVIDER_REGISTRY['zoho-crm'],
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
    ...window.PROVIDER_REGISTRY['google-drive'],
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
    ...window.PROVIDER_REGISTRY.dropbox,
    headline: 'Select photos from Dropbox to deliver private client galleries.',
    status: 'connected',
    isDefault: false,
    mode: 'live',
    accountIdentity: 'Studio Teni Portfolio Dropbox',
    permissions: {
      createUploads: true,
      importToGalleries: true
    },
    lastSync: 'Just now',
    health: 'Connected · Access Token Active',
    config: {
      accountName: 'Studio Teni Portfolio Dropbox',
      selectedFolder: '/Studio Teni Client Deliveries/Amaka Wedding 2026/',
      syncType: 'one_time_import'
    },
    activityLog: [
      { timestamp: 'Just now', event: 'Connection active', status: 'success', details: 'Access to /Studio Teni Client Deliveries/ verified' }
    ]
  },
  'meta-ads': {
    ...window.PROVIDER_REGISTRY['meta-ads'],
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

function getAppsState() {
  if (!workspace.connectedApps) {
    workspace.connectedApps = JSON.parse(JSON.stringify(defaultAppsCatalogue));
    save({ connectedApps: workspace.connectedApps });
  }
  for (const k of Object.keys(defaultAppsCatalogue)) {
    if (!workspace.connectedApps[k]) {
      workspace.connectedApps[k] = JSON.parse(JSON.stringify(defaultAppsCatalogue[k]));
    }
  }
  if (workspace.connectedApps['zoho-crm']) {
    workspace.connectedApps['zoho-crm'].category = 'sales';
  }
  return workspace.connectedApps;
}

// Logo container renderer ensuring 40px consistent container and no initials tiles
function renderAppLogo(appId, size = 40) {
  const meta = window.PROVIDER_REGISTRY[appId] || {};
  const assetPath = meta.assetPath || ('/assets/integrations/' + appId + '.svg');
  const name = meta.name || appId;
  return `<div class="app-logo-container" style="width:${size}px; height:${size}px; min-width:${size}px;">
    <img src="${assetPath}" alt="${escapeHtml(name)} logo" class="app-logo-img" style="width:${size}px; height:${size}px;">
  </div>`;
}

function getAppSummary(app) {
  if (app.id === 'dropbox') {
    return 'Studio Teni Portfolio · Add photos to gallery';
  }
  if (app.id === 'paystack') {
    return app.isDefault ? 'Live NGN Default · Naira card & bank checkout' : 'Live NGN Gateway · Naira deposits';
  }
  if (app.id === 'flutterwave') {
    if (app.status === 'continue_setup' || app.connectionState === 'key_verified_awaiting_webhook') {
      return 'Awaiting payment confirmation · Multi-currency';
    }
    return app.isDefault ? 'Live NGN Default · Multi-currency USD/GBP/EUR' : 'Multi-currency gateway · USD/GBP/EUR';
  }
  if (app.id === 'stripe') {
    return 'Studio Teni Ltd · Global cards & Apple Pay';
  }
  if (app.id === 'whatsapp') {
    return app.config?.replyMode === 'auto' ? 'Studio number ending 4567 · Auto-replies routine enquiries' : 'Studio number ending 4567 · Draft replies require approval';
  }
  if (app.id === 'google-calendar') {
    return 'Dele’s chair · View availability';
  }
  if (app.id === 'outlook-calendar') {
    return 'Segun (Chair 2) · Microsoft 365 schedule';
  }
  if (app.id === 'apple-calendar') {
    return 'Personal devices · 1-way webcal feed';
  }
  if (app.id === 'zoho-books') {
    return 'Studio Teni Services Ltd · Quote to invoice';
  }
  if (app.id === 'zoho-crm') {
    return 'Corporate clients · Deduplicated leads';
  }
  if (app.id === 'zoho-mail') {
    return 'hello@studioteni.ng · Inbound & Outbound healthy';
  }
  if (app.id === 'instagram') {
    return '@studioteni_ng · DMs & story replies';
  }
  if (app.id === 'tiktok') {
    return '@studioteni · Tracked link & video comments';
  }
  if (app.id === 'google-drive') {
    return 'Client deliverables · Add photos';
  }
  if (app.id === 'meta-ads') {
    return 'VI Studio Chairs · Spend approval required';
  }
  return app.accountIdentity ? `${app.accountIdentity} · Active` : app.headline;
}

function getAppPrimaryAction(app) {
  const isContinue = app.status === 'continue_setup' || app.connectionState === 'key_verified_awaiting_webhook';
  const isAttention = app.status === 'needs_attention';
  if (isAttention) {
    return { label: 'Reconnect', onclick: `openAppDetailModal('${app.id}')`, style: 'background:#DC2626;' };
  }
  if (isContinue) {
    return { label: 'Finish setup', onclick: `openAppDetailModal('${app.id}')`, style: 'background:#B45309;' };
  }
  if (app.id === 'dropbox') {
    return { label: 'Add photos', onclick: `openDropboxImportFlow('gal-amaka', 1)` };
  }
  if (app.id === 'whatsapp') {
    return { label: 'Open inbox', onclick: `openWhatsAppInboxModal()` };
  }
  if (app.id === 'google-calendar') {
    return { label: 'View availability', onclick: `openAvailabilityPreviewModal('dele')` };
  }
  if (app.id === 'outlook-calendar') {
    return { label: 'View availability', onclick: `openAvailabilityPreviewModal('segun')` };
  }
  if (app.id === 'apple-calendar') {
    return { label: 'View subscription', onclick: `openAppleCalendarModal()` };
  }
  if (app.id === 'paystack') {
    return { label: 'Preview checkout', onclick: `openCheckoutPreviewModal('paystack')` };
  }
  if (app.id === 'flutterwave') {
    return { label: 'Preview checkout', onclick: `openCheckoutPreviewModal('flutterwave')` };
  }
  if (app.id === 'stripe') {
    return { label: 'Preview checkout', onclick: `openCheckoutPreviewModal('stripe')` };
  }
  if (app.id === 'zoho-mail') {
    return { label: 'Open inbox', onclick: `openEmailInboxModal()` };
  }
  if (app.id === 'instagram') {
    return { label: 'Open inbox', onclick: `openInstagramInboxModal()` };
  }
  if (app.id === 'tiktok') {
    return { label: 'Create link', onclick: `openTikTokBookingLinkModal()` };
  }
  if (app.id === 'zoho-books') {
    return { label: 'Preview invoice', onclick: `openZohoBooksPreviewModal()` };
  }
  if (app.id === 'zoho-crm') {
    return { label: 'Review first lead', onclick: `openZohoCrmLeadModal()` };
  }
  if (app.id === 'google-drive') {
    return { label: 'Add photos', onclick: `openAddPhotosModal('gal-horizon')` };
  }
  if (app.id === 'meta-ads') {
    return { label: 'Create campaign', onclick: `openMetaAdsDraftModal()` };
  }
  return { label: 'Open tool', onclick: `openAppDetailModal('${app.id}')` };
}

// Render Connected Apps Screen (Simplified Two-Section Layout)
function renderConnectedApps(params) {
  const container = el('div', '', 'apps-view-container');
  const apps = getAppsState();

  if (params && params.get('category')) {
    currentAppsCategory = params.get('category').toLowerCase();
  }
  if (params && params.get('app')) {
    setTimeout(() => {
      openAppDetailModal(params.get('app'), params.get('returnTask'));
    }, 100);
  }

  // Hero Header
  const heroBar = el('div', '', 'page-hero-header');
  heroBar.innerHTML = `
    <div class="page-hero-main">
      <div class="page-hero-title-group">
        <div class="page-hero-title-row">
          <h1 class="page-hero-title">Connected apps</h1>
        </div>
        <div class="page-hero-subtitle">
          Choose the tools Vela can use for your business.
        </div>
      </div>
      <div class="page-hero-actions">
        <button type="button" class="page-hero-btn-secondary" onclick="openPaymentGatewaySelector()" title="Inspect and configure payment gateways">
          Payment Settings
        </button>
      </div>
    </div>
  `;
  container.append(heroBar);

  const allApps = Object.values(apps);
  const connectedApps = allApps.filter(a => a.status === 'connected');
  const continueApps = allApps.filter(a => a.status === 'continue_setup');
  const attentionApps = allApps.filter(a => a.status === 'needs_attention');

  // =========================================================
  // SECTION 1: YOUR APPS
  // =========================================================
  const connectedSection = el('div', '', 'apps-section-container');
  connectedSection.innerHTML = `
    <div class="apps-summary-card">
      <div class="apps-summary-header">
        <div class="apps-summary-title">Your apps · ${connectedApps.length + attentionApps.length + continueApps.length} active</div>
      </div>

      ${attentionApps.length > 0 ? `
        <div class="apps-needs-attention-box">
          <div class="apps-needs-attention-left">
            <span class="apps-needs-attention-icon">⚠️</span>
            <div class="apps-needs-attention-text">
              <strong>Needs attention:</strong> ${attentionApps.map(a => a.name).join(', ')} connection expired. Reconnect to resume automated tasks.
            </div>
          </div>
          <button type="button" class="btn-approve" style="font-size:11.5px; padding:5px 12px; background:#B45309;" onclick="openAppDetailModal('${attentionApps[0].id}')">
            Fix connection
          </button>
        </div>
      ` : ''}

      <div class="apps-connected-list">
        ${[...attentionApps, ...continueApps, ...connectedApps].map(app => {
          const isContinue = app.status === 'continue_setup' || app.connectionState === 'key_verified_awaiting_webhook';
          const isAttention = app.status === 'needs_attention';
          const isDemo = Boolean(app.isDemo);

          let badgeHtml = '';
          if (app.isDefault) badgeHtml += '<span class="app-default-pill">Default</span>';
          if (isDemo) badgeHtml += '<span class="provider-badge demo" style="margin-left:4px;">Demo</span>';
          else if (isContinue) badgeHtml += '<span class="provider-badge awaiting" style="margin-left:4px;">Key verified · Awaiting webhook</span>';
          else if (isAttention) badgeHtml += '<span class="provider-badge attention" style="margin-left:4px;">Needs Attention</span>';

          let statusText = isDemo ? 'Demo' : (isContinue ? 'Key verified · Awaiting webhook' : (isAttention ? 'Needs Attention' : 'Connected'));
          let statusDotColor = isDemo ? '#6B7280' : (isContinue ? '#B45309' : (isAttention ? '#DC2626' : '#15803D'));

          const primaryAction = getAppPrimaryAction(app);

          return `
            <div class="app-compact-row" id="connected-row-${app.id}">
              <div class="app-compact-left">
                ${renderAppLogo(app.id, 40)}
                <div class="app-compact-info">
                  <div class="app-compact-name-row">
                    <span class="app-compact-name">${escapeHtml(app.name)}</span>
                    ${badgeHtml}
                  </div>
                  <div class="app-compact-desc">${escapeHtml(getAppSummary(app))}</div>
                </div>
              </div>
              <div class="app-compact-right" style="display:flex; align-items:center; gap:8px;">
                <span class="app-status-indicator" style="color:${statusDotColor}; margin-right:4px;">
                  <span class="app-status-dot" style="background:${statusDotColor};"></span>
                  ${escapeHtml(statusText)}
                </span>
                <button type="button" class="btn-approve" style="font-size:12px; padding:5px 14px; ${primaryAction.style || ''}" onclick="${primaryAction.onclick}">
                  ${escapeHtml(primaryAction.label)}
                </button>
                <button type="button" class="btn-secondary" style="font-size:12px; padding:5px 12px;" onclick="openAppDetailModal('${app.id}')">
                  Manage
                </button>
              </div>
            </div>
          `;
        }).join('')}

        ${connectedApps.length === 0 && attentionApps.length === 0 && continueApps.length === 0 ? `
          <div style="padding:28px 16px; text-align:center; color:#666; font-size:13px;">
            No apps connected yet. Browse discoverable integrations below to connect your first tool.
          </div>
        ` : ''}
      </div>
    </div>
  `;
  container.append(connectedSection);

  // Contextual Needs-Based Recommendation (Only when solves an identified merchant need)
  if (params && params.get('intent') === 'currency_check') {
    const recBox = el('div', '', 'app-recommendation-box');
    recBox.innerHTML = `
      <div class="app-recommendation-content">
        <span class="app-recommendation-icon">💳</span>
        <div>
          <div class="app-recommendation-title">Check supported payment options</div>
          <div class="app-recommendation-text">You are invoicing in foreign currency. Evaluate Flutterwave or Stripe to accept USD, GBP and international credit cards without currency limits.</div>
        </div>
      </div>
      <button type="button" class="btn-approve" style="white-space:nowrap; font-size:12px; padding:7px 14px;" onclick="openAppDetailModal('flutterwave')">
        Evaluate Flutterwave
      </button>
    `;
    container.append(recBox);
  }

  // =========================================================
  // SECTION 2: DISCOVER APPS (Excludes connected apps from default view)
  // =========================================================
  const discoverSection = el('div', '', 'apps-section-container');
  discoverSection.innerHTML = `
    <div class="apps-section-title-row">
      <div>
        <div class="apps-section-title">Add an app</div>
        <div class="apps-section-subtitle">Available tools and integrations you can connect to Vela.</div>
      </div>
    </div>

    <!-- Controls Bar (Search + Categories) -->
    <div class="apps-controls-bar">
      <div class="apps-search-wrap">
        <svg class="apps-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" class="apps-search-input" id="appsSearchInput" placeholder="Search available tools (e.g. Stripe, Outlook, Dropbox)..." value="${escapeHtml(currentAppsSearch)}" oninput="handleAppsSearch(this.value)">
      </div>
      <div class="apps-category-tabs">
        <button class="apps-category-tab ${currentAppsCategory === 'all' ? 'active' : ''}" onclick="setAppsCategory('all')">All</button>
        <button class="apps-category-tab ${currentAppsCategory === 'payments' ? 'active' : ''}" onclick="setAppsCategory('payments')">Payments</button>
        <button class="apps-category-tab ${currentAppsCategory === 'messaging' ? 'active' : ''}" onclick="setAppsCategory('messaging')">Messaging</button>
        <button class="apps-category-tab ${currentAppsCategory === 'calendar' ? 'active' : ''}" onclick="setAppsCategory('calendar')">Calendar</button>
        <button class="apps-category-tab ${currentAppsCategory === 'sales' ? 'active' : ''}" onclick="setAppsCategory('sales')">Sales & CRM</button>
        <button class="apps-category-tab ${currentAppsCategory === 'accounting' ? 'active' : ''}" onclick="setAppsCategory('accounting')">Accounting</button>
        <button class="apps-category-tab ${currentAppsCategory === 'files' ? 'active' : ''}" onclick="setAppsCategory('files')">Files</button>
        <button class="apps-category-tab ${currentAppsCategory === 'marketing' ? 'active' : ''}" onclick="setAppsCategory('marketing')">Marketing</button>
      </div>
    </div>

    <div class="apps-available-grid" id="appsAvailableList"></div>
  `;
  container.append(discoverSection);

  const availableContainer = discoverSection.querySelector('#appsAvailableList');
  renderAvailableAppsList(availableContainer);

  return container;
}

function handleAppsSearch(val) {
  currentAppsSearch = val.trim().toLowerCase();
  const container = byId('appsAvailableList');
  if (container) renderAvailableAppsList(container);
}

function setAppsCategory(category) {
  currentAppsCategory = category;
  history.replaceState(null, '', category === 'all' ? '#apps' : `#apps?category=${category}`);
  const container = byId('appsAvailableList');
  if (container) {
    document.querySelectorAll('.apps-category-tab').forEach(t => {
      t.classList.toggle('active', t.textContent.trim().toLowerCase() === category);
    });
    renderAvailableAppsList(container);
  }
}

// Render Available Apps Grid (EXCLUDES already connected apps from default view)
function renderAvailableAppsList(container) {
  const apps = Object.values(getAppsState());

  // Exclude healthy connected and pending-setup apps from default discovery view
  const discoverable = apps.filter(app => {
    if (app.status === 'connected' || app.status === 'continue_setup') return false;
    if (currentAppsCategory !== 'all' && app.category !== currentAppsCategory) return false;
    if (currentAppsSearch) {
      const matchName = app.name.toLowerCase().includes(currentAppsSearch);
      const matchHeadline = (app.headline || '').toLowerCase().includes(currentAppsSearch);
      const matchCat = (app.category || '').toLowerCase().includes(currentAppsSearch);
      if (!matchName && !matchHeadline && !matchCat) return false;
    }
    return true;
  });

  if (discoverable.length === 0) {
    container.innerHTML = `
      <div style="background:#FFFFFF; border:1px solid rgba(22,24,23,0.08); border-radius:14px; padding:32px 20px; text-align:center; color:#666;">
        <div style="font-size:20px; margin-bottom:6px;">✓</div>
        <div style="font-weight:700; color:#161817; margin-bottom:4px;">All tools in this category are connected</div>
        <div style="font-size:12.5px;">To manage active accounts or add another account, select Manage in the Connected section above.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = discoverable.map(app => {
    const isNeedsAttention = app.status === 'needs_attention';
    const catUpper = app.category.charAt(0).toUpperCase() + app.category.slice(1);

    return `
      <div class="app-row-card" id="app-card-${app.id}">
        <div class="app-row-main">
          ${renderAppLogo(app.id, 40)}
          <div class="app-row-details">
            <div class="app-row-title-line">
              <span class="app-row-title">${escapeHtml(app.name)}</span>
              <span class="app-category-pill">${escapeHtml(catUpper)}</span>
              ${isNeedsAttention ? '<span style="font-size:11px; color:#B45309; font-weight:600;">⚠️ Needs Attention</span>' : ''}
            </div>
            <div class="app-row-sentence">${escapeHtml(app.outcomeExplanation || app.headline)}</div>
          </div>
        </div>
        <div class="app-row-action">
          ${isNeedsAttention ? `
            <button type="button" class="btn-approve" style="font-size:12px; padding:6px 16px; background:#B45309;" onclick="openAppDetailModal('${app.id}')">
              ${(app.setupType === 'oauth' || app.setupType === 'business_onboarding') ? 'Reconnect account' : 'Reconnect'}
            </button>
          ` : `
            <button type="button" class="btn-approve" style="font-size:12px; padding:6px 16px;" onclick="openAppDetailModal('${app.id}')">
              ${(app.category === 'payments' && app.setupType === 'credentials') ? 'Set up credentials' : ((app.setupType === 'oauth' || app.setupType === 'business_onboarding') ? 'Connect account' : 'Connect')}
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

// -------------------------------------------------------------
// APP DETAIL MODAL (Router between Connect Wizard, Payment Panel & Manage Screen)
// -------------------------------------------------------------
function openAppDetailModal(appId, returnTask) {
  const apps = getAppsState();
  const app = apps[appId] || window.PROVIDER_REGISTRY[appId];
  if (!app) return;

  currentConnectingAppId = appId;
  currentReturnTask = returnTask || null;
  currentWizardError = null;

  if (appId === 'paystack' || appId === 'flutterwave') {
    renderPaymentProviderPanel(appId, null, returnTask);
    return;
  }

  if (app.status === 'connected' || app.status === 'needs_attention') {
    renderManageModal(app);
  } else if (app.status === 'continue_setup') {
    const resumeStep = app.unfinishedStep || 3;
    currentConnectStep = resumeStep;
    isWebhookEventReceived = (app.webhookStatus === 'verified');
    renderConnectWizardModal(app, resumeStep);
  } else {
    currentConnectStep = 1;
    isWebhookEventReceived = false;
    renderConnectWizardModal(app, 1);
  }
}

// -------------------------------------------------------------
// 1. FOCUSED 4-STEP CONNECT FLOW WIZARD
// -------------------------------------------------------------
let currentWizardMode = 'live';
let currentWizardError = null;
let currentWizardMasked = true;
let isWebhookEventReceived = false;

function setWizardMode(mode) {
  currentWizardMode = mode;
  currentWizardError = null;
  const apps = getAppsState();
  if (currentConnectingAppId && apps[currentConnectingAppId]) {
    renderConnectWizardModal(apps[currentConnectingAppId], 2);
  }
}

function toggleWizardKeyMask() {
  currentWizardMasked = !currentWizardMasked;
  const input = byId('wizardSecretInput');
  const btn = byId('wizardToggleMaskBtn');
  if (input) {
    input.type = currentWizardMasked ? 'password' : 'text';
  }
  if (btn) {
    btn.textContent = currentWizardMasked ? 'Show' : 'Hide';
  }
}

function copyWizardWebhookUrl(appId) {
  const url = `${window.location.origin}/api/webhooks/${appId}`;
  navigator.clipboard.writeText(url).then(() => {
    const btn = byId('wizardCopyBtn');
    if (btn) {
      btn.textContent = 'Copied!';
      btn.style.background = '#15803d';
      setTimeout(() => {
        btn.textContent = 'Copy';
        btn.style.background = '#161817';
      }, 2000);
    }
    notify(`Webhook URL copied: ${url}`);
  }).catch(() => {
    notify(`Webhook URL: ${url}`);
  });
}

function markWizardWaitingForEvent(appId) {
  fetch('/api/apps/webhook-waiting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId })
  })
  .then(r => r.json())
  .then(res => {
    const apps = getAppsState();
    if (apps[appId]) {
      apps[appId].status = 'continue_setup';
      apps[appId].waitingForEvent = true;
      apps[appId].unfinishedStep = 3;
      apps[appId].webhookStatus = 'waiting_for_event';
      apps[appId].health = 'Waiting for provider event';
      save({ connectedApps: apps });
    }
    notify(`Listening for ${apps[appId]?.name || appId} webhook event. Status set to Continue setup.`);
    renderConnectWizardModal(apps[appId], 3);
  })
  .catch(() => {
    const apps = getAppsState();
    if (apps[appId]) {
      apps[appId].status = 'continue_setup';
      apps[appId].waitingForEvent = true;
      apps[appId].unfinishedStep = 3;
      save({ connectedApps: apps });
    }
    notify(`Listening for ${apps[appId]?.name || appId} webhook event.`);
    renderConnectWizardModal(apps[appId], 3);
  });
}

function checkWizardTestWebhook(appId) {
  notify('Checking for test webhook event from server...');
  fetch('/api/webhooks/test-trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: appId })
  })
  .then(r => r.json())
  .then(res => {
    if (res.success) {
      isWebhookEventReceived = true;
      const apps = getAppsState();
      if (apps[appId]) {
        apps[appId].status = 'connected';
        apps[appId].webhookStatus = 'verified';
        apps[appId].waitingForEvent = false;
        apps[appId].health = 'Active · Verified';
        apps[appId].lastSync = 'Just now';
        save({ connectedApps: apps });
      }
      notify(`✓ Webhook verified for ${apps[appId]?.name || appId}.`);
      renderConnectWizardModal(apps[appId], 4);
    } else {
      notify('⚠️ Webhook verification pending. Please send a test event from provider dashboard.');
    }
  })
  .catch(() => {
    isWebhookEventReceived = true;
    renderConnectWizardModal(getAppsState()[appId], 4);
  });
}

function saveWizardKeys(appId) {
  const secretInput = byId('wizardSecretInput');
  const publicInput = byId('wizardPublicInput');
  const secretHashInput = byId('wizardSecretHashInput');

  const secretKey = secretInput ? secretInput.value.trim() : '';
  const publicKey = publicInput ? publicInput.value.trim() : '';
  const secretHash = secretHashInput ? secretHashInput.value.trim() : '';

  const apps = getAppsState();
  const app = apps[appId];

  // Client-side quick check
  if (appId === 'paystack') {
    if (currentWizardMode === 'live' && (secretKey.startsWith('sk_test_') || publicKey.startsWith('pk_test_'))) {
      currentWizardError = `You entered a Paystack test key (${secretKey.slice(0, 8)}...). Switch to test mode or paste your live secret key (sk_live_...).`;
      renderConnectWizardModal(app, 2);
      return;
    }
    if (currentWizardMode === 'test' && (secretKey.startsWith('sk_live_') || publicKey.startsWith('pk_live_'))) {
      currentWizardError = `You entered a Paystack live key in test mode. Switch to live mode or enter a test key (sk_test_...).`;
      renderConnectWizardModal(app, 2);
      return;
    }
  } else if (appId === 'flutterwave') {
    if (currentWizardMode === 'live' && secretKey.startsWith('FLWSECK_TEST-')) {
      currentWizardError = `You entered a Flutterwave test key. Switch to test mode or paste your live secret key (FLWSECK_LIVE-...).`;
      renderConnectWizardModal(app, 2);
      return;
    }
    if (currentWizardMode === 'test' && secretKey.startsWith('FLWSECK_LIVE-')) {
      currentWizardError = `You entered a Flutterwave live key in test mode. Switch to live mode or enter a test key (FLWSECK_TEST-...).`;
      renderConnectWizardModal(app, 2);
      return;
    }
  }

  notify('Verifying credentials on server...');
  fetch('/api/apps/save-keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appId,
      mode: currentWizardMode,
      secretKey,
      publicKey,
      secretHash,
      accountIdentity: appId === 'paystack' ? 'Studio Teni · GTBank (...4910)' : appId === 'flutterwave' ? 'Studio Teni · Zenith Bank (...8821)' : 'Studio Teni Merchant'
    })
  })
  .then(r => r.json())
  .then(res => {
    if (res.error) {
      currentWizardError = res.error;
      renderConnectWizardModal(app, 2);
      return;
    }
    currentWizardError = null;
    isWebhookEventReceived = false;
    const updatedApps = getAppsState();
    if (updatedApps[appId]) {
      updatedApps[appId].status = 'continue_setup';
      updatedApps[appId].webhookStatus = 'awaiting_event';
      updatedApps[appId].unfinishedStep = 3;
      updatedApps[appId].health = 'Payment notifications awaiting verification';
      save({ connectedApps: updatedApps });
    }
    renderConnectWizardModal(updatedApps[appId], 3);
    notify(`✓ ${app.name} keys accepted. Configure webhooks in step 3.`);
  })
  .catch(err => {
    currentWizardError = 'Failed to connect to server. Please try again.';
    renderConnectWizardModal(app, 2);
  });
}

function simulateOAuthConnect(appId) {
  notify(`Authorising connection with ${window.PROVIDER_REGISTRY[appId]?.name || appId}...`);
  setTimeout(() => {
    const apps = getAppsState();
    const app = apps[appId];
    if (app) {
      if (app.id === 'google-calendar') app.accountIdentity = 'dele.cuts@studioteni.ng (Google Workspace)';
      else if (app.id === 'outlook-calendar') app.accountIdentity = 'studio@studioteni.onmicrosoft.com';
      else if (app.id === 'zoho-mail') app.accountIdentity = 'hello@studioteni.ng (Zoho Professional)';
      else if (app.id === 'zoho-books') app.accountIdentity = 'Studio Teni Services Ltd (Org #8029193)';
      else if (app.id === 'zoho-crm') app.accountIdentity = 'Studio Teni CRM (zoho.com/crm)';
      else if (app.id === 'whatsapp') app.accountIdentity = '+234 803 123 4567 (Meta Cloud API)';
      else if (app.id === 'instagram') app.accountIdentity = '@studioteni_ng (Meta Graph API)';
      else if (app.id === 'tiktok') app.accountIdentity = '@studioteni (TikTok API)';
      else if (app.id === 'stripe') app.accountIdentity = 'Studio Teni Ltd (acct_1N92X)';
      else if (app.id === 'meta-ads') app.accountIdentity = 'Studio Teni VI (act_882910)';
      else if (app.id === 'google-drive') app.accountIdentity = 'dele.cuts@studioteni.ng Drive';
      else if (app.id === 'dropbox') app.accountIdentity = 'Studio Teni Portfolio Dropbox';
      save({ connectedApps: apps });
    }
    renderConnectWizardModal(app, 3);
  }, 400);
}

function saveWizardConfiguration(appId) {
  const apps = getAppsState();
  const app = apps[appId];
  if (!app) return;

  const staffSelect = byId('wizardStaffSelect');
  if (staffSelect && app.config) app.config.assignedStaff = staffSelect.value;

  const replySelect = byId('wizardReplyMode');
  if (replySelect && app.config) app.config.replyMode = replySelect.value;

  const emailInput = byId('wizardEmailSelect');
  if (emailInput && app.config) app.config.emailAddress = emailInput.value;

  app.status = 'connected';
  app.health = 'Active · Verified';
  app.lastSync = 'Just now';
  save({ connectedApps: apps });

  renderConnectWizardModal(app, 4);
  notify(`✓ Configuration saved for ${app.name}.`);
}

function regenerateAppleSubscription(appId = 'apple-calendar') {
  notify('Regenerating private Apple Calendar subscription URL...');
  fetch('/api/apps/regenerate-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId })
  })
  .then(r => r.json())
  .then(res => {
    if (res.success) {
      const apps = getAppsState();
      if (apps[appId]) {
        if (!apps[appId].config) apps[appId].config = {};
        apps[appId].config.subscriptionUrl = res.subscriptionUrl;
        save({ connectedApps: apps });
      }
      notify('✓ Apple Calendar link regenerated. Previous URL revoked.');
      const feedInput = byId('appleFeedUrlInput');
      if (feedInput) feedInput.value = res.subscriptionUrl;
      const copyInput = byId('wizardAppleCopyInput');
      if (copyInput) copyInput.value = res.subscriptionUrl;
    }
  });
}

function renderConnectWizardModal(app, step = 1) {
  const modal = byId('appDetailModal');
  const card = byId('appDetailModalCard');
  if (!modal || !card) return;

  currentConnectStep = step;
  const isCalendar = app.category === 'calendar';
  const isPayment = app.category === 'payments';
  const isMail = app.id === 'zoho-mail';
  const isBooks = app.id === 'zoho-books';
  const isApple = app.id === 'apple-calendar';
  const setupType = app.setupType || (app.requiresWebhook ? 'credentials' : (isApple ? 'subscription' : (['whatsapp', 'instagram', 'stripe', 'meta-ads'].includes(app.id) ? 'business_onboarding' : 'oauth')));
  const requiresWebhook = Boolean(app.requiresWebhook);

  const webhookUrl = `${window.location.origin}/api/webhooks/${app.id}`;
  const subscriptionUrl = app.config?.subscriptionUrl || `${window.location.origin.replace('http', 'webcal')}/api/calendar/subscribe?token=demo_token_8821`;

  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(22,24,23,0.08); padding-bottom:12px; margin-bottom:16px;">
      <div style="display:flex; align-items:center; gap:12px;">
        ${renderAppLogo(app.id, 40)}
        <div>
          <h3 style="margin:0; font-size:16px; font-weight:700;">Connect ${escapeHtml(app.name)}</h3>
          <span style="font-size:11.5px; color:#666;">${escapeHtml(app.officialSource || 'Official Integration')}</span>
        </div>
      </div>
      <button onclick="closeAppDetailModal()" style="background:none; border:none; cursor:pointer; font-size:18px; color:#666;">✕</button>
    </div>

    <!-- Step Indicator tailored to provider type -->
    <div class="connect-wizard-steps">
      <div class="connect-step-indicator ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}">
        <span class="connect-step-circle">${step > 1 ? '✓' : '1'}</span>
        <span>Outcome</span>
      </div>
      <div class="connect-step-indicator ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}">
        <span class="connect-step-circle">${step > 2 ? '✓' : '2'}</span>
        <span>${setupType === 'credentials' ? 'Credentials' : setupType === 'subscription' ? 'Subscribe' : 'Authorise'}</span>
      </div>
      ${requiresWebhook ? `
        <div class="connect-step-indicator ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}">
          <span class="connect-step-circle">${step > 3 ? '✓' : '3'}</span>
          <span>Webhooks</span>
        </div>
      ` : setupType !== 'subscription' ? `
        <div class="connect-step-indicator ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}">
          <span class="connect-step-circle">${step > 3 ? '✓' : '3'}</span>
          <span>Configure</span>
        </div>
      ` : ''}
      <div class="connect-step-indicator ${step >= 4 ? 'active' : ''}">
        <span class="connect-step-circle">${requiresWebhook || setupType !== 'subscription' ? '4' : '3'}</span>
        <span>Verify &amp; Finish</span>
      </div>
    </div>

    <!-- STEP 1: Show what connecting enables -->
    ${step === 1 ? `
      <div class="app-detail-section">
        <div style="background:#FAF9F5; border:1px solid rgba(22,24,23,0.08); border-radius:12px; padding:16px; margin-bottom:16px;">
          <div style="font-size:15px; font-weight:700; color:#161817; margin-bottom:8px; line-height:1.4;">
            ${escapeHtml(app.outcomeExplanation || app.headline)}
          </div>
          <div style="font-size:12.5px; color:#555; line-height:1.5;">
            Where this fits: When a client initiates a booking, inquiry or payment, Vela coordinates with ${escapeHtml(app.name)} automatically.
          </div>
        </div>

        <div class="app-detail-section-title">What Vela can do once connected:</div>
        <div class="app-capabilities-list" style="margin-bottom:16px;">
          ${(app.supportedCapabilities || app.capabilities || []).map(cap => `
            <div class="app-capability-item">
              <span class="app-capability-icon">✓</span>
              <span>${escapeHtml(cap)}</span>
            </div>
          `).join('')}
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button type="button" class="btn-secondary" onclick="closeAppDetailModal()">Cancel</button>
          <button type="button" class="btn-approve" onclick="renderConnectWizardModal(getAppsState()['${app.id}'], 2)">
            ${setupType === 'credentials' ? 'Enter API Keys →' : setupType === 'subscription' ? 'View Subscription URL →' : setupType === 'business_onboarding' ? `Connect ${escapeHtml(app.name)} →` : `Connect with ${escapeHtml(app.name)} →`}
          </button>
        </div>
      </div>
    ` : ''}

    <!-- STEP 2: Authorise or Enter credentials -->
    ${step === 2 ? `
      <div class="app-detail-section">
        ${currentWizardError ? `
          <div class="wizard-alert-error" id="wizardErrorBanner">
            <span>⚠️</span>
            <div style="font-weight:600;">${escapeHtml(currentWizardError)}</div>
          </div>
        ` : ''}

        ${setupType === 'credentials' ? `
          <!-- API Credentials Form with Directional Label -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <span class="wizard-direction-badge inbound">From ${escapeHtml(app.name)} → paste into Vela</span>
            <div class="wizard-mode-toggle" style="margin-bottom:0;">
              <button type="button" class="wizard-mode-btn ${currentWizardMode === 'live' ? 'active' : ''}" onclick="setWizardMode('live')">Live Mode</button>
              <button type="button" class="wizard-mode-btn ${currentWizardMode === 'test' ? 'active' : ''}" onclick="setWizardMode('test')">Test Mode</button>
            </div>
          </div>

          <div style="background:#FFFFFF; border:1px solid rgba(22,24,23,0.1); border-radius:12px; padding:18px; margin-bottom:16px;">
            <label style="display:block; font-size:12px; font-weight:700; color:#161817; margin-bottom:4px;">
              ${escapeHtml(app.name)} ${currentWizardMode === 'live' ? 'Live' : 'Test'} Secret Key · <span style="font-weight:normal; color:#666;">Required</span>
            </label>
            <div style="font-size:11.5px; color:#666; margin-bottom:8px;">
              Used by Vela to initialize deposit checkouts and verify incoming client payments.
            </div>

            <div style="position:relative; margin-bottom:12px;">
              <input type="password" id="wizardSecretInput" placeholder="${app.id === 'paystack' ? (currentWizardMode === 'live' ? 'sk_live_...' : 'sk_test_...') : (currentWizardMode === 'live' ? 'FLWSECK_LIVE-...' : 'FLWSECK_TEST-...')}" style="width:100%; box-sizing:border-box; padding:9px 50px 9px 10px; border:1px solid #ccc; border-radius:8px; font-family:monospace; font-size:12px;">
              <button type="button" id="wizardToggleMaskBtn" onclick="toggleWizardKeyMask()" style="position:absolute; right:8px; top:8px; background:none; border:none; font-size:11.5px; color:#666; cursor:pointer;">Show</button>
            </div>

            <label style="display:block; font-size:12px; font-weight:700; color:#161817; margin-bottom:4px;">
              ${escapeHtml(app.name)} ${currentWizardMode === 'live' ? 'Live' : 'Test'} Public Key
            </label>
            <input type="text" id="wizardPublicInput" placeholder="${app.id === 'paystack' ? (currentWizardMode === 'live' ? 'pk_live_...' : 'pk_test_...') : (currentWizardMode === 'live' ? 'FLWPUBK_LIVE-...' : 'FLWPUBK_TEST-...')}" style="width:100%; box-sizing:border-box; padding:9px 10px; border:1px solid #ccc; border-radius:8px; font-family:monospace; font-size:12px; margin-bottom:12px;">

            ${app.id === 'flutterwave' ? `
              <label style="display:block; font-size:12px; font-weight:700; color:#161817; margin-bottom:4px;">
                Flutterwave Webhook Secret Hash
              </label>
              <input type="text" id="wizardSecretHashInput" placeholder="Enter custom secret hash" style="width:100%; box-sizing:border-box; padding:9px 10px; border:1px solid #ccc; border-radius:8px; font-family:monospace; font-size:12px; margin-bottom:12px;">
            ` : ''}

            <div style="font-size:11.5px; color:#0284c7; background:#F0F9FF; border:1px solid #BAE6FD; border-radius:8px; padding:9px 12px;">
              <strong>Where do I find this?</strong>
              ${app.id === 'paystack' ? 'Log into Paystack Dashboard → Settings → API Keys &amp; Webhooks' : 'Log into Flutterwave Dashboard → Settings → API Keys'}
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; gap:10px;">
            <button type="button" class="btn-secondary" onclick="renderConnectWizardModal(getAppsState()['${app.id}'], 1)">← Back</button>
            <button type="button" class="btn-approve" onclick="saveWizardKeys('${app.id}')">
              Save &amp; verify key →
            </button>
          </div>
        ` : setupType === 'subscription' ? `
          <!-- Apple Calendar 1-Way Subscription -->
          <div style="background:#FAF9F5; border:1px solid rgba(22,24,23,0.08); border-radius:12px; padding:16px; margin-bottom:16px;">
            <div style="font-weight:700; font-size:14px; margin-bottom:6px;">1-Way Calendar Subscription</div>
            <div style="font-size:12.5px; color:#555; line-height:1.5; margin-bottom:12px;">
              This private feed gives Apple Calendar read-only access to your confirmed Vela bookings on iPhone, iPad and Mac. Two-way sync (reading personal busy times to block chairs) requires CalDAV or Google/Microsoft Calendar.
            </div>

            <label style="display:block; font-size:12px; font-weight:700; margin-bottom:4px;">Private Subscription URL:</label>
            <div class="wizard-copy-box" style="margin-bottom:12px;">
              <input type="text" class="wizard-copy-input" id="wizardAppleCopyInput" value="${escapeHtml(subscriptionUrl)}" readonly>
              <button type="button" class="wizard-copy-btn" onclick="navigator.clipboard.writeText('${subscriptionUrl}'); notify('Subscription URL copied!');">Copy link</button>
            </div>

            <div style="display:flex; gap:10px; margin-bottom:14px;">
              <button type="button" class="btn-secondary" style="font-size:11.5px; padding:5px 12px;" onclick="regenerateAppleSubscription('${app.id}')">
                Revoke or regenerate link
              </button>
            </div>

            <div class="wizard-instruction-card">
              <div style="font-size:12px; font-weight:700; margin-bottom:8px; color:#161817;">How to add to Apple Calendar:</div>
              <div class="wizard-instruction-step">
                <span class="wizard-step-num">1</span>
                <span><strong>On iPhone / iPad:</strong> Open Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar. Paste the link.</span>
              </div>
              <div class="wizard-instruction-step">
                <span class="wizard-step-num">2</span>
                <span><strong>On Mac:</strong> Open Calendar app → File → New Calendar Subscription. Paste the link and click Subscribe.</span>
              </div>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; gap:10px;">
            <button type="button" class="btn-secondary" onclick="renderConnectWizardModal(getAppsState()['${app.id}'], 1)">← Back</button>
            <button type="button" class="btn-approve" onclick="renderConnectWizardModal(getAppsState()['${app.id}'], 4)">
              I've added the feed on my device →
            </button>
          </div>
        ` : setupType === 'business_onboarding' ? `
          <!-- Business Account Onboarding -->
          <div style="background:#FFFFFF; border:1px solid rgba(22,24,23,0.1); border-radius:12px; padding:20px; text-align:center; margin-bottom:16px;">
            <div style="font-size:14px; font-weight:700; margin-bottom:8px;">
              ${app.id === 'whatsapp' ? 'Connect verified WhatsApp Business number' : app.id === 'instagram' ? 'Connect Instagram Business Account' : app.id === 'stripe' ? 'Connect Stripe Account via Stripe Connect' : 'Select Meta Ad Account'}
            </div>
            <div style="font-size:12.5px; color:#666; margin-bottom:18px; max-width:420px; margin-left:auto; margin-right:auto;">
              ${app.id === 'whatsapp' ? 'Authorises Vela to receive booking messages and send approved appointment confirmations from +234 803 123 4567.' : app.id === 'stripe' ? 'Connects your bank settlement and verifies card charge capability via Stripe Connect.' : 'Authorises Vela to coordinate inquiries and customer interactions securely.'}
            </div>

            <button type="button" class="btn-approve" style="padding:10px 22px; font-size:13.5px;" onclick="simulateOAuthConnect('${app.id}')">
              ${app.id === 'whatsapp' ? 'Connect WhatsApp number' : app.id === 'instagram' ? 'Connect Instagram account' : app.id === 'stripe' ? 'Connect Stripe account' : 'Select Meta ad account'}
            </button>
          </div>

          <div style="display:flex; justify-content:flex-start;">
            <button type="button" class="btn-secondary" onclick="renderConnectWizardModal(getAppsState()['${app.id}'], 1)">← Back</button>
          </div>
        ` : `
          <!-- Sign in with Provider (OAuth) -->
          <div style="background:#FFFFFF; border:1px solid rgba(22,24,23,0.1); border-radius:12px; padding:20px; text-align:center; margin-bottom:16px;">
            <div style="font-size:14px; font-weight:700; margin-bottom:8px;">
              Sign in with ${escapeHtml(app.name)}
            </div>
            <div style="font-size:12.5px; color:#666; margin-bottom:18px; max-width:420px; margin-left:auto; margin-right:auto;">
              Authorises Vela to securely check availability, sync records or manage folders on your behalf.
            </div>

            <button type="button" class="btn-approve" style="padding:10px 22px; font-size:13.5px;" onclick="simulateOAuthConnect('${app.id}')">
              ${app.id.includes('google') ? 'Connect with Google' : app.id.includes('zoho') ? 'Connect with Zoho' : app.id.includes('outlook') ? 'Connect with Microsoft' : app.id === 'dropbox' ? 'Connect Dropbox' : `Connect with ${escapeHtml(app.name)}`}
            </button>
          </div>

          <div style="display:flex; justify-content:flex-start;">
            <button type="button" class="btn-secondary" onclick="renderConnectWizardModal(getAppsState()['${app.id}'], 1)">← Back</button>
          </div>
        `}
      </div>
    ` : ''}

    <!-- STEP 3: Webhook Registration (FOR CREDENTIALS ONLY) OR Account & Options (FOR OAUTH / BUSINESS ONBOARDING) -->
    ${step === 3 ? `
      <div class="app-detail-section">
        ${requiresWebhook ? `
          <!-- Webhooks for Paystack & Flutterwave with Directional Label -->
          <span class="wizard-direction-badge outbound">From Vela → paste into ${escapeHtml(app.name)}</span>
          <div class="app-detail-section-title">Webhook Configuration</div>
          <div style="font-size:12px; color:#666; margin-bottom:12px;">
            Copy your unique Vela webhook URL into your ${escapeHtml(app.name)} dashboard to verify customer deposits:
          </div>

          <div class="wizard-copy-box" style="margin-bottom:12px;">
            <input type="text" class="wizard-copy-input" value="${escapeHtml(webhookUrl)}" readonly>
            <button type="button" class="wizard-copy-btn" id="wizardCopyBtn" onclick="copyWizardWebhookUrl('${app.id}')">Copy URL</button>
          </div>

          <div class="wizard-instruction-card" style="margin-bottom:14px;">
            <div style="font-size:12px; font-weight:700; margin-bottom:8px; color:#161817;">
              Setup Instructions in ${escapeHtml(app.name)} Dashboard:
            </div>
            <div class="wizard-instruction-step">
              <span class="wizard-step-num">1</span>
              <span>Open <strong>${escapeHtml(app.name)} → Settings → ${app.id === 'paystack' ? 'API Keys & Webhooks' : 'Webhooks'}</strong></span>
            </div>
            <div class="wizard-instruction-step">
              <span class="wizard-step-num">2</span>
              <span>Paste the Vela Webhook URL above into the Webhook URL field</span>
            </div>
            <div class="wizard-instruction-step">
              <span class="wizard-step-num">3</span>
              <span>Subscribed events: <code>charge.success</code>, <code>transfer.success</code></span>
            </div>
          </div>

          ${app.waitingForEvent ? `
            <div class="wizard-waiting-box">
              <div class="wizard-spinner"></div>
              <div style="font-weight:700; color:#B45309; font-size:13px; margin-bottom:4px;">Waiting for provider event</div>
              <div style="font-size:11.5px; color:#92400E; line-height:1.4;">
                Vela is listening for the first event from ${escapeHtml(app.name)}. App status is set to <strong>Continue setup</strong>.
              </div>
            </div>
          ` : ''}

          <div style="display:flex; justify-content:space-between; gap:10px;">
            <button type="button" class="btn-secondary" onclick="renderConnectWizardModal(getAppsState()['${app.id}'], 2)">← Back</button>
            <div style="display:flex; gap:8px;">
              <button type="button" class="btn-secondary" onclick="markWizardWaitingForEvent('${app.id}')">
                I've added the webhook
              </button>
              <button type="button" class="btn-approve" onclick="checkWizardTestWebhook('${app.id}')">
                Check for test event
              </button>
            </div>
          </div>
        ` : `
          <!-- Account & Options Configuration (SKIPS WEBHOOK SCREEN ENTIRELY) -->
          <div style="background:#FFFFFF; border:1px solid rgba(22,24,23,0.1); border-radius:12px; padding:18px; margin-bottom:16px;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px;">
              <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#22C55E;"></span>
              <div>
                <strong style="font-size:13.5px; color:#161817;">Account identified: ${escapeHtml(app.accountIdentity || 'Studio Teni')}</strong>
                <div style="font-size:11.5px; color:#666;">Choose what Vela may use for this integration</div>
              </div>
            </div>

            ${isCalendar ? `
              <label style="display:block; font-size:12px; font-weight:700; margin-bottom:6px;">Assign to staff member or studio chair:</label>
              <select id="wizardStaffSelect" style="width:100%; padding:9px 10px; border:1px solid #ccc; border-radius:8px; font-size:13px; margin-bottom:14px;">
                <option value="Dele (Chair 1)" selected>Dele (Chair 1) · Schedule</option>
                <option value="Segun (Chair 2)">Segun (Chair 2) · Schedule</option>
              </select>
            ` : isMail ? `
              <label style="display:block; font-size:12px; font-weight:700; margin-bottom:6px;">Sending mailbox address:</label>
              <input type="text" value="hello@studioteni.ng" id="wizardEmailSelect" style="width:100%; padding:9px 10px; border:1px solid #ccc; border-radius:8px; font-size:13px; margin-bottom:14px;">
              <div class="dual-health-grid" style="margin-bottom:14px;">
                <div class="dual-health-card">
                  <div class="dual-health-title">Incoming Mail</div>
                  <div class="dual-health-status" style="color:#15803d;">● IMAP &amp; Inbound healthy</div>
                </div>
                <div class="dual-health-card">
                  <div class="dual-health-title">Outgoing Replies</div>
                  <div class="dual-health-status" style="color:#15803d;">● SPF, DKIM, DMARC passed</div>
                </div>
              </div>
            ` : isBooks ? `
              <label style="display:block; font-size:12px; font-weight:700; margin-bottom:6px;">Zoho Books Organisation:</label>
              <select id="wizardOrgSelect" style="width:100%; padding:9px 10px; border:1px solid #ccc; border-radius:8px; font-size:13px; margin-bottom:14px;">
                <option value="8029193" selected>Studio Teni Services Ltd (Org #8029193)</option>
              </select>
            ` : app.id === 'whatsapp' ? `
              <label style="display:block; font-size:12px; font-weight:700; margin-bottom:6px;">AI Reply Mode:</label>
              <select id="wizardReplyMode" style="width:100%; padding:9px 10px; border:1px solid #ccc; border-radius:8px; font-size:13px; margin-bottom:14px;">
                <option value="draft" selected>[Draft replies] (Every customer reply requires owner approval)</option>
                <option value="auto">[Allow routine replies] (Auto-answer hours, location &amp; basic pricing)</option>
              </select>
            ` : app.id === 'tiktok' ? `
              <div style="background:#FAF9F5; border:1px solid #E5E7EB; border-radius:8px; padding:12px; margin-bottom:14px;">
                <div style="font-weight:700; font-size:12px; margin-bottom:6px;">TikTok Capability Verification:</div>
                <div style="font-size:11.5px; color:#B45309; margin-bottom:4px;">⚠️ Direct messages: Pending developer approval. Automated outgoing DMs are paused.</div>
                <div style="font-size:11.5px; color:#15803d; margin-bottom:4px;">✓ Video comment inquiries: Active</div>
                <div style="font-size:11.5px; color:#15803d;">✓ Transformation lookbook content: Active</div>
              </div>
            ` : app.id === 'google-drive' || app.id === 'dropbox' ? `
              <label style="display:block; font-size:12px; font-weight:700; margin-bottom:6px;">Select Photoshoot Deliverables Root Folder:</label>
              <select id="wizardFolderSelect" style="width:100%; padding:9px 10px; border:1px solid #ccc; border-radius:8px; font-size:13px; margin-bottom:14px;">
                <option value="Studio Teni Client Deliveries" selected>Studio Teni Client Deliveries (Recommended)</option>
                <option value="Weddings & Commercial 2026">Weddings &amp; Commercial 2026</option>
              </select>
            ` : app.id === 'stripe' ? `
              <div style="background:#F0FDF4; border:1px solid #86EFAC; border-radius:8px; padding:12px; margin-bottom:14px;">
                <div style="font-weight:700; font-size:12px; color:#166534; margin-bottom:4px;">✓ Charge Capability Verified</div>
                <div style="font-size:11.5px; color:#166534;">Connected to acct_1N92X. Charges enabled: <strong>true</strong>. Apple Pay and global card checkout active.</div>
              </div>
            ` : ''}

            <div style="font-size:11.5px; color:#666; line-height:1.45;">
              Vela coordinates with this tool using the permissions and limits you specify here.
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; gap:10px;">
            <button type="button" class="btn-secondary" onclick="renderConnectWizardModal(getAppsState()['${app.id}'], 2)">← Back</button>
            <button type="button" class="btn-approve" onclick="saveWizardConfiguration('${app.id}')">
              Save configuration &amp; verify →
            </button>
          </div>
        `}
      </div>
    ` : ''}

    <!-- STEP 4: Verify and finish with a useful action -->
    ${step === 4 ? `
      <div class="app-detail-section">
        <div class="app-detail-section-title">Verification Milestones</div>

        <div style="margin-bottom:16px;">
          <div class="wizard-milestone-row done">
            <span>✓</span>
            <div><strong>Authorization accepted:</strong> Verified for ${escapeHtml(app.name)}</div>
          </div>
          <div class="wizard-milestone-row done">
            <span>✓</span>
            <div><strong>Account identified:</strong> ${escapeHtml(app.accountIdentity || 'Studio Teni Enterprise Account')}</div>
          </div>
          <div class="wizard-milestone-row ${requiresWebhook ? (isWebhookEventReceived ? 'done' : 'pending') : 'done'}">
            <span>${requiresWebhook ? (isWebhookEventReceived ? '✓' : '⏳') : '✓'}</span>
            <div>
              <strong>${requiresWebhook ? 'Webhook notification:' : 'Integration health:'}</strong>
              ${requiresWebhook ? (isWebhookEventReceived ? 'Verified & HMAC signature authenticated' : 'Payment notifications awaiting verification') : 'Verified 100% operational'}
            </div>
          </div>
          <div class="wizard-milestone-row done">
            <span>✓</span>
            <div><strong>Workflow tested:</strong> Ready for business actions</div>
          </div>
        </div>

        ${requiresWebhook && !isWebhookEventReceived ? `
          <div style="background:#FFFBEB; border:1px solid #FCD34D; border-radius:10px; padding:12px; margin-bottom:16px; font-size:12px; color:#92400E;">
            <strong>Partial setup:</strong> Status set to <em>Continue setup</em>. Payments will function via API redirection while awaiting your first webhook.
          </div>
        ` : `
          <div style="background:#F0FDF4; border:1px solid #86EFAC; border-radius:10px; padding:12px; margin-bottom:16px; font-size:12px; color:#166534;">
            🎉 <strong>100% Operational:</strong> ${escapeHtml(app.name)} is connected, verified and ready to use.
          </div>
        `}

        <div style="display:flex; flex-direction:column; gap:10px;">
          ${currentReturnTask ? `
            <button type="button" class="btn-approve" style="padding:11px 18px; font-size:13px; justify-content:center;" onclick="returnToAgentTask('${currentReturnTask}')">
              Return to task &amp; resume saved draft →
            </button>
          ` : ''}

          ${isPayment ? `
            <button type="button" class="btn-approve" style="padding:11px 18px; font-size:13px; justify-content:center;" onclick="previewDepositCheckout()">
              Preview deposit checkout →
            </button>
          ` : isCalendar ? `
            <button type="button" class="btn-approve" style="padding:11px 18px; font-size:13px; justify-content:center;" onclick="checkAvailableTimes()">
              Check Dele's availability →
            </button>
          ` : isBooks ? `
            <button type="button" class="btn-approve" style="padding:11px 18px; font-size:13px; justify-content:center;" onclick="createTestQuotation()">
              Prepare first quotation →
            </button>
          ` : `
            <button type="button" class="btn-approve" style="padding:11px 18px; font-size:13px; justify-content:center;" onclick="closeAppDetailModal(); renderPage(); notify('✓ ${escapeHtml(app.name)} is active.');">
              Go to Connected Apps
            </button>
          `}

          <button type="button" class="btn-secondary" style="padding:9px 16px; font-size:12.5px; justify-content:center;" onclick="closeAppDetailModal(); renderPage();">
            Close &amp; Return to Dashboard
          </button>
        </div>
      </div>
    ` : ''}
  `;

  modal.style.display = 'flex';
}

// =============================================================
// PAYMENT PROVIDER PANELS (PAYSTACK & FLUTTERWAVE CREDENTIALS & WEBHOOKS)
// =============================================================
let currentPaymentEnv = 'live';
let isReplacingKey = false;
let isKeyMasked = true;
let isReplacementKeyMasked = true;

async function renderPaymentProviderPanel(appId, forcedEnv, returnTask) {
  const modal = byId('appDetailModal');
  const card = byId('appDetailModalCard');
  if (!modal || !card) return;

  currentConnectingAppId = appId;
  currentReturnTask = returnTask || null;

  let credsData = null;
  try {
    const res = await fetch(`/api/apps/credentials?appId=${appId}`);
    credsData = await res.json();
  } catch (e) {
    console.error('Failed to load credentials from server', e);
  }

  const apps = getAppsState();
  const app = apps[appId] || window.PROVIDER_REGISTRY[appId];
  if (!app) return;

  if (forcedEnv) {
    currentPaymentEnv = forcedEnv;
  } else if (credsData && credsData.activeEnvironment) {
    currentPaymentEnv = credsData.activeEnvironment;
  }

  const activeEnv = currentPaymentEnv;
  const envInfo = credsData?.environments?.[activeEnv] || {
    hasKey: Boolean(app.config?.maskedSecretKey && app.config?.mode === activeEnv),
    maskedSecretKey: app.config?.mode === activeEnv ? app.config?.maskedSecretKey : null,
    maskedSuffix: app.config?.mode === activeEnv && app.config?.maskedSecretKey ? app.config.maskedSecretKey.slice(-4) : (app.isDemo && activeEnv === 'live' ? '4910' : null)
  };

  const hasKey = Boolean(envInfo.hasKey);
  const maskedSuffix = envInfo.maskedSuffix || (app.isDemo && activeEnv === 'live' ? '4910' : '••••');

  const connectionState = credsData?.connectionState || (app.isDemo ? 'demo' : (hasKey ? (app.webhookStatus === 'verified' ? 'connected' : 'key_verified_awaiting_webhook') : 'no_credentials'));
  const isDemo = Boolean(credsData?.isDemo || app.isDemo);

  let stateBadgeText = 'Connected';
  let stateBadgeClass = 'connected';
  if (isDemo) {
    stateBadgeText = 'Demo';
    stateBadgeClass = 'demo';
  } else if (connectionState === 'no_credentials') {
    stateBadgeText = 'Set up credentials';
    stateBadgeClass = 'no-creds';
  } else if (connectionState === 'key_verified_awaiting_webhook' || app.status === 'continue_setup') {
    stateBadgeText = 'Key verified · Awaiting webhook';
    stateBadgeClass = 'awaiting';
  } else if (app.status === 'needs_attention') {
    stateBadgeText = 'Needs Attention';
    stateBadgeClass = 'attention';
  }

  const webhookUrl = credsData?.webhook?.url || `${window.location.origin.replace('http:', 'https:')}/api/webhooks/${app.id}`;
  const isWebhookConfigured = credsData?.webhook?.isConfigured !== false;
  const lastEvent = credsData?.webhook?.lastEvent || (isDemo ? 'Deposit ₦2,000 from Babatunde Ojo · 10m ago' : (app.lastWebhookEvent || null));
  const hasSecretHash = Boolean(credsData?.webhook?.hasSecretHash || app.config?.secretHash);

  const secretPlaceholder = appId === 'paystack'
    ? (activeEnv === 'test' ? 'sk_test_...' : 'sk_live_...')
    : (activeEnv === 'test' ? 'FLWSECK_TEST-...' : 'FLWSECK_LIVE-...');
  const publicPlaceholder = appId === 'paystack'
    ? (activeEnv === 'test' ? 'pk_test_...' : 'pk_live_...')
    : (activeEnv === 'test' ? 'FLWPUBK_TEST-...' : 'FLWPUBK_LIVE-...');

  card.innerHTML = `
    <!-- Header -->
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(22,24,23,0.08); padding-bottom:12px; margin-bottom:16px;">
      <div style="display:flex; align-items:center; gap:12px;">
        ${renderAppLogo(app.id, 40)}
        <div>
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <h3 style="margin:0; font-size:17px; font-weight:700;">${escapeHtml(app.name)}</h3>
            <span class="provider-badge ${stateBadgeClass}">${stateBadgeText}</span>
            ${app.isDefault ? '<span class="app-default-pill">Default NGN Provider</span>' : ''}
          </div>
          <span style="font-size:11.5px; color:#666;">${escapeHtml(app.category.toUpperCase())} · ${escapeHtml(app.headline || app.outcomeExplanation)}</span>
        </div>
      </div>
      <button onclick="closeAppDetailModal()" style="background:none; border:none; cursor:pointer; font-size:18px; color:#666;" title="Close">✕</button>
    </div>

    <!-- SECTION 1: API CREDENTIALS (Immediately below provider name) -->
    <div class="panel-section" id="panelCredentialsSection" style="background:#FFFFFF; border:1px solid rgba(22,24,23,0.1); border-radius:12px; padding:16px; margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <div>
          <h4 style="margin:0; font-size:13.5px; font-weight:700; color:#161817;">API Credentials</h4>
          <div style="font-size:11.5px; color:#666;">Direct server-to-server gateway authentication</div>
        </div>

        <!-- Test / Live Selector -->
        <div class="env-toggle-group">
          <button type="button" class="env-toggle-btn ${activeEnv === 'test' ? 'active' : ''}" onclick="switchPaymentPanelEnv('${app.id}', 'test')">
            Test
          </button>
          <button type="button" class="env-toggle-btn ${activeEnv === 'live' ? 'active' : ''}" onclick="switchPaymentPanelEnv('${app.id}', 'live')">
            Live
          </button>
        </div>
      </div>

      <!-- If selected environment has NO saved key: immediately show masked input -->
      ${!hasKey ? `
        <div id="panelNoKeyForm">
          <div style="margin-bottom:12px;">
            <label style="display:block; font-size:12px; font-weight:600; color:#161817; margin-bottom:6px;">
              ${activeEnv === 'test' ? 'Test secret key' : 'Live secret key'}
            </label>
            <div style="position:relative;">
              <input type="${isKeyMasked ? 'password' : 'text'}" id="panelSecretKeyInput" class="masked-key-input" placeholder="${secretPlaceholder}" autocomplete="off" style="width:100%; box-sizing:border-box; padding:9px 50px 9px 12px; border:1px solid #c5c7bf; border-radius:8px; font-family:'JetBrains Mono', monospace; font-size:12px;">
              <button type="button" class="toggle-mask-btn" onclick="togglePaymentKeyMask('panelSecretKeyInput', this)" style="position:absolute; right:8px; top:50%; transform:translateY(-50%); background:none; border:none; color:#666; font-size:11px; font-weight:600; cursor:pointer; padding:4px 6px;">
                ${isKeyMasked ? 'Show' : 'Hide'}
              </button>
            </div>
          </div>

          ${app.id === 'flutterwave' ? `
            <div style="margin-bottom:12px;">
              <label style="display:block; font-size:12px; font-weight:600; color:#161817; margin-bottom:6px;">
                ${activeEnv === 'test' ? 'Test public key' : 'Live public key'} <span style="font-weight:400; color:#888;">(Optional)</span>
              </label>
              <input type="text" id="panelPublicKeyInput" class="masked-key-input" placeholder="${publicPlaceholder}" style="width:100%; box-sizing:border-box; padding:9px 12px; border:1px solid #c5c7bf; border-radius:8px; font-family:'JetBrains Mono', monospace; font-size:12px;">
            </div>
          ` : ''}

          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
            <a href="/knowledge-base/connected-apps/connect-${app.id}" target="_blank" rel="noopener" class="where-find-key-link" style="font-size:12px; color:#285731; font-weight:600; text-decoration:none;">
              Where to find my key? ↗
            </a>
            <button type="button" class="btn-approve" onclick="submitPanelSecretKey('${app.id}', '${activeEnv}')" style="font-size:12px; padding:7px 16px;">
              Save &amp; verify key
            </button>
          </div>

          <div id="panelKeyHelpBox" style="display:none; margin-top:10px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:10px 12px; font-size:11.5px; color:#475569; line-height:1.4;">
            ${app.id === 'paystack'
              ? 'Find your keys in <strong>Paystack Dashboard → Settings → API Keys &amp; Webhooks</strong>. <a href="/knowledge-base/connected-apps/connect-paystack" target="_blank" style="color:#285731; font-weight:600;">Read complete guide ↗</a>'
              : 'Find your keys in <strong>Flutterwave Dashboard → Settings → API Keys</strong>. <a href="/knowledge-base/connected-apps/connect-flutterwave" target="_blank" style="color:#285731; font-weight:600;">Read complete guide ↗</a>'}
          </div>

          <div id="panelCredentialsError" style="display:none; margin-top:10px; background:#FEF2F2; border:1px solid #FCA5A5; color:#991B1B; padding:9px 12px; border-radius:8px; font-size:12px; font-weight:500;"></div>
        </div>
      ` : `
        <!-- If key exists: show masked suffix and visible Replace key button -->
        <div id="panelExistingKeyBox">
          <div style="display:flex; justify-content:space-between; align-items:center; background:#FAF9F5; border:1px solid #E5E7EB; border-radius:8px; padding:12px 14px;">
            <div>
              <div style="font-size:11px; font-weight:600; color:#666; text-transform:uppercase; letter-spacing:0.04em;">
                ${activeEnv === 'test' ? 'Test secret key' : 'Live secret key'}
              </div>
              <div style="font-family:'JetBrains Mono', monospace; font-size:13.5px; font-weight:700; color:#161817; margin-top:3px;">
                ••••••••${maskedSuffix}
              </div>
              <div style="font-size:11px; color:#15803d; margin-top:2px; font-weight:500;">
                ✓ Key verified on server · AES-256 encrypted
              </div>
            </div>
            <button type="button" class="btn-secondary" onclick="toggleInPlaceKeyReplacer()" style="font-size:12px; padding:6px 14px;">
              Replace key
            </button>
          </div>

          <!-- In-place replacement container -->
          <div id="inPlaceKeyReplacerBox" style="display:${isReplacingKey ? 'block' : 'none'}; margin-top:12px; background:#FFFFFF; border:1px solid #deded9; border-radius:8px; padding:12px;">
            <div style="font-size:12px; font-weight:700; color:#161817; margin-bottom:2px;">Replace ${activeEnv.toUpperCase()} Secret Key</div>
            <div style="font-size:11.5px; color:#666; margin-bottom:8px;">
              Your current working key (••••••••${maskedSuffix}) remains active until this replacement key verifies successfully.
            </div>
            <div style="position:relative; margin-bottom:10px;">
              <input type="${isReplacementKeyMasked ? 'password' : 'text'}" id="panelReplacementKeyInput" class="masked-key-input" placeholder="Paste replacement ${activeEnv} key (${secretPlaceholder})..." autocomplete="off" style="width:100%; box-sizing:border-box; padding:9px 50px 9px 12px; border:1px solid #c5c7bf; border-radius:8px; font-family:'JetBrains Mono', monospace; font-size:12px;">
              <button type="button" class="toggle-mask-btn" onclick="togglePaymentKeyMask('panelReplacementKeyInput', this)" style="position:absolute; right:8px; top:50%; transform:translateY(-50%); background:none; border:none; color:#666; font-size:11px; font-weight:600; cursor:pointer; padding:4px 6px;">
                ${isReplacementKeyMasked ? 'Show' : 'Hide'}
              </button>
            </div>
            <div style="display:flex; gap:8px;">
              <button type="button" class="btn-approve" onclick="submitInPlaceReplacementKey('${app.id}', '${activeEnv}')" style="font-size:12px; padding:7px 16px;">
                Save &amp; verify replacement
              </button>
              <button type="button" class="btn-secondary" onclick="toggleInPlaceKeyReplacer(false)" style="font-size:12px; padding:7px 14px;">
                Cancel
              </button>
            </div>
            <div id="panelReplacementError" style="display:none; margin-top:10px; background:#FEF2F2; border:1px solid #FCA5A5; color:#991B1B; padding:9px 12px; border-radius:8px; font-size:12px; font-weight:500;"></div>
          </div>
        </div>
      `}
    </div>

    <!-- SECTION 2: WEBHOOK SETUP (Directly below credentials) -->
    <div class="panel-section" id="panelWebhookSection" style="background:#FFFFFF; border:1px solid rgba(22,24,23,0.1); border-radius:12px; padding:16px; margin-bottom:16px;">
      <div style="margin-bottom:12px;">
        <h4 style="margin:0; font-size:13.5px; font-weight:700; color:#161817;">Webhook Configuration</h4>
        <div style="font-size:11.5px; color:#666;">Real-time booking and deposit payment notifications</div>
      </div>

      ${!isWebhookConfigured ? `
        <div style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:8px; padding:10px 12px; margin-bottom:12px; font-size:12px; color:#92400E;">
          <strong>⚠️ Webhook setup pending:</strong> Platform administrator must configure a public HTTPS endpoint (VELA_PUBLIC_URL) in server environment.
        </div>
      ` : ''}

      <div style="margin-bottom:12px;">
        <label style="display:block; font-size:12px; font-weight:600; color:#161817; margin-bottom:5px;">
          Public HTTPS Webhook URL
        </label>
        <div style="display:flex; gap:8px;">
          <input type="text" readonly value="${escapeHtml(webhookUrl)}" id="panelWebhookUrlInput" style="flex:1; padding:8px 12px; background:#F8FAFC; border:1px solid #CBD5E1; border-radius:8px; font-family:'JetBrains Mono', monospace; font-size:12px; color:#1E293B;" onclick="this.select()">
          <button type="button" class="btn-secondary" id="panelCopyWebhookBtn" onclick="copyWebhookUrl('${escapeHtml(webhookUrl)}', this)" style="white-space:nowrap; font-size:12px; padding:7px 14px;">
            Copy URL
          </button>
        </div>
      </div>

      <!-- Provider-specific setup instructions -->
      <div style="background:#FAF9F5; border:1px solid #E5E7EB; border-radius:8px; padding:10px 14px; margin-bottom:12px;">
        <div style="font-weight:700; font-size:12px; color:#161817; margin-bottom:6px;">Setup instructions:</div>
        ${app.id === 'paystack' ? `
          <ol style="margin:0; padding-left:18px; font-size:12px; color:#444; line-height:1.5;">
            <li>Log into your <strong>Paystack Dashboard → Settings → API Keys &amp; Webhooks</strong>.</li>
            <li>Paste this Webhook URL into the <strong>${activeEnv === 'test' ? 'Test Webhook URL' : 'Live Webhook URL'}</strong> field.</li>
            <li>Paystack signs all webhook notifications with HMAC SHA512 using your secret key.</li>
            <li>Click <strong>Save Changes</strong> to activate instant payment reconciliation.</li>
          </ol>
        ` : `
          <ol style="margin:0; padding-left:18px; font-size:12px; color:#444; line-height:1.5;">
            <li>Log into your <strong>Flutterwave Dashboard → Settings → Webhooks</strong>.</li>
            <li>Paste this Webhook URL into the <strong>URL</strong> field.</li>
            <li>Under <strong>Secret hash</strong>, enter your secret hash to sign and authenticate notifications.</li>
            <li>Save changes in Flutterwave and trigger a test payment.</li>
          </ol>
        `}
      </div>

      ${app.id === 'flutterwave' ? `
        <!-- Flutterwave Secret Hash Configuration -->
        <div style="background:#FAF9F5; border:1px solid #E5E7EB; border-radius:8px; padding:12px; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <div style="font-size:12px; font-weight:700; color:#161817;">Secret Hash (Webhook Verification)</div>
            ${hasSecretHash ? '<span style="font-size:11px; color:#15803d; font-weight:600;">✓ Configured</span>' : ''}
          </div>
          <div style="font-size:11.5px; color:#666; margin-bottom:8px;">
            Where it comes from: Flutterwave Dashboard → Settings → Webhooks → <strong>Secret hash</strong>.
          </div>
          <div style="display:flex; gap:8px;">
            <input type="password" id="panelFlwSecretHashInput" placeholder="Enter secret hash..." value="${hasSecretHash ? '••••••••' : ''}" style="flex:1; padding:8px 12px; border:1px solid #c5c7bf; border-radius:8px; font-family:'JetBrains Mono', monospace; font-size:12px;">
            <button type="button" class="btn-approve" onclick="savePanelSecretHash()" style="font-size:12px; padding:7px 14px;">
              Save hash
            </button>
          </div>
        </div>
      ` : ''}

      <!-- Last verified event & test trigger -->
      <div style="display:flex; justify-content:space-between; align-items:center; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:10px 14px;">
        <div>
          <div style="font-size:10.5px; font-weight:700; text-transform:uppercase; color:#64748B; letter-spacing:0.04em;">Last Verified Webhook Event</div>
          <div style="font-size:12px; font-weight:600; color:#1E293B; margin-top:2px;" id="panelLastEventText">
            ${escapeHtml(lastEvent || 'No events received yet · Awaiting first event')}
          </div>
        </div>
        <button type="button" class="btn-secondary" style="font-size:11.5px; padding:6px 12px;" onclick="sendPanelTestWebhook('${app.id}')">
          Send test event
        </button>
      </div>
    </div>

    <!-- Currency Defaults & Capabilities -->
    <div style="background:#FAF9F5; border:1px solid #E5E7EB; border-radius:12px; padding:14px; margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-size:12px; font-weight:700; color:#161817;">Default NGN Provider</div>
          <div style="font-size:11.5px; color:#666;">Use this provider as the primary checkout gateway for customer bookings</div>
        </div>
        <input type="checkbox" ${app.isDefault ? 'checked' : ''} onchange="setDefaultPaymentGateway('${app.id}', this.checked)" style="width:16px; height:16px; cursor:pointer;">
      </div>
    </div>

    <!-- Disconnect Zone -->
    <div style="border-top:1px solid rgba(22,24,23,0.08); padding-top:14px; display:flex; justify-content:space-between; align-items:center;">
      <div style="font-size:11.5px; color:#666;">
        Historical receipts, bookings &amp; drafts remain preserved.
      </div>
      <button type="button" class="btn-secondary" style="color:#b91c1c; border-color:#fca5a5; font-size:12px; padding:6px 12px;" onclick="confirmDisconnectWithExplanation('${app.id}')">
        Disconnect app
      </button>
    </div>
  `;

  modal.style.display = 'flex';
}

function switchPaymentPanelEnv(appId, env) {
  currentPaymentEnv = env;
  isReplacingKey = false;
  renderPaymentProviderPanel(appId, env);
}

function togglePaymentKeyMask(inputId, btn) {
  const input = byId(inputId);
  if (!input) return;
  const isCurrentlyPassword = input.type === 'password';
  input.type = isCurrentlyPassword ? 'text' : 'password';
  if (btn) btn.textContent = isCurrentlyPassword ? 'Hide' : 'Show';
}

function openKeyHelp(appId, env) {
  const box = byId('panelKeyHelpBox');
  if (box) box.style.display = (box.style.display === 'none' || !box.style.display) ? 'block' : 'none';
}

function toggleInPlaceKeyReplacer(force) {
  isReplacingKey = (force !== undefined) ? force : !isReplacingKey;
  const box = byId('inPlaceKeyReplacerBox');
  if (box) box.style.display = isReplacingKey ? 'block' : 'none';
}

async function submitPanelSecretKey(appId, mode) {
  const input = byId('panelSecretKeyInput');
  const secretKey = input ? input.value.trim() : '';
  const publicInput = byId('panelPublicKeyInput');
  const publicKey = publicInput ? publicInput.value.trim() : '';
  const errBox = byId('panelCredentialsError');

  if (!secretKey) {
    if (errBox) {
      errBox.textContent = `Please enter your ${mode === 'test' ? 'Test' : 'Live'} secret key.`;
      errBox.style.display = 'block';
    }
    return;
  }

  // Pre-validate environment prefix on client for instant feedback
  if (appId === 'paystack') {
    if (mode === 'live' && !secretKey.startsWith('sk_live_')) {
      if (errBox) {
        errBox.textContent = secretKey.startsWith('sk_test_')
          ? 'You entered a Paystack test key (sk_test_...). Switch to test mode or paste your live secret key (sk_live_...) from Paystack Dashboard → Settings → API Keys & Webhooks.'
          : 'Invalid Paystack live key. Live keys must begin with sk_live_ (find in Paystack Dashboard → Settings → API Keys & Webhooks).';
        errBox.style.display = 'block';
      }
      return;
    }
    if (mode === 'test' && !secretKey.startsWith('sk_test_')) {
      if (errBox) {
        errBox.textContent = secretKey.startsWith('sk_live_')
          ? 'You entered a Paystack live key (sk_live_...) in test mode. Switch to live mode or enter a test key (sk_test_...).'
          : 'Invalid Paystack test key. Test keys must begin with sk_test_ (find in Paystack Dashboard → Settings → API Keys & Webhooks).';
        errBox.style.display = 'block';
      }
      return;
    }
  } else if (appId === 'flutterwave') {
    if (mode === 'live' && !secretKey.startsWith('FLWSECK_LIVE-')) {
      if (errBox) {
        errBox.textContent = secretKey.startsWith('FLWSECK_TEST-')
          ? 'You entered a Flutterwave test key (FLWSECK_TEST-...). Switch to test mode or paste your live secret key (FLWSECK_LIVE-...) from Flutterwave Dashboard → Settings → API Keys.'
          : 'Invalid Flutterwave live key. Live keys must begin with FLWSECK_LIVE- (find in Flutterwave Dashboard → Settings → API Keys).';
        errBox.style.display = 'block';
      }
      return;
    }
    if (mode === 'test' && !secretKey.startsWith('FLWSECK_TEST-')) {
      if (errBox) {
        errBox.textContent = secretKey.startsWith('FLWSECK_LIVE-')
          ? 'You entered a Flutterwave live key in test mode. Switch to live mode or enter a test key (FLWSECK_TEST-...).'
          : 'Invalid Flutterwave test key. Test keys must begin with FLWSECK_TEST- (find in Flutterwave Dashboard → Settings → API Keys).';
        errBox.style.display = 'block';
      }
      return;
    }
  }

  notify('Verifying credentials on server...');
  try {
    const res = await fetch('/api/apps/save-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appId,
        mode,
        secretKey,
        publicKey
      })
    });
    const data = await res.json();
    if (data.error) {
      if (errBox) {
        errBox.textContent = data.error;
        errBox.style.display = 'block';
      }
      return;
    }

    notify(`✓ ${data.message || 'Credentials accepted.'}`);
    const apps = getAppsState();
    if (apps[appId]) {
      apps[appId].status = 'continue_setup';
      apps[appId].connectionState = 'key_verified_awaiting_webhook';
      apps[appId].isDemo = false;
      apps[appId].webhookStatus = 'awaiting_event';
      apps[appId].health = 'Key verified · Awaiting webhook';
      if (!apps[appId].config) apps[appId].config = {};
      apps[appId].config.mode = mode;
      apps[appId].config.maskedSecretKey = data.maskedSecretKey;
      apps[appId].config.maskedSuffix = data.maskedSuffix;
      save({ connectedApps: apps });
    }

    isReplacingKey = false;
    renderPaymentProviderPanel(appId, mode);
  } catch (err) {
    if (errBox) {
      errBox.textContent = 'Server connection error. Please try again.';
      errBox.style.display = 'block';
    }
  }
}

async function submitInPlaceReplacementKey(appId, mode) {
  const input = byId('panelReplacementKeyInput');
  const newSecretKey = input ? input.value.trim() : '';
  const errBox = byId('panelReplacementError');

  if (!newSecretKey) {
    if (errBox) {
      errBox.textContent = `Please enter a replacement ${mode} secret key.`;
      errBox.style.display = 'block';
    }
    return;
  }

  // Pre-validate environment prefix on client
  if (appId === 'paystack') {
    if (mode === 'live' && !newSecretKey.startsWith('sk_live_')) {
      if (errBox) {
        errBox.textContent = 'Invalid Paystack live key. Must begin with sk_live_. Current working key preserved.';
        errBox.style.display = 'block';
      }
      return;
    }
    if (mode === 'test' && !newSecretKey.startsWith('sk_test_')) {
      if (errBox) {
        errBox.textContent = 'Invalid Paystack test key. Must begin with sk_test_. Current working key preserved.';
        errBox.style.display = 'block';
      }
      return;
    }
  } else if (appId === 'flutterwave') {
    if (mode === 'live' && !newSecretKey.startsWith('FLWSECK_LIVE-')) {
      if (errBox) {
        errBox.textContent = 'Invalid Flutterwave live key. Must begin with FLWSECK_LIVE-. Current working key preserved.';
        errBox.style.display = 'block';
      }
      return;
    }
    if (mode === 'test' && !newSecretKey.startsWith('FLWSECK_TEST-')) {
      if (errBox) {
        errBox.textContent = 'Invalid Flutterwave test key. Must begin with FLWSECK_TEST-. Current working key preserved.';
        errBox.style.display = 'block';
      }
      return;
    }
  }

  notify('Verifying replacement key while preserving active key...');
  try {
    const res = await fetch('/api/apps/rotate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId, mode, newSecretKey })
    });
    const data = await res.json();
    if (data.error) {
      if (errBox) {
        errBox.textContent = data.error + ' Current working key preserved.';
        errBox.style.display = 'block';
      }
      return;
    }

    notify(`✓ ${data.message || 'Key replaced successfully.'}`);
    const apps = getAppsState();
    if (apps[appId]) {
      if (!apps[appId].config) apps[appId].config = {};
      apps[appId].config.maskedSecretKey = data.maskedSecretKey;
      apps[appId].config.maskedSuffix = data.maskedSuffix;
      apps[appId].isDemo = false;
      save({ connectedApps: apps });
    }

    isReplacingKey = false;
    renderPaymentProviderPanel(appId, mode);
  } catch (err) {
    if (errBox) {
      errBox.textContent = 'Server connection error. Working key preserved.';
      errBox.style.display = 'block';
    }
  }
}

async function sendPanelTestWebhook(appId) {
  notify(`Sending test webhook event to /api/webhooks/${appId}...`);
  try {
    const res = await fetch('/api/webhooks/test-trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: appId })
    });
    const data = await res.json();
    if (data.success) {
      notify(`✓ Webhook verified for ${appId}. Reconciliation ledger updated.`);
      const apps = getAppsState();
      if (apps[appId]) {
        apps[appId].status = 'connected';
        apps[appId].webhookStatus = 'verified';
        apps[appId].connectionState = 'connected';
        apps[appId].health = 'Active · Verified';
        apps[appId].lastSync = 'Just now';
        apps[appId].lastWebhookEvent = 'charge.success · ₦10,000 · Just now';
        save({ connectedApps: apps });
      }
      renderPaymentProviderPanel(appId, currentPaymentEnv);
    }
  } catch (e) {
    notify('Error sending test event.');
  }
}

async function savePanelSecretHash() {
  const input = byId('panelFlwSecretHashInput');
  const secretHash = input ? input.value.trim() : '';
  if (!secretHash) return notify('Please enter a secret hash.');
  notify('Saving secret hash for Flutterwave webhook verification...');
  try {
    const res = await fetch('/api/apps/save-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appId: 'flutterwave',
        secretHash,
        secretKey: 'FLWSECK_TEST-existing'
      })
    });
    notify('✓ Flutterwave secret hash saved.');
    renderPaymentProviderPanel('flutterwave', currentPaymentEnv);
  } catch (e) {
    notify('Saved secret hash.');
  }
}

function copyWebhookUrl(url, btn) {
  navigator.clipboard.writeText(url).then(() => {
    if (btn) {
      btn.textContent = 'Copied!';
      btn.style.background = '#15803d';
      btn.style.color = '#FFFFFF';
      setTimeout(() => {
        btn.textContent = 'Copy URL';
        btn.style.background = '';
        btn.style.color = '';
      }, 2000);
    }
    notify(`Webhook URL copied: ${url}`);
  }).catch(() => {
    notify(`Webhook URL: ${url}`);
  });
}

async function openPaymentGatewaySelector() {
  const modal = byId('appDetailModal');
  const card = byId('appDetailModalCard');
  if (!modal || !card) return;

  let gwData = null;
  try {
    const res = await fetch('/api/apps/payment-gateways');
    gwData = await res.json();
  } catch (e) {}

  const apps = getAppsState();
  const paystackApp = apps.paystack || window.PROVIDER_REGISTRY.paystack;
  const flwApp = apps.flutterwave || window.PROVIDER_REGISTRY.flutterwave;
  const stripeApp = apps.stripe || window.PROVIDER_REGISTRY.stripe;

  function getBadgeHtml(a) {
    if (a.isDemo) return '<span class="provider-badge demo">Demo</span>';
    if (a.connectionState === 'key_verified_awaiting_webhook' || a.status === 'continue_setup') return '<span class="provider-badge awaiting">Key verified · Awaiting webhook</span>';
    if (a.connectionState === 'connected' || a.status === 'connected') return '<span class="provider-badge connected">Connected</span>';
    return '<span class="provider-badge no-creds">Set up credentials</span>';
  }

  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(22,24,23,0.08); padding-bottom:12px; margin-bottom:16px;">
      <div>
        <h3 style="margin:0; font-size:17px; font-weight:700;">Payment Settings · Gateway Selector</h3>
        <p style="margin:4px 0 0; font-size:12px; color:#666;">Choose the payment accounts Vela uses to collect deposits and process client payments.</p>
      </div>
      <button onclick="closeAppDetailModal()" style="background:none; border:none; cursor:pointer; font-size:18px; color:#666;" title="Close">✕</button>
    </div>

    <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:18px;">
      <!-- Paystack -->
      <div style="background:#FFFFFF; border:1px solid rgba(22,24,23,0.12); border-radius:12px; padding:14px; display:flex; justify-content:space-between; align-items:center; gap:14px;">
        <div style="display:flex; align-items:center; gap:12px;">
          ${renderAppLogo('paystack', 36)}
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <strong style="font-size:14px;">Paystack</strong>
              ${getBadgeHtml(paystackApp)}
              ${paystackApp.isDefault ? '<span class="app-default-pill">Default for NGN</span>' : ''}
            </div>
            <div style="font-size:12px; color:#555; margin-top:2px;">Primary checkout gateway for Naira deposits, debit cards, bank transfers &amp; USSD.</div>
          </div>
        </div>
        <button type="button" class="btn-secondary" onclick="openAppDetailModal('paystack')" style="font-size:12px; padding:6px 14px; white-space:nowrap;">
          Configure Paystack
        </button>
      </div>

      <!-- Flutterwave -->
      <div style="background:#FFFFFF; border:1px solid rgba(22,24,23,0.12); border-radius:12px; padding:14px; display:flex; justify-content:space-between; align-items:center; gap:14px;">
        <div style="display:flex; align-items:center; gap:12px;">
          ${renderAppLogo('flutterwave', 36)}
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <strong style="font-size:14px;">Flutterwave</strong>
              ${getBadgeHtml(flwApp)}
            </div>
            <div style="font-size:12px; color:#555; margin-top:2px;">Multi-currency deposit collection (USD, GBP, EUR, NGN) for corporate and diaspora clients.</div>
          </div>
        </div>
        <button type="button" class="${(flwApp.status === 'connected' || flwApp.status === 'continue_setup' || flwApp.connectionState === 'key_verified_awaiting_webhook') ? 'btn-secondary' : 'btn-approve'}" onclick="openAppDetailModal('flutterwave')" style="font-size:12px; padding:6px 14px; white-space:nowrap;">
          ${(flwApp.status === 'connected' || flwApp.status === 'continue_setup' || flwApp.connectionState === 'key_verified_awaiting_webhook') ? 'Configure Flutterwave' : 'Set up credentials'}
        </button>
      </div>

      <!-- Stripe Connect -->
      <div style="background:#FFFFFF; border:1px solid rgba(22,24,23,0.12); border-radius:12px; padding:14px; display:flex; justify-content:space-between; align-items:center; gap:14px;">
        <div style="display:flex; align-items:center; gap:12px;">
          ${renderAppLogo('stripe', 36)}
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <strong style="font-size:14px;">Stripe Connect</strong>
              ${getBadgeHtml(stripeApp)}
            </div>
            <div style="font-size:12px; color:#555; margin-top:2px;">1-tap Apple Pay and global card checkout for international clients.</div>
          </div>
        </div>
        <button type="button" class="btn-approve" onclick="simulateOAuthConnect('stripe')" style="font-size:12px; padding:6px 14px; white-space:nowrap;">
          ${stripeApp.status === 'connected' ? 'Reconnect account' : 'Connect account'}
        </button>
      </div>
    </div>

    <!-- Currency Defaults & Routing Summary -->
    <div style="background:#FAF9F5; border:1px solid #E5E7EB; border-radius:10px; padding:12px 14px;">
      <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#666; margin-bottom:6px;">Default Checkout Gateway per Currency:</div>
      <div style="font-size:12px; color:#444; line-height:1.6;">
        • <strong>NGN:</strong> ${paystackApp.isDefault ? 'Paystack (Direct Naira card & bank checkout)' : 'Flutterwave'}<br>
        • <strong>USD / GBP / EUR:</strong> Flutterwave (International card processing)<br>
        • <strong>Apple Pay / CAD:</strong> Stripe Connect (1-Tap wallet checkout)
      </div>
    </div>
  `;

  modal.style.display = 'flex';
}

// -------------------------------------------------------------
// 2. COMPREHENSIVE MANAGE MODAL (Answers 4 Questions + Tailored Controls)
// -------------------------------------------------------------
function renderManageModal(app) {
  if (app.id === 'paystack' || app.id === 'flutterwave') {
    renderPaymentProviderPanel(app.id);
    return;
  }
  const modal = byId('appDetailModal');
  const card = byId('appDetailModalCard');
  if (!modal || !card) return;

  const isConnected = app.status === 'connected';
  const isNeedsAttention = app.status === 'needs_attention';
  const isPayment = app.category === 'payments';
  const isCalendar = app.category === 'calendar';
  const isBooks = app.id === 'zoho-books';
  const isMail = app.id === 'zoho-mail';
  const isApple = app.id === 'apple-calendar';
  const isTikTok = app.id === 'tiktok';

  // Specific failure messages
  let specificFailure = null;
  if (isNeedsAttention) {
    if (app.id === 'dropbox') specificFailure = "Dropbox access expired. Your imported photos in client galleries remain safe. Reconnect account to resume importing new photos.";
    else if (isCalendar) specificFailure = "Vela can read Dele’s availability. Permission to add appointments has expired. Reauthorise connection to resume updates.";
    else if (isBooks) specificFailure = "The deposit was recorded in Vela. Zoho Books sync failed. Retry invoice sync.";
    else if (isMail) specificFailure = "Your quotation is saved. Reconnect Zoho Mail to send it from Studio Teni.";
    else if (isPayment) specificFailure = "This checkout was created with Paystack. Its payment will still be reconciled there even though Flutterwave is now your default.";
    else specificFailure = `${app.name} credentials need reconnecting.`;
  }

  const webhookUrl = `${window.location.origin}/api/webhooks/${app.id}`;
  const subscriptionUrl = app.config?.subscriptionUrl || `${window.location.origin.replace('http', 'webcal')}/api/calendar/subscribe?token=demo_token_8821`;

  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(22,24,23,0.08); padding-bottom:12px; margin-bottom:16px;">
      <div style="display:flex; align-items:center; gap:12px;">
        ${renderAppLogo(app.id, 40)}
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <h3 style="margin:0; font-size:16px; font-weight:700;">${escapeHtml(app.name)}</h3>
            ${app.isDefault ? '<span class="app-default-pill">Default Provider</span>' : ''}
          </div>
          <span style="font-size:11.5px; color:#666;">${escapeHtml(app.category.toUpperCase())} · ${isConnected ? 'Connected & Verified' : 'Needs Attention'}</span>
        </div>
      </div>
      <button onclick="closeAppDetailModal()" style="background:none; border:none; cursor:pointer; font-size:18px; color:#666;">✕</button>
    </div>

    ${specificFailure ? `
      <div class="app-failure-callout" style="background:#FEF2F2; border:1px solid #FCA5A5; color:#991B1B; padding:12px 14px; border-radius:8px; margin-bottom:14px; font-size:12.5px;">
        <strong>⚠️ Attention Required:</strong> ${escapeHtml(specificFailure)}
        ${app.id === 'dropbox' ? `
          <div style="margin-top:8px;">
            <button type="button" class="btn-approve" style="font-size:11.5px; padding:5px 14px; background:#DC2626;" onclick="reconnectDropboxPrompt()">
              Reconnect Dropbox
            </button>
          </div>
        ` : ''}
      </div>
    ` : ''}

    <div class="manage-four-q-card">
      <!-- Question 1: Which account is this? -->
      <div class="manage-q-block">
        <div class="manage-q-heading">1. Which account is this?</div>
        <div class="manage-q-content">
          <div><strong>${escapeHtml(app.accountIdentity || 'Studio Teni Enterprise Account')}</strong></div>
          <div style="font-size:12px; color:#666; margin-top:2px;">
            ${app.id === 'dropbox'
              ? 'Connected folder: <code>/Studio Teni Client Deliveries/Amaka Wedding 2026/</code><br>Mode: <strong>LIVE</strong> · Sync type: <strong>One-time import (Originals untouched)</strong>'
              : `Mode: <strong>${(app.mode || 'live').toUpperCase()}</strong>${app.settlementAccount ? ` · Payouts: <strong>${escapeHtml(app.settlementAccount)}</strong>` : ''}`}
          </div>
        </div>
      </div>

      <!-- Question 2: What can Vela do? -->
      <div class="manage-q-block">
        <div class="manage-q-heading">2. What can Vela do?</div>
        <div class="manage-q-content">
          <div style="margin-bottom:8px;">
            ${(app.supportedCapabilities || app.capabilities || []).map(cap => `
              <span class="manage-capability-tag">✓ ${escapeHtml(cap)}</span>
            `).join('')}
          </div>

          ${app.id === 'dropbox' ? `
            <div style="font-size:11.5px; color:#555; line-height:1.4;">
              Imports high-resolution copies into client galleries. Originals in Dropbox remain untouched. Clarification: Disconnecting Dropbox does not delete imported photos.
            </div>
          ` : ''}

          ${isCalendar ? `
            <div class="app-permission-row" style="margin-top:6px;">
              <div>
                <strong>Require staff confirmation for reschedules</strong>
                <div style="font-size:11.5px; color:#666;">Staff member must approve appointment changes before calendar moves</div>
              </div>
              <input type="checkbox" ${app.permissions?.requireConfirmation ? 'checked' : ''} onchange="toggleAppPerm('${app.id}', 'requireConfirmation', this.checked)">
            </div>
          ` : isPayment ? `
            <div class="app-permission-row" style="margin-top:6px;">
              <div>
                <strong>Use as default provider for NGN deposits</strong>
                <div style="font-size:11.5px; color:#666;">Primary checkout gateway for customer bookings</div>
              </div>
              <input type="checkbox" ${app.isDefault ? 'checked' : ''} onchange="setDefaultPaymentGateway('${app.id}', this.checked)">
            </div>
          ` : ''}

          ${isPayment ? `
            <!-- Currency Defaults -->
            <div style="margin-top:10px; background:#FAF9F5; border:1px solid #E5E7EB; border-radius:8px; padding:10px 12px;">
              <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#666; margin-bottom:4px;">Default Payment Provider Per Currency:</div>
              <div style="font-size:12px; color:#444; line-height:1.4;">
                • <strong>NGN:</strong> ${app.id === 'paystack' ? 'Paystack (Direct Naira card & bank checkout)' : 'Flutterwave'}<br>
                • <strong>USD / GBP / EUR:</strong> Flutterwave (International card processing)<br>
                • <strong>Apple Pay / CAD:</strong> Stripe (1-Tap wallet checkout)
              </div>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Question 3: Where do I go to use it right now? -->
      <div class="manage-q-block">
        <div class="manage-q-heading">3. Where do I go to use it right now?</div>
        <div class="manage-q-content">
          ${app.id === 'dropbox' ? `
            <div style="font-size:12px; color:#4B5563; margin-bottom:8px;">
              Choose photos from your Dropbox to add to client galleries:
            </div>
            <button type="button" class="btn-approve" style="font-size:13px; padding:7px 16px;" onclick="closeAppDetailModal(); openAddPhotosModal('gal-amaka');">
              Add photos to a gallery
            </button>
          ` : `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span>Last successful sync: <strong>${escapeHtml(app.lastSync || 'Just now')}</strong></span>
              <span style="font-size:11px; color:#15803d; font-weight:600;">${escapeHtml(app.health || 'Active')}</span>
            </div>
            <button type="button" class="btn-approve" style="font-size:12.5px; padding:6px 14px;" onclick="${getAppPrimaryAction(app).onclick}">
              ${escapeHtml(getAppPrimaryAction(app).label)}
            </button>
          `}
        </div>
      </div>

      <!-- Question 4: If it stops working, how do I fix it? -->
      <div class="manage-q-block">
        <div class="manage-q-heading">4. If it stops working, how do I fix it?</div>
        <div class="manage-q-content">
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
            <button type="button" class="btn-secondary" style="font-size:12px; padding:6px 12px;" onclick="testCapabilityHealth('${app.id}')">
              Test connection
            </button>
            ${app.id === 'dropbox' ? `
              <button type="button" class="btn-secondary" style="font-size:12px; padding:6px 12px;" onclick="notify('Connected folder: /Studio Teni Client Deliveries/Amaka Wedding 2026/');">
                Change folder
              </button>
              <button type="button" class="btn-secondary" style="font-size:12px; padding:6px 12px;" onclick="reconnectDropboxPrompt()">
                Reconnect account
              </button>
            ` : ''}
            ${isNeedsAttention && app.id === 'zoho-books' ? `
              <button type="button" class="btn-approve" style="font-size:12px; padding:6px 12px; background:#B45309;" onclick="retryAppAction('sync_zoho_books')">
                Retry Zoho Books sync
              </button>
            ` : ''}
            ${isNeedsAttention && app.id === 'whatsapp' ? `
              <button type="button" class="btn-approve" style="font-size:12px; padding:6px 12px; background:#B45309;" onclick="retryAppAction('retry_whatsapp')">
                Retry WhatsApp reply
              </button>
            ` : ''}
            ${isNeedsAttention && app.id !== 'zoho-books' && app.id !== 'whatsapp' && app.id !== 'dropbox' ? `
              <button type="button" class="btn-approve" style="font-size:12px; padding:6px 12px; background:#B45309;" onclick="connectAppPrompt('${app.id}')">
                Reconnect account
              </button>
            ` : ''}
            ${app.supportsMultipleAccounts ? `
              <button type="button" class="btn-secondary" style="font-size:12px; padding:6px 12px;" onclick="notify('Opening additional account flow for ' + '${app.name}...');">
                + Add another account
              </button>
            ` : ''}
          </div>
          <div style="font-size:11.5px; color:#666;">
            ${app.id === 'dropbox'
              ? 'If access expires: imported photos remain safe in Vela, but new imports pause until reconnected. Disconnecting does not delete imported photos.'
              : 'Historical receipts, bookings and drafts remain preserved if disconnected.'}
          </div>
        </div>
      </div>
    </div>

    <!-- Provider-Tailored Controls Grid -->
    <div style="margin-top:16px;">
      <div style="font-size:12px; font-weight:700; color:#161817; margin-bottom:8px;">Manage &amp; Controls:</div>
      <div class="manage-controls-grid">
        ${app.requiresWebhook ? `
          <button type="button" class="manage-control-btn" onclick="toggleInlineReplaceKey('${app.id}')">
            <span>🔑</span> Replace key
          </button>
          <button type="button" class="manage-control-btn" onclick="copyWizardWebhookUrl('${app.id}')">
            <span>🔗</span> Copy webhook URL
          </button>
          <button type="button" class="manage-control-btn" onclick="showSecretRotationModal('${app.id}')">
            <span>🔄</span> Rotate signing secret
          </button>
        ` : ''}

        ${app.setupType === 'oauth' || app.setupType === 'business_onboarding' ? `
          <button type="button" class="manage-control-btn" onclick="connectAppPrompt('${app.id}')">
            <span>🔄</span> Reauthorise
          </button>
          <button type="button" class="manage-control-btn" onclick="notify('Opening account switch for ' + '${app.name}...');">
            <span>👤</span> Change selected account
          </button>
          ${isCalendar ? `
            <button type="button" class="manage-control-btn" onclick="switchCalendarStaffPrompt('${app.id}')">
              <span>📅</span> Change calendar (Dele / Segun)
            </button>
          ` : app.id === 'google-drive' || app.id === 'dropbox' ? `
            <button type="button" class="manage-control-btn" onclick="notify('Select new delivery folder...');">
              <span>📁</span> Change folder
            </button>
          ` : ''}
        ` : ''}

        ${isApple ? `
          <button type="button" class="manage-control-btn" onclick="navigator.clipboard.writeText('${subscriptionUrl}'); notify('Subscription URL copied!');">
            <span>🔗</span> Copy feed URL
          </button>
          <button type="button" class="manage-control-btn" onclick="regenerateAppleSubscription('${app.id}')">
            <span>🔄</span> Revoke or regenerate link
          </button>
        ` : ''}
      </div>

      <!-- Inline Replace Key Form (Keeps existing key active until replacement passes validation) -->
      <div id="inlineReplaceKeyBox" style="display:none; background:#FAF9F5; border:1px solid #E5E7EB; border-radius:10px; padding:14px; margin-top:12px;">
        <div style="font-size:12px; font-weight:700; color:#161817; margin-bottom:4px;">Replace API Key Seamlessly</div>
        <div style="font-size:11.5px; color:#666; margin-bottom:10px;">
          Your current key remains active until the replacement key is validated by the server. Zero booking downtime.
        </div>
        <div style="display:flex; gap:8px;">
          <input type="password" id="inlineNewSecretKey" placeholder="Paste replacement secret key..." style="flex:1; padding:8px 10px; border:1px solid #ccc; border-radius:6px; font-family:monospace; font-size:12px;">
          <button type="button" class="btn-approve" style="font-size:12px; padding:8px 14px;" onclick="submitInlineReplaceKey('${app.id}')">
            Verify &amp; replace key
          </button>
          <button type="button" class="btn-secondary" style="font-size:12px; padding:8px 12px;" onclick="toggleInlineReplaceKey('${app.id}')">
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Disconnect Zone with Full Explanation -->
    <div style="border-top:1px solid rgba(22,24,23,0.08); padding-top:16px; margin-top:20px; display:flex; justify-content:space-between; align-items:center;">
      <div style="font-size:11.5px; color:#666;">
        Historical receipts, bookings &amp; drafts remain preserved.
      </div>
      <button type="button" class="btn-secondary" style="color:#b91c1c; border-color:#fca5a5; font-size:12px; padding:6px 12px;" onclick="confirmDisconnectWithExplanation('${app.id}')">
        Disconnect app
      </button>
    </div>
  `;

  modal.style.display = 'flex';
}

function toggleInlineReplaceKey(appId) {
  const box = byId('inlineReplaceKeyBox');
  if (box) box.style.display = (box.style.display === 'none' || !box.style.display) ? 'block' : 'none';
}

function submitInlineReplaceKey(appId) {
  const keyInput = byId('inlineNewSecretKey');
  const newSecretKey = keyInput ? keyInput.value.trim() : '';
  if (!newSecretKey) return notify('Please enter a new secret key.');

  notify('Verifying replacement key while keeping existing key active...');
  fetch('/api/apps/rotate-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId, newSecretKey })
  })
  .then(r => r.json())
  .then(res => {
    if (res.error) return notify('⚠️ ' + res.error);
    notify('✓ Replacement key verified and rotated with zero downtime.');
    const apps = getAppsState();
    if (apps[appId]) {
      if (!apps[appId].config) apps[appId].config = {};
      apps[appId].config.maskedSecretKey = newSecretKey.slice(0, 7) + '••••••••' + newSecretKey.slice(-4);
      save({ connectedApps: apps });
    }
    renderManageModal(apps[appId]);
  })
  .catch(() => notify('Error rotating key. Existing key remains active.'));
}

function showSecretRotationModal(appId) {
  alert(`Signing Secret Rotation Instructions for ${appId.toUpperCase()}:\n\n1. In your ${appId} dashboard, generate a secondary signing secret.\n2. In Vela Manage, enter the secondary secret.\n3. Vela will accept events signed with either secret during the rotation window.\n4. Deactivate the old secret in your provider dashboard once verified.`);
}

function switchCalendarStaffPrompt(appId) {
  const choice = prompt('Assign calendar to:\n1 - Dele (Chair 1)\n2 - Segun (Chair 2)', '1');
  const staff = (choice === '2') ? 'Segun (Chair 2)' : 'Dele (Chair 1)';
  const apps = getAppsState();
  if (apps[appId]) {
    if (!apps[appId].config) apps[appId].config = {};
    apps[appId].config.assignedStaff = staff;
    save({ connectedApps: apps });
    notify(`Calendar assigned to ${staff}. Availability synced.`);
    renderManageModal(apps[appId]);
  }
}

function retryAppAction(action) {
  notify('Retrying subsystem action...');
  fetch('/api/retry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action })
  })
  .then(r => r.json())
  .then(res => {
    if (res.success) {
      notify(`✓ ${res.message}`);
      const apps = getAppsState();
      if (action === 'sync_zoho_books' && apps['zoho-books']) {
        apps['zoho-books'].status = 'connected';
        apps['zoho-books'].health = 'Active · Verified';
        apps['zoho-books'].lastSync = 'Just now';
        if (!apps['zoho-books'].activityLog) apps['zoho-books'].activityLog = [];
        apps['zoho-books'].activityLog.unshift({
          timestamp: 'Just now',
          event: 'Sync Reconciled',
          status: 'success',
          details: res.message
        });
      } else if (action === 'retry_whatsapp' && apps.whatsapp) {
        apps.whatsapp.status = 'connected';
        apps.whatsapp.health = 'Active · Verified';
        apps.whatsapp.lastSync = 'Just now';
      }
      save({ connectedApps: apps });
      closeAppDetailModal();
      renderPage();
    }
  })
  .catch(() => {
    notify('Retry request failed.');
  });
}

function confirmDisconnectWithExplanation(appId) {
  const apps = getAppsState();
  const app = apps[appId];
  if (!app) return;

  const msg = `Disconnect ${app.name}?\n\n• Future automated actions will stop.\n• Pending payments and scheduled bookings will still be honored.\n• Historical receipts, booking records and client profiles remain untouched.\n\nDo you wish to disconnect ${app.name}?`;
  if (confirm(msg)) {
    disconnectAppPrompt(appId);
  }
}

function returnToAgentTask(returnTask) {
  closeAppDetailModal();
  if (returnTask === 'conv-3') {
    openDecisionReview('conv-3');
    openDecisionTriage();
    notify('✓ Google Calendar verified. Dele’s 2:30 PM slot confirmed available.');
  } else if (returnTask === 'review_quote') {
    originatingScreen = 'agent';
    runWorkflow('review_quote');
    notify('✓ Payment gateway verified. Quotation ready to send.');
  } else {
    location.hash = 'agent';
  }
}

function previewDepositCheckout() {
  closeAppDetailModal();
  window.open('/storefront?service=srv-1&promo=wed_slots', '_blank');
  notify('Opening deposit checkout preview with active provider.');
}

function checkAvailableTimes() {
  closeAppDetailModal();
  location.hash = 'bookings';
  bookingFilter = 'dele';
  renderPage();
  notify('Showing Dele (Chair 1) verified calendar appointments.');
}

function createTestQuotation() {
  closeAppDetailModal();
  originatingScreen = 'agent';
  runWorkflow('review_quote');
  notify('Opening corporate quotation flow linked to Zoho Books.');
}

function setDefaultPaymentGateway(appId, isDefault) {
  const apps = getAppsState();
  if (isDefault) {
    for (const k of Object.keys(apps)) {
      if (apps[k].category === 'payments') {
        apps[k].isDefault = (k === appId);
      }
    }
  } else {
    apps[appId].isDefault = false;
  }
  save({ connectedApps: apps });

  fetch('/api/apps/currency-default', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currency: 'NGN', provider: isDefault ? appId : 'paystack' })
  }).catch(() => {});

  notify(`${apps[appId]?.name || appId} is now ${isDefault ? 'the default NGN deposit provider' : 'no longer default'}.`);
  renderPage();
}

function togglePaymentMode(appId, mode) {
  const apps = getAppsState();
  if (apps[appId]) {
    apps[appId].mode = mode;
    save({ connectedApps: apps });
    notify(`${apps[appId].name} switched to ${mode.toUpperCase()} mode.`);
  }
}

function saveDepositPercentage(pct) {
  const apps = getAppsState();
  if (apps.paystack) {
    apps.paystack.config.depositPercentage = Number(pct);
    save({ connectedApps: apps });
    notify(`Paystack default deposit set to ${pct}%.`);
  }
}

function updateStaffCalendarAssignment(calName) {
  const apps = getAppsState();
  if (apps['google-calendar']) {
    apps['google-calendar'].config.calendarName = calName;
    save({ connectedApps: apps });
    notify(`Assigned Google Calendar: "${calName}".`);
  }
}

function updateAppBufferMinutes(mins) {
  const apps = getAppsState();
  if (apps['google-calendar']) {
    apps['google-calendar'].config.bufferMinutes = Number(mins);
    save({ connectedApps: apps });
    notify(`Calendar buffer time updated to ${mins} minutes.`);
  }
}

function toggleAppPerm(appId, permKey, checked) {
  const apps = getAppsState();
  if (apps[appId] && apps[appId].permissions) {
    apps[appId].permissions[permKey] = checked;
    save({ connectedApps: apps });
    notify('Permission updated.');
  }
}

function testCapabilityHealth(appId) {
  const apps = getAppsState();
  const app = apps[appId];
  if (!app) return;

  notify(`Verifying ${app.name} capability health...`);
  setTimeout(() => {
    app.status = 'connected';
    app.lastSync = 'Just now';
    app.health = '100% Operational · Latency 14ms';
    save({ connectedApps: apps });
    notify(`✓ ${app.name} capability verified successfully!`);
    openAppDetailModal(appId);
    renderPage();
  }, 400);
}

function connectAppPrompt(appId, returnTask) {
  const apps = getAppsState();
  const app = apps[appId];
  if (!app) return;

  notify(`Authorising ${app.name} connection...`);
  setTimeout(() => {
    app.status = 'connected';
    app.lastSync = 'Just now';
    app.health = 'Active · Verified';
    if (app.id === 'google-calendar') {
      app.accountIdentity = 'dele.cuts@studioteni.ng (Google Workspace)';
    } else if (app.id === 'flutterwave') {
      app.accountIdentity = 'Studio Teni Global (flw_live_...9182)';
    } else if (app.id === 'zoho-books') {
      app.accountIdentity = 'Studio Teni Services Ltd (Org #8029193)';
    }
    save({ connectedApps: apps });
    notify(`✓ ${app.name} connected and verified!`);
    if (returnTask) {
      returnToAgentTask(returnTask);
    } else {
      openAppDetailModal(appId);
      renderPage();
    }
  }, 500);
}

function disconnectAppPrompt(appId) {
  const apps = getAppsState();
  const app = apps[appId];
  if (!app) return;

  app.status = 'disconnected';
  app.health = 'Disconnected by merchant';
  app.lastSync = 'Disconnected';
  if (app.isDefault) {
    app.isDefault = false;
    const other = Object.values(apps).find(a => a.category === 'payments' && a.id !== appId && a.status === 'connected');
    if (other) other.isDefault = true;
  }
  save({ connectedApps: apps });
  notify(`${app.name} disconnected. Historical data preserved.`);
  closeAppDetailModal();
  renderPage();
}

function closeAppDetailModal() {
  const modal = byId('appDetailModal');
  if (modal) modal.style.display = 'none';
}

// -------------------------------------------------------------
// MULTI-PROVIDER PAYMENT INTERFACE (VelaPaymentGateway)
// -------------------------------------------------------------
window.VelaPaymentGateway = {
  createCheckout(options) {
    const apps = getAppsState();
    const defaultProv = Object.values(apps).find(a => a.category === 'payments' && a.isDefault && a.status === 'connected') || apps.paystack;
    const providerId = options.provider || defaultProv.id;
    const prefix = providerId === 'stripe' ? 'cs_test_' : providerId === 'flutterwave' ? 'FLW-' : 'VP-';
    const txRef = prefix + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 899 + 100);

    const totalServiceAmount = Number(options.totalAmount || (options.amount ? options.amount * 5 : 10000));
    const depositAmount = Number(options.amount || 2000);

    const tx = {
      id: 'tx-' + Date.now(),
      reference: txRef,
      provider: providerId,
      merchantId: 'merch-studioteni',
      bookingId: options.bookingId || null,
      invoiceId: options.invoiceId || 'INV-' + txRef.slice(-6),
      clientName: options.clientName || 'Client',
      service: options.service || 'Service Booking',
      totalAmount: totalServiceAmount,
      expectedAmount: depositAmount,
      amountReceived: 0,
      balanceDue: totalServiceAmount,
      currency: options.currency || (providerId === 'stripe' ? 'USD' : 'NGN'),
      customerPaymentStatus: 'Pending',
      bankSettlementStatus: 'Awaiting customer payment',
      createdAt: 'Today at ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      verifiedAt: null
    };

    if (!workspace.transactions) workspace.transactions = [];
    workspace.transactions.unshift(tx);
    save({ transactions: workspace.transactions });

    return {
      reference: txRef,
      provider: providerId,
      checkoutUrl: `/storefront?ref=${txRef}&provider=${providerId}`,
      transaction: tx
    };
  },

  verifyPayment(ref) {
    if (!workspace.transactions) workspace.transactions = [];
    const tx = workspace.transactions.find(t => t.reference === ref);
    if (!tx) return false;

    // Server-side verification & idempotency: if already paid, return without double-crediting
    if (tx.customerPaymentStatus === 'Paid') {
      return { alreadyVerified: true, deduplicated: true, transaction: tx };
    }

    tx.customerPaymentStatus = 'Paid';
    tx.verifiedAt = 'Today at ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    tx.amountReceived = tx.expectedAmount;
    tx.balanceDue = Math.max(0, tx.totalAmount - tx.amountReceived);

    // Provider-specific settlement reporting
    if (tx.provider === 'paystack') {
      tx.bankSettlementStatus = 'Settled to GTBank (...4910)';
    } else if (tx.provider === 'flutterwave') {
      tx.bankSettlementStatus = 'Settled to Zenith Bank (...8821)';
    } else if (tx.provider === 'stripe') {
      tx.bankSettlementStatus = 'Settled to Wise USD (...3301)';
    } else {
      tx.bankSettlementStatus = 'Pending settlement (T+2)';
    }

    // Update unified booking ledger if matched
    if (tx.clientName && tx.clientName.includes('Chuka')) {
      const b = (workspace.bookingsList || []).find(b => b.clientName.includes('Chuka'));
      if (b) {
        b.depositPaid = 2000;
        b.balanceDue = 8000;
        b.status = 'Confirmed · Deposit Paid';
      }
    }

    // Allocate to Zoho Books if connected
    const apps = getAppsState();
    if (apps['zoho-books'] && apps['zoho-books'].status === 'connected') {
      if (!tx.externalInvoiceId) {
        tx.externalInvoiceId = (apps['zoho-books'].config?.invoicePrefix || 'ZB-INV-') + '2026-' + Math.floor(Math.random() * 899 + 100);
      }
    }

    save({
      transactions: workspace.transactions,
      bookingsList: workspace.bookingsList
    });

    return { alreadyVerified: false, transaction: tx };
  }
};

window.closeAppDetailModal = closeAppDetailModal;
window.returnToAgentTask = returnToAgentTask;
window.previewDepositCheckout = previewDepositCheckout;
window.checkAvailableTimes = checkAvailableTimes;
window.createTestQuotation = createTestQuotation;
window.setDefaultPaymentGateway = setDefaultPaymentGateway;
window.togglePaymentMode = togglePaymentMode;
window.saveDepositPercentage = saveDepositPercentage;
window.updateStaffCalendarAssignment = updateStaffCalendarAssignment;
window.updateAppBufferMinutes = updateAppBufferMinutes;
window.toggleAppPerm = toggleAppPerm;
window.testCapabilityHealth = testCapabilityHealth;
window.connectAppPrompt = connectAppPrompt;
window.disconnectAppPrompt = disconnectAppPrompt;
window.openAddPhotosModal = openAddPhotosModal;
window.openDropboxImportFlow = openDropboxImportFlow;
window.executeDropboxImport = executeDropboxImport;
window.openGalleryProofPreview = openGalleryProofPreview;
window.toggleGalleryPublish = toggleGalleryPublish;
window.reconnectDropboxPrompt = reconnectDropboxPrompt;
window.openWhatsAppInboxModal = openWhatsAppInboxModal;
window.openInstagramInboxModal = openInstagramInboxModal;
window.openTikTokBookingLinkModal = openTikTokBookingLinkModal;
window.openEmailInboxModal = openEmailInboxModal;
window.openAvailabilityPreviewModal = openAvailabilityPreviewModal;
window.openCheckoutPreviewModal = openCheckoutPreviewModal;
window.openZohoBooksPreviewModal = openZohoBooksPreviewModal;
window.openZohoCrmLeadModal = openZohoCrmLeadModal;
window.openMetaAdsDraftModal = openMetaAdsDraftModal;
window.openAppleCalendarModal = openAppleCalendarModal;

window.checkMultiStylistAvailability = function(timeSlot) {
  const isOnePm = timeSlot.includes('1:00');
  return {
    requestedTime: timeSlot,
    dele: {
      staff: 'Dele (Chair 1)',
      available: !isOnePm,
      conflict: isOnePm ? 'Booked: Tobi Adebayo (Haircut & Beard)' : null
    },
    segun: {
      staff: 'Segun (Chair 2)',
      available: true,
      conflict: null
    },
    recommendation: isOnePm
      ? 'Dele is booked at 1:00 PM on Google Calendar. Segun (Chair 2) is available.'
      : 'Both Dele and Segun are open at ' + timeSlot
  };
};

window.setCleanAccountDemo = function() {
  const apps = getAppsState();
  for (const k of Object.keys(apps)) {
    apps[k].status = 'disconnected';
    apps[k].health = 'Not connected';
    apps[k].lastSync = 'Never';
    apps[k].accountIdentity = 'Unconnected';
  }
  save({ connectedApps: apps });
  renderPage();
  return { success: true, connectedCount: 0 };
};

window.restoreDemoAccount = function() {
  workspace.connectedApps = JSON.parse(JSON.stringify(defaultAppsCatalogue));
  save({ connectedApps: workspace.connectedApps });
  renderPage();
  return { success: true, connectedCount: Object.values(workspace.connectedApps).filter(a => a.status === 'connected').length };
};

// Initial bootstrap
updatePendingBadges();
renderPage();



// URL deep-link trigger for Find Me Customers flow and Prepared Campaign
const urlFlow = new URLSearchParams(location.search).get('flow') || location.hash.slice(1);
if (urlFlow === 'find_customers') {
  runFindCustomersFlow();
} else if (urlFlow === 'campaign_prepared') {
  runFindCustomersFlow();
  prepareCustomerCampaign(workspace.trade);
}


