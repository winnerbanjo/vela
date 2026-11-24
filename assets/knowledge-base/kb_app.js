// Vela Knowledge Base Application Logic
// Implements client-side routing, instant search, article rendering, deep-linking, and image lightboxes

document.addEventListener('DOMContentLoaded', () => {
  initKnowledgeBase();
});

function initKnowledgeBase() {
  renderTopicsGrid();
  handleRouteFromUrl();

  window.addEventListener('popstate', () => {
    handleRouteFromUrl();
  });
}

function handleRouteFromUrl() {
  const path = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash;

  // Check if article is specified in path (e.g. /knowledge-base/connected-apps/connect-paystack or /knowledge-base/connect-paystack)
  if (path.startsWith('/knowledge-base/')) {
    const parts = path.replace('/knowledge-base/', '').split('/').filter(Boolean);
    const slug = parts[parts.length - 1];
    if (slug && findArticle(slug)) {
      renderArticleView(slug, false);
      return;
    }
  }

  // Check query parameter ?article=slug
  if (searchParams.get('article')) {
    const slug = searchParams.get('article');
    if (findArticle(slug)) {
      renderArticleView(slug, false);
      return;
    }
  }

  // Check hash #article-slug
  if (hash.startsWith('#article-')) {
    const slug = hash.replace('#article-', '');
    if (findArticle(slug)) {
      renderArticleView(slug, false);
      return;
    }
  }

  // Otherwise, render Knowledge Base Home
  renderHomeView(false);
}

function findArticle(slug) {
  return window.KB_ARTICLES.find(a => a.slug === slug);
}

function findCategory(id) {
  return window.KB_CATEGORIES.find(c => c.id === id);
}

// -------------------------------------------------------------
// RENDER HOME VIEW
// -------------------------------------------------------------
function renderHomeView(pushHistory = true) {
  document.title = 'Vela Knowledge Base · Step-by-Step Guides for Service Businesses';
  const homeView = document.getElementById('kbHomeView');
  const readerView = document.getElementById('kbReaderView');
  if (homeView) homeView.style.display = 'block';
  if (readerView) readerView.style.display = 'none';

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (pushHistory && window.location.pathname !== '/knowledge-base') {
    window.history.pushState(null, '', '/knowledge-base');
  }
}

function renderTopicsGrid() {
  const grid = document.getElementById('kbTopicsGrid');
  if (!grid) return;

  grid.innerHTML = window.KB_CATEGORIES.map(cat => {
    const articles = window.KB_ARTICLES.filter(a => a.categoryId === cat.id);
    return `
      <div class="kb-topic-card" id="topic-card-${cat.id}">
        <div class="kb-topic-header">
          <div class="kb-topic-icon">${cat.icon}</div>
          <h3 class="kb-topic-title">${escapeHtml(cat.title)}</h3>
        </div>
        <p class="kb-topic-desc">${escapeHtml(cat.description)}</p>
        <ul class="kb-article-list">
          ${articles.map(art => `
            <li>
              <a href="/knowledge-base/${cat.id}/${art.slug}" class="kb-article-link-item" onclick="event.preventDefault(); openArticle('${art.slug}');">
                <span>${escapeHtml(art.title)}</span>
                <span class="chevron">→</span>
              </a>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }).join('');
}

// -------------------------------------------------------------
// SEARCH FUNCTIONALITY
// -------------------------------------------------------------
function handleKbSearch(query) {
  const cleanQ = query.trim().toLowerCase();
  const resultsContainer = document.getElementById('kbSearchResultsContainer');
  const homeContent = document.getElementById('kbHomeContent');
  const clearBtn = document.getElementById('kbSearchClearBtn');

  if (clearBtn) clearBtn.style.display = cleanQ ? 'block' : 'none';

  if (!cleanQ) {
    if (resultsContainer) resultsContainer.style.display = 'none';
    if (homeContent) homeContent.style.display = 'block';
    return;
  }

  if (homeContent) homeContent.style.display = 'none';
  if (resultsContainer) resultsContainer.style.display = 'block';

  // Search through articles
  const matched = window.KB_ARTICLES.filter(art => {
    const titleMatch = art.title.toLowerCase().includes(cleanQ);
    const summaryMatch = art.summary.toLowerCase().includes(cleanQ);
    const finishMatch = art.finishWith.toLowerCase().includes(cleanQ);
    const aliasMatch = (art.searchAliases || []).some(alias => alias.toLowerCase().includes(cleanQ) || cleanQ.includes(alias.toLowerCase()));
    const stepMatch = (art.steps || []).some(s => s.title.toLowerCase().includes(cleanQ) || s.text.toLowerCase().includes(cleanQ));
    return titleMatch || summaryMatch || finishMatch || aliasMatch || stepMatch;
  });

  if (matched.length > 0) {
    resultsContainer.innerHTML = `
      <div style="font-size:13px; font-weight:700; color:#666; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:14px;">
        ${matched.length} ${matched.length === 1 ? 'guide found' : 'guides found'} for “${escapeHtml(query)}”
      </div>
      <div style="display:flex; flex-direction:column; gap:12px;">
        ${matched.map(art => {
          const cat = findCategory(art.categoryId);
          return `
            <div style="background:#FFFFFF; border:1px solid rgba(22,24,23,0.1); border-radius:14px; padding:18px 20px; cursor:pointer; transition:border-color 0.15s, transform 0.15s;" onclick="openArticle('${art.slug}')" onmouseover="this.style.borderColor='#161817'" onmouseout="this.style.borderColor='rgba(22,24,23,0.1)'">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="font-size:11.5px; font-weight:700; color:#285731; background:#EDFCD4; padding:2px 8px; border-radius:999px;">${cat ? cat.title : 'Guide'}</span>
                <span style="font-size:12px; color:#888;">${art.readTime}</span>
              </div>
              <h3 style="font-size:17px; font-weight:700; color:#161817; margin:0 0 6px 0;">${escapeHtml(art.title)}</h3>
              <p style="font-size:13.5px; color:#555; margin:0; line-height:1.45;">${escapeHtml(art.summary)}</p>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else {
    resultsContainer.innerHTML = `
      <div style="text-align:center; padding:48px 24px; background:#FFFFFF; border-radius:20px; border:1px solid rgba(22,24,23,0.08);">
        <div style="font-size:36px; margin-bottom:12px;">🔍</div>
        <h3 style="font-size:20px; font-weight:700; color:#161817; margin-bottom:8px;">No guides found for “${escapeHtml(query)}”</h3>
        <p style="font-size:14px; color:#666; max-width:480px; margin:0 auto 20px auto; line-height:1.5;">
          We couldn't find an exact article match. Try searching for common merchant actions like <strong>“secret key”</strong>, <strong>“move a client”</strong>, <strong>“walk in”</strong>, or <strong>“publishing”</strong>.
        </p>
        <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
          <button class="btn btn-pill-ink" onclick="clearKbSearch()" style="font-size:13px; padding:8px 18px;">Browse all categories</button>
          <a href="https://wa.me/2348123843076?text=Hi%20Vela%20team,%20I%20need%20help%20with%20" target="_blank" rel="noopener" class="btn btn-pill-lime" style="font-size:13px; padding:8px 18px; text-decoration:none;">
            Chat on WhatsApp concierge
          </a>
        </div>
      </div>
    `;
  }
}

function clearKbSearch() {
  const input = document.getElementById('kbSearchInput');
  if (input) input.value = '';
  handleKbSearch('');
}

// -------------------------------------------------------------
// RENDER ARTICLE READER
// -------------------------------------------------------------
function openArticle(slug) {
  const article = findArticle(slug);
  if (!article) return;

  const cat = findCategory(article.categoryId);
  const targetUrl = `/knowledge-base/${cat ? cat.id : 'general'}/${article.slug}`;
  window.history.pushState(null, '', targetUrl);
  renderArticleView(slug, false);
}

function renderArticleView(slug, pushHistory = true) {
  const article = findArticle(slug);
  if (!article) return renderHomeView();

  const cat = findCategory(article.categoryId) || { title: 'Help Centre', id: 'general' };
  document.title = `${article.title} · Vela Knowledge Base`;

  const homeView = document.getElementById('kbHomeView');
  const readerView = document.getElementById('kbReaderView');
  if (homeView) homeView.style.display = 'none';
  if (readerView) readerView.style.display = 'block';

  window.scrollTo({ top: 0, behavior: 'smooth' });

  const articleBody = document.getElementById('kbArticleBody');
  const tocList = document.getElementById('kbTocList');

  // Breadcrumbs
  const breadcrumbHtml = `
    <nav class="kb-breadcrumbs" aria-label="Breadcrumb">
      <a href="/knowledge-base" onclick="event.preventDefault(); renderHomeView();">Knowledge Base</a>
      <span>/</span>
      <a href="/knowledge-base#topic-card-${cat.id}" onclick="event.preventDefault(); renderHomeView();">${escapeHtml(cat.title)}</a>
      <span>/</span>
      <span>${escapeHtml(article.title)}</span>
    </nav>
  `;

  // Action Buttons (Copy link + In-app contextual launch)
  const canonicalUrl = `${window.location.origin}/knowledge-base/${cat.id}/${article.slug}`;
  const inAppBtnHtml = article.inAppAction ? `
    <a href="${article.inAppAction.url}" class="kb-btn-action kb-btn-primary" title="Jump straight into the feature in Vela">
      <span>${escapeHtml(article.inAppAction.label)}</span>
    </a>
  ` : '';

  const copyBtnHtml = `
    <button type="button" class="kb-btn-action kb-btn-secondary" id="copyArticleLinkBtn" onclick="copyArticleLink('${canonicalUrl}', this)">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
      <span>Copy article link</span>
    </button>
  `;

  // Prerequisites
  const prereqsHtml = (article.prerequisites && article.prerequisites.length > 0) ? `
    <section class="kb-prereq-card" id="before-you-start">
      <div class="kb-prereq-title">Before you start</div>
      <ul class="kb-prereq-list">
        ${article.prerequisites.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
      </ul>
    </section>
  ` : '';

  // Numbered Steps with Screenshots
  const stepsHtml = (article.steps || []).map(step => `
    <section class="kb-step-item" id="step-${step.num}">
      <div class="kb-step-header">
        <span class="kb-step-num">${step.num}</span>
        <span>${escapeHtml(step.title)}</span>
      </div>
      <div class="kb-step-text">${step.text}</div>
      ${step.screenshot ? `
        <div class="kb-screenshot-wrap">
          <img src="${step.screenshot}" alt="${escapeHtml(step.alt || step.title)}" loading="lazy" onclick="openLightbox('${step.screenshot}')">
          <div class="kb-screenshot-caption">
            <span>${escapeHtml(step.caption || step.title)}</span>
            <span class="kb-zoom-hint">🔍 Tap to expand</span>
          </div>
        </div>
      ` : ''}
    </section>
  `).join('');

  // How to check it worked
  const checkWorkedHtml = article.checkWorked ? `
    <section class="kb-check-card" id="how-to-check">
      <div class="kb-check-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        <span>How to check it worked</span>
      </div>
      <div class="kb-check-text">${article.checkWorked}</div>
    </section>
  ` : '';

  // Troubleshooting (If it didn't work)
  const troubleHtml = (article.troubleshooting && article.troubleshooting.length > 0) ? `
    <section class="kb-trouble-card" id="troubleshooting">
      <div class="kb-trouble-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <span>If it didn't work</span>
      </div>
      <div>
        ${article.troubleshooting.map(t => `
          <div class="kb-trouble-item">
            <strong>Symptom:</strong> ${escapeHtml(t.symptom)}<br>
            <strong>Likely cause:</strong> ${escapeHtml(t.cause)}<br>
            <strong>Next action:</strong> ${escapeHtml(t.action)}
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  // Related Guides
  const relatedArticles = (article.relatedSlugs || []).map(s => findArticle(s)).filter(Boolean);
  const relatedHtml = relatedArticles.length > 0 ? `
    <section class="kb-related-card" id="related-guides">
      <div class="kb-related-title">Related guides</div>
      <div class="kb-related-grid">
        ${relatedArticles.map(rel => `
          <a href="/knowledge-base/${rel.categoryId}/${rel.slug}" class="kb-related-item" onclick="event.preventDefault(); openArticle('${rel.slug}');">
            <div>${escapeHtml(rel.title)}</div>
            <div style="font-size:11.5px; color:#666; margin-top:3px; font-weight:400;">${rel.readTime}</div>
          </a>
        `).join('')}
      </div>
    </section>
  ` : '';

  // Build Article DOM
  articleBody.innerHTML = `
    ${breadcrumbHtml}

    <header class="kb-article-header">
      <div class="kb-article-meta">
        <span class="kb-header-badge" style="margin:0;">${escapeHtml(cat.title)}</span>
        <span style="font-size:12.5px; color:#666;">•</span>
        <span style="font-size:12.5px; color:#666;">⏱ ${article.readTime}</span>
        <span style="font-size:12.5px; color:#666;">•</span>
        <span style="font-size:12.5px; color:#15803d; font-weight:600;">✓ Verified ${article.verifiedDate}</span>
      </div>

      <h1 class="kb-article-title">${escapeHtml(article.title)}</h1>

      <div class="kb-article-finish">
        <strong>What you'll finish with:</strong> ${escapeHtml(article.finishWith)}
      </div>

      <div class="kb-actions-bar">
        ${inAppBtnHtml}
        ${copyBtnHtml}
      </div>
    </header>

    ${prereqsHtml}
    ${stepsHtml}
    ${checkWorkedHtml}
    ${troubleHtml}
    ${relatedHtml}

    <div style="margin-top:40px; padding:24px; background:#FAF9F5; border:1px solid rgba(22,24,23,0.08); border-radius:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
      <div>
        <div style="font-size:14px; font-weight:700; color:#161817;">Need further assistance?</div>
        <div style="font-size:12.5px; color:#666; margin-top:2px;">Our Lagos-based merchant support concierge is available via WhatsApp.</div>
      </div>
      <a href="https://wa.me/2348123843076?text=Hi%20Vela%20support,%20I'm%20reading%20the%20guide%20${encodeURIComponent(article.title)}" target="_blank" rel="noopener" class="btn btn-pill-lime" style="text-decoration:none; font-size:12.5px; padding:8px 18px;">
        Chat with Concierge →
      </a>
    </div>
  `;

  // Build Table of Contents
  if (tocList) {
    let tocItems = [];
    if (article.prerequisites && article.prerequisites.length > 0) {
      tocItems.push({ id: 'before-you-start', label: 'Before you start' });
    }
    (article.steps || []).forEach(s => {
      tocItems.push({ id: `step-${s.num}`, label: `${s.num}. ${s.title}` });
    });
    if (article.checkWorked) {
      tocItems.push({ id: 'how-to-check', label: 'How to check it worked' });
    }
    if (article.troubleshooting && article.troubleshooting.length > 0) {
      tocItems.push({ id: 'troubleshooting', label: 'If it didn’t work' });
    }
    if (relatedArticles.length > 0) {
      tocItems.push({ id: 'related-guides', label: 'Related guides' });
    }

    tocList.innerHTML = tocItems.map(item => `
      <li>
        <a href="#${item.id}" class="kb-toc-link" onclick="scrollToSection('${item.id}'); return false;">
          ${escapeHtml(item.label)}
        </a>
      </li>
    `).join('');
  }
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function copyArticleLink(url, btn) {
  navigator.clipboard.writeText(url).then(() => {
    const origHtml = btn.innerHTML;
    btn.innerHTML = `<span style="color:#15803d; font-weight:700;">✓ Link copied!</span>`;
    setTimeout(() => {
      btn.innerHTML = origHtml;
    }, 2000);
  }).catch(() => {
    alert(`Article URL: ${url}`);
  });
}

// Lightbox for full-size inspection
function openLightbox(src) {
  const lb = document.getElementById('kbLightbox');
  const img = document.getElementById('kbLightboxImg');
  if (lb && img) {
    img.src = src;
    lb.style.display = 'flex';
  }
}

function closeLightbox() {
  const lb = document.getElementById('kbLightbox');
  if (lb) lb.style.display = 'none';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
