const byId = id => document.getElementById(id);
const page = byId('workspacePage');
const defaults = {
  name: 'Studio Teni',
  trade: 'barber',
  location: 'Victoria Island · Lagos',
  bio: '',
  walkIns: 0,
  photos: [],
  inboxMode: 'draft',
  whatsappNumber: '+234 803 123 4567',
  emailAddress: 'hello@studioteni.ng'
};
const storageKey = 'vela.preview.workspace.v1';
let workspace = { ...defaults };
try { Object.assign(workspace, JSON.parse(localStorage.getItem(storageKey) || '{}')); } catch { /* Use the preview defaults. */ }

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function link(text, dest) {
  const a = el('a', text, 'section-link');
  a.href = '#' + dest;
  return a;
}
function row(title, detail, action) {
  const wrap = el('div', '', 'workspace-row');
  const info = el('div');
  info.append(el('strong', title), el('p', detail));
  wrap.append(info);
  if (action) wrap.append(action);
  return wrap;
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
  notify.timer = setTimeout(() => status.remove(), 4000);
}
function save(changes) {
  const next = { ...workspace, ...changes };
  try { localStorage.setItem(storageKey, JSON.stringify(next)); }
  catch { notify('Could not save on this device. Check available storage.'); return false; }
  workspace = next;
  applyProfile();
  return true;
}
function setInboxMode(mode) {
  if (save({ inboxMode: mode })) {
    notify('Inbox mode updated to: ' + (mode === 'draft' ? 'Draft for me' : mode === 'routine' ? 'Reply to routine enquiries' : 'I’ll handle this'));
    renderPage();
  }
}
function approveChukaReply(btn) {
  btn.disabled = true;
  btn.textContent = '✓ Reply sent via WhatsApp';
  btn.style.background = '#15803d';
  save({ walkIns: workspace.walkIns + 1 });
  byId('chukaStatusTag').textContent = 'Confirmed · Reserved 4:15 PM';
  byId('chukaStatusTag').style.background = '#dcfce7';
  byId('chukaStatusTag').style.color = '#15803d';
  notify('Appointment reserved for Chuka at 4:15 PM. Added to Bookings!');
}
function handleChukaManually(btn) {
  btn.disabled = true;
  byId('chukaStatusTag').textContent = 'Owner handling';
  byId('chukaStatusTag').style.background = '#f1f5f9';
  byId('chukaStatusTag').style.color = '#475569';
  notify('Vela replies paused for Chuka. Conversation assigned to owner.');
}
function confirmBabatundeShift(btn) {
  btn.disabled = true;
  btn.textContent = '✓ Slot moved & WhatsApp sent';
  btn.style.background = '#15803d';
  byId('babatundeStatusTag').textContent = 'Rescheduled to 2:30 PM';
  byId('babatundeStatusTag').style.background = '#dcfce7';
  byId('babatundeStatusTag').style.color = '#15803d';
  notify('Babatunde\'s booking updated to 2:30 PM with Dele.');
}
function closeDrawer() {
  byId('sidebar').classList.remove('open');
  byId('closeSidebarBtn').style.display = 'none';
}
function enterAgent() {
  if (location.hash && location.hash !== '#agent') history.pushState(null, '', '#agent');
  page.hidden = true;
  selectNav('agent');
}
function selectNav(view) {
  for (const a of document.querySelectorAll('.nav-item')) {
    const active = a.hash === '#' + view;
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}
function applyProfile() {
  currentMode = workspace.trade;
  document.querySelector('.owner-info').textContent = workspace.name;
  if (typeof renderSuggestions === 'function') renderSuggestions();
}
function recordWalkIn(button) {
  if (save({ walkIns: workspace.walkIns + 1 })) {
    button.disabled = true;
    button.textContent = 'Added to demo bookings';
  }
}
function showInstructionHelp(text) {
  enterAgent();
  byId('homeView').style.display = 'none';
  byId('chatView').style.display = 'flex';
  byId('chatTaskTitle').textContent = 'Your instruction';
  byId('chatContainer').replaceChildren(el('p', text, 'msg-bubble user-msg'),
    el('p', 'This demo supports finding customers, managing your inbox, fill openings, quotes, and shoot preparation.', 'msg-bubble'), link('Open inbox','inbox'));
}
function field(form, label, key, options) {
  const wrapper = el('label', label);
  const input = el(options ? 'select' : 'input');
  if (options) for (const [value, title] of options) input.add(new Option(title,value));
  input.name = key;
  input.value = workspace[key] || '';
  input.required = key !== 'bio';
  if (!options) input.maxLength = key === 'bio' ? 400 : 100;
  wrapper.append(input);
  form.append(wrapper);
  return input;
}
function profileForm(website) {
  const form = el('form', '', 'workspace-form');
  if (website) {
    field(form,'Website introduction','bio');
    form.append(row('Portfolio images',workspace.photos.length + ' saved in this demo',link('Manage gallery','gallery')));
  } else {
    field(form,'Business name','name');
    field(form,'Business type','trade',[['barber','Barber'],['photographer','Photographer']]);
    field(form,'Location','location');
    field(form,'WhatsApp Business Number','whatsappNumber');
    field(form,'Notification Email','emailAddress');
    field(form,'Default Channel Response Mode','inboxMode',[['draft','Draft for me (review each reply)'],['routine','Reply to routine enquiries automatically'],['manual','I’ll handle this (manual only)']]);
  }
  form.append(el('button','Save changes','btn-approve'));
  form.onsubmit = event => {
    event.preventDefault();
    const changes = Object.fromEntries(new FormData(form));
    for (const key of Object.keys(changes)) {
      changes[key] = changes[key].trim();
      if (key !== 'bio' && !changes[key]) { form.elements.namedItem(key).focus(); return; }
    }
    if (save(changes)) notify('Changes saved on this device.');
  };
  return form;
}
function renderInbox() {
  const container = el('div');
  
  const modesBar = el('div', '', 'inbox-modes-bar');
  modesBar.innerHTML = `
    <div style="flex:1; min-width:240px;">
      <div style="font-weight:700; color:#161817; margin-bottom:2px;">Connected Channels:</div>
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <span class="channel-pill whatsapp">● WhatsApp (${workspace.whatsappNumber})</span>
        <span class="channel-pill email">● Email (${workspace.emailAddress})</span>
        <a href="#settings" class="section-link" style="margin-left:4px;">Settings → Channels</a>
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

  const convList = el('div');

  // Conv 1: Chuka on WhatsApp
  const c1 = el('div', '', 'inbox-item-card');
  c1.innerHTML = `
    <div class="inbox-item-header">
      <div class="inbox-customer-info">
        <span class="channel-pill whatsapp">WhatsApp</span>
        <span>Chuka Nnamdi</span>
        <span style="font-size:11px; color:#666; font-weight:400;">· Just now</span>
      </div>
      <span class="inbox-status-tag" id="chukaStatusTag">Needs your approval</span>
    </div>
    <div class="inbox-customer-msg">
      “Boss, can I come around 4 for haircut and beard? How much?”
    </div>
    <div style="font-size:11.5px; color:#555; margin-bottom:8px;">
      <strong>Vela Context:</strong> First-time client · Chair 1 (Dele) open at 4:15 PM · Haircut & Beard (₦10,000)
    </div>
    <div class="inbox-draft-box" id="chukaDraftBox">
      <div class="inbox-draft-label">Vela Prepared Reply (Draft)</div>
      <div class="inbox-draft-text">“Haircut and beard is ₦10,000. Dele is available at 4:15 today at our shop. Would that work for you?”</div>
    </div>
    <div class="inbox-item-actions" id="chukaActions">
      <button class="btn-approve" onclick="approveChukaReply(this)">Approve & send WhatsApp</button>
      <button class="btn-secondary" onclick="alert('Draft opened for inline editing.');">Edit reply</button>
      <button class="btn-secondary" onclick="handleChukaManually(this)">I'll handle this</button>
    </div>
  `;
  convList.append(c1);

  // Conv 2: Horizon Capital on Email
  const c2 = el('div', '', 'inbox-item-card');
  c2.innerHTML = `
    <div class="inbox-item-header">
      <div class="inbox-customer-info">
        <span class="channel-pill email">Email</span>
        <span>Kemi Adeleke (HR · Horizon Capital)</span>
        <span style="font-size:11px; color:#666; font-weight:400;">· 28m ago</span>
      </div>
      <span class="inbox-status-tag" id="kemiStatusTag">Quotation ready</span>
    </div>
    <div class="inbox-customer-msg">
      “We need headshots for 18 staff at our Victoria Island office. Can you send a quote?”
    </div>
    <div style="font-size:11.5px; color:#555; margin-bottom:8px;">
      <strong>Vela Context:</strong> Corporate inquiry · 18 people · On-location Victoria Island · Proposed: ₦350,000 package
    </div>
    <div class="inbox-draft-box" id="kemiDraftBox">
      <div class="inbox-draft-label">Vela Prepared Email Reply & Quotation</div>
      <div class="inbox-draft-text">“Hello Kemi, attached is Quotation #VQ-2026-112 for 18 executive staff headshots on-location (₦350,000 total · ₦140,000 deposit to secure Thursday 3 Dec).”</div>
    </div>
    <div class="inbox-item-actions" id="kemiActions">
      <button class="btn-approve" onclick="runWorkflow('review_quote')">Review quotation</button>
      <button class="btn-secondary" onclick="alert('Quotation values unlocked for customization.');">Edit package terms</button>
    </div>
  `;
  convList.append(c2);

  // Conv 3: Ada on WhatsApp (Routine enquiry)
  const c3 = el('div', '', 'inbox-item-card');
  c3.innerHTML = `
    <div class="inbox-item-header">
      <div class="inbox-customer-info">
        <span class="channel-pill whatsapp">WhatsApp</span>
        <span>Adaeze Obi</span>
        <span style="font-size:11px; color:#666; font-weight:400;">· 1h ago</span>
      </div>
      <span style="font-size:11px; color:#15803d; background:#dcfce7; padding:2px 8px; border-radius:12px; font-weight:600;">Routine enquiry · Auto-replied</span>
    </div>
    <div class="inbox-customer-msg">
      “What time do you close on Friday and where are you located?”
    </div>
    <div class="inbox-draft-box" style="border-style:solid; border-color:#e2e8f0; background:#f8fafc;">
      <div class="inbox-draft-label" style="color:#15803d;">Vela Auto-Reply (Sent via Routine Rule)</div>
      <div class="inbox-draft-text">“We’re open until 7:00 PM on Friday! Studio Teni is located at 14 Bishop Oluwole St, Victoria Island. You can view services and lock in a chair directly here: studioteni.vela.ng/book”</div>
    </div>
  `;
  convList.append(c3);

  // Conv 4: Babatunde on WhatsApp (Rescheduling)
  const c4 = el('div', '', 'inbox-item-card');
  c4.innerHTML = `
    <div class="inbox-item-header">
      <div class="inbox-customer-info">
        <span class="channel-pill whatsapp">WhatsApp</span>
        <span>Babatunde Ojo</span>
        <span style="font-size:11px; color:#666; font-weight:400;">· 2h ago</span>
      </div>
      <span class="inbox-status-tag" id="babatundeStatusTag">Reschedule request</span>
    </div>
    <div class="inbox-customer-msg">
      “I'm stuck in traffic on Third Mainland, can we shift my 1:00 PM to 2:30 PM?”
    </div>
    <div class="inbox-draft-box" id="babaDraftBox">
      <div class="inbox-draft-label">Vela Prepared Reply</div>
      <div class="inbox-draft-text">“No problem Babatunde! Dele's 2:30 PM slot was free so we've shifted your appointment to 2:30 PM today. Drive safe, see you soon.”</div>
    </div>
    <div class="inbox-item-actions" id="babaActions">
      <button class="btn-approve" onclick="confirmBabatundeShift(this)">Confirm shift & reply</button>
      <button class="btn-secondary" onclick="alert('Viewing Dele\'s schedule.');">Check schedule</button>
    </div>
  `;
  convList.append(c4);

  container.append(convList);
  return container;
}
function gallery() {
  const grid = el('div','','gallery-grid');
  for (const photo of workspace.photos) {
    const img = el('img');
    img.src = photo.src;
    img.alt = photo.name;
    grid.append(img);
  }
  const picker = el('input');
  picker.type = 'file';
  picker.accept = 'image/jpeg,image/png,image/webp';
  const label = el('label','Add a portfolio image (up to 500 KB)');
  label.append(picker);
  picker.onchange = async () => {
    const file = picker.files[0];
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 500000) { notify('Choose a JPG, PNG or WebP under 500 KB.'); return; }
    const reader = new FileReader();
    reader.onload = () => { if (save({ photos: [...workspace.photos, {name: file.name, src: reader.result}] })) renderPage(); };
    reader.onerror = () => notify('Could not read this image.');
    reader.readAsDataURL(file);
  };
  page.append(label, grid);
}
const sections = {
  inbox: 'Inbox', bookings: 'Bookings', clients: 'Clients', money: 'Money', services: 'Services',
  website: 'Website', gallery: 'Gallery', settings: 'Settings'
};
function renderPage() {
  closeDrawer();
  closeModal();
  const view = location.hash.slice(1);
  if (!Object.hasOwn(sections,view)) { startFreshTask(); return; }
  selectNav(view);
  byId('homeView').style.display = 'none';
  byId('chatView').style.display = 'none';
  page.hidden = false;
  page.replaceChildren(el('h1',sections[view]));
  const barber = currentMode === 'barber';
  const client = barber ? 'Tobi Adebayo' : 'Mrs. Yemi Balogun';
  const service = barber ? 'Haircut and beard' : 'Wedding photography';
  if (view === 'inbox') page.append(renderInbox());
  if (view === 'settings' || view === 'website') page.append(profileForm(view === 'website'));
  if (view === 'gallery') gallery();
  if (view === 'services') page.append(row(service, barber ? '45 minutes · ₦10,000' : 'Event coverage · Custom quotation',link('View bookings','bookings')));
  if (view === 'clients') page.append(row(client,service,link('View booking','bookings')));
  if (view === 'money') page.append(row(client,barber ? '₦2,000 deposit paid · ₦8,000 outstanding' : '₦140,000 deposit paid · ₦210,000 outstanding',link('View client','clients')));
  if (view === 'bookings') {
    page.append(row(client, service + (barber ? ' · Today at 1:00 pm' : ' · Friday at 10:00 am'),link('View balance','money')));
    if (barber) {
      if (workspace.walkIns) page.append(row('Walk-ins recorded',String(workspace.walkIns)+' haircut appointments'));
      const add = el('button','Add a walk-in','btn-approve');
      add.onclick = () => runWorkflow('walk_in');
      page.append(add);
    }
  }
}
const nav = document.querySelector('.nav-list');
for (const dest of ['services','gallery']) {
  const a = link(sections[dest], dest);
  a.className = 'nav-item secondary-nav';
  nav.append(a);
}
document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeDrawer(); closeModal(); } });
document.addEventListener('click', event => {
  if (byId('sidebar').classList.contains('open') && !event.target.closest('#sidebar,#openSidebarBtn')) closeDrawer();
});
window.addEventListener('hashchange',renderPage);
applyProfile();
renderPage();
