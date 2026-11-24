// Vela Knowledge Base Database
// Authoritative guides authored against the running Vela application
// Contains verified steps, real screenshot references, troubleshooting points, and keyword aliases

window.KB_CATEGORIES = [
  {
    id: 'getting-started',
    title: 'Getting started',
    icon: '🚀',
    description: 'Set up the business, choose a trade, add staff and tell Vela what services to promote.'
  },
  {
    id: 'website-gallery',
    title: 'Website & gallery',
    icon: '🌐',
    description: 'Edit and publish a website, share a booking link and turn portfolio photos into bookable services.'
  },
  {
    id: 'bookings-clients',
    title: 'Bookings & clients',
    icon: '📅',
    description: 'Set availability, record a walk-in, reschedule a client and find their booking history.'
  },
  {
    id: 'agent-inbox',
    title: 'Agent & inbox',
    icon: '💬',
    description: 'Give Vela instructions, review a reply, approve a quotation or take over a conversation.'
  },
  {
    id: 'find-me-customers',
    title: 'Find me customers',
    icon: '🎯',
    description: 'Prepare a campaign, review its creative, share it and understand where bookings came from.'
  },
  {
    id: 'payments-quotations',
    title: 'Payments & quotations',
    icon: '💳',
    description: 'Set a deposit, send a quote, issue an invoice and check whether a customer has paid.'
  },
  {
    id: 'connected-apps',
    title: 'Connected apps',
    icon: '🔌',
    description: 'Connect accounts, enter credentials where required, configure webhooks and recover a failed connection.'
  }
];

window.KB_ARTICLES = [
  // -------------------------------------------------------------
  // GETTING STARTED
  // -------------------------------------------------------------
  {
    slug: 'set-up-vela-first-booking',
    categoryId: 'getting-started',
    title: 'Set up Vela and take your first booking',
    readTime: '4 min read',
    verifiedDate: 'November 2026',
    inAppAction: { label: 'Open Website Editor ↗', url: '/dashboard#website' },
    summary: 'A complete walk-through to configure your business, set opening hours, preview and publish your site, and confirm your first client appointment.',
    finishWith: 'Your service menu is online, your chairs and calendar are ready, and customers can book appointments directly through your custom link.',
    prerequisites: [
      'An active Vela merchant workspace (Barber, Salon, or Photography trade selected).',
      'At least one team member or stylist chair configured.',
      'A smartphone or desktop browser connected to the internet.'
    ],
    steps: [
      {
        num: 1,
        title: 'Review your business profile and services',
        text: 'From the dashboard sidebar, navigate to <strong>Website</strong>. Under the <strong>Business details</strong> tab, verify your trading name (e.g. Studio Teni), address, contact phone number, and operating hours.',
        screenshot: '/assets/knowledge-base/website-01-edit-business.png',
        caption: 'Verify your business details, location, and published contact channels in the Website editor.',
        alt: 'Vela website editor business details tab'
      },
      {
        num: 2,
        title: 'Add your services and pricing',
        text: 'In the services list, verify your core services. For example, a barber sets <strong>Signature Fade & Beard Sculpt</strong> at <strong>₦10,000</strong> with a <strong>₦2,000 deposit</strong> requirement, while a studio photographer lists <strong>Executive Leadership Headshots</strong> at <strong>₦85,000</strong>.',
        screenshot: null,
        caption: null,
        alt: null
      },
      {
        num: 3,
        title: 'Preview your live storefront on mobile',
        text: 'Select the <strong>Preview</strong> button in the top action bar. Inspect the mobile view to ensure your services, chair availability, and bio appear clean and easy to tap.',
        screenshot: '/assets/knowledge-base/website-02-preview-mobile.png',
        caption: 'Review your customer-facing mobile storefront before publishing your updates.',
        alt: 'Mobile preview modal showing Studio Teni storefront'
      },
      {
        num: 4,
        title: 'Publish changes to your live site',
        text: 'Select <strong>Publish changes</strong>. Vela pushes your draft updates instantly to your canonical domain (e.g. <code>https://studioteni.vela.ng</code>) with zero downtime.',
        screenshot: '/assets/knowledge-base/website-03-publish-changes.png',
        caption: 'Select Publish changes to push drafts live to your customer booking URL.',
        alt: 'Website editor with published confirmation'
      },
      {
        num: 5,
        title: 'Perform a test booking as a client',
        text: 'Open your public booking link in an incognito window or on your phone. Select a service (e.g. Signature Fade), pick an available chair (e.g. Dele, Chair 1), select a time slot (e.g. 4:15 PM), and enter client test details.',
        screenshot: '/assets/knowledge-base/start-here-storefront.png',
        caption: 'Your verified public storefront where clients select haircuts and reserve chairs.',
        alt: 'Public customer booking storefront'
      }
    ],
    checkWorked: 'Open <strong>Bookings</strong> in your dashboard. Your test appointment will appear on the calendar under the assigned staff member with the deposit status clearly marked.',
    troubleshooting: [
      {
        symptom: 'Changes do not appear on your public website',
        cause: 'You saved draft edits but have not tapped Publish changes.',
        action: 'Return to Website and tap Publish changes in the top hero bar.'
      },
      {
        symptom: 'Slots show as unavailable on the calendar',
        cause: 'Operating hours are not configured or staff member has an external Google Calendar conflict.',
        action: 'Check staff working hours in Settings and inspect Connected Apps → Google Calendar.'
      }
    ],
    relatedSlugs: ['edit-business-details', 'preview-publish-changes', 'connect-paystack'],
    searchAliases: ['start here', 'getting started', 'first booking', 'onboarding', 'set up business']
  },
  {
    slug: 'add-service-price',
    categoryId: 'getting-started',
    title: 'Add a service and price',
    readTime: '2 min read',
    verifiedDate: 'November 2026',
    inAppAction: { label: 'Open Website Services ↗', url: '/dashboard#website' },
    summary: 'Define service offerings, appointment durations, total price, and deposit requirements.',
    finishWith: 'A newly created service appears on your booking menu with custom pricing and deposit rules.',
    prerequisites: ['Business owner or administrator access in Vela.'],
    steps: [
      {
        num: 1,
        title: 'Open Website and select Services',
        text: 'From your merchant dashboard, select <strong>Website</strong> from the left navigation, then select the <strong>Services</strong> tab.',
        screenshot: '/assets/knowledge-base/website-01-edit-business.png',
        caption: 'The Website management area where services and business policies are maintained.',
        alt: 'Website editor view'
      },
      {
        num: 2,
        title: 'Select Add new service',
        text: 'Select <strong>+ Add service</strong>. Enter the service title (e.g. <em>Luxury Hot Towel Shave</em> or <em>Executive Headshot Session</em>), duration in minutes, and price in Nigerian Naira (₦).',
        screenshot: null,
        caption: null,
        alt: null
      },
      {
        num: 3,
        title: 'Set the deposit policy',
        text: 'Specify whether this service requires a booking deposit. For appointment protection, select <strong>Require deposit</strong> and set a fixed amount (e.g. ₦2,000) or percentage (e.g. 20%).',
        screenshot: null,
        caption: null,
        alt: null
      },
      {
        num: 4,
        title: 'Publish changes to live booking menu',
        text: 'Select <strong>Save service</strong>, then tap <strong>Publish changes</strong> in the top hero header to update your live customer booking link.',
        screenshot: '/assets/knowledge-base/website-03-publish-changes.png',
        caption: 'Publishing activates the new service on your public website immediately.',
        alt: 'Publish changes confirmation'
      }
    ],
    checkWorked: 'Visit your live storefront URL (e.g. <code>https://studioteni.vela.ng</code>) and confirm the newly added service appears with its price and deposit badge.',
    troubleshooting: [
      {
        symptom: 'Service appears in dashboard but not on public booking page',
        cause: 'Unpublished draft state pending.',
        action: 'Tap Publish changes in the top hero notice bar.'
      }
    ],
    relatedSlugs: ['set-up-vela-first-booking', 'choose-deposit-amount', 'upload-gallery-image'],
    searchAliases: ['add service', 'pricing', 'create haircut', 'haircut cost', 'deposit rate']
  },

  // -------------------------------------------------------------
  // WEBSITE & GALLERY
  // -------------------------------------------------------------
  {
    slug: 'edit-business-details',
    categoryId: 'website-gallery',
    title: 'Edit your business details',
    readTime: '3 min read',
    verifiedDate: 'November 2026',
    inAppAction: { label: 'Open Website Details ↗', url: '/dashboard#website' },
    summary: 'Update studio address, bio, opening hours, and phone number across your public site.',
    finishWith: 'Your studio address, bio, opening hours, and phone number are updated across your public website.',
    prerequisites: ['Owner permissions in the merchant workspace.'],
    steps: [
      {
        num: 1,
        title: 'Navigate to Website in dashboard',
        text: 'Click <strong>Website</strong> in the sidebar. Select the <strong>Business details</strong> tab.',
        screenshot: '/assets/knowledge-base/website-01-edit-business.png',
        caption: 'Edit your business name, bio, location, and operational schedule.',
        alt: 'Website business details screen'
      },
      {
        num: 2,
        title: 'Update contact information and address',
        text: 'Update your official location (e.g. <em>14 Admiralty Way, Lekki Phase 1, Lagos</em>) and direct customer WhatsApp number. This number is used for one-tap WhatsApp routing.',
        screenshot: null,
        caption: null,
        alt: null
      },
      {
        num: 3,
        title: 'Set weekly opening hours',
        text: 'Adjust your open days and shift hours. For instance, set Tuesday to Sunday 09:00 AM – 07:00 PM. Vela uses these hours to prevent bookings outside your working hours.',
        screenshot: null,
        caption: null,
        alt: null
      },
      {
        num: 4,
        title: 'Publish changes',
        text: 'Click <strong>Publish changes</strong> to push the updated address and hours to your live website.',
        screenshot: '/assets/knowledge-base/website-03-publish-changes.png',
        caption: 'Select Publish changes to apply edits to your canonical website.',
        alt: 'Published status confirmation'
      }
    ],
    checkWorked: 'Open your public website in your browser and verify the footer and contact sections show your new address and opening times.',
    troubleshooting: [
      {
        symptom: 'Draft banner remains visible after editing',
        cause: 'Publish button was not tapped.',
        action: 'Click Publish changes in the upper banner.'
      }
    ],
    relatedSlugs: ['preview-publish-changes', 'share-public-booking-link'],
    searchAliases: ['business details', 'change address', 'update phone', 'opening hours', 'hours of operation']
  },
  {
    slug: 'preview-publish-changes',
    categoryId: 'website-gallery',
    title: 'Preview and publish changes',
    readTime: '2 min read',
    verifiedDate: 'November 2026',
    inAppAction: { label: 'Open Website Preview ↗', url: '/dashboard#website' },
    summary: 'Review pending draft edits on mobile and desktop before deploying them to your live website.',
    finishWith: 'Draft changes are reviewed in a mobile preview and pushed to your live website with zero downtime.',
    prerequisites: ['Unpublished changes in the Website editor.'],
    steps: [
      {
        num: 1,
        title: 'Locate the unpublished changes banner',
        text: 'When edits have been made to services, gallery photos, or business info, an amber notice appears: <em>⚠️ You have unpublished draft edits</em>.',
        screenshot: '/assets/knowledge-base/website-01-edit-business.png',
        caption: 'The unpublished draft edits banner displays the timestamp of the last live revision.',
        alt: 'Draft changes warning banner'
      },
      {
        num: 2,
        title: 'Open Live Preview',
        text: 'Select <strong>Preview</strong> in the page actions bar. A responsive device frame modal opens showing your storefront exactly as customers experience it.',
        screenshot: '/assets/knowledge-base/website-02-preview-mobile.png',
        caption: 'Interactive mobile storefront preview demonstrating service cards and book buttons.',
        alt: 'Mobile preview modal'
      },
      {
        num: 3,
        title: 'Publish to live website',
        text: 'Select <strong>Publish changes</strong>. Vela updates the live site instantly and records the new revision timestamp.',
        screenshot: '/assets/knowledge-base/website-03-publish-changes.png',
        caption: 'The green confirmation indicates your site revision is active online.',
        alt: 'Website published confirmation'
      }
    ],
    checkWorked: 'The amber draft banner disappears, and the timestamp updates to show your live revision.',
    troubleshooting: [
      {
        symptom: 'Customer says prices have not changed',
        cause: 'Browser cache on customer device or draft was not published.',
        action: 'Confirm the dashboard shows no unpublished draft banner, and ask customer to do a hard refresh.'
      }
    ],
    relatedSlugs: ['edit-business-details', 'upload-gallery-image'],
    searchAliases: ['publish', 'how does publishing work', 'preview', 'deploy site', 'draft']
  },
  {
    slug: 'upload-gallery-image',
    categoryId: 'website-gallery',
    title: 'Upload a gallery image and link look to service',
    readTime: '3 min read',
    verifiedDate: 'November 2026',
    inAppAction: { label: 'Open Gallery ↗', url: '/dashboard#website' },
    summary: 'Turn your haircut or photography portfolio photos into direct one-tap booking links.',
    finishWith: 'Clients browsing your portfolio can tap “Book this look” to automatically reserve the exact service shown in the photograph.',
    prerequisites: ['High-quality photos of your haircuts, hairstyles, or studio shoots.'],
    steps: [
      {
        num: 1,
        title: 'Open Gallery & Looks in Website',
        text: 'From the dashboard sidebar, select <strong>Website</strong>, then click the <strong>Gallery & Looks</strong> tab.',
        screenshot: '/assets/knowledge-base/gallery-01-portfolio.png',
        caption: 'The Gallery view displays your portfolio photos and their linked bookable services.',
        alt: 'Website gallery and looks manager'
      },
      {
        num: 2,
        title: 'Upload new look or select existing photograph',
        text: 'Click <strong>+ Add photo look</strong> to upload an image from your device, or select an existing portfolio item.',
        screenshot: null,
        caption: null,
        alt: null
      },
      {
        num: 3,
        title: 'Link look to bookable service',
        text: 'Click <strong>Link to service</strong> on the image card. Select the matching service from your menu (e.g. <em>Signature Fade & Beard Sculpt</em>) and select <strong>Save link</strong>.',
        screenshot: '/assets/knowledge-base/gallery-02-link-service.png',
        caption: 'Linking an image to a service enables the “Book this look” button on your storefront.',
        alt: 'Link look to service modal'
      },
      {
        num: 4,
        title: 'Publish changes to live gallery',
        text: 'Select <strong>Publish changes</strong> to push the updated lookbook to your public website.',
        screenshot: '/assets/knowledge-base/website-03-publish-changes.png',
        caption: 'Publishing enables the new portfolio items on your public booking page.',
        alt: 'Publish changes'
      }
    ],
    checkWorked: 'Visit your public website, click on the photo in the gallery, and verify the <strong>Book this look</strong> button opens checkout with the pre-selected haircut.',
    troubleshooting: [
      {
        symptom: 'Photo does not have a “Book this look” button on public website',
        cause: 'The image has not been linked to a specific service.',
        action: 'In the dashboard Gallery tab, tap Link to service on the photo card and select a service.'
      }
    ],
    relatedSlugs: ['preview-publish-changes', 'add-service-price'],
    searchAliases: ['gallery', 'put my work on my site', 'lookbook', 'upload photo', 'link look']
  },

  // -------------------------------------------------------------
  // BOOKINGS & CLIENTS
  // -------------------------------------------------------------
  {
    slug: 'add-walk-in',
    categoryId: 'bookings-clients',
    title: 'Record a walk-in appointment',
    readTime: '3 min read',
    verifiedDate: 'November 2026',
    inAppAction: { label: 'Open Bookings ↗', url: '/dashboard#bookings' },
    summary: 'Instantly add an unplanned walk-in customer into an available chair and record their deposit or full payment.',
    finishWith: 'A walk-in client is recorded on your chair’s schedule with their collected deposit or cash payment logged in Money.',
    prerequisites: ['At least one barber or stylist chair on shift.'],
    steps: [
      {
        num: 1,
        title: 'Navigate to Bookings in dashboard',
        text: 'Click <strong>Bookings</strong> in the dashboard sidebar to open today’s schedule and chair agenda.',
        screenshot: '/assets/knowledge-base/bookings-01-agenda-view.png',
        caption: 'The Bookings agenda displays today’s schedule, reserved slots, and the Add a walk-in button.',
        alt: 'Bookings agenda overview'
      },
      {
        num: 2,
        title: 'Select + Add a walk-in',
        text: 'Click the <strong>+ Add a walk-in</strong> button in the top action bar to open the walk-in modal.',
        screenshot: '/assets/knowledge-base/bookings-02-add-walkin-modal.png',
        caption: 'Enter client details, select the service, and designate the chair and payment collection mode.',
        alt: 'Add walk-in appointment modal'
      },
      {
        num: 3,
        title: 'Enter client details and service',
        text: 'Enter the client’s name and optional phone number. Select the service (e.g. <em>Signature Fade & Beard Sculpt - ₦10,000</em>) and assigned staff chair (e.g. <em>Dele (Chair 1)</em>).',
        screenshot: null,
        caption: null,
        alt: null
      },
      {
        num: 4,
        title: 'Choose payment method and submit',
        text: 'Select the payment option: <strong>₦2,000 Deposit collected</strong>, <strong>₦10,000 Full payment collected (Cash / POS / Transfer)</strong>, or <strong>Pay after haircut</strong>. Click <strong>Confirm & add to agenda</strong>.',
        screenshot: '/assets/knowledge-base/bookings-03-walkin-recorded.png',
        caption: 'The walk-in appointment immediately appears on the chair’s agenda with paid and due balances.',
        alt: 'Recorded walk-in on agenda card'
      }
    ],
    checkWorked: 'The walk-in appointment card appears on the agenda with staff assigned, and the deposit is recorded in the <strong>Money</strong> ledger.',
    troubleshooting: [
      {
        symptom: 'Chair shows as unavailable at the selected time',
        cause: 'An existing booking or calendar buffer is already reserved.',
        action: 'Assign the walk-in to another chair or adjust the appointment time.'
      }
    ],
    relatedSlugs: ['reschedule-appointment', 'lookup-customer-balance'],
    searchAliases: ['walk in', 'walk-in', 'book walk in', 'add walk-in', 'offline customer', 'cash booking']
  },
  {
    slug: 'reschedule-appointment',
    categoryId: 'bookings-clients',
    title: 'Move a client to another appointment',
    readTime: '3 min read',
    verifiedDate: 'November 2026',
    inAppAction: { label: 'Open Bookings ↗', url: '/dashboard#bookings' },
    summary: 'Reschedule an existing booking to a new time or staff chair while preserving verified deposit payments.',
    finishWith: 'The appointment is updated to the new date and time while their deposit payment remains attached and verified.',
    prerequisites: ['An existing confirmed booking with or without deposit.'],
    steps: [
      {
        num: 1,
        title: 'Locate the client booking',
        text: 'Open <strong>Bookings</strong> from the sidebar. Find the appointment you need to move, or review a client reschedule request in the <strong>Agent</strong> decisions list.',
        screenshot: '/assets/knowledge-base/bookings-01-agenda-view.png',
        caption: 'Select the booking you wish to move on the agenda.',
        alt: 'Bookings list'
      },
      {
        num: 2,
        title: 'Review proposed new time slot',
        text: 'Check chair availability to avoid double-booking. For example, if Dele (Chair 1) is busy at 2:30 PM due to an external Google Calendar block, move the slot to 4:15 PM.',
        screenshot: '/assets/knowledge-base/agent-01-decisions-list.png',
        caption: 'Vela flags reschedule decisions and confirms chair availability before applying changes.',
        alt: 'Decision review for moving appointment'
      },
      {
        num: 3,
        title: 'Confirm reschedule and notify client',
        text: 'Select <strong>Approve & send reply</strong>. Vela updates the booking time, retains the customer’s verified deposit, and sends a WhatsApp or SMS notification.',
        screenshot: null,
        caption: null,
        alt: null
      }
    ],
    checkWorked: 'The appointment moves to the new slot in <strong>Bookings</strong>, and the original payment reference (e.g. ₦2,000 deposit) remains attached in the transaction ledger.',
    troubleshooting: [
      {
        symptom: 'Client was charged a second deposit',
        cause: 'A new booking was created rather than moving the existing appointment.',
        action: 'Always use Move appointment or approve the Agent reschedule action to preserve the original payment.'
      }
    ],
    relatedSlugs: ['add-walk-in', 'lookup-customer-balance'],
    searchAliases: ['reschedule', 'move a client', 'change time', 'move booking', 'shift appointment']
  },

  // -------------------------------------------------------------
  // AGENT & INBOX
  // -------------------------------------------------------------
  {
    slug: 'review-vela-reply',
    categoryId: 'agent-inbox',
    title: 'Review a Vela reply and approve actions',
    readTime: '2 min read',
    verifiedDate: 'November 2026',
    inAppAction: { label: 'Open Agent Decisions ↗', url: '/dashboard#agent' },
    summary: 'Inspect AI-prepared responses, check business facts, edit customer replies, and approve automated tasks.',
    finishWith: 'An AI-prepared booking confirmation, quotation, or reschedule draft is reviewed, edited, and sent to the client.',
    prerequisites: ['Pending actions in the “Needs your decision” panel.'],
    steps: [
      {
        num: 1,
        title: 'Open Agent in the sidebar',
        text: 'Click <strong>Agent</strong> in your dashboard. Inspect the <strong>Needs your decision</strong> panel showing prepared actions waiting for your review.',
        screenshot: '/assets/knowledge-base/agent-01-decisions-list.png',
        caption: 'The Needs your decision list displays verb-led titles with client context and channel tags.',
        alt: 'Agent decisions flat list'
      },
      {
        num: 2,
        title: 'Tap a decision row to open focused review',
        text: 'Select any row (e.g. <em>Review Horizon Capital’s quote</em> or <em>Move Babatunde’s appointment</em>). The panel transitions smoothly to the focused review view.',
        screenshot: '/assets/knowledge-base/agent-02-quote-review.png',
        caption: 'The focused review screen presents the proposed action, business facts, and editable customer reply.',
        alt: 'Focused decision review view'
      },
      {
        num: 3,
        title: 'Edit customer reply if necessary',
        text: 'Review the proposed message. You can adjust the wording, pricing, or greeting in the editable draft field.',
        screenshot: null,
        caption: null,
        alt: null
      },
      {
        num: 4,
        title: 'Select Approve & send',
        text: 'Click <strong>Approve & send</strong>. Vela dispatches the message via the customer’s channel (e.g. WhatsApp, Email, or Instagram) and updates the decision counter.',
        screenshot: null,
        caption: null,
        alt: null
      }
    ],
    checkWorked: 'The decision card is removed from your pending queue, and the message appears in the conversation history.',
    troubleshooting: [
      {
        symptom: 'Approve button does not send message',
        cause: 'The connected channel (e.g. WhatsApp Cloud API) credentials or webhook may be disconnected.',
        action: 'Check Connected apps → WhatsApp Business to ensure the channel health is Active.'
      }
    ],
    relatedSlugs: ['take-over-conversation', 'prepare-send-quotation'],
    searchAliases: ['agent', 'approve action', 'review reply', 'needs your decision', 'ai draft']
  },

  // -------------------------------------------------------------
  // PAYMENTS & QUOTATIONS
  // -------------------------------------------------------------
  {
    slug: 'choose-deposit-amount',
    categoryId: 'payments-quotations',
    title: 'Set a deposit amount and booking policy',
    readTime: '3 min read',
    verifiedDate: 'November 2026',
    inAppAction: { label: 'Open Payment Settings ↗', url: '/dashboard#apps' },
    summary: 'Configure fixed or percentage deposit requirements to eliminate no-shows and secure upfront revenue.',
    finishWith: 'Customers must pay a fixed or percentage deposit (e.g. ₦2,000) before their slot is reserved.',
    prerequisites: ['A connected payment gateway (Paystack, Flutterwave, or Stripe).'],
    steps: [
      {
        num: 1,
        title: 'Open Connected Apps and select Payment Settings',
        text: 'From the dashboard, go to <strong>Connected apps</strong> and select the <strong>Payment Settings</strong> button in the header.',
        screenshot: '/assets/knowledge-base/payments-01-gateway-selector.png',
        caption: 'The Payment Settings gateway selector displays your active providers and currency routing rules.',
        alt: 'Payment Settings Gateway Selector'
      },
      {
        num: 2,
        title: 'Select your default NGN gateway',
        text: 'Confirm that <strong>Paystack</strong> is selected as your default gateway for Nigerian Naira transactions.',
        screenshot: null,
        caption: null,
        alt: null
      },
      {
        num: 3,
        title: 'Define service deposit rules in Website Editor',
        text: 'Under <strong>Website → Services</strong>, specify the required deposit amount per service (e.g. ₦2,000 for haircuts, ₦20,000 for photoshoot bookings).',
        screenshot: null,
        caption: null,
        alt: null
      }
    ],
    checkWorked: 'Initiate a test booking on your storefront and verify that the checkout button requires the exact deposit amount before confirming the chair.',
    troubleshooting: [
      {
        symptom: 'Checkout allows bookings without deposit',
        cause: 'Enforce deposits setting is toggled off.',
        action: 'Open Paystack → Manage and ensure Enforce deposits is checked.'
      }
    ],
    relatedSlugs: ['connect-paystack', 'change-default-gateway'],
    searchAliases: ['deposit', 'set deposit', 'deposit policy', 'upfront payment', 'no-show protection']
  },
  {
    slug: 'change-default-gateway',
    categoryId: 'payments-quotations',
    title: 'Change your default checkout gateway',
    readTime: '2 min read',
    verifiedDate: 'November 2026',
    inAppAction: { label: 'Open Gateway Selector ↗', url: '/dashboard#apps' },
    summary: 'Route local Naira cards to Paystack, international corporate clients to Flutterwave, and USD/GBP to Stripe.',
    finishWith: 'Your preferred payment provider handles primary Naira checkout while alternative gateways handle international currencies.',
    prerequisites: ['At least two payment providers connected in Vela.'],
    steps: [
      {
        num: 1,
        title: 'Open Connected Apps and click Payment Settings',
        text: 'In the <strong>Connected apps</strong> page header, click <strong>Payment Settings</strong>.',
        screenshot: '/assets/knowledge-base/payments-01-gateway-selector.png',
        caption: 'Configure payment routing defaults across Paystack, Flutterwave, and Stripe Connect.',
        alt: 'Payment Gateway Selector Modal'
      },
      {
        num: 2,
        title: 'Select default gateway per currency',
        text: 'Use the currency defaults panel to assign <strong>Paystack</strong> for NGN direct checkout, <strong>Flutterwave</strong> for international cards and diaspora currencies, and <strong>Stripe Connect</strong> for 1-tap Apple Pay.',
        screenshot: null,
        caption: null,
        alt: null
      },
      {
        num: 3,
        title: 'Save gateway routing',
        text: 'Click <strong>Configure</strong> on your chosen provider to inspect settlement bank details (e.g. GTBank for Paystack, Zenith Bank for Flutterwave).',
        screenshot: null,
        caption: null,
        alt: null
      }
    ],
    checkWorked: 'The chosen provider displays the <strong>DEFAULT FOR NGN</strong> pill in the gateway selector.',
    troubleshooting: [
      {
        symptom: 'Cannot select gateway as default',
        cause: 'Gateway credentials are not yet verified.',
        action: 'Enter valid API keys or connect your provider account first.'
      }
    ],
    relatedSlugs: ['connect-paystack', 'connect-flutterwave'],
    searchAliases: ['default gateway', 'change provider', 'switch to flutterwave', 'stripe apple pay', 'currency routing']
  },

  // -------------------------------------------------------------
  // CONNECTED APPS (REFERENCE BENCHMARKS)
  // -------------------------------------------------------------
  {
    slug: 'connect-paystack',
    categoryId: 'connected-apps',
    title: 'Connect Paystack to collect booking deposits',
    readTime: '3 min read',
    verifiedDate: 'November 2026',
    inAppAction: { label: 'Open Paystack Setup ↗', url: '/dashboard#apps' },
    summary: 'Enter your Paystack API credentials, configure the secure webhook URL, and accept automated customer deposits.',
    finishWith: 'Your customers can pay a deposit when they book, and you can see the payment against their appointment.',
    prerequisites: [
      'Business owner access in Vela.',
      'An active Paystack account (Test mode or Live mode approved by Paystack).'
    ],
    steps: [
      {
        num: 1,
        title: 'Open Connected apps and locate Paystack',
        text: 'Navigate to <strong>Connected apps</strong> from the dashboard sidebar. Find <strong>Paystack</strong> in the list. Select <strong>Connect</strong> for a new account or <strong>Manage</strong> for an existing connection.',
        screenshot: '/assets/knowledge-base/paystack-01-row.png',
        caption: 'Locate Paystack in your Connected apps list and select Manage or Connect.',
        alt: 'Paystack row in Connected apps list'
      },
      {
        num: 2,
        title: 'Choose Test or Live mode and enter your secret key',
        text: 'In the <strong>API Credentials</strong> section immediately below the provider name, choose your environment using the <strong>Test / Live</strong> toggle. If no key is saved, enter your secret key in the masked field (Test keys begin with <code>sk_test_</code>; Live keys begin with <code>sk_live_</code>). If a key exists, select <strong>Replace key</strong> to open the in-place replacement form while preserving your active working key. Select <strong>Save & verify key</strong>.',
        screenshot: '/assets/knowledge-base/paystack-02-test-credentials.png',
        caption: 'The credentials panel lets you switch Test/Live mode, enter secret keys, and replace active keys safely.',
        alt: 'Paystack API credentials panel with masked input'
      },
      {
        num: 3,
        title: 'Set up payment notifications (Webhook URL)',
        text: 'In the <strong>Webhook Configuration</strong> section directly below credentials, copy your <strong>Public HTTPS Webhook URL</strong> (e.g. <code>https://api.studioteni.ng/api/webhooks/paystack</code>) using the <strong>Copy URL</strong> button. Log into your <a href="https://dashboard.paystack.com/#/settings/developer" target="_blank" rel="noopener">Paystack Dashboard → Settings → API Keys & Webhooks</a>, paste the URL into the matching <strong>Webhook URL</strong> field, and click <strong>Save Changes</strong>.',
        screenshot: '/assets/knowledge-base/paystack-03-webhook-url.png',
        caption: 'Copy the Webhook URL and paste it into Paystack Dashboard → Settings → API Keys & Webhooks.',
        alt: 'Webhook configuration section with Copy URL button'
      },
      {
        num: 4,
        title: 'Complete a sandbox checkout',
        text: 'Trigger a sample ₦2,000 deposit by selecting <strong>Send test event</strong> or making a test booking on your storefront. Vela validates the HMAC SHA512 signature and records the payment reference against the appointment.',
        screenshot: null,
        caption: null,
        alt: null
      }
    ],
    checkWorked: 'In <strong>Connected apps</strong>, Paystack displays the <strong>Connected</strong> or <strong>Key verified</strong> badge. In <strong>Bookings</strong>, test appointments display <em>₦2,000 paid · ₦8,000 due</em> with automated bank settlement confirmed.',
    troubleshooting: [
      {
        symptom: 'Error: “Invalid Paystack key: Must begin with sk_test_”',
        cause: 'You entered a live key (sk_live_...) while Test mode was selected, or vice-versa.',
        action: 'Toggle the environment selector to match the key you obtained from Paystack.'
      },
      {
        symptom: 'Customer completed payment but booking is still marked Pending',
        cause: 'The Webhook URL was not saved in Paystack or network blocked notification.',
        action: 'Verify that the Webhook URL is saved in Paystack Dashboard and tap Send test event in Vela to verify connectivity.'
      },
      {
        symptom: '“Where to find my key?” link',
        cause: 'Merchant needs location of Paystack credentials.',
        action: 'Log in to Paystack Dashboard, click Settings on the left menu, and click API Keys & Webhooks.'
      }
    ],
    relatedSlugs: ['connect-flutterwave', 'choose-deposit-amount', 'change-default-gateway'],
    searchAliases: ['paystack', 'secret key', 'api key', 'paystack key', 'where do i find my key', 'connect paystack', 'webhook paystack', 'naira payments']
  },
  {
    slug: 'connect-flutterwave',
    categoryId: 'connected-apps',
    title: 'Connect Flutterwave for multi-currency payments',
    readTime: '3 min read',
    verifiedDate: 'November 2026',
    inAppAction: { label: 'Open Flutterwave Setup ↗', url: '/dashboard#apps' },
    summary: 'Set up Flutterwave API credentials and secret hash verification to accept USD, GBP, and EUR bookings.',
    finishWith: 'You can accept payments from corporate and international clients in USD, GBP, EUR, and NGN.',
    prerequisites: [
      'Business owner access.',
      'A verified Flutterwave merchant account.'
    ],
    steps: [
      {
        num: 1,
        title: 'Open Connected apps and select Flutterwave',
        text: 'From the dashboard, open <strong>Connected apps</strong>. Locate <strong>Flutterwave</strong> and select <strong>Set up credentials</strong> or <strong>Manage</strong>.',
        screenshot: '/assets/knowledge-base/flutterwave-01-credentials.png',
        caption: 'Enter your Flutterwave Test or Live secret key, public key, and webhook secret hash.',
        alt: 'Flutterwave credentials and secret hash form'
      },
      {
        num: 2,
        title: 'Enter Flutterwave secret key',
        text: 'Select <strong>Test</strong> or <strong>Live</strong>. Enter your secret key (Test keys begin with <code>FLWSECK_TEST-</code>; Live keys begin with <code>FLWSECK_LIVE-</code>). Select <strong>Save & verify key</strong>.',
        screenshot: null,
        caption: null,
        alt: null
      },
      {
        num: 3,
        title: 'Enter your Secret Hash for Webhook Verification',
        text: 'Under <strong>Secret Hash (Webhook Verification)</strong>, enter the exact signing secret hash configured in your Flutterwave dashboard (<a href="https://app.flutterwave.com/dashboard/settings/webhooks" target="_blank" rel="noopener">Settings → Webhooks → Secret hash</a>). Select <strong>Save hash</strong>.',
        screenshot: null,
        caption: null,
        alt: null
      },
      {
        num: 4,
        title: 'Register the Webhook URL in Flutterwave',
        text: 'Copy the <strong>Public HTTPS Webhook URL</strong> from Vela and paste it into Flutterwave Dashboard → Settings → Webhooks → URL. Save changes in Flutterwave.',
        screenshot: null,
        caption: null,
        alt: null
      }
    ],
    checkWorked: 'Flutterwave displays the <strong>Key verified · Awaiting webhook</strong> or <strong>Connected</strong> badge, and international cards can be processed at checkout.',
    troubleshooting: [
      {
        symptom: 'Invalid Flutterwave key format error',
        cause: 'Prefix mismatch between Test (FLWSECK_TEST-) and Live (FLWSECK_LIVE-).',
        action: 'Verify you copied the secret key from the matching environment in Flutterwave.'
      },
      {
        symptom: 'Webhook signature verification failed',
        cause: 'The secret hash in Vela does not match the secret hash entered in Flutterwave.',
        action: 'Re-enter your secret hash in Vela and click Save hash.'
      }
    ],
    relatedSlugs: ['connect-paystack', 'change-default-gateway'],
    searchAliases: ['flutterwave', 'flw', 'international payments', 'usd booking', 'gbp', 'secret hash']
  },
  {
    slug: 'connect-google-calendar',
    categoryId: 'connected-apps',
    title: 'Connect Google Calendar for staff scheduling',
    readTime: '2 min read',
    verifiedDate: 'November 2026',
    inAppAction: { label: 'Open Google Calendar Setup ↗', url: '/dashboard#apps' },
    summary: 'Sync staff Google Workspace calendars to prevent scheduling conflicts with personal appointments.',
    finishWith: 'Stylist calendars stay synced in real-time, preventing double-bookings when staff block personal appointments.',
    prerequisites: ['Google Workspace or Gmail account for staff members.'],
    steps: [
      {
        num: 1,
        title: 'Open Connected apps and locate Google Calendar',
        text: 'In <strong>Connected apps</strong>, locate <strong>Google Calendar</strong> and select <strong>Manage</strong> or <strong>Connect account</strong>.',
        screenshot: null,
        caption: null,
        alt: null
      },
      {
        num: 2,
        title: 'Map calendar to staff chair',
        text: 'Assign the connected Google account (e.g. <code>dele.cuts@studioteni.ng</code>) to the relevant stylist chair (e.g. <em>Dele · Chair 1</em>).',
        screenshot: null,
        caption: null,
        alt: null
      },
      {
        num: 3,
        title: 'Verify real-time availability check',
        text: 'When a staff member places a personal appointment (e.g. 2:30 PM Dentist) on their Google Calendar, Vela automatically marks Chair 1 as busy during that slot while leaving other chairs open.',
        screenshot: null,
        caption: null,
        alt: null
      }
    ],
    checkWorked: 'Open <strong>Bookings</strong> agenda. External calendar blocks appear as reserved buffer slots, preventing overlapping client reservations.',
    troubleshooting: [
      {
        symptom: 'Staff member personal event does not block booking slot',
        cause: 'Event was created on a personal calendar not mapped to the stylist chair.',
        action: 'Ensure the event is created on the primary calendar account mapped in Vela.'
      }
    ],
    relatedSlugs: ['add-walk-in', 'reschedule-appointment'],
    searchAliases: ['google calendar', 'calendar sync', 'double booking', 'stylist availability', 'dele calendar']
  },
  {
    slug: 'connect-zoho-books',
    categoryId: 'connected-apps',
    title: 'Connect Zoho Books for invoicing and accounting',
    readTime: '3 min read',
    verifiedDate: 'November 2026',
    inAppAction: { label: 'Open Zoho Books Setup ↗', url: '/dashboard#apps' },
    summary: 'Turn accepted client quotations into automatic Zoho Books invoices and reconcile deposit payments.',
    finishWith: 'Accepted customer quotes automatically generate itemized invoices and record payment receipts in Zoho Books.',
    prerequisites: ['Active Zoho Books organization account.'],
    steps: [
      {
        num: 1,
        title: 'Locate Zoho Books in Connected Apps',
        text: 'In <strong>Connected apps</strong>, select <strong>Zoho Books</strong>. Click <strong>Connect account</strong> to authorize OAuth access to your Zoho organization.',
        screenshot: null,
        caption: null,
        alt: null
      },
      {
        num: 2,
        title: 'Select organization and invoice prefix',
        text: 'Verify your Zoho organization ID (e.g. Org #8029193 - Studio Teni Services Ltd) and configure your invoice prefix (e.g. <code>ZB-INV-</code>).',
        screenshot: null,
        caption: null,
        alt: null
      },
      {
        num: 3,
        title: 'Automatic invoice generation on quote acceptance',
        text: 'When a corporate client accepts a photography quote, Vela generates the official Zoho invoice (e.g. <em>#ZB-INV-2026-092</em> for ₦350,000) and syncs the deposit receipt directly.',
        screenshot: '/assets/knowledge-base/agent-02-quote-review.png',
        caption: 'Accepted corporate photography quotes synchronize directly with Zoho Books.',
        alt: 'Corporate quote review and invoice generation'
      }
    ],
    checkWorked: 'The Zoho Books row in Connected apps shows <strong>Connected · OAuth Verified</strong> with the latest invoice number displayed in the activity log.',
    troubleshooting: [
      {
        symptom: 'Invoice failed to sync with Zoho Books',
        cause: 'Zoho OAuth refresh token expired.',
        action: 'Click Reconnect in Connected apps to re-authorize Zoho Books.'
      }
    ],
    relatedSlugs: ['prepare-send-quotation', 'choose-deposit-amount'],
    searchAliases: ['zoho books', 'invoicing', 'accounting', 'quotes to invoice', 'tax receipt']
  }
];
