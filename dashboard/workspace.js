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
        <button class="page-hero-btn-primary" style="padding:4px 12px; font-size:11.5px;" onclick="publishWebsiteChanges()">Publish now</button>
      </div>
    ` : ''}

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
          Portfolio looks connected directly to bookable services
        </div>
      </div>
    </div>
  `;
  container.append(heroBar);

  // Upload header
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

  // File picker handler
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

  // Gallery items
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
  if (app.id === 'paystack') {
    return `Studio Teni · ${app.isDefault ? 'Default for NGN deposits' : 'Active for NGN deposits'}`;
  }
  if (app.id === 'whatsapp') {
    return `Studio Teni · ${app.config.replyMode === 'auto' ? 'Auto-reply routine enquiries' : 'Replies require approval'}`;
  }
  if (app.id === 'google-calendar') {
    return `Dele · Chair 1 schedule`;
  }
  if (app.id === 'zoho-books') {
    return `Studio Teni Services Ltd · Invoice sync active`;
  }
  if (app.id === 'zoho-mail') {
    return `hello@studioteni.ng · Inbound & Outbound healthy`;
  }
  if (app.id === 'instagram') {
    return `@studioteni_ng · DMs & story inquiries`;
  }
  if (app.id === 'tiktok') {
    return `@studioteni · Viral video inquiries`;
  }
  if (app.id === 'flutterwave') {
    return `Studio Teni Global · USD/GBP/NGN international`;
  }
  if (app.id === 'stripe') {
    return `Studio Teni Ltd · Global cards & Apple Pay`;
  }
  return app.accountIdentity ? `${app.accountIdentity} · Active` : app.headline;
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
        <button type="button" class="page-hero-btn-secondary" onclick="openAppDetailModal('paystack')" title="Inspect default NGN payment provider">
          Payment Settings
        </button>
      </div>
    </div>
  `;
  container.append(heroBar);

  const allApps = Object.values(apps);
  const connectedApps = allApps.filter(a => a.status === 'connected');
  const attentionApps = allApps.filter(a => a.status === 'needs_attention');

  // =========================================================
  // SECTION 1: CONNECTED
  // =========================================================
  const connectedSection = el('div', '', 'apps-section-container');
  connectedSection.innerHTML = `
    <div class="apps-summary-card">
      <div class="apps-summary-header">
        <div class="apps-summary-title">Connected · ${connectedApps.length + attentionApps.length} active</div>
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
        ${[...attentionApps, ...connectedApps].map(app => `
          <div class="app-compact-row" id="connected-row-${app.id}">
            <div class="app-compact-left">
              ${renderAppLogo(app.id, 40)}
              <div class="app-compact-info">
                <div class="app-compact-name-row">
                  <span class="app-compact-name">${escapeHtml(app.name)}</span>
                  ${app.isDefault ? '<span class="app-default-pill">Default</span>' : ''}
                  ${app.status === 'needs_attention' ? '<span class="app-default-pill" style="background:#FEF3C7; color:#92400E;">Needs Attention</span>' : ''}
                </div>
                <div class="app-compact-desc">${escapeHtml(getAppSummary(app))}</div>
              </div>
            </div>
            <div class="app-compact-right">
              <span class="app-status-indicator ${app.status === 'needs_attention' ? 'needs-attention' : ''}">
                <span class="app-status-dot"></span>
                ${app.status === 'needs_attention' ? 'Needs Attention' : 'Connected'}
              </span>
              <button type="button" class="btn-secondary" style="font-size:12px; padding:5px 14px;" onclick="openAppDetailModal('${app.id}')">
                Manage
              </button>
            </div>
          </div>
        `).join('')}

        ${connectedApps.length === 0 && attentionApps.length === 0 ? `
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
        <div class="apps-section-title">Discover apps</div>
        <div class="apps-section-subtitle">Available integrations you can add to Vela.</div>
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

  // Exclude healthy connected apps from default discovery view
  const discoverable = apps.filter(app => {
    if (app.status === 'connected') return false;
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
              Reconnect
            </button>
          ` : `
            <button type="button" class="btn-approve" style="font-size:12px; padding:6px 16px;" onclick="openAppDetailModal('${app.id}')">
              Connect
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

// -------------------------------------------------------------
// APP DETAIL MODAL (Router between Connect Wizard & Manage Screen)
// -------------------------------------------------------------
function openAppDetailModal(appId, returnTask) {
  const apps = getAppsState();
  const app = apps[appId];
  if (!app) return;

  currentConnectingAppId = appId;
  currentReturnTask = returnTask || null;

  if (app.status === 'connected') {
    renderManageModal(app);
  } else {
    currentConnectStep = 1;
    renderConnectWizardModal(app, 1);
  }
}

// -------------------------------------------------------------
// 1. COMPLETE STEP-BY-STEP CONNECT FLOW WIZARD
// -------------------------------------------------------------
function renderConnectWizardModal(app, step = 1) {
  const modal = byId('appDetailModal');
  const card = byId('appDetailModalCard');
  if (!modal || !card) return;

  currentConnectStep = step;
  const isCalendar = app.category === 'calendar';
  const isPayment = app.category === 'payments';
  const isMail = app.id === 'zoho-mail';
  const isBooks = app.id === 'zoho-books';
  const isFiles = app.category === 'files';

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

    <!-- Wizard Step Indicator -->
    <div class="connect-wizard-steps">
      <div class="connect-step-indicator ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}">
        <span class="connect-step-circle">${step > 1 ? '✓' : '1'}</span>
        <span>Outcome</span>
      </div>
      <div class="connect-step-indicator ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}">
        <span class="connect-step-circle">${step > 2 ? '✓' : '2'}</span>
        <span>Authorise</span>
      </div>
      <div class="connect-step-indicator ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}">
        <span class="connect-step-circle">${step > 3 ? '✓' : '3'}</span>
        <span>Mapping</span>
      </div>
      <div class="connect-step-indicator ${step >= 4 ? 'active' : ''} ${step > 4 ? 'completed' : ''}">
        <span class="connect-step-circle">${step > 4 ? '✓' : '4'}</span>
        <span>Verify</span>
      </div>
      <div class="connect-step-indicator ${step >= 5 ? 'active' : ''}">
        <span class="connect-step-circle">5</span>
        <span>Finish</span>
      </div>
    </div>

    <!-- Step 1: Explain the Outcome -->
    ${step === 1 ? `
      <div class="app-detail-section">
        <div class="app-detail-section-title">What Vela will do with this tool</div>
        <div style="background:#FAF9F5; border:1px solid rgba(22,24,23,0.08); border-radius:12px; padding:16px; margin-bottom:14px;">
          <div style="font-size:14px; font-weight:700; color:#161817; margin-bottom:6px;">
            ${escapeHtml(app.outcomeExplanation || app.headline)}
          </div>
          <div style="font-size:12.5px; color:#666; line-height:1.45;">
            By connecting ${escapeHtml(app.name)}, Vela acts as your studio assistant to automate bookings, availability, invoicing and messages with strict merchant authorization.
          </div>
        </div>

        <div class="app-detail-section-title">Platform Requirements</div>
        <div style="font-size:12px; color:#666; background:#FFFFFF; border:1px solid rgba(22,24,23,0.1); border-radius:10px; padding:12px; margin-bottom:16px;">
          ${escapeHtml(app.developerRequirements || 'Provider account credentials and standard OAuth authorization required.')}
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button type="button" class="btn-secondary" onclick="closeAppDetailModal()">Cancel</button>
          <button type="button" class="btn-approve" onclick="renderConnectWizardModal(getAppsState()['${app.id}'], 2)">Continue to Authorise →</button>
        </div>
      </div>
    ` : ''}

    <!-- Step 2: Authorise & Verify Server Capabilities -->
    ${step === 2 ? `
      <div class="app-detail-section">
        <div class="app-detail-section-title">Step 2: Authorise &amp; Inspect Granted Capabilities</div>
        <div style="background:#FFFFFF; border:1px solid rgba(22,24,23,0.1); border-radius:12px; padding:16px; margin-bottom:14px;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
            <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#22C55E;"></span>
            <strong style="font-size:13px; color:#161817;">Account identified: ${escapeHtml(app.accountIdentity || 'Studio Teni Enterprise Account')}</strong>
          </div>
          <div style="font-size:12px; color:#666; margin-bottom:10px;">
            Server-side capability inspection results:
          </div>
          <div class="app-capabilities-list">
            ${(app.capabilities || []).map(cap => `
              <div class="app-capability-item">
                <span class="app-capability-icon">✓</span>
                <span>${escapeHtml(cap)}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; gap:10px;">
          <button type="button" class="btn-secondary" onclick="renderConnectWizardModal(getAppsState()['${app.id}'], 1)">← Back</button>
          <button type="button" class="btn-approve" onclick="renderConnectWizardModal(getAppsState()['${app.id}'], 3)">Confirm &amp; Map Business →</button>
        </div>
      </div>
    ` : ''}

    <!-- Step 3: Business Mapping -->
    ${step === 3 ? `
      <div class="app-detail-section">
        <div class="app-detail-section-title">Step 3: Business Mapping</div>
        <div style="background:#FAF9F5; border:1px solid rgba(22,24,23,0.08); border-radius:12px; padding:16px; margin-bottom:14px;">
          ${isCalendar ? `
            <label style="display:block; font-size:12px; font-weight:700; margin-bottom:6px;">Assign to staff member or studio chair:</label>
            <select id="wizardStaffSelect" style="width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:8px; font-size:13px; margin-bottom:12px;">
              <option value="Dele (Chair 1)" selected>Dele (Chair 1) · Schedule</option>
              <option value="Segun (Chair 2)">Segun (Chair 2) · Schedule</option>
              <option value="General Studio Floor">General Studio Floor</option>
            </select>
          ` : isMail ? `
            <label style="display:block; font-size:12px; font-weight:700; margin-bottom:6px;">Sending mailbox address:</label>
            <input type="text" value="hello@studioteni.ng" id="wizardEmailSelect" style="width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:8px; font-size:13px; margin-bottom:12px;">
            <label style="display:block; font-size:12px; font-weight:700; margin-bottom:6px;">Zoho Data Centre Region:</label>
            <select id="wizardDcSelect" style="width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:8px; font-size:13px; margin-bottom:12px;">
              <option value="zoho.com" selected>United States (zoho.com)</option>
              <option value="zoho.eu">Europe (zoho.eu)</option>
            </select>
          ` : isBooks ? `
            <label style="display:block; font-size:12px; font-weight:700; margin-bottom:6px;">Select Zoho Books Accounting Organisation:</label>
            <select id="wizardOrgSelect" style="width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:8px; font-size:13px; margin-bottom:12px;">
              <option value="8029193" selected>Studio Teni Services Ltd (Org #8029193)</option>
              <option value="9928172">Studio Teni Media Ventures</option>
            </select>
          ` : isPayment ? `
            <label style="display:block; font-size:12px; font-weight:700; margin-bottom:6px;">Default deposit percentage for bookings:</label>
            <input type="number" value="20" id="wizardDepositPct" style="width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:8px; font-size:13px; margin-bottom:12px;">
            <label style="display:flex; align-items:center; gap:8px; font-size:12.5px; font-weight:600;">
              <input type="checkbox" id="wizardDefaultPayment" checked>
              Set as default provider for NGN deposits
            </label>
          ` : `
            <div style="font-size:12.5px; color:#555;">
              Account mapped to primary merchant workspace <strong>Studio Teni</strong>.
            </div>
          `}
        </div>

        <div style="display:flex; justify-content:space-between; gap:10px;">
          <button type="button" class="btn-secondary" onclick="renderConnectWizardModal(getAppsState()['${app.id}'], 2)">← Back</button>
          <button type="button" class="btn-approve" onclick="executeWizardMeaningfulCheck('${app.id}')">Run Meaningful Check →</button>
        </div>
      </div>
    ` : ''}

    <!-- Step 4: Meaningful Check -->
    ${step === 4 ? `
      <div class="app-detail-section">
        <div class="app-detail-section-title">Step 4: Real Capability Verification</div>
        <div style="background:#F0FDF4; border:1px solid #86EFAC; border-radius:12px; padding:16px; margin-bottom:14px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
            <span style="font-size:16px; color:#15803d;">✓</span>
            <strong style="color:#166534; font-size:13.5px;">Verification Complete: 100% Operational</strong>
          </div>
          <div style="font-size:12.5px; color:#166534; line-height:1.45;" id="wizardCheckDetails">
            Read-only check executed. No client messages sent or external costs incurred.
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button type="button" class="btn-approve" onclick="completeConnectionWizard('${app.id}')">Activate &amp; Finish →</button>
        </div>
      </div>
    ` : ''}

    <!-- Step 5: Finish & Useful Next Action -->
    ${step === 5 ? `
      <div class="app-detail-section">
        <div class="app-detail-section-title">Step 5: Integration Activated</div>
        <div style="background:#FAF9F5; border:1px solid rgba(22,24,23,0.08); border-radius:12px; padding:16px; margin-bottom:16px; text-align:center;">
          <div style="font-size:24px; margin-bottom:8px;">🎉</div>
          <div style="font-size:14.5px; font-weight:700; color:#161817; margin-bottom:4px;">
            ${escapeHtml(app.name)} is connected to Vela
          </div>
          <div style="font-size:12.5px; color:#666;">
            What would you like to do next?
          </div>
        </div>

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
            <button type="button" class="btn-approve" style="padding:11px 18px; font-size:13px; justify-content:center;" onclick="closeAppDetailModal(); renderPage(); notify('✓ ${escapeHtml(app.name)} is active and ready.');">
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

function executeWizardMeaningfulCheck(appId) {
  notify('Running real capability check on server...');
  fetch('/api/apps/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId })
  })
  .then(r => r.json())
  .then(res => {
    renderConnectWizardModal(getAppsState()[appId], 4);
    setTimeout(() => {
      const el = byId('wizardCheckDetails');
      if (el && res.checkResult) {
        el.innerText = res.checkResult.details + ' ' + res.checkResult.disclosures;
      }
    }, 50);
  })
  .catch(() => {
    renderConnectWizardModal(getAppsState()[appId], 4);
  });
}

function completeConnectionWizard(appId) {
  const apps = getAppsState();
  const app = apps[appId];
  if (!app) return;

  app.status = 'connected';
  app.lastSync = 'Just now';
  app.health = 'Active · Verified';

  if (!app.activityLog) app.activityLog = [];
  app.activityLog.unshift({
    timestamp: 'Just now',
    event: 'Connected & Verified',
    status: 'success',
    details: 'Completed multi-step verification and mapped to business.'
  });

  save({ connectedApps: apps });
  renderConnectWizardModal(app, 5);
}

// -------------------------------------------------------------
// 2. COMPREHENSIVE MANAGE MODAL (Answers 4 Questions)
// -------------------------------------------------------------
function renderManageModal(app) {
  const modal = byId('appDetailModal');
  const card = byId('appDetailModalCard');
  if (!modal || !card) return;

  const isConnected = app.status === 'connected';
  const isNeedsAttention = app.status === 'needs_attention';
  const isPayment = app.category === 'payments';
  const isCalendar = app.category === 'calendar';
  const isBooks = app.id === 'zoho-books';
  const isMail = app.id === 'zoho-mail';

  // Specific failure messages
  let specificFailure = null;
  if (isNeedsAttention) {
    if (isCalendar) specificFailure = "Vela can read Dele’s availability. Permission to add appointments has expired.";
    else if (isBooks) specificFailure = "The deposit was recorded in Vela. Zoho Books sync failed. Retry invoice sync.";
    else if (isMail) specificFailure = "Your quotation is saved. Reconnect Zoho Mail to send it from Studio Teni.";
    else if (isPayment) specificFailure = "This checkout was created with Paystack. Its payment will still be reconciled there even though Flutterwave is now your default.";
    else specificFailure = `${app.name} credentials need reconnecting.`;
  }

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
      <div class="app-failure-callout">
        <strong>⚠️ Attention Required:</strong> ${escapeHtml(specificFailure)}
      </div>
    ` : ''}

    <div class="manage-four-q-card">
      <!-- Question 1: Which account is this? -->
      <div class="manage-q-block">
        <div class="manage-q-heading">1. Which account is this?</div>
        <div class="manage-q-content">
          <div><strong>${escapeHtml(app.accountIdentity || 'Studio Teni Enterprise Account')}</strong></div>
          <div style="font-size:12px; color:#666; margin-top:2px;">
            Mode: <strong>${(app.mode || 'live').toUpperCase()}</strong>
            ${app.settlementAccount ? ` · Payouts: <strong>${escapeHtml(app.settlementAccount)}</strong>` : ''}
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
        </div>
      </div>

      <!-- Question 3: When did it last work? -->
      <div class="manage-q-block">
        <div class="manage-q-heading">3. When did it last work?</div>
        <div class="manage-q-content">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span>Last successful sync: <strong>${escapeHtml(app.lastSync || 'Just now')}</strong></span>
            <span style="font-size:11px; color:#15803d; font-weight:600;">${escapeHtml(app.health || 'Active')}</span>
          </div>
          <div class="manage-activity-list">
            ${(app.activityLog && app.activityLog.length > 0 ? app.activityLog : [
              { timestamp: '10m ago', event: 'Health check passed', details: 'Webhooks and API token verified active' }
            ]).map(item => `
              <div class="manage-activity-row">
                <span>${escapeHtml(item.event)} (${escapeHtml(item.details)})</span>
                <span style="color:#888;">${escapeHtml(item.timestamp)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Question 4: What do I do if it stops? -->
      <div class="manage-q-block">
        <div class="manage-q-heading">4. What do I do if it stops?</div>
        <div class="manage-q-content">
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button type="button" class="btn-secondary" style="font-size:12px; padding:6px 12px;" onclick="testCapabilityHealth('${app.id}')">
              Test connection
            </button>
            ${isNeedsAttention ? `
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
  notify(`${apps[appId].name} is now ${isDefault ? 'the default NGN deposit provider' : 'no longer default'}.`);
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


