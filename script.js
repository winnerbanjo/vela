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

  // --- Dynamic Rotating Word in Hero ---
  function initRotatingWord() {
    const wordEl = document.getElementById('hero-rotating-word');
    if (!wordEl) return;

    const words = ['website', 'store', 'booking page', 'one link'];
    let index = 0;

    setInterval(() => {
      wordEl.classList.add('fade-out');
      setTimeout(() => {
        index = (index + 1) % words.length;
        wordEl.textContent = words[index];
        wordEl.classList.remove('fade-out');
        wordEl.classList.add('fade-in');
        setTimeout(() => {
          wordEl.classList.remove('fade-in');
        }, 220);
      }, 220);
    }, 2600);
  }

  // --- Day with Vela Stepper & Simulations ---
  function initDayStepper() {
    const momentBtns = document.querySelectorAll('.day-moment-btn');
    const momentViews = document.querySelectorAll('.day-moment-view');

    momentBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        const momentNum = this.getAttribute('data-moment');

        // Update tabs
        momentBtns.forEach(b => {
          b.classList.remove('is-active');
          b.setAttribute('aria-selected', 'false');
        });
        this.classList.add('is-active');
        this.setAttribute('aria-selected', 'true');

        // Switch views
        momentViews.forEach(v => {
          v.classList.remove('is-active');
          v.hidden = true;
        });

        const targetView = document.getElementById('view-moment-' + momentNum);
        if (targetView) {
          targetView.hidden = false;
          targetView.classList.add('is-active');
        }

        trackEvent('day_moment_switched', { moment: momentNum });
      });
    });

    // 9:00 AM Confirm Attendance Simulation
    const btnConfirm = document.getElementById('btn-confirm-reminder');
    const feedbackConfirm = document.getElementById('reminder-feedback');
    const labelConfirm = document.getElementById('confirm-reminder-label');
    if (btnConfirm) {
      btnConfirm.addEventListener('click', () => {
        if (labelConfirm) labelConfirm.textContent = '✓ Confirmed';
        btnConfirm.classList.add('btn-pill-lime');
        if (feedbackConfirm) feedbackConfirm.hidden = false;
        trackEvent('sim_attendance_confirmed', {});
      });
    }

    // 12:30 PM Time Slot Chip Selection
    const slotChips = document.querySelectorAll('.sim-chip-btn');
    slotChips.forEach(chip => {
      chip.addEventListener('click', function () {
        slotChips.forEach(c => c.classList.remove('is-selected'));
        this.classList.add('is-selected');
        const slot = this.getAttribute('data-slot');
        trackEvent('sim_slot_selected', { slot });
      });
    });

    // 12:30 PM Pay Deposit Simulation
    const btnDeposit = document.getElementById('btn-simulate-booking');
    const textDeposit = document.getElementById('simulate-booking-text');
    const syncDeposit = document.getElementById('booking-calendar-sync');
    if (btnDeposit) {
      btnDeposit.addEventListener('click', () => {
        if (textDeposit) textDeposit.textContent = '✓ Paystack Deposit Paid';
        btnDeposit.style.backgroundColor = '#15803d';
        btnDeposit.style.color = '#FFFFFF';
        if (syncDeposit) syncDeposit.hidden = false;
        trackEvent('sim_deposit_paid', {});
      });
    }

    // 4:00 PM Approve Outreach Simulation
    const btnApprove = document.getElementById('btn-approve-outreach');
    const labelApprove = document.getElementById('approve-outreach-label');
    const outcomeApprove = document.getElementById('campaign-outcome-box');
    if (btnApprove) {
      btnApprove.addEventListener('click', () => {
        if (labelApprove) labelApprove.textContent = '✓ Approved & Sent';
        btnApprove.style.backgroundColor = '#15803d';
        btnApprove.style.color = '#FFFFFF';
        if (outcomeApprove) outcomeApprove.hidden = false;
        trackEvent('sim_campaign_approved', {});
      });
    }
  }

  // --- Document Ready ---
  document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initFaqAccordion();
    initRotatingWord();
    initDayStepper();
  });
})();




