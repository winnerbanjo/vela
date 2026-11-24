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

let workspace = { ...defaultWorkspace };
try {
  const loaded = JSON.parse(localStorage.getItem(storageKey) || '{}');
  workspace = { ...defaultWorkspace, ...loaded };
  if (loaded.servicesList) workspace.servicesList = loaded.servicesList;
  if (loaded.photos) workspace.photos = loaded.photos;
  if (loaded.bookingsList) workspace.bookingsList = loaded.bookingsList;
  if (loaded.conversations) workspace.conversations = loaded.conversations;
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

function updatePendingBadges() {
  const pendingCount = workspace.conversations.filter(c => c.status === 'needs_approval').length;
  
  // Home card badge
  const homeBadge = document.querySelector('.action-badge-count');
  if (homeBadge) homeBadge.textContent = `${pendingCount} pending`;
  
  const homeCardTitle = document.querySelectorAll('.action-card-title')[1];
  if (homeCardTitle) homeCardTitle.textContent = `Manage my inbox · ${pendingCount}`;

  // Nav badge
  const navBadge = document.querySelector('a[href="#inbox"] .nav-badge');
  if (navBadge) navBadge.textContent = String(pendingCount);
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
  const input = byId('homePromptInput');
  if (input) input.value = '';
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

// -------------------------------------------------------------
// RENDER INBOX
// -------------------------------------------------------------
function renderInbox() {
  const container = el('div');
  
  // Channels status bar
  const modesBar = el('div', '', 'inbox-modes-bar');
  modesBar.innerHTML = `
    <div style="flex:1; min-width:280px;">
      <div style="font-weight:700; color:#161817; margin-bottom:4px; font-size:12px;">Active Channel Connections:</div>
      <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
        <span class="channel-pill whatsapp">● WhatsApp (${workspace.phone})</span>
        <span class="channel-pill email">● Email (${workspace.email})</span>
        <span class="channel-pill instagram">● IG (@studioteni_ng)</span>
        <span class="channel-pill tiktok">● TikTok (@studioteni)</span>
      </div>
    </div>
    <div style="display:flex; gap:6px; align-items:center;">
      <span style="font-size:11px; font-weight:600; color:#666;">Mode:</span>
      <button class="inbox-mode-pill ${workspace.inboxMode === 'draft' ? 'active' : ''}" onclick="setInboxMode('draft')">Draft for me</button>
      <button class="inbox-mode-pill ${workspace.inboxMode === 'routine' ? 'active' : ''}" onclick="setInboxMode('routine')">Reply to routine enquiries</button>
      <button class="inbox-mode-pill ${workspace.inboxMode === 'manual' ? 'active' : ''}" onclick="setInboxMode('manual')">I'll handle this</button>
    </div>
  `;
  container.append(modesBar);

  // Channel & Status Filter Tabs
  const pendingCount = workspace.conversations.filter(c => c.status === 'needs_approval').length;
  const filterBar = el('div', '', 'inbox-filter-bar');
  filterBar.innerHTML = `
    <button class="inbox-filter-tab ${currentInboxFilter === 'all' ? 'active' : ''}" onclick="setInboxFilter('all')">All Messages (${workspace.conversations.length})</button>
    <button class="inbox-filter-tab ${currentInboxFilter === 'pending' ? 'active' : ''}" onclick="setInboxFilter('pending')">Needs Approval (${pendingCount})</button>
    <button class="inbox-filter-tab ${currentInboxFilter === 'whatsapp' ? 'active' : ''}" onclick="setInboxFilter('whatsapp')">WhatsApp (3)</button>
    <button class="inbox-filter-tab ${currentInboxFilter === 'email' ? 'active' : ''}" onclick="setInboxFilter('email')">Email (1)</button>
    <button class="inbox-filter-tab ${currentInboxFilter === 'instagram' ? 'active' : ''}" onclick="setInboxFilter('instagram')">Instagram (1)</button>
    <button class="inbox-filter-tab ${currentInboxFilter === 'tiktok' ? 'active' : ''}" onclick="setInboxFilter('tiktok')">TikTok (1)</button>
  `;
  container.append(filterBar);

  const list = el('div');
  const filtered = workspace.conversations.filter(c => {
    if (currentInboxFilter === 'pending') return c.status === 'needs_approval';
    if (currentInboxFilter !== 'all') return c.channel === currentInboxFilter;
    return true;
  });

  if (filtered.length === 0) {
    const empty = el('div', '', 'inbox-item-card');
    empty.style.textAlign = 'center';
    empty.style.padding = '40px 20px';
    empty.innerHTML = `<p style="font-weight:600; color:#555;">No messages in this filter.</p><p style="font-size:12px; color:#888;">All client enquiries are currently answered or resolved.</p>`;
    list.append(empty);
  }

  for (const conv of filtered) {
    const card = el('div', '', 'inbox-item-card');
    const isPending = conv.status === 'needs_approval';
    const isManual = conv.status === 'manual_handling';
    const isSent = conv.status === 'sent';

    card.innerHTML = `
      <div class="inbox-item-header">
        <div class="inbox-customer-info">
          <span class="channel-pill ${conv.channel}">${conv.channel.toUpperCase()}</span>
          <span>${conv.sender}</span>
          <span style="font-size:11px; color:#666; font-weight:400;">· ${conv.time}</span>
        </div>
        <span class="inbox-status-tag" style="${isSent ? 'background:#dcfce7; color:#15803d;' : isManual ? 'background:#f1f5f9; color:#475569;' : ''}">
          ${isSent ? '✓ Sent' : isManual ? 'Owner handling' : conv.status === 'routine_replied' ? 'Routine · Auto-replied' : 'Needs your approval'}
        </span>
      </div>

      <div class="inbox-customer-msg">${conv.message}</div>

      <div style="font-size:11.5px; color:#555; margin-bottom:8px;">
        <strong>Vela Context:</strong> ${conv.context}
      </div>

      <div class="inbox-draft-box" style="${conv.status === 'routine_replied' ? 'background:#f8fafc; border-style:solid; border-color:#e2e8f0;' : ''}">
        <div class="inbox-draft-label" style="${conv.status === 'routine_replied' ? 'color:#15803d;' : ''}">
          ${conv.status === 'routine_replied' ? 'Vela Auto-Reply (Sent via Routine Rule)' : 'Vela Prepared Reply (Draft)'}
        </div>
        <div class="inbox-draft-text">${conv.draftText}</div>
      </div>

      <div class="inbox-item-actions">
        ${isPending ? `
          <button class="btn-approve" onclick="${conv.isQuote ? 'originatingScreen=\'inbox\'; runWorkflow(\'review_quote\')' : `approveConversation('${conv.id}', this)`}">
            ${conv.actionLabel}
          </button>
          <button class="btn-secondary" onclick="pauseAIForConversation('${conv.id}', this)">I'll handle this</button>
        ` : ''}
        ${isManual ? `
          <button class="btn-secondary" onclick="resumeAIForConversation('${conv.id}')">Resume AI replies</button>
        ` : ''}
        ${conv.phone ? `<a href="https://wa.me/${conv.phone.replace(/[^0-9]/g,'')}" target="_blank" class="section-link" style="align-self:center; margin-left:auto;">Open WhatsApp ↗</a>` : ''}
      </div>
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

  // General Settings Form
  const form = el('form', '', 'workspace-form');
  form.style.marginTop = '24px';
  form.innerHTML = `
    <h2 style="font-size:16px; font-weight:700; margin:0 0 4px;">Business Profile & Rules</h2>
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
    save({
      name: fd.get('name').trim(),
      trade: fd.get('trade'),
      location: fd.get('location').trim(),
      inboxMode: fd.get('inboxMode')
    });
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
  page.replaceChildren(el('h1', sections[view]));

  if (view === 'inbox') page.append(renderInbox());
  else if (view === 'website') page.append(renderWebsite());
  else if (view === 'services') page.append(renderServices());
  else if (view === 'gallery') page.append(renderGallery());
  else if (view === 'bookings') page.append(renderBookings());
  else if (view === 'clients') page.append(renderClients());
  else if (view === 'money') page.append(renderMoney());
  else if (view === 'settings') page.append(renderSettings());
}

// -------------------------------------------------------------
// EVENT LISTENERS & INITIALIZATION
// -------------------------------------------------------------
// Fix: Agent nav button reliably returns home every time
const agentLink = document.querySelector('a[href="#agent"]');
if (agentLink) {
  agentLink.addEventListener('click', e => {
    e.preventDefault();
    startFreshTask();
  });
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
