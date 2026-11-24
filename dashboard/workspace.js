// Vela AI Workspace Controller
// Single source of truth for merchant dashboard, catalogue, connected channels, and booking state

const byId = id => document.getElementById(id);
const page = byId('workspacePage');
const storageKey = 'vela.preview.workspace.v1';

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
  const row = byId('quietReviewRow');
  const text = byId('quietReviewText');
  const dropdown = byId('quietReviewDropdown');

  if (!row) return;

  if (pendingCount === 0) {
    row.style.display = 'none';
    if (dropdown) dropdown.style.display = 'none';
    isReviewDropdownOpen = false;
    return;
  }

  row.style.display = 'flex';
  if (text) {
    text.textContent = `${pendingCount} decision${pendingCount === 1 ? '' : 's'} need${pendingCount === 1 ? 's' : ''} your review`;
  }

  if (dropdown && isReviewDropdownOpen) {
    populateQuietReviewDropdown(pendingDecisions);
  }
}

function toggleReviewDropdown() {
  const dropdown = byId('quietReviewDropdown');
  const btn = byId('quietReviewBtn');
  if (!dropdown) return;

  isReviewDropdownOpen = !isReviewDropdownOpen;
  if (isReviewDropdownOpen) {
    const pendingDecisions = workspace.conversations.filter(c => c.status === 'needs_approval');
    populateQuietReviewDropdown(pendingDecisions);
    dropdown.style.display = 'flex';
    dropdown.style.flexDirection = 'column';
    if (btn) btn.textContent = 'Hide';
  } else {
    dropdown.style.display = 'none';
    if (btn) btn.textContent = 'Review';
  }
}

function getDecisionSummary(conv) {
  if (conv.isQuote) {
    return `Approve ${conv.sender.split('(')[0].trim()}’s quotation · ₦350,000`;
  }
  if (conv.id === 'conv-1') {
    return `Confirm 4:15 PM haircut for ${conv.sender} · ₦10,000`;
  }
  if (conv.id === 'conv-3') {
    return `Confirm shift to 2:30 PM for ${conv.sender}`;
  }
  if (conv.channel === 'instagram') {
    return `Review Instagram reply for ${conv.sender}`;
  }
  if (conv.channel === 'tiktok') {
    return `Review TikTok reply for ${conv.sender}`;
  }
  return `Review ${conv.channel} reply for ${conv.sender}`;
}

function populateQuietReviewDropdown(decisions) {
  const dropdown = byId('quietReviewDropdown');
  if (!dropdown) return;

  dropdown.innerHTML = '';
  decisions.forEach(conv => {
    const item = document.createElement('div');
    item.className = 'quiet-review-item';
    item.innerHTML = `
      <div class="quiet-item-header" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="toggleReviewItemDetail(this)">
        <span style="font-weight:600; color:#161817; font-size:13px;">${getDecisionSummary(conv)}</span>
        <span class="quiet-chevron" style="font-size:12px; color:#888; transition:transform 0.15s;">▸</span>
      </div>
      <div class="quiet-item-detail" style="display:none; margin-top:10px; border-top:1px solid #E5E5E0; padding-top:10px; font-size:12px;">
        <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
          <span style="font-size:10px; text-transform:uppercase; font-weight:700; background:#E5E7EB; color:#374151; padding:2px 6px; border-radius:4px;">${conv.channel}</span>
          <span style="font-weight:600; color:#161817;">${conv.sender}</span>
          <span style="color:#888; font-size:11px;">· ${conv.time}</span>
        </div>
        <div style="color:#444; margin-bottom:6px; font-style:italic;">${conv.message}</div>
        <div style="color:#2563eb; font-size:11.5px; margin-bottom:8px; font-weight:500;">✦ Context: ${conv.context}</div>
        <div style="background:#FFF; border:1px solid #DDD; border-radius:8px; padding:8px 10px; margin-bottom:10px; font-size:12px; line-height:1.4;">
          <span style="color:#888; font-size:10.5px; font-weight:600; text-transform:uppercase;">Vela Prepared Reply:</span><br>
          ${conv.draftText}
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${conv.isQuote ? `
            <button type="button" class="btn-approve" style="font-size:11.5px; padding:6px 12px;" onclick="originatingScreen='agent'; runWorkflow('review_quote')">Review quotation</button>
          ` : `
            <button type="button" class="btn-approve" style="font-size:11.5px; padding:6px 12px;" onclick="approveConversation('${conv.id}', this); setTimeout(updatePendingBadges, 300);">Approve &amp; send</button>
            <button type="button" class="btn-secondary" style="font-size:11.5px; padding:6px 12px;" onclick="pauseAIForConversation('${conv.id}', this); setTimeout(updatePendingBadges, 300);">I’ll handle this</button>
          `}
        </div>
      </div>
    `;
    dropdown.append(item);
  });
}

function toggleReviewItemDetail(headerEl) {
  const detail = headerEl.nextElementSibling;
  const chevron = headerEl.querySelector('.quiet-chevron');
  if (!detail) return;
  const isHidden = detail.style.display === 'none';
  detail.style.display = isHidden ? 'block' : 'none';
  if (chevron) chevron.textContent = isHidden ? '▾' : '▸';
}

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

  btn.disabled = true;
  btn.textContent = '✓ Approved & Sent';
  btn.style.background = '#15803d';
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

  // Clean Header & Controls Bar
  const heroBar = el('div', '', 'inbox-hero-bar');
  heroBar.innerHTML = `
    <div class="inbox-title-group">
      <div class="inbox-title-row">
        <h1>Inbox</h1>
        ${pendingCount > 0 ? `
          <span class="inbox-status-pill pending">
            <span class="inbox-status-dot"></span>
            ${pendingCount} decision${pendingCount === 1 ? '' : 's'} waiting
          </span>
        ` : `
          <span class="inbox-status-pill clean">✓ All clear</span>
        `}
      </div>
      <div class="inbox-subtitle">
        WhatsApp · Email · Instagram · TikTok
      </div>
    </div>

    <div class="inbox-controls-group">
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
      <a href="#settings" class="inbox-channels-btn" title="Manage channel connections">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        <span>Channels</span>
      </a>
    </div>
  `;
  container.append(heroBar);

  // Minimal Pill Filters
  const filterStrip = el('div', '', 'inbox-filter-strip');
  filterStrip.innerHTML = `
    <button class="inbox-filter-pill ${currentInboxFilter === 'all' ? 'active' : ''}" onclick="setInboxFilter('all')">All Messages (${workspace.conversations.length})</button>
    <button class="inbox-filter-pill ${currentInboxFilter === 'pending' ? 'active' : ''}" onclick="setInboxFilter('pending')">Needs Decision (${pendingCount})</button>
    <button class="inbox-filter-pill ${currentInboxFilter === 'whatsapp' ? 'active' : ''}" onclick="setInboxFilter('whatsapp')">WhatsApp (3)</button>
    <button class="inbox-filter-pill ${currentInboxFilter === 'email' ? 'active' : ''}" onclick="setInboxFilter('email')">Email (1)</button>
    <button class="inbox-filter-pill ${currentInboxFilter === 'instagram' ? 'active' : ''}" onclick="setInboxFilter('instagram')">Instagram (1)</button>
    <button class="inbox-filter-pill ${currentInboxFilter === 'tiktok' ? 'active' : ''}" onclick="setInboxFilter('tiktok')">TikTok (1)</button>
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

  // Top Channel Header
  const headerCard = el('div', '', 'website-channel-card');
  headerCard.innerHTML = `
    <div class="website-header-row">
      <div>
        <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#666; margin-bottom:4px;">Public Storefront Address</div>
        <div class="website-url-badge">
          <span>https://${workspace.slug}.vela.ng</span>
          <span class="website-status-tag ${workspace.hasUnpublishedChanges ? 'draft' : 'published'}">
            ${workspace.hasUnpublishedChanges ? 'Draft Edits' : 'Published'}
          </span>
        </div>
      </div>
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <button class="btn-secondary" onclick="openLivePreviewModal('mobile')">Preview</button>
        <button class="btn-approve" onclick="publishWebsiteChanges()">Publish changes</button>
        <a href="/p/${workspace.slug}" target="_blank" class="btn-secondary" style="text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
          <span>Open live site</span>
          <span>↗</span>
        </a>
      </div>
    </div>
    ${workspace.hasUnpublishedChanges ? `
      <div class="unpublished-alert-banner">
        <span>⚠️ You have unpublished draft edits. The live site will remain on revision from ${workspace.lastPublishedAt} until published.</span>
        <button class="btn-approve" style="padding:4px 10px; font-size:11px;" onclick="publishWebsiteChanges()">Publish now</button>
      </div>
    ` : `
      <div style="font-size:11.5px; color:#666; margin-top:10px;">
        ✓ Live site is up to date · Last published: <strong>${workspace.lastPublishedAt}</strong>
      </div>
    `}
  `;
  container.append(headerCard);

  // Section Tabs (Phone friendly)
  const tabs = el('div', '', 'website-section-tabs');
  tabs.innerHTML = `
    <button class="website-tab-btn ${activeWebsiteSection === 'details' ? 'active' : ''}" onclick="setWebsiteSection('details')">Business details</button>
    <button class="website-tab-btn ${activeWebsiteSection === 'services' ? 'active' : ''}" onclick="setWebsiteSection('services')">Services & Pricing</button>
    <button class="website-tab-btn ${activeWebsiteSection === 'booking' ? 'active' : ''}" onclick="setWebsiteSection('booking')">Booking policy</button>
    <button class="website-tab-btn ${activeWebsiteSection === 'gallery' ? 'active' : ''}" onclick="setWebsiteSection('gallery')">Gallery & Looks</button>
    <button class="website-tab-btn ${activeWebsiteSection === 'domain' ? 'active' : ''}" onclick="setWebsiteSection('domain')">Domain & Links</button>
  `;
  container.append(tabs);

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
  
  const header = el('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.marginBottom = '20px';
  header.innerHTML = `
    <div>
      <div style="font-size:13px; color:#666;">Single source of truth for prices, durations, and deposit policies</div>
    </div>
    <button class="btn-approve" onclick="openAddServiceModal()">+ Add New Service</button>
  `;
  container.append(header);

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

  const topBar = el('div');
  topBar.style.display = 'flex';
  topBar.style.justifyContent = 'space-between';
  topBar.style.alignItems = 'center';
  topBar.style.marginBottom = '18px';
  topBar.style.flexWrap = 'wrap';
  topBar.style.gap = '10px';
  topBar.innerHTML = `
    <div style="display:flex; gap:6px;">
      <button class="inbox-filter-tab ${bookingFilter === 'all' ? 'active' : ''}" onclick="bookingFilter='all'; renderPage();">All Staff</button>
      <button class="inbox-filter-tab ${bookingFilter === 'dele' ? 'active' : ''}" onclick="bookingFilter='dele'; renderPage();">Dele (Chair 1)</button>
      <button class="inbox-filter-tab ${bookingFilter === 'walkin' ? 'active' : ''}" onclick="bookingFilter='walkin'; renderPage();">Walk-ins</button>
    </div>
    <button class="btn-approve" onclick="runWorkflow('walk_in')">+ Add a walk-in</button>
  `;
  container.append(topBar);

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
  container.innerHTML = `
    <div style="font-size:13px; color:#666; margin-bottom:16px;">
      Connected client directory with contact channels, appointment history, and lifetime value:
    </div>
  `;

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
          <td>₦0</td>
          <td>₦10,000</td>
          <td><span class="inbox-status-tag">Awaiting Approval</span></td>
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

  // Channels Section (Requested by user: WhatsApp, Email, Instagram, TikTok)
  const channelsHeader = el('div');
  channelsHeader.innerHTML = `
    <h2 style="font-size:16px; font-weight:700; margin:0 0 4px;">Connected Channels</h2>
    <p style="font-size:12.5px; color:#666; margin:0 0 16px;">Vela communicates through your verified business channels to sell, book, and answer customers.</p>
  `;
  container.append(channelsHeader);

  // Channel 1: WhatsApp
  const ch1 = el('div', '', 'channel-connection-card');
  ch1.innerHTML = `
    <div style="display:flex; align-items:center; gap:14px;">
      <div class="channel-connection-icon wa">WA</div>
      <div class="channel-details">
        <div style="font-weight:700; font-size:14px;">WhatsApp Business (${workspace.channels.whatsapp.name})</div>
        <div style="font-size:12.5px; color:#555;">Identity: <strong>${workspace.channels.whatsapp.identity}</strong></div>
        <div style="font-size:11px; color:#777; margin-top:2px;">
          <span class="channel-status-dot active"></span>Connected · Last sync: ${workspace.channels.whatsapp.lastSync}
        </div>
      </div>
    </div>
    <button class="btn-secondary" onclick="notify('WhatsApp connection verified.');">Reconnect</button>
  `;
  container.append(ch1);

  // Channel 2: Email
  const ch2 = el('div', '', 'channel-connection-card');
  ch2.innerHTML = `
    <div style="display:flex; align-items:center; gap:14px;">
      <div class="channel-connection-icon em">@</div>
      <div class="channel-details">
        <div style="font-weight:700; font-size:14px;">Email Outbox (${workspace.channels.email.name})</div>
        <div style="font-size:12.5px; color:#555;">Identity: <strong>${workspace.channels.email.identity}</strong></div>
        <div style="font-size:11px; color:#777; margin-top:2px;">
          <span class="channel-status-dot active"></span>Connected · Last delivery: ${workspace.channels.email.lastSync}
        </div>
      </div>
    </div>
    <button class="btn-secondary" onclick="notify('Email SMTP test successful.');">Test Send</button>
  `;
  container.append(ch2);

  // Channel 3: Instagram
  const ch3 = el('div', '', 'channel-connection-card');
  ch3.innerHTML = `
    <div style="display:flex; align-items:center; gap:14px;">
      <div class="channel-connection-icon ig">IG</div>
      <div class="channel-details">
        <div style="font-weight:700; font-size:14px;">Instagram Direct Messages (${workspace.channels.instagram.name})</div>
        <div style="font-size:12.5px; color:#555;">Account: <strong>${workspace.channels.instagram.identity}</strong></div>
        <div style="font-size:11px; color:#777; margin-top:2px;">
          <span class="channel-status-dot active"></span>Connected · Last sync: ${workspace.channels.instagram.lastSync}
        </div>
      </div>
    </div>
    <button class="btn-secondary" onclick="notify('Instagram webhook active.');">Reconnect</button>
  `;
  container.append(ch3);

  // Channel 4: TikTok
  const ch4 = el('div', '', 'channel-connection-card');
  ch4.innerHTML = `
    <div style="display:flex; align-items:center; gap:14px;">
      <div class="channel-connection-icon tt">TT</div>
      <div class="channel-details">
        <div style="font-weight:700; font-size:14px;">TikTok Business Messaging (${workspace.channels.tiktok.name})</div>
        <div style="font-size:12.5px; color:#555;">Account: <strong>${workspace.channels.tiktok.identity}</strong></div>
        <div style="font-size:11px; color:#777; margin-top:2px;">
          <span class="channel-status-dot active"></span>Connected · Last sync: ${workspace.channels.tiktok.lastSync}
        </div>
      </div>
    </div>
    <button class="btn-secondary" onclick="notify('TikTok API tokens refreshed.');">Reconnect</button>
  `;
  container.append(ch4);

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
  settings: 'Settings'
};

function renderPage() {
  closeDrawer();
  closeModal();

  const view = location.hash.slice(1);
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
  } else {
    page.append(el('h1', sections[view]));
    if (view === 'website') page.append(renderWebsite());
    else if (view === 'services') page.append(renderServices());
    else if (view === 'gallery') page.append(renderGallery());
    else if (view === 'bookings') page.append(renderBookings());
    else if (view === 'clients') page.append(renderClients());
    else if (view === 'money') page.append(renderMoney());
    else if (view === 'settings') page.append(renderSettings());
  }
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
window.toggleReviewDropdown = toggleReviewDropdown;
window.toggleReviewItemDetail = toggleReviewItemDetail;
window.updatePendingBadges = updatePendingBadges;
window.autoGrowComposer = autoGrowComposer;
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
