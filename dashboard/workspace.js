const byId = id => document.getElementById(id);
const page = byId('workspacePage');
const defaults = { name: 'Studio Teni', trade: 'barber', location: 'Victoria Island · Lagos', bio: '', walkIns: 0, photos: [] };
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
  const barber = currentMode === 'barber';
  document.querySelectorAll('.update-card').forEach((card,i) => card.hidden = barber ? i !== 0 : i !== 1);
  for (const button of document.querySelectorAll('.task-history-btn')) {
    const barberTask = button.getAttribute('onclick').includes('fill_slots');
    button.hidden = barberTask !== barber;
  }
  renderSuggestions();
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
    el('p', 'This demo supports appointment openings, walk-ins, quotes and shoot preparation. You can also open a workspace section.', 'msg-bubble'), link('Open bookings','bookings'));
}
function field(form, label, key, options) {
  const wrapper = el('label', label);
  const input = el(options ? 'select' : 'input');
  if (options) for (const [value, title] of options) input.add(new Option(title,value));
  input.name = key;
  input.value = workspace[key];
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
    form.append(row('Notifications and payments','Messaging and payment providers are disconnected in this local demo.'));
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
  bookings: 'Bookings', clients: 'Clients', money: 'Money', services: 'Services',
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
