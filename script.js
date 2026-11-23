/**
 * Vela AI Interactive Engine (Version 2 · 23 November 2026)
 * Conforms to Vela AI Product Requirements
 */

(function () {
  'use strict';

  // --- State Management ---
  const state = {
    currentTask: 'fill_openings', // 'fill_openings' | 'send_reminders' | 'update_website'
    // Fill openings task state
    subjectLine: 'Two braids appointments this Saturday',
    isEmailApproved: false,
    selectedClientTime: null,
    isClientBooked: false,
    openSlotsCount: 2,
    bookedSlots: {
      '12:00 PM': false,
      '2:00 PM': false
    },
    // Reminders task state
    isReminderSent: false,
    // Website task state
    isServicePublished: false
  };

  // --- DOM Elements Cache ---
  const dom = {
    srAnnouncements: document.getElementById('sr-announcements'),
    tryAgentHeroBtn: document.getElementById('try-agent-hero-btn'),
    agentDemoHeading: document.getElementById('agent-demo-heading'),

    // Task Tabs
    taskTabs: document.querySelectorAll('.task-tab-btn'),
    taskViews: {
      fill_openings: document.getElementById('task-view-fill-openings'),
      send_reminders: document.getElementById('task-view-send-reminders'),
      update_website: document.getElementById('task-view-update-website')
    },
    simViews: {
      fill_openings: document.getElementById('sim-view-fill-openings'),
      send_reminders: document.getElementById('sim-view-send-reminders'),
      update_website: document.getElementById('sim-view-update-website')
    },

    // Task 1: Fill Openings Elements
    subjectInput: document.getElementById('email-subject-input'),
    emailSubjectPreview: document.getElementById('email-subject-preview'),
    btnApproveEmail: document.getElementById('btn-approve-email'),
    btnDiscardEmail: document.getElementById('btn-discard-email'),
    emailDraftCard: document.getElementById('email-draft-card'),
    sendCompleteBanner: document.getElementById('send-complete-banner'),
    simSlotBtns: document.querySelectorAll('.sim-slot-btn'),
    simSlotsRemainingCount: document.getElementById('sim-slots-remaining-count'),
    btnConfirmSimBooking: document.getElementById('btn-confirm-sim-booking'),
    simMathCard: document.getElementById('sim-math-card'),
    simMathSelectedTime: document.getElementById('sim-math-selected-time'),
    outcomeSummaryCard: document.getElementById('outcome-summary-card'),
    btnResetDemo: document.getElementById('btn-reset-demo'),

    // Task 2: Reminders Elements
    btnSendReminders: document.getElementById('btn-send-reminders'),
    reminderCompleteBanner: document.getElementById('reminder-complete-banner'),
    reminderPreviewBox: document.getElementById('reminder-preview-box'),

    // Task 3: Website Elements
    btnPublishService: document.getElementById('btn-publish-service'),
    publishCompleteBanner: document.getElementById('publish-complete-banner'),
    newServiceSimCard: document.getElementById('new-service-sim-card'),

    // Mobile Menu
    mobileMenuBtn: document.querySelector('.mobile-menu-btn'),
    mobileMenu: document.getElementById('mobile-menu'),
    mobileMenuClose: document.querySelector('.mobile-menu-close'),
    mobileMenuBackdrop: document.querySelector('.mobile-menu-backdrop'),
    mobileNavLinks: document.querySelectorAll('.mobile-nav-link, .mobile-signup-btn'),

    // Accordions
    accordionTriggers: document.querySelectorAll('.accordion-trigger')
  };

  // --- Accessibility Announcer ---
  function announce(message) {
    if (dom.srAnnouncements) {
      dom.srAnnouncements.textContent = '';
      setTimeout(() => {
        dom.srAnnouncements.textContent = message;
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

  // --- Task Switching Logic ---
  function switchTask(taskId) {
    state.currentTask = taskId;

    // Update Tab Styles
    dom.taskTabs.forEach(tab => {
      const isTarget = tab.getAttribute('data-task') === taskId;
      tab.classList.toggle('active', isTarget);
      tab.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    // Update Left Column Views
    Object.keys(dom.taskViews).forEach(key => {
      if (dom.taskViews[key]) {
        dom.taskViews[key].style.display = key === taskId ? 'block' : 'none';
      }
    });

    // Update Right Column Simulator Views
    Object.keys(dom.simViews).forEach(key => {
      if (dom.simViews[key]) {
        dom.simViews[key].style.display = key === taskId ? 'block' : 'none';
      }
    });

    announce(`Switched to task: ${taskId.replace('_', ' ')}`);
    trackEvent('agent_task_selected', { taskId });
  }

  // --- Task 1: Fill Openings Handlers ---
  function initFillOpenings() {
    // Subject line real-time sync
    if (dom.subjectInput) {
      dom.subjectInput.addEventListener('input', e => {
        state.subjectLine = e.target.value;
        if (dom.emailSubjectPreview) {
          dom.emailSubjectPreview.textContent = e.target.value;
        }
        trackEvent('draft_reviewed', { field: 'subject', value: state.subjectLine });
      });
    }

    // Approve Sample Email
    if (dom.btnApproveEmail) {
      dom.btnApproveEmail.addEventListener('click', () => {
        state.isEmailApproved = true;
        if (dom.emailDraftCard) dom.emailDraftCard.style.opacity = '0.6';
        if (dom.btnApproveEmail) dom.btnApproveEmail.style.display = 'none';
        if (dom.btnDiscardEmail) dom.btnDiscardEmail.style.display = 'none';
        if (dom.sendCompleteBanner) dom.sendCompleteBanner.classList.add('visible');

        announce('Sample send complete. 8 recipients notified. View client booking page.');
        trackEvent('sample_task_completed', { task: 'fill_openings', action: 'email_approved' });
      });
    }

    // Discard Button
    if (dom.btnDiscardEmail) {
      dom.btnDiscardEmail.addEventListener('click', () => {
        resetFillOpenings();
        announce('Draft discarded. Ready for instruction.');
      });
    }

    // Client Simulator Slot Selection
    dom.simSlotBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const time = btn.getAttribute('data-time');
        if (state.bookedSlots[time]) return; // already booked

        state.selectedClientTime = time;

        // Update button active state
        dom.simSlotBtns.forEach(b => {
          const bTime = b.getAttribute('data-time');
          if (!state.bookedSlots[bTime]) {
            b.classList.toggle('selected', bTime === time);
          }
        });

        // Update math breakdown
        if (dom.simMathSelectedTime) {
          dom.simMathSelectedTime.textContent = time;
        }
        if (dom.btnConfirmSimBooking && !state.isClientBooked) {
          dom.btnConfirmSimBooking.disabled = false;
          dom.btnConfirmSimBooking.textContent = `Confirm booking for ${time} →`;
        }

        announce(`Selected appointment time: ${time}`);
      });
    });

    // Confirm Sample Booking
    if (dom.btnConfirmSimBooking) {
      dom.btnConfirmSimBooking.addEventListener('click', () => {
        if (!state.selectedClientTime || state.isClientBooked) return;

        state.isClientBooked = true;
        state.bookedSlots[state.selectedClientTime] = true;
        state.openSlotsCount = Math.max(0, state.openSlotsCount - 1);

        // Mark slot as booked in UI
        dom.simSlotBtns.forEach(btn => {
          const time = btn.getAttribute('data-time');
          if (time === state.selectedClientTime) {
            btn.classList.remove('selected');
            btn.classList.add('disabled');
            const statusSpan = btn.querySelector('.slot-status');
            if (statusSpan) statusSpan.textContent = 'Booked';
          }
        });

        // Update remaining slots text
        if (dom.simSlotsRemainingCount) {
          dom.simSlotsRemainingCount.textContent = `${state.openSlotsCount} opening remaining`;
        }

        // Disable confirm button to prevent repeated inflating
        dom.btnConfirmSimBooking.disabled = true;
        dom.btnConfirmSimBooking.textContent = '✓ Booking Confirmed';

        // Show outcome card
        if (dom.outcomeSummaryCard) {
          dom.outcomeSummaryCard.classList.add('visible');
        }

        announce('1 booking confirmed from sample email. ₦5,000 sample deposit collected.');
        trackEvent('sample_task_completed', { task: 'fill_openings', action: 'client_booking_confirmed' });
      });
    }

    // Reset Demo Button
    if (dom.btnResetDemo) {
      dom.btnResetDemo.addEventListener('click', () => {
        resetFillOpenings();
        announce('Interactive demo reset.');
      });
    }
  }

  function resetFillOpenings() {
    state.isEmailApproved = false;
    state.selectedClientTime = null;
    state.isClientBooked = false;
    state.openSlotsCount = 2;
    state.bookedSlots['12:00 PM'] = false;
    state.bookedSlots['2:00 PM'] = false;

    if (dom.subjectInput) {
      dom.subjectInput.value = 'Two braids appointments this Saturday';
    }
    if (dom.emailSubjectPreview) {
      dom.emailSubjectPreview.textContent = 'Two braids appointments this Saturday';
    }
    if (dom.emailDraftCard) {
      dom.emailDraftCard.style.opacity = '1';
    }
    if (dom.btnApproveEmail) {
      dom.btnApproveEmail.style.display = 'inline-flex';
    }
    if (dom.btnDiscardEmail) {
      dom.btnDiscardEmail.style.display = 'inline-flex';
    }
    if (dom.sendCompleteBanner) {
      dom.sendCompleteBanner.classList.remove('visible');
    }
    if (dom.outcomeSummaryCard) {
      dom.outcomeSummaryCard.classList.remove('visible');
    }
    if (dom.simSlotsRemainingCount) {
      dom.simSlotsRemainingCount.textContent = '2 openings available';
    }
    if (dom.btnConfirmSimBooking) {
      dom.btnConfirmSimBooking.disabled = true;
      dom.btnConfirmSimBooking.textContent = 'Select a time above to book';
    }
    if (dom.simMathSelectedTime) {
      dom.simMathSelectedTime.textContent = 'Select time above';
    }

    dom.simSlotBtns.forEach(btn => {
      btn.classList.remove('selected', 'disabled');
      const statusSpan = btn.querySelector('.slot-status');
      if (statusSpan) statusSpan.textContent = 'Available';
    });
  }

  // --- Task 2: Reminders Handlers ---
  function initReminders() {
    if (dom.btnSendReminders) {
      dom.btnSendReminders.addEventListener('click', () => {
        state.isReminderSent = true;
        if (dom.reminderCompleteBanner) {
          dom.reminderCompleteBanner.classList.add('visible');
        }
        if (dom.btnSendReminders) {
          dom.btnSendReminders.disabled = true;
          dom.btnSendReminders.textContent = '✓ 2 Simulated Sends Complete';
        }
        announce('Appointment reminders simulated successfully. 2 clients notified.');
        trackEvent('sample_task_completed', { task: 'send_reminders' });
      });
    }
  }

  // --- Task 3: Website Handlers ---
  function initWebsiteUpdate() {
    if (dom.btnPublishService) {
      dom.btnPublishService.addEventListener('click', () => {
        state.isServicePublished = true;
        if (dom.publishCompleteBanner) {
          dom.publishCompleteBanner.classList.add('visible');
        }
        if (dom.newServiceSimCard) {
          dom.newServiceSimCard.style.display = 'block';
        }
        if (dom.btnPublishService) {
          dom.btnPublishService.disabled = true;
          dom.btnPublishService.textContent = '✓ Service Published to Website';
        }
        announce('New service published to your sample website.');
        trackEvent('sample_task_completed', { task: 'update_website' });
      });
    }
  }

  // --- Navigation & Accordion Setup ---
  function initNavigation() {
    // Hero "Try the agent" button
    if (dom.tryAgentHeroBtn) {
      dom.tryAgentHeroBtn.addEventListener('click', e => {
        e.preventDefault();
        const demoSection = document.getElementById('agent-demo');
        if (demoSection) {
          demoSection.scrollIntoView({ behavior: 'smooth' });
          if (dom.agentDemoHeading) {
            dom.agentDemoHeading.setAttribute('tabindex', '-1');
            dom.agentDemoHeading.focus();
          }
        }
      });
    }

    // Task Tab Switchers
    dom.taskTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const taskId = tab.getAttribute('data-task');
        if (taskId) switchTask(taskId);
      });
    });

    // Mobile Menu Drawer
    if (dom.mobileMenuBtn && dom.mobileMenu) {
      const toggleMenu = isOpen => {
        dom.mobileMenu.classList.toggle('open', isOpen);
        dom.mobileMenuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        dom.mobileMenu.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        document.body.style.overflow = isOpen ? 'hidden' : '';
      };

      dom.mobileMenuBtn.addEventListener('click', () => {
        const isOpen = dom.mobileMenu.classList.contains('open');
        toggleMenu(!isOpen);
      });

      if (dom.mobileMenuClose) {
        dom.mobileMenuClose.addEventListener('click', () => toggleMenu(false));
      }

      if (dom.mobileMenuBackdrop) {
        dom.mobileMenuBackdrop.addEventListener('click', () => toggleMenu(false));
      }

      dom.mobileNavLinks.forEach(link => {
        link.addEventListener('click', () => toggleMenu(false));
      });
    }

    // FAQ Accordion
    dom.accordionTriggers.forEach(trigger => {
      trigger.addEventListener('click', () => {
        const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
        const panelId = trigger.getAttribute('aria-controls');
        const panel = document.getElementById(panelId);

        // Close other panels
        dom.accordionTriggers.forEach(otherTrigger => {
          if (otherTrigger !== trigger) {
            otherTrigger.setAttribute('aria-expanded', 'false');
            const otherPanelId = otherTrigger.getAttribute('aria-controls');
            const otherPanel = document.getElementById(otherPanelId);
            if (otherPanel) otherPanel.hidden = true;
          }
        });

        // Toggle current panel
        trigger.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
        if (panel) panel.hidden = isExpanded;
      });
    });
  }

  // --- Rotating Headline Words ---
  function initHeadlineRotator() {
    const rotatingEl = document.getElementById('rotating-word');
    if (!rotatingEl) return;

    const words = ['link', 'website', 'page', 'store', 'calendar'];
    let currentIndex = 0;

    setInterval(() => {
      rotatingEl.classList.add('fade-out');
      setTimeout(() => {
        currentIndex = (currentIndex + 1) % words.length;
        rotatingEl.textContent = words[currentIndex];
        rotatingEl.classList.remove('fade-out');
        rotatingEl.classList.add('fade-in');
        setTimeout(() => {
          rotatingEl.classList.remove('fade-in');
        }, 200);
      }, 200);
    }, 2600);
  }

  // --- A Day with Vela Interactivity ---
  function initDayInteractions() {
    const momentBtns = document.querySelectorAll('.day-moment-btn');
    const timelineEntries = document.querySelectorAll('.timeline-entry');

    function setActiveMoment(momentNum) {
      momentBtns.forEach(btn => {
        const isActive = btn.getAttribute('data-moment') === String(momentNum);
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      timelineEntries.forEach(entry => {
        const isActive = entry.getAttribute('data-moment') === String(momentNum);
        entry.classList.toggle('is-active', isActive);
      });
    }

    momentBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const momentNum = btn.getAttribute('data-moment');
        setActiveMoment(momentNum);
        const targetEntry = document.getElementById(`timeline-moment-${momentNum}`);
        if (targetEntry && window.innerWidth <= 1024) {
          targetEntry.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    });

    timelineEntries.forEach(entry => {
      entry.addEventListener('click', (e) => {
        if (e.target.closest('button, input, a')) return;
        const momentNum = entry.getAttribute('data-moment');
        if (momentNum) setActiveMoment(momentNum);
      });
    });

    // Moment 1: Ada's Reminder
    const btnShowMap = document.getElementById('btn-show-map');
    const mapFeedback = document.getElementById('map-feedback');
    const btnConfirmReminder = document.getElementById('btn-confirm-reminder');
    const confirmReminderLabel = document.getElementById('confirm-reminder-label');
    const reminderFeedback = document.getElementById('reminder-feedback');

    if (btnShowMap && mapFeedback) {
      btnShowMap.addEventListener('click', () => {
        mapFeedback.hidden = !mapFeedback.hidden;
      });
    }

    if (btnConfirmReminder && confirmReminderLabel && reminderFeedback) {
      btnConfirmReminder.addEventListener('click', () => {
        const isConfirmed = btnConfirmReminder.classList.toggle('is-confirmed');
        confirmReminderLabel.textContent = isConfirmed ? 'Attendance Confirmed ✓' : 'Confirm Attendance';
        reminderFeedback.hidden = !isConfirmed;
      });
    }

    // Moment 2: Live Website Booking
    const simChips = document.querySelectorAll('.sim-chip-btn');
    const syncSlotTime = document.getElementById('sync-slot-time');
    const btnSimBooking = document.getElementById('btn-simulate-booking');
    const simBookingText = document.getElementById('simulate-booking-text');
    const bookingCalendarSync = document.getElementById('booking-calendar-sync');
    let selectedSlot = '3:30 PM';

    simChips.forEach(chip => {
      chip.addEventListener('click', () => {
        simChips.forEach(c => c.classList.remove('is-selected'));
        chip.classList.add('is-selected');
        selectedSlot = chip.getAttribute('data-slot') || '3:30 PM';
        if (syncSlotTime) syncSlotTime.textContent = selectedSlot;
      });
    });

    if (btnSimBooking && bookingCalendarSync && simBookingText) {
      btnSimBooking.addEventListener('click', () => {
        simBookingText.textContent = 'Processing Deposit via Paystack...';
        btnSimBooking.disabled = true;
        setTimeout(() => {
          simBookingText.textContent = 'Deposit Paid (₦10,000) ✓';
          btnSimBooking.style.background = '#161817';
          bookingCalendarSync.hidden = false;
        }, 350);
      });
    }

    // Moment 3: AI Email Outreach
    const btnApproveOutreach = document.getElementById('btn-approve-outreach');
    const approveOutreachLabel = document.getElementById('approve-outreach-label');
    const campaignOutcomeBox = document.getElementById('campaign-outcome-box');
    const btnResetDemo = document.getElementById('btn-reset-timeline-demo');

    if (btnApproveOutreach && approveOutreachLabel && campaignOutcomeBox) {
      btnApproveOutreach.addEventListener('click', () => {
        approveOutreachLabel.textContent = 'Sending emails...';
        btnApproveOutreach.disabled = true;
        setTimeout(() => {
          approveOutreachLabel.textContent = '✓ 8 Emails Sent to Clients';
          btnApproveOutreach.style.background = '#25D366';
          btnApproveOutreach.style.borderColor = '#25D366';
          btnApproveOutreach.style.color = '#FFFFFF';
          campaignOutcomeBox.hidden = false;
        }, 400);
      });
    }

    if (btnResetDemo) {
      btnResetDemo.addEventListener('click', () => {
        // Reset Moment 1
        if (btnConfirmReminder) {
          btnConfirmReminder.classList.remove('is-confirmed');
          if (confirmReminderLabel) confirmReminderLabel.textContent = 'Confirm Attendance';
        }
        if (reminderFeedback) reminderFeedback.hidden = true;
        if (mapFeedback) mapFeedback.hidden = true;

        // Reset Moment 2
        if (btnSimBooking && simBookingText) {
          btnSimBooking.disabled = false;
          btnSimBooking.style.background = '';
          simBookingText.textContent = 'Pay ₦10,000 Deposit & Book';
        }
        if (bookingCalendarSync) bookingCalendarSync.hidden = true;

        // Reset Moment 3
        if (btnApproveOutreach && approveOutreachLabel) {
          btnApproveOutreach.disabled = false;
          btnApproveOutreach.style.background = '';
          btnApproveOutreach.style.borderColor = '';
          btnApproveOutreach.style.color = '';
          approveOutreachLabel.textContent = 'Approve & Send to 8 Clients';
        }
        if (campaignOutcomeBox) campaignOutcomeBox.hidden = true;
      });
    }
  }

  // --- Document Ready ---
  document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initHeadlineRotator();
    initFillOpenings();
    initReminders();
    initWebsiteUpdate();
    initDayInteractions();
  });

})();
