/**
 * Vela AI Interactive Engine (Design & Engineering Handoff)
 * Clean, lightweight, and accessible navigation & accordion controls
 */

(function () {
  'use strict';

  // --- Accessibility Announcer ---
  const srRegion = document.getElementById('sr-announcements');
  function announce(message) {
    if (srRegion) {
      srRegion.textContent = '';
      setTimeout(() => {
        srRegion.textContent = message;
      }, 50);
    }
  }

  // --- Analytics Event Logger ---
  function trackEvent(name, details) {
    const payload = {
      event: name,
      timestamp: new Date().toISOString(),
      ...details
    };
    try {
      window.dispatchEvent(new CustomEvent('vela_analytics', { detail: payload }));
      if (window.dataLayer && Array.isArray(window.dataLayer)) {
        window.dataLayer.push(payload);
      }
    } catch (e) {
      // safe fallback
    }
  }

  // --- Navigation & Mobile Menu ---
  function initNavigation() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuClose = document.querySelector('.mobile-menu-close');
    const mobileMenuBackdrop = document.querySelector('.mobile-menu-backdrop');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link, .mobile-signup-btn');

    function openMobileMenu() {
      if (!mobileMenu) return;
      mobileMenu.classList.add('open');
      mobileMenu.setAttribute('aria-hidden', 'false');
      if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      announce('Navigation menu opened');
      if (mobileMenuClose) mobileMenuClose.focus();
    }

    function closeMobileMenu() {
      if (!mobileMenu) return;
      mobileMenu.classList.remove('open');
      mobileMenu.setAttribute('aria-hidden', 'true');
      if (mobileMenuBtn) {
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        mobileMenuBtn.focus();
      }
      document.body.style.overflow = '';
      announce('Navigation menu closed');
    }

    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', () => {
        const isOpen = mobileMenu?.classList.contains('open');
        isOpen ? closeMobileMenu() : openMobileMenu();
      });
    }

    if (mobileMenuClose) mobileMenuClose.addEventListener('click', closeMobileMenu);
    if (mobileMenuBackdrop) mobileMenuBackdrop.addEventListener('click', closeMobileMenu);

    mobileNavLinks.forEach(link => {
      link.addEventListener('click', () => {
        closeMobileMenu();
      });
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && mobileMenu?.classList.contains('open')) {
        closeMobileMenu();
      }
    });

    // Smooth Scroll for in-page anchors
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId && targetId !== '#') {
          const target = document.querySelector(targetId);
          if (target) {
            e.preventDefault();
            const headerOffset = 70;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });

            target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
          }
        }
      });
    });

    // CTA Tracking
    document.querySelectorAll('.track-cta').forEach(cta => {
      cta.addEventListener('click', function () {
        const placement = this.getAttribute('data-cta-placement') || 'general';
        const label = this.textContent.trim();
        trackEvent('cta_clicked', { placement, label });
      });
    });
  }

  // --- FAQs Accordion ---
  function initFaqAccordion() {
    const accordionTriggers = document.querySelectorAll('.accordion-trigger');
    accordionTriggers.forEach(trigger => {
      trigger.addEventListener('click', function () {
        const isExpanded = this.getAttribute('aria-expanded') === 'true';
        const panelId = this.getAttribute('aria-controls');
        const panel = document.getElementById(panelId);

        // Close other panels
        accordionTriggers.forEach(otherTrigger => {
          if (otherTrigger !== trigger) {
            otherTrigger.setAttribute('aria-expanded', 'false');
            const otherPanelId = otherTrigger.getAttribute('aria-controls');
            const otherPanel = document.getElementById(otherPanelId);
            if (otherPanel) otherPanel.hidden = true;
          }
        });

        // Toggle current panel
        this.setAttribute('aria-expanded', !isExpanded);
        if (panel) {
          panel.hidden = isExpanded;
        }

        const questionText = this.querySelector('.faq-question')?.textContent.trim();
        trackEvent('faq_toggled', { question: questionText, expanded: !isExpanded });
      });
    });
  }

  // --- Document Ready ---
  document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initFaqAccordion();
  });
})();



