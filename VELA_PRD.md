# Vela Product Requirements Document (PRD)

**AI sales assistant for barbers, photographers and appointment or project-based professionals**  
*Product proposal · 24 November 2026 · For the founder, product designer, engineering, merchant success and QA teams*

---

## 1. Who Vela is for

Vela helps barbers, photographers and similar hands-on professionals sell while they are busy doing the work. A barber between cuts needs to know who is next, which chair is free and who wants to come back. A photographer on location needs enquiries qualified, quotations approved, deposits recorded and the next shoot brief ready. Both need a mobile website that shows their work and lets a visitor act on what they see.

**Primary outcome:** A visitor sees work they like, chooses the relevant service, books or requests a quotation, pays according to the business’s terms and arrives prepared. The owner can trace that sale from the original enquiry to the job and the money collected.

| Pilot merchant | Daily constraint | What Vela must get right |
| :--- | :--- | :--- |
| **Independent barber** | Cannot answer every WhatsApp message while cutting hair | Show real slots, accept a walk-in in seconds, send preparation or location details and invite a regular back at the right time |
| **Multi-chair barbershop** | Barbers have different shifts and services, and several people can book at once | Offer a named barber or first available, account for chair capacity and keep every staff calendar consistent |
| **Portrait photographer** | Sells a defined session, often with a studio, several looks and a fixed number of edits | Show the relevant portfolio, reserve the photographer and studio, collect the deposit and capture the brief |
| **Wedding or event photographer** | Price depends on date, location, coverage, team and deliverables | Qualify the brief, price exceptions with the owner, version quotations and assemble a job brief after acceptance |

- **Adjacent trades:** A braider can reuse duration-based services, staff selection and style references. A makeup artist can add home-service zones, travel charges and a ready-by time. A videographer can reuse coverage packages, crew requirements and quotation approval. Onboarding asks how each service is sold, so one account can offer instant booking and custom projects.
- **Pilot assumptions:** Nigeria, NGN (₦), Africa/Lagos as the default time zone, WhatsApp for conversations and mobile web for customers and owners. Prices and timings illustrate product behaviour. Merchants supply their own.

---

## 2. Two Sales Journeys the Product Must Complete

### Journey A. Sell the barber’s next available appointment
1. An independent barber with two spaces on Saturday taps **Find customers → Fill open slots** and chooses haircut and beard trim. Vela surfaces eligible customers who previously asked about the service or are due to return. Each suggestion shows the last visit or enquiry and the reason for inclusion.
2. The barber chooses two people, reviews the actual message and approves it. A customer taps the offer and recognises a low taper in the gallery. **Book this look** opens the right service with that image attached as a reference.
3. The customer selects a barber or first available. An illustrative ₦10,000 service takes 45 minutes and the shop blocks another 10 minutes for cleanup. A customer who must leave by 2pm can accept a 1pm start. Customer-facing finish time is 1:45pm. The barber and chair become available again at 1:55pm.
4. If the merchant requires a ₦2,000 deposit, the customer sees ₦8,000 payable later and the hold expiry before opening checkout. When payment is verified, the barber sees one appointment with its reference image, source and deposit. A shop with zero deposit confirms on selection.
5. At the shop, staff check the client in, mark the service complete and record the remaining payment using its actual payment method. The customer can choose a preferred rebooking interval. The owner sees the next eligible rebooking opportunity when it is due.

### Journey B. Sell and onboard a photography client
1. A customer chooses **Request a quote** on a studio’s website. The form collects name, reply channel, event date, venue and requested coverage. Vela opens an opportunity and lets the studio reply from the inbox.
2. The agent asks only for missing details. It prepares a quote for eight hours of coverage, two photographers and an album using the studio’s catalogue. The owner reviews travel and delivery terms and sends version 1.
3. The client requests a smaller album. The owner sends version 2. The client opens the branded link, accepts version 2 and receives an invoice. The agreed total is ₦450,000. At a 40% deposit, ₦180,000 is due now and ₦270,000 remains after payment.
4. A verified payment creates the job and receipt. The client’s welcome page asks for a shot list, event contact and venue instructions. The already supplied date and venue are prefilled. The client can save progress and return.
5. The photographer sees the job brief and an outstanding shot list. When the owner marks delivery complete, the remaining invoice balance stays visible until paid. The merchant can request a review and record a future opportunity.

> [!IMPORTANT]
> **Commercial rule:** Quote acceptance, money received, date reserved, onboarding complete and job delivered are separate facts. The interface must say exactly which have happened. A quotation for a dated event shows availability terms. If the date has been taken before acceptance, offer alternatives or refer the client to the owner before collecting a deposit for that date.

---

## 3. Product Surfaces

| Surface | Primary decisions and actions |
| :--- | :--- |
| **Today** | Rank unanswered enquiries, quotes awaiting approval, accepted quotes awaiting deposit, imminent jobs with missing information and available capacity. Each card opens the record and its next action. An empty state points to setup or sharing the website. |
| **Sales** | Find customers, open the inbox, filter opportunities by source, service, owner and next-action date. Show pipeline stages, quotations and outreach results. Support search by name, business and phone. |
| **Clients** | Combine contact history, jobs, messages, quotes, invoices, files, permissions and opt-outs. Show repeat opportunities separately so a new job cannot overwrite the previous one. |
| **Calendar** | Show staff, appointments, blocked time and active holds. Allow manual bookings and rescheduling through the same availability engine as website and chat. |
| **Money** | View invoices, instalments, receipts, outstanding balances and reconciliation exceptions. Filter by customer, date, status and reference. Open the related job. |
| **Website** | Edit brand, service pages, packages, portfolio, enquiry forms and calls to action. Preview the actual mobile booking and quote flows before publishing. |
| **Settings** | Configure staff, roles, service policies, WhatsApp, payment destination, email sender, message templates, agent permissions and usage limits. |
| **Customer portal** | Mobile, branded access to a specific quote or job. Review, request edits, accept, pay, upload files and see outstanding tasks without setting up a merchant account. |

**Owner home on mobile:**
- **Barber:** Lead with next appointment, time, barber and balance. Put *Add walk-in* and *Block time* within reach.
- **Photographer:** Lead with next shoot and anything that could prevent delivery (unpaid deposit, missing venue).
- **Roles:** Front-desk (manage bookings & check-in), Assigned staff (see brief), Owner (payouts, staff permissions, outbound campaign approval).

---

## 4. Merchant Setup and Website Requirements

- **Setup sequence:** Business name, category, time zone, locations → Create first service → Fixed-price booking vs quotation → Configure staff/availability → Set payment terms → Add intake questions → Preview end-to-end → Connect payments.
- **Per-service configuration:** Title, description, images, price/method, duration, buffer, staff/resource, location type, travel zones/fees, deposit rule, availability, lead time, cancellation policy, quote validity, intake template, custom-price flag.
- **Public website order:**
  1. Introduction and primary action
  2. Services and packages
  3. Team or business details
  4. Booking
  5. Gallery
  6. Footer
- Each gallery item can reopen Booking with its service and reference image preselected. Custom work opens the relevant quote form.

---

## 5. Find Customers and Outbound Sales

- **Workflow:** Choose a goal → Select service & audience → Review candidates → Approve an action → Track replies and sales.
- **Candidate sources:**
  1. *Existing enquiries:* Match requested service, open opportunity, last activity.
  2. *Returning customers:* Completed jobs + merchant-defined rebooking interval.
  3. *Merchant CSV:* Map name, email, phone, service interest, explicit permission.
  4. *Shareable offer:* Social copy + tracked link to a live booking/offer page.
  5. *External business prospects (Phase 2):* Shortlist of vetted public contacts.
- **Review screen:** Shows recipient, why they appear, channel, last contact, eligibility, and exact proposed message. Owner has full edit/deselect veto.
- **Delivery limits & attribution:** Quiet hours, per-merchant volume caps, automatic stop on reply/booking. Last attributable sales action tracked on verified money.

---

## 6. Inbox, CRM and Agent Controls

- **Opportunity stages:** `New` → `Qualifying` → `Quote sent` / `Booking offered` → `Awaiting deposit` → `Won`.
- **Default authority matrix:**
  - Inbound FAQs & slot lookup: Automatic within approved facts.
  - Catalogue quote & slot hold: Automatic within published rules.
  - Custom quote, discount, scope change: **Draft for owner approval**.
  - Contact lists / win-back: **Owner approves recipients, copy, and channel**.
  - Confirmations, receipts, reminders: Automatic on verified events.
  - Refunds, bank changes, disputes: **Assigned to authorised humans**.
- **Handoff:** Automatic replies pause on customer request, complaint, or dispute. Resume only on explicit staff action.

---

## 7. Quotations, Invoices and Payments

- **Quotation lifecycle:** `Draft` → `Sent` → `Accepted`, `Declined`, `Expired`, or `Superseded`.
- **Invoice:** Unique sequential number, line items, total, amount received, deposit due, balance, Paystack link.
- **Verification:** Integer minor units (kobo). Webhook deduplication by event ID.
- **Exceptions:** If payment arrives after hold expiry, record money, recheck resource; if unavailable, flag paid-but-unscheduled case for owner resolution.

---

## 8. Client Onboarding and Job Delivery

- **Trigger:** On accepted terms (zero deposit) or verified deposit (paid project).
- **Template builder:** Text, choices, dates, file uploads, acknowledgements. Reusable templates for haircut preferences, portrait session briefs, and wedding coverage.
- **Client portal:** Scoped mobile link showing business identity, service, date, accepted quote, balance, and prefilled checklist.
- **Job board states:** `Awaiting intake` → `Ready` → `In progress` → `Delivered` → `Closed`.

---

## 9. Technical Design and Dependencies

| Dependency | Interface Vela owns | Required proof before rollout |
| :--- | :--- | :--- |
| **Vela Service API & Database** | Single API for storefront, dashboard, and agent (merchant-scoped prices, calendars, holds, jobs). | Simultaneous requests for one resource produce at most one confirmed booking. |
| **WhatsApp Business Platform** | Number mapping, inbound webhooks, outbound templates, delivery events. | Inbound enquiry, approved reminder, disconnect recovery verified. |
| **OpenAI Responses API** | Supply merchant context and narrow tool calls with server validation. | Prompt injection or fabricated prices strictly prevented. |
| **Paystack Checkout** | Payment intent creation, webhook verification, receipt generation. | Test success, duplicate webhooks, delayed success, mismatch recovery. |
| **Private File Storage & Jobs** | Scoped uploads, expiring downloads, scheduled reminders. | Worker restarts cannot duplicate receipts or reminders. |

---

## 10. Analytics and Commercial Measures

1. **Weekly merchants winning a paid client**
2. **Enquiry to first payment conversion rate & cohort age**
3. **Follow-up revenue directly attributed to outreach**
4. **Quote acceptance rate**
5. **Onboarding readiness by deadline**
6. **Operational health:** Double bookings, payment mismatches, delivery failures, opt-outs, model/messaging cost per conversion.

---

## 11. Release Sequence and Migration

1. **Inventory and baseline:** Map existing merchant records, reservations, and payment connections.
2. **Deliver two complete journeys:** Ship Journey A (barber instant booking + cleanup buffer) and Journey B (photography quote + revision + onboarding).
3. **Deliver merchant-led growth:** Ship Today surface, repeat-client win-back, and campaign tracking.
4. **Expand acquisition:** Pilot external business prospect discovery.
5. **Migrate by merchant cohort:** Idempotent record backfill without triggering unwanted notices.

---

## 12. Release Acceptance Tests

1. Client enters via campaign link → Attributable paid job recorded.
2. Two customers choose last time slot simultaneously → Exactly one hold granted.
3. Owner sends revised quote → Superseded version cannot be accepted; invoice uses revision values.
4. Client accepts undated project quote → Deposit collected without inventing an appointment.
5. Gateway notification delivered three times → Exactly one allocation, receipt, and job created.
6. Deposit settles after slot has expired/sold → Money visible, exception flagged for owner.
7. Customer sends payment screenshot → Recorded status reported; verification task opened.
8. Duplicate/opted-out contact imported → Suppressed; zero unauthorized outreach.
9. Client replies while follow-up is queued → Follow-up cancelled; thread routed to inbox.
10. Human takes over mid-conversation → Queued AI reply cancelled immediately.
11. Rescheduled booking → Old reminders cancelled; new reminder and intake deadlines set.
12. Unauthorized access to another client's file → Access rejected with no metadata leak.
13. WhatsApp disconnected or limit reached → Clear alert, zero false delivery, web leads preserved.
14. Legacy links and historical records migrated → Existing URLs resolve without customer disturbance.
15. Business with zero prospects → Actionable empty state displayed with zero fake leads.

---

## 13. Key Decisions Before General Availability

- **Product positioning:** Launch as *"AI sales assistant for service businesses"*.
- **Deposit settlement & escrow:** Clearly map recipient accounts and exception ownership per merchant.
- **Commercial entitlements:** Meter AI calls and WhatsApp outbound limits during pilot.
- **Outbound eligibility:** Enforce quiet hours, explicit permission records, and instant opt-outs.
- **Pilot cohort:** 3 barbershops (including 1 multi-chair) and 3 photography studios (portraits & events).

---

## 14. Booking Engine Specification

- **Availability calculation:** $\text{Qualified shifts} \cap \text{Location hours} \cap \text{Resource capacity} - (\text{Appointments} + \text{Active holds} + \text{Buffer})$.
- **Barber example:** 45-min haircut + 10-min cleanup buffer. Customer finish time: 1:45 PM; chair and barber become bookable at 1:55 PM.
- **Front-desk walk-in:** Staff can add a walk-in in seconds, instantly consuming chair capacity.

---

## 15. Gallery Specification

- **Purpose:** Public portfolio linked directly to service booking or quotation briefs.
- **Customer interactions:**
  - Barber image: *"Book this look"* (preselects service and reference photo).
  - Portrait image: *"Book a session"* (carries package and style into booking).
  - Wedding album: *"Request a similar shoot"* (attaches album reference to quote brief).
- **Merchant controls:** Category tagging, display order, copyright/permission confirmation, instant unpublish.
