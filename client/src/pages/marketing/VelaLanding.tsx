import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Check } from 'lucide-react';

export const VelaLanding: React.FC = () => {
  // Navigation & FAQ state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#C5F36A] p-1.5 sm:p-2.5 lg:p-3 font-sans text-[#161817] selection:bg-[#C5F36A] selection:text-[#161817]">
      {/* Accessibility Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-[9999] bg-[#161817] text-[#F7F6F0] px-4 py-2 rounded-full text-sm font-medium"
      >
        Skip to main content
      </a>

      {/* Inner Warm-White Canvas */}
      <div className="relative bg-[#F7F6F0] rounded-[20px] sm:rounded-[26px] overflow-hidden shadow-2xl flex flex-col min-h-[calc(100vh-12px)] sm:min-h-[calc(100vh-24px)]">
        
        {/* Slim Header inside Canvas */}
        <header className="relative z-50 py-5 sm:py-6">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
            
            {/* Brand Logo with AI Badge */}
            <Link to="/" className="inline-flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#161817] rounded" aria-label="Vela AI Homepage">
              <img src="/vela-logo-black-opt.png" alt="vela" className="h-7 sm:h-8 w-auto object-contain" />
              <span className="bg-[#161817] text-[#C5F36A] text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase font-mono">
                AI
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8 text-[14.5px] font-medium text-[#161817]/70">
              <button 
                type="button" 
                onClick={() => scrollToSection('see-vela-at-work')} 
                className="hover:text-[#161817] transition-colors cursor-pointer"
              >
                How it works
              </button>
              <button 
                type="button" 
                onClick={() => scrollToSection('pricing')} 
                className="hover:text-[#161817] transition-colors cursor-pointer"
              >
                Pricing
              </button>
            </nav>

            {/* Header Actions */}
            <div className="flex items-center gap-3 sm:gap-5">
              <Link to="/login" className="hidden sm:inline-block text-[14.5px] font-medium text-[#161817] hover:opacity-75 transition-opacity px-2">
                Log in
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center bg-[#161817] text-[#F7F6F0] rounded-full px-5 sm:px-6 h-10 sm:h-11 text-[13.5px] sm:text-[14.5px] font-semibold hover:bg-[#272a29] transition-all shadow-sm"
              >
                Get started
              </Link>

              {/* Mobile menu toggle */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-[#161817] rounded-lg"
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
              >
                <div className="w-5 h-4 flex flex-col justify-between">
                  <span className="w-full h-0.5 bg-[#161817] rounded-full"></span>
                  <span className="w-full h-0.5 bg-[#161817] rounded-full"></span>
                </div>
              </button>
            </div>
          </div>

          {/* Mobile Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-[#F7F6F0] border-b border-[#161817]/10 px-6 py-6 space-y-4 shadow-xl z-50">
              <button 
                type="button" 
                onClick={() => { setMobileMenuOpen(false); scrollToSection('see-vela-at-work'); }} 
                className="block text-left w-full text-lg font-medium text-[#161817]"
              >
                How it works
              </button>
              <button 
                type="button" 
                onClick={() => { setMobileMenuOpen(false); scrollToSection('pricing'); }} 
                className="block text-left w-full text-lg font-medium text-[#161817]"
              >
                Pricing
              </button>
              <button 
                type="button" 
                onClick={() => { setMobileMenuOpen(false); scrollToSection('faqs'); }} 
                className="block text-left w-full text-lg font-medium text-[#161817]"
              >
                Questions?
              </button>
              <div className="h-[1px] bg-[#161817]/10 my-2" />
              <Link to="/login" className="block text-lg font-medium text-[#161817]">Log in</Link>
              <Link to="/register" className="block w-full text-center bg-[#161817] text-[#F7F6F0] rounded-full py-3 text-sm font-semibold">
                Get started
              </Link>
            </div>
          )}
        </header>

        {/* Main Content */}
        <main id="main-content" className="flex-1 relative z-10">
          
          {/* Hero Section */}
          <section className="pt-6 sm:pt-8 pb-10 sm:pb-12 text-center">
            <div className="max-w-[760px] mx-auto px-4 sm:px-6 flex flex-col items-center">
              
              {/* Plain Descriptor */}
              <div className="text-xs sm:text-[13px] font-semibold text-[#161817]/70 tracking-wider uppercase font-mono mb-4 sm:mb-5">
                The AI agent for service businesses
              </div>

              {/* Two-Line Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[60px] font-semibold tracking-[-0.03em] leading-[1.1] text-[#161817] mb-4 sm:mb-5">
                You see the clients.<br className="hidden sm:inline" /> Vela follows up.
              </h1>

              {/* Supporting Copy */}
              <p className="text-sm sm:text-base lg:text-[17px] text-[#161817]/70 max-w-[560px] mb-7 leading-relaxed">
                Give clients a website to book and pay a deposit. Vela sends reminders and helps you bring past clients back.
              </p>

              {/* Hero Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 w-full sm:w-auto">
                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center bg-[#161817] text-[#F7F6F0] rounded-full px-8 h-12 text-[15px] font-semibold hover:bg-[#272a29] transition-all shadow-md"
                >
                  Get started
                </Link>
                <button
                  type="button"
                  onClick={() => scrollToSection('see-vela-at-work')}
                  className="text-[15px] font-medium text-[#161817] underline underline-offset-4 decoration-[#161817]/30 hover:decoration-[#161817] transition-all py-2 px-3 cursor-pointer"
                >
                  See how it works
                </button>
              </div>

            </div>
          </section>

          {/* Editorial Photo Pair (38:62 Split) */}
          <section className="mb-14 sm:mb-20" aria-label="Studio Teni Story">
            <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-[38fr_62fr] gap-4">
                
                {/* Left Card (38% width): Stylist styling hair in a salon */}
                <div className="relative rounded-[20px] sm:rounded-[26px] overflow-hidden h-[340px] sm:h-[460px] bg-[#161817]/5 shadow-sm">
                  <img
                    src="/stylist-portrait.jpg"
                    alt="Stylist styling hair in a salon"
                    className="w-full h-full object-cover object-[center_25%]"
                  />
                  {/* Restrained Overlay */}
                  <div className="absolute bottom-5 left-5 bg-[#161817]/88 backdrop-blur-md text-[#F7F6F0] rounded-full px-4 py-2 text-xs sm:text-[13px] font-semibold shadow-lg pointer-events-none">
                    Saturday · 2 openings
                  </div>
                </div>

                {/* Right Card (62% width): Barber consulting with a client */}
                <div className="relative rounded-[20px] sm:rounded-[26px] overflow-hidden h-[340px] sm:h-[460px] bg-[#161817]/5 shadow-sm">
                  <img
                    src="/stylist-consultation.jpg"
                    alt="Barber consulting with a client in a studio"
                    className="w-full h-full object-cover object-[center_18%]"
                  />
                  {/* Restrained Overlay */}
                  <div className="absolute bottom-5 right-5 bg-[#161817]/88 backdrop-blur-md text-[#F7F6F0] rounded-full px-4 py-2 text-xs sm:text-[13px] font-semibold shadow-lg pointer-events-none">
                    Rebooking email ready to review
                  </div>
                </div>

              </div>

              {/* Caption */}
              <div className="mt-3 text-right text-xs font-mono font-medium text-[#161817]/50 tracking-wider">
                Studio Teni · Example business
              </div>
            </div>
          </section>

          {/* ==========================================================================
               One Product Story ("While you’re with a client")
               ========================================================================== */}
          <section id="see-vela-at-work" className="py-14 sm:py-20 border-t border-[#161817]/08" aria-labelledby="story-heading">
            {/* Anchor aliases for legacy links */}
            <div id="what-vela-does" className="relative -top-10" />
            <div id="agent-demo" className="relative -top-10" />
            <div id="how-it-works" className="relative -top-10" />

            <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-10 lg:gap-16 items-start text-left">
                
                {/* Left Column: Heading & Caption */}
                <div className="lg:sticky lg:top-24">
                  <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#161817]/60 mb-2">
                    An example day at Studio Teni
                  </div>
                  <h2 id="story-heading" className="text-3xl sm:text-4xl lg:text-[40px] font-semibold tracking-[-0.03em] leading-tight text-[#161817]">
                    While you’re with a client
                  </h2>
                </div>

                {/* Right Column: Semantic List of All 3 Moments */}
                <div>
                  <ol className="space-y-8 sm:space-y-10">
                    
                    {/* Moment 1: 9:00 AM */}
                    <li className="relative flex gap-5 items-start">
                      <div className="relative flex flex-col items-center flex-shrink-0 pt-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#161817] ring-2 ring-[#C5F36A] z-10" />
                        <span className="absolute top-4 -bottom-10 w-[2px] bg-[#C5F36A]" aria-hidden="true" />
                      </div>
                      <div className="flex-1">
                        <div className="text-base sm:text-[17px] font-bold text-[#161817] mb-1">
                          9:00 AM · Appointment reminder
                        </div>
                        <p className="text-sm sm:text-[15px] text-[#161817]/70 leading-relaxed max-w-[540px]">
                          Ada receives her appointment time and studio address while Teni sets up.
                        </p>
                      </div>
                    </li>

                    {/* Moment 2: 12:30 PM */}
                    <li className="relative flex gap-5 items-start">
                      <div className="relative flex flex-col items-center flex-shrink-0 pt-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#161817] ring-2 ring-[#C5F36A] z-10" />
                        <span className="absolute top-4 -bottom-10 w-[2px] bg-[#C5F36A]" aria-hidden="true" />
                      </div>
                      <div className="flex-1">
                        <div className="text-base sm:text-[17px] font-bold text-[#161817] mb-1">
                          12:30 PM · Deposit received
                        </div>
                        <p className="text-sm sm:text-[15px] text-[#161817]/70 leading-relaxed max-w-[540px]">
                          A client books through Teni’s website and pays her deposit. The appointment appears on the calendar.
                        </p>
                      </div>
                    </li>

                    {/* Moment 3: 4:00 PM */}
                    <li className="relative flex gap-5 items-start">
                      <div className="relative flex flex-col items-center flex-shrink-0 pt-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#161817] ring-2 ring-[#C5F36A] z-10" />
                      </div>
                      <div className="flex-1">
                        <div className="text-base sm:text-[17px] font-bold text-[#161817] mb-1">
                          4:00 PM · Rebooking email drafted
                        </div>
                        <p className="text-sm sm:text-[15px] text-[#161817]/70 leading-relaxed max-w-[540px]">
                          Teni asks Vela to fill Saturday’s gaps. Vela drafts an invite for past clients who opted in.
                        </p>
                        <div className="inline-block mt-2.5 text-xs font-semibold text-[#161817]/70 bg-[#161817]/[0.04] border-l-2 border-[#C5F36A] px-2.5 py-1 rounded-r">
                          Teni reviews the email before it goes out.
                        </div>
                      </div>
                    </li>

                  </ol>
                </div>

              </div>
            </div>
          </section>

          {/* ==========================================================================
               Pricing Section ("Simple quarterly plans")
               ========================================================================== */}
          <section id="pricing" className="py-14 sm:py-20 bg-[#F1EFE6]/40 border-t border-[#161817]/08">
            <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
              
              <div className="text-center max-w-[680px] mx-auto mb-10 sm:mb-14">
                <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#161817]">
                  Simple quarterly plans
                </h2>
              </div>

              {/* Pricing Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch text-left">
                
                {/* Starter Plan */}
                <div className="bg-white border border-[#161817]/10 rounded-3xl p-7 sm:p-8 flex flex-col justify-between shadow-sm">
                  <div>
                    <h3 className="text-xl font-bold text-[#161817] mb-1">Starter</h3>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-lg font-bold text-[#161817]">₦</span>
                      <span className="text-4xl font-extrabold text-[#161817] tracking-tight">10,000</span>
                      <span className="text-xs text-[#161817]/60 font-medium">/ quarter</span>
                    </div>

                    <ul className="space-y-3 text-xs sm:text-[13.5px] text-[#161817]/80 pb-6 border-b border-[#161817]/08">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#16a34a] shrink-0 mt-0.5" />
                        <span>1 provider profile &amp; unlimited bookings</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#16a34a] shrink-0 mt-0.5" />
                        <span>Dedicated booking website (vela.ng/p/yourname)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#16a34a] shrink-0 mt-0.5" />
                        <span>Automated email confirmations &amp; receipts</span>
                      </li>
                    </ul>
                  </div>

                  <Link
                    to="/register?plan=starter"
                    className="w-full mt-6 py-3 bg-[#161817] text-white rounded-full text-center text-xs sm:text-sm font-bold hover:bg-[#272a29] transition-colors shadow-sm"
                  >
                    Get started
                  </Link>
                </div>

                {/* Growth Plan */}
                <div className="bg-white border border-[#161817]/10 rounded-3xl p-7 sm:p-8 flex flex-col justify-between shadow-sm">
                  <div>
                    <h3 className="text-xl font-bold text-[#161817] mb-1">Growth</h3>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-lg font-bold text-[#161817]">₦</span>
                      <span className="text-4xl font-extrabold text-[#161817] tracking-tight">15,000</span>
                      <span className="text-xs text-[#161817]/60 font-medium">/ quarter</span>
                    </div>

                    <ul className="space-y-3 text-xs sm:text-[13.5px] text-[#161817]/80 pb-6 border-b border-[#161817]/08">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#16a34a] shrink-0 mt-0.5" />
                        <span>Up to 3 staff members &amp; calendar sync</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#16a34a] shrink-0 mt-0.5" />
                        <span>Automated SMS &amp; WhatsApp reminders</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#16a34a] shrink-0 mt-0.5" />
                        <span>Instant Paystack &amp; Moniepoint deposits</span>
                      </li>
                    </ul>
                  </div>

                  <Link
                    to="/register?plan=growth"
                    className="w-full mt-6 py-3 bg-[#161817] text-white rounded-full text-center text-xs sm:text-sm font-bold hover:bg-[#272a29] transition-colors shadow-sm"
                  >
                    Get started
                  </Link>
                </div>

                {/* Scale Plan */}
                <div className="bg-white border border-[#161817]/10 rounded-3xl p-7 sm:p-8 flex flex-col justify-between shadow-sm">
                  <div>
                    <h3 className="text-xl font-bold text-[#161817] mb-1">Scale</h3>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-lg font-bold text-[#161817]">₦</span>
                      <span className="text-4xl font-extrabold text-[#161817] tracking-tight">25,000</span>
                      <span className="text-xs text-[#161817]/60 font-medium">/ quarter</span>
                    </div>

                    <ul className="space-y-3 text-xs sm:text-[13.5px] text-[#161817]/80 pb-6 border-b border-[#161817]/08">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#16a34a] shrink-0 mt-0.5" />
                        <span>Multiple locations &amp; team permissions</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#16a34a] shrink-0 mt-0.5" />
                        <span>Custom domain booking page (.biz eligible)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#16a34a] shrink-0 mt-0.5" />
                        <span>Dedicated WhatsApp concierge support</span>
                      </li>
                    </ul>
                  </div>

                  <Link
                    to="/register?plan=scale"
                    className="w-full mt-6 py-3 bg-[#161817] text-white rounded-full text-center text-xs sm:text-sm font-bold hover:bg-[#272a29] transition-colors shadow-sm"
                  >
                    Get started
                  </Link>
                </div>

              </div>

            </div>
          </section>

          {/* ==========================================================================
               FAQs Section ("Questions?")
               ========================================================================== */}
          <section id="faqs" className="py-14 sm:py-20">
            <div className="max-w-[760px] mx-auto px-4 sm:px-6">
              
              <div className="text-center mb-8 sm:mb-12">
                <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#161817]">
                  Questions?
                </h2>
              </div>

              <div className="space-y-3 text-left">
                
                {/* FAQ 1 */}
                <div className="bg-white border border-[#161817]/10 rounded-2xl overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => toggleFaq(1)}
                    className="w-full px-5 sm:px-6 py-4 sm:py-5 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-[#161817] hover:bg-[#FAF9F5] transition-colors cursor-pointer"
                  >
                    <span>Do I get a booking website?</span>
                    <ChevronDown className={`w-4 h-4 text-[#161817]/60 transition-transform ${activeFaq === 1 ? 'rotate-180' : ''}`} />
                  </button>
                  {activeFaq === 1 && (
                    <div className="px-5 sm:px-6 pb-5 pt-1 text-xs sm:text-sm text-[#161817]/70 leading-relaxed border-t border-[#161817]/06">
                      Yes. Every plan includes your own dedicated booking page (e.g. <code>vela.ng/p/yourname</code>) where clients can view services, pick open times, and pay deposits. On the Scale plan, you can connect your own custom domain (e.g. <code>yourname.biz</code>).
                    </div>
                  )}
                </div>

                {/* FAQ 2 */}
                <div className="bg-white border border-[#161817]/10 rounded-2xl overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => toggleFaq(2)}
                    className="w-full px-5 sm:px-6 py-4 sm:py-5 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-[#161817] hover:bg-[#FAF9F5] transition-colors cursor-pointer"
                  >
                    <span>Which messages can Vela send?</span>
                    <ChevronDown className={`w-4 h-4 text-[#161817]/60 transition-transform ${activeFaq === 2 ? 'rotate-180' : ''}`} />
                  </button>
                  {activeFaq === 2 && (
                    <div className="px-5 sm:px-6 pb-5 pt-1 text-xs sm:text-sm text-[#161817]/70 leading-relaxed border-t border-[#161817]/06">
                      Vela sends automated booking confirmations, 24-hour appointment reminders with studio directions, and targeted rebooking invites to past clients who opted in.
                    </div>
                  )}
                </div>

                {/* FAQ 3 */}
                <div className="bg-white border border-[#161817]/10 rounded-2xl overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => toggleFaq(3)}
                    className="w-full px-5 sm:px-6 py-4 sm:py-5 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-[#161817] hover:bg-[#FAF9F5] transition-colors cursor-pointer"
                  >
                    <span>Can I review campaigns first?</span>
                    <ChevronDown className={`w-4 h-4 text-[#161817]/60 transition-transform ${activeFaq === 3 ? 'rotate-180' : ''}`} />
                  </button>
                  {activeFaq === 3 && (
                    <div className="px-5 sm:px-6 pb-5 pt-1 text-xs sm:text-sm text-[#161817]/70 leading-relaxed border-t border-[#161817]/06">
                      Yes, always. Rebooking emails and marketing messages are drafted for your review. You have complete control to edit the text or discard the draft before anything is sent.
                    </div>
                  )}
                </div>

              </div>

            </div>
          </section>

          {/* ==========================================================================
               Dark Closing Card
               ========================================================================== */}
          <section className="py-12 sm:py-16">
            <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
              <div className="bg-[#161817] rounded-[24px] sm:rounded-[28px] p-8 sm:p-14 text-center text-[#F7F6F0]">
                <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] mb-6">
                  Ready to set up Vela?
                </h2>
                <div className="flex items-center justify-center">
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center bg-[#C5F36A] text-[#161817] rounded-full px-8 h-12 text-[15px] font-bold hover:bg-[#d4f78e] transition-all shadow-md"
                  >
                    Get started
                  </Link>
                </div>
              </div>
            </div>
          </section>

        </main>

        {/* Footer (Dark Ink Background) */}
        <footer className="bg-[#161817] text-[#F7F6F0] py-12 sm:py-14 relative z-10 border-t border-white/10">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
            
            <div className="flex flex-col md:flex-row justify-between gap-10 pb-10 border-b border-white/10">
              {/* Brand Column */}
              <div className="max-w-sm text-left">
                <Link to="/" className="inline-flex items-center gap-1.5 mb-3" aria-label="Vela AI Homepage">
                  <img src="/vela-logo-lime-opt.png" alt="vela" className="h-8 w-auto object-contain" />
                  <span className="bg-[#C5F36A] text-[#161817] text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase font-mono">
                    AI
                  </span>
                </Link>
                <p className="text-sm text-[#F7F6F0]/60 leading-relaxed">
                  The AI agent for service businesses. Give clients a website to book and pay a deposit. Vela sends reminders and helps you bring past clients back.
                </p>
              </div>

              {/* Navigation Columns */}
              <div className="grid grid-cols-2 gap-8 sm:gap-16 text-left">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#F7F6F0]/40 mb-3.5">Product</div>
                  <ul className="space-y-2.5 text-xs sm:text-[13px] text-[#F7F6F0]/70">
                    <li>
                      <button 
                        type="button" 
                        onClick={() => scrollToSection('see-vela-at-work')} 
                        className="hover:text-[#F7F6F0] transition-colors cursor-pointer"
                      >
                        How it works
                      </button>
                    </li>
                    <li>
                      <button 
                        type="button" 
                        onClick={() => scrollToSection('pricing')} 
                        className="hover:text-[#F7F6F0] transition-colors cursor-pointer"
                      >
                        Pricing
                      </button>
                    </li>
                    <li><Link to="/login" className="hover:text-[#F7F6F0] transition-colors">Log in</Link></li>
                  </ul>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#F7F6F0]/40 mb-3.5">Support &amp; Legal</div>
                  <ul className="space-y-2.5 text-xs sm:text-[13px] text-[#F7F6F0]/70">
                    <li><a href="mailto:support@vela.ng" className="hover:text-[#F7F6F0] transition-colors">Help &amp; support</a></li>
                    <li>
                      <a
                        href="https://wa.me/2348123843076"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#F7F6F0] transition-colors"
                      >
                        WhatsApp concierge
                      </a>
                    </li>
                    <li><Link to="/privacy" className="hover:text-[#F7F6F0] transition-colors">Privacy policy</Link></li>
                    <li><Link to="/terms" className="hover:text-[#F7F6F0] transition-colors">Terms of service</Link></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#F7F6F0]/50">
              <p>&copy; 2026 Vela Technologies. All rights reserved.</p>
              <div className="inline-flex items-center gap-1.5 bg-white/05 px-3 py-1 rounded-full border border-white/10 text-[11px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C5F36A]" />
                <span>Lagos, Nigeria (WAT)</span>
              </div>
            </div>

          </div>
        </footer>

      </div>
    </div>
  );
};

export default VelaLanding;
