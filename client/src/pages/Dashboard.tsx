import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowUp,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Send,
  FileText,
  User,
  Scissors,
  Camera,
  Share2,
  ExternalLink,
  ChevronRight,
  Plus,
  Trash2,
  Edit3,
  MapPin,
  Phone,
  RefreshCw,
  Image as ImageIcon,
  ShieldCheck,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { VelaLogo } from '../components/ui/VelaLogo';

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  widgetType?: 'fill_openings' | 'wedding_quote' | 'friday_shoot' | 'walk_in' | 'block_calendar' | 'gallery_upload' | 'general';
  widgetData?: any;
}

interface ActiveTask {
  id: string;
  title: string;
  category: string;
  updatedAt: string;
  messages: ChatMessage[];
  stateData?: any;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Trade/role context toggle (Barber vs Photographer)
  const [tradeContext, setTradeContext] = useState<'barber' | 'photographer'>(() => {
    if (user?.industry === 'fitness' || user?.industry === 'beauty') return 'barber';
    return (localStorage.getItem('vela_trade_context') as 'barber' | 'photographer') || 'barber';
  });

  // Input state
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedBookingModal, setSelectedBookingModal] = useState<any | null>(null);

  // Active conversation state
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(() => {
    const taskId = searchParams.get('task');
    if (taskId) {
      try {
        const savedTasks = localStorage.getItem('vela_agent_tasks');
        if (savedTasks) {
          const parsed: ActiveTask[] = JSON.parse(savedTasks);
          const found = parsed.find(t => t.id === taskId);
          if (found) return found;
        }
      } catch (e) {}
    }
    return null;
  });

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeTask && activeTask.messages.length > 0) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTask?.messages, isProcessing]);

  // Sync trade context to localStorage
  const handleTradeChange = (newTrade: 'barber' | 'photographer') => {
    setTradeContext(newTrade);
    localStorage.setItem('vela_trade_context', newTrade);
  };

  // Listen for custom events from Sidebar
  useEffect(() => {
    const handleNewTaskEvent = () => {
      setActiveTask(null);
      setSearchParams({});
    };

    const handleOpenTaskEvent = (e: any) => {
      const taskId = e.detail?.taskId;
      if (taskId) {
        loadTaskById(taskId);
      }
    };

    window.addEventListener('vela_new_task', handleNewTaskEvent);
    window.addEventListener('vela_open_task', handleOpenTaskEvent);
    return () => {
      window.removeEventListener('vela_new_task', handleNewTaskEvent);
      window.removeEventListener('vela_open_task', handleOpenTaskEvent);
    };
  }, []);

  // Save tasks to localStorage and update Recent Tasks in sidebar
  const persistTask = (task: ActiveTask) => {
    try {
      const savedTasks = localStorage.getItem('vela_agent_tasks');
      let tasksList: ActiveTask[] = savedTasks ? JSON.parse(savedTasks) : [];
      const existingIndex = tasksList.findIndex(t => t.id === task.id);
      if (existingIndex >= 0) {
        tasksList[existingIndex] = task;
      } else {
        tasksList.unshift(task);
      }
      localStorage.setItem('vela_agent_tasks', JSON.stringify(tasksList));

      // Update recent tasks metadata for sidebar
      const recentList = tasksList.slice(0, 6).map(t => ({
        id: t.id,
        title: t.title,
        category: t.category,
        updatedAt: t.updatedAt
      }));
      localStorage.setItem('vela_recent_tasks', JSON.stringify(recentList));
      window.dispatchEvent(new CustomEvent('vela_tasks_updated'));
    } catch (e) {
      console.error('Failed to persist task', e);
    }
  };

  const loadTaskById = (taskId: string) => {
    try {
      const savedTasks = localStorage.getItem('vela_agent_tasks');
      if (savedTasks) {
        const parsed: ActiveTask[] = JSON.parse(savedTasks);
        const found = parsed.find(t => t.id === taskId);
        if (found) {
          setActiveTask(found);
          return;
        }
      }
    } catch (e) {}

    // Fallback preset tasks if not yet saved in localStorage
    if (taskId === 'task-amaka-quote') {
      startAmakaQuoteTask();
    } else if (taskId === 'task-fill-slots') {
      startFillOpeningsTask();
    } else if (taskId === 'task-friday-shoot') {
      startFridayShootTask();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. END-TO-END WORKFLOW: "Fill my empty slots tomorrow"
  // ─────────────────────────────────────────────────────────────────────────────
  const startFillOpeningsTask = () => {
    const taskId = 'task-fill-slots';
    const initialTask: ActiveTask = {
      id: taskId,
      title: 'Fill tomorrow’s open slots',
      category: 'Outreach',
      updatedAt: 'Just now',
      messages: [
        {
          id: 'm1',
          sender: 'user',
          text: 'Fill my empty slots tomorrow.',
          timestamp: '1:02 PM'
        },
        {
          id: 'm2',
          sender: 'agent',
          text: 'I checked tomorrow’s schedule with Dele. You have two open appointment slots:',
          timestamp: '1:02 PM',
          widgetType: 'fill_openings',
          widgetData: {
            slots: [
              { time: '11:00 AM', finishTime: '11:45 AM', bufferEnd: '11:55 AM', barber: 'Dele', chair: 'Chair 1' },
              { time: '2:30 PM', finishTime: '3:15 PM', bufferEnd: '3:25 PM', barber: 'Dele', chair: 'Chair 1' }
            ],
            recipients: [
              {
                id: 'c1',
                name: 'Femi Adeleke',
                phone: '+234 803 111 2233',
                service: 'Haircut & Beard trim',
                reason: 'Due for cut · Last visit 22 days ago',
                proposedMessage: 'Hi Femi! Dele has an opening tomorrow at 11:00 AM at Studio Teni. Would you like me to hold it for you?'
              },
              {
                id: 'c2',
                name: 'Chidi Nnamdi',
                phone: '+234 812 444 5566',
                service: 'Low Taper & Beard',
                reason: 'Enquired about open slots last week',
                proposedMessage: 'Hi Chidi! A 2:30 PM slot just opened up with Dele tomorrow. Tap here to lock it with a quick deposit: https://studioteni.vela.ng/p/dele'
              }
            ],
            status: 'draft', // 'draft' | 'sending' | 'sent'
            shareLink: 'https://studioteni.vela.ng/book?date=tomorrow'
          }
        }
      ]
    };
    setActiveTask(initialTask);
    persistTask(initialTask);
    setSearchParams({ task: taskId });
  };

  const handleSendSlotOutreach = (recipientsCount: number) => {
    if (!activeTask) return;
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      const updatedMessages = activeTask.messages.map(m => {
        if (m.widgetType === 'fill_openings') {
          return {
            ...m,
            widgetData: {
              ...m.widgetData,
              status: 'sent',
              sentCount: recipientsCount,
              sentTime: '1:15 PM'
            }
          };
        }
        return m;
      });

      const updatedTask = {
        ...activeTask,
        updatedAt: 'Just now',
        messages: [
          ...updatedMessages,
          {
            id: 'm-sent-conf',
            sender: 'agent' as const,
            text: `Rechecked calendar and recipient eligibility. Personalized WhatsApp invitations delivered to ${recipientsCount} clients. The slots remain open on your website until confirmed.`,
            timestamp: '1:15 PM'
          }
        ]
      };
      setActiveTask(updatedTask);
      persistTask(updatedTask);
    }, 900);
  };

  const handleRemoveRecipient = (recipientId: string) => {
    if (!activeTask) return;
    const updatedMessages = activeTask.messages.map(m => {
      if (m.widgetType === 'fill_openings') {
        const remaining = m.widgetData.recipients.filter((r: any) => r.id !== recipientId);
        return {
          ...m,
          widgetData: {
            ...m.widgetData,
            recipients: remaining
          }
        };
      }
      return m;
    });

    const updatedTask = { ...activeTask, messages: updatedMessages };
    setActiveTask(updatedTask);
    persistTask(updatedTask);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. END-TO-END WORKFLOW: "Prepare a ₦450,000 wedding quote for Amaka"
  // ─────────────────────────────────────────────────────────────────────────────
  const startAmakaQuoteTask = () => {
    const taskId = 'task-amaka-quote';
    const initialTask: ActiveTask = {
      id: taskId,
      title: 'Amaka’s wedding quotation',
      category: 'Quotes',
      updatedAt: 'Just now',
      messages: [
        {
          id: 'm1',
          sender: 'user',
          text: 'Prepare a ₦450,000 wedding quote for Amaka with a 40% deposit.',
          timestamp: '11:40 AM'
        },
        {
          id: 'm2',
          sender: 'agent',
          text: 'Found Amaka Okonkwo’s enquiry for her wedding on December 12 in Victoria Island. Here is the draft quote prepared for your review:',
          timestamp: '11:40 AM',
          widgetType: 'wedding_quote',
          widgetData: {
            quoteNumber: 'VQ-2026-088',
            clientName: 'Amaka Okonkwo',
            phone: '+234 802 333 4455',
            eventDate: 'Saturday, 12 December 2026',
            venue: 'Victoria Island, Lagos',
            coverage: '8 hours coverage · 2 photographers · Pre-wedding consultation',
            deliverables: '350 edited high-res images, online client gallery, and 1 luxury linen photobook (30 pages).',
            totalAmount: 450000,
            depositPercent: 40,
            depositAmount: 180000,
            remainingBalance: 270000,
            status: 'draft', // 'draft' | 'sent' | 'paid'
            isEditing: false
          }
        }
      ]
    };
    setActiveTask(initialTask);
    persistTask(initialTask);
    setSearchParams({ task: taskId });
  };

  const handleApproveAndSendQuote = () => {
    if (!activeTask) return;
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      const updatedMessages = activeTask.messages.map(m => {
        if (m.widgetType === 'wedding_quote') {
          return {
            ...m,
            widgetData: {
              ...m.widgetData,
              status: 'sent',
              sentTime: '11:45 AM'
            }
          };
        }
        return m;
      });

      const updatedTask = {
        ...activeTask,
        updatedAt: 'Just now',
        messages: [
          ...updatedMessages,
          {
            id: 'm-quote-sent',
            sender: 'agent' as const,
            text: 'Quote #VQ-2026-088 sent to Amaka via WhatsApp with branded portal link. Date is marked on hold pending deposit payment of ₦180,000.',
            timestamp: '11:45 AM'
          }
        ]
      };
      setActiveTask(updatedTask);
      persistTask(updatedTask);
    }, 800);
  };

  const handleSimulateQuotePayment = () => {
    if (!activeTask) return;
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      const updatedMessages = activeTask.messages.map(m => {
        if (m.widgetType === 'wedding_quote') {
          return {
            ...m,
            widgetData: {
              ...m.widgetData,
              status: 'paid',
              paidTime: '11:48 AM',
              receiptNumber: 'RCP-8921',
              jobId: 'VJ-402'
            }
          };
        }
        return m;
      });

      const updatedTask = {
        ...activeTask,
        updatedAt: 'Just now',
        messages: [
          ...updatedMessages,
          {
            id: 'm-quote-paid',
            sender: 'agent' as const,
            text: 'Verified Paystack deposit receipt of ₦180,000 from Amaka Okonkwo. Created Job #VJ-402 and opened client welcome onboarding checklist. Remaining balance of ₦270,000 scheduled for post-event delivery.',
            timestamp: '11:48 AM'
          }
        ]
      };
      setActiveTask(updatedTask);
      persistTask(updatedTask);
    }, 800);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. END-TO-END WORKFLOW: "Get Friday’s shoot ready"
  // ─────────────────────────────────────────────────────────────────────────────
  const startFridayShootTask = () => {
    const taskId = 'task-friday-shoot';
    const initialTask: ActiveTask = {
      id: taskId,
      title: 'Friday shoot preparation',
      category: 'Shoot prep',
      updatedAt: 'Just now',
      messages: [
        {
          id: 'm1',
          sender: 'user',
          text: 'Get Friday’s shoot ready.',
          timestamp: '9:15 AM'
        },
        {
          id: 'm2',
          sender: 'agent',
          text: 'Here is the operational brief for Friday’s shoot with the Balogun family. Deposit and shot list are confirmed, but the venue address is still missing:',
          timestamp: '9:15 AM',
          widgetType: 'friday_shoot',
          widgetData: {
            jobId: 'VJ-394',
            clientName: 'Mrs. Yemi Balogun',
            phone: '+234 809 555 7788',
            dateTime: 'Friday, 28 Nov · 10:00 AM',
            photographer: 'Teni (Lead) + Samuel (Assistant)',
            package: 'Full Day Wedding & Reception Coverage',
            totalAgreed: 350000,
            depositPaid: 140000,
            balanceDue: 210000,
            checklist: [
              { id: 'item-1', label: 'Deposit paid (₦140,000 verified)', done: true },
              { id: 'item-2', label: 'Family shot list submitted', done: true },
              { id: 'item-3', label: 'Venue address & reception directions', done: false, missing: true },
              { id: 'item-4', label: 'Event coordinator phone contact', done: true, value: 'Ronke (+234 803 777 9900)' }
            ],
            preparedMessage: 'Good morning Mrs. Balogun! ✨ Just finalizing prep for Friday’s 10:00 AM shoot. Could you please share the exact church & reception address so Samuel and I can schedule equipment setup?',
            venueAddress: '',
            status: 'pending_venue' // 'pending_venue' | 'message_sent' | 'address_received'
          }
        }
      ]
    };
    setActiveTask(initialTask);
    persistTask(initialTask);
    setSearchParams({ task: taskId });
  };

  const handleSendVenueRequest = () => {
    if (!activeTask) return;
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      const updatedMessages = activeTask.messages.map(m => {
        if (m.widgetType === 'friday_shoot') {
          return {
            ...m,
            widgetData: {
              ...m.widgetData,
              status: 'message_sent'
            }
          };
        }
        return m;
      });

      const updatedTask = {
        ...activeTask,
        updatedAt: 'Just now',
        messages: [
          ...updatedMessages,
          {
            id: 'm-venue-req-sent',
            sender: 'agent' as const,
            text: 'Venue request message sent to Mrs. Balogun via WhatsApp. I will automatically update the job brief the moment she replies.',
            timestamp: '9:18 AM'
          }
        ]
      };
      setActiveTask(updatedTask);
      persistTask(updatedTask);
    }, 700);
  };

  const handleSimulateAddressReceived = () => {
    if (!activeTask) return;
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      const updatedMessages = activeTask.messages.map(m => {
        if (m.widgetType === 'friday_shoot') {
          const updatedChecklist = m.widgetData.checklist.map((item: any) => {
            if (item.id === 'item-3') {
              return { ...item, done: true, missing: false, value: 'Catholic Church of Divine Mercy, Admiralty Way, Lekki Phase 1' };
            }
            return item;
          });
          return {
            ...m,
            widgetData: {
              ...m.widgetData,
              status: 'address_received',
              venueAddress: 'Catholic Church of Divine Mercy, Admiralty Way, Lekki Phase 1',
              checklist: updatedChecklist
            }
          };
        }
        return m;
      });

      const updatedTask = {
        ...activeTask,
        updatedAt: 'Just now',
        messages: [
          ...updatedMessages,
          {
            id: 'm-address-rcvd',
            sender: 'agent' as const,
            text: 'Client replied with address: "Catholic Church of Divine Mercy, Admiralty Way, Lekki Phase 1." Updated Job Brief #VJ-394. All mandatory checklist items are now complete for Friday’s shoot!',
            timestamp: '9:22 AM'
          }
        ]
      };
      setActiveTask(updatedTask);
      persistTask(updatedTask);
    }, 750);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. ADDITIONAL WORKFLOWS: Walk-in, Calendar Block, Gallery Upload
  // ─────────────────────────────────────────────────────────────────────────────
  const handleGenericSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setInputValue('');
    const lower = trimmed.toLowerCase();

    // Route to appropriate workflow or handle conversational reply
    if (lower.includes('fill') || lower.includes('open slots') || lower.includes('empty slots')) {
      startFillOpeningsTask();
      return;
    }
    if (lower.includes('amaka') || lower.includes('wedding quote') || lower.includes('quote')) {
      startAmakaQuoteTask();
      return;
    }
    if (lower.includes('friday') || lower.includes('shoot ready') || lower.includes('shoot')) {
      startFridayShootTask();
      return;
    }

    // Add Walk-in
    if (lower.includes('walk-in') || lower.includes('walk in')) {
      const taskId = `task-walkin-${Date.now()}`;
      const newTask: ActiveTask = {
        id: taskId,
        title: 'Walk-in for Dele',
        category: 'Walk-in',
        updatedAt: 'Just now',
        messages: [
          { id: 'm1', sender: 'user', text: trimmed, timestamp: 'Now' },
          {
            id: 'm2',
            sender: 'agent',
            text: 'Dele is available right now at Chair 1 until 2:00 PM. Here is the quick booking card:',
            timestamp: 'Now',
            widgetType: 'walk_in',
            widgetData: {
              barber: 'Dele',
              chair: 'Chair 1',
              service: 'Haircut & Beard Trim (₦10,000)',
              time: 'Now (Immediate)',
              confirmed: false
            }
          }
        ]
      };
      setActiveTask(newTask);
      persistTask(newTask);
      setSearchParams({ task: taskId });
      return;
    }

    // Block Calendar
    if (lower.includes('block') || lower.includes('calendar from 2 to 4')) {
      const taskId = `task-block-${Date.now()}`;
      const newTask: ActiveTask = {
        id: taskId,
        title: 'Calendar block (2:00 – 4:00 PM)',
        category: 'Calendar',
        updatedAt: 'Just now',
        messages: [
          { id: 'm1', sender: 'user', text: trimmed, timestamp: 'Now' },
          {
            id: 'm2',
            sender: 'agent',
            text: 'I checked your calendar for today between 2:00 PM and 4:00 PM. No existing appointments are scheduled in this window. Would you like me to block this time?',
            timestamp: 'Now',
            widgetType: 'block_calendar',
            widgetData: {
              timeWindow: '2:00 PM – 4:00 PM today',
              affectedBookings: 0,
              blocked: false
            }
          }
        ]
      };
      setActiveTask(newTask);
      persistTask(newTask);
      setSearchParams({ task: taskId });
      return;
    }

    // Gallery upload
    if (lower.includes('gallery') || lower.includes('photos')) {
      const taskId = `task-gallery-${Date.now()}`;
      const newTask: ActiveTask = {
        id: taskId,
        title: 'Publish style photos',
        category: 'Gallery',
        updatedAt: 'Just now',
        messages: [
          { id: 'm1', sender: 'user', text: trimmed, timestamp: 'Now' },
          {
            id: 'm2',
            sender: 'agent',
            text: 'I can publish your new style photos directly to your website gallery. When visitors tap "Book this look", they will arrive at booking with this exact service selected.',
            timestamp: 'Now',
            widgetType: 'gallery_upload',
            widgetData: {
              published: false
            }
          }
        ]
      };
      setActiveTask(newTask);
      persistTask(newTask);
      setSearchParams({ task: taskId });
      return;
    }

    // Default Conversational Reply
    const userMsg: ChatMessage = { id: `m-${Date.now()}`, sender: 'user', text: trimmed, timestamp: 'Now' };
    let currentTask = activeTask;
    if (!currentTask) {
      const newId = `task-${Date.now()}`;
      currentTask = {
        id: newId,
        title: trimmed.slice(0, 32),
        category: 'Instruction',
        updatedAt: 'Just now',
        messages: [userMsg]
      };
      setSearchParams({ task: newId });
    } else {
      currentTask = {
        ...currentTask,
        messages: [...currentTask.messages, userMsg]
      };
    }

    setActiveTask(currentTask);
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      const agentReply: ChatMessage = {
        id: `m-rep-${Date.now()}`,
        sender: 'agent',
        text: `I’ve checked your business data for "${trimmed}". Everything is synced and ready. What specific action would you like me to take next?`,
        timestamp: 'Just now',
        widgetType: 'general'
      };
      const finalTask = {
        ...currentTask!,
        updatedAt: 'Just now',
        messages: [...currentTask!.messages, agentReply]
      };
      setActiveTask(finalTask);
      persistTask(finalTask);
    }, 700);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenericSend(inputValue);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F7F6F0] text-[#161817]">
      
      {/* ─────────────────────────────────────────────────────────────────────────
          STATE A: HOME SCREEN (What do you need done?)
          ───────────────────────────────────────────────────────────────────────── */}
      {!activeTask ? (
        <div className="flex-1 flex flex-col justify-center px-4 py-8 sm:py-12 max-w-2xl mx-auto w-full animate-in fade-in duration-300">
          
          {/* Trade Context Switcher (Discreet & practical) */}
          <div className="flex items-center justify-between mb-8">
            <div className="inline-flex items-center gap-1.5 p-1 bg-[#161817]/5 rounded-xl border border-[#161817]/10">
              <button
                type="button"
                onClick={() => handleTradeChange('barber')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  tradeContext === 'barber'
                    ? 'bg-[#161817] text-[#F7F6F0] shadow-xs'
                    : 'text-[#161817]/60 hover:text-[#161817]'
                )}
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Barber & Salon</span>
              </button>
              <button
                type="button"
                onClick={() => handleTradeChange('photographer')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  tradeContext === 'photographer'
                    ? 'bg-[#161817] text-[#F7F6F0] shadow-xs'
                    : 'text-[#161817]/60 hover:text-[#161817]'
                )}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Photographer & Studio</span>
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#161817]/50 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse"></span>
              <span>Vela Active</span>
            </div>
          </div>

          {/* Headline */}
          <div className="mb-6 space-y-1">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#161817]">
              What do you need done?
            </h1>
            <p className="text-xs sm:text-sm text-[#161817]/60 font-normal">
              Give Vela an instruction in everyday language. Inspect, approve, and track.
            </p>
          </div>

          {/* Large Prompt Input Box */}
          <div className="relative bg-white border border-[#161817]/15 rounded-2xl shadow-sm focus-within:border-[#161817] focus-within:ring-2 focus-within:ring-[#161817]/10 transition-all p-3 sm:p-4 mb-4">
            <textarea
              ref={inputRef}
              rows={3}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Vela to do something for your business…"
              className="w-full bg-transparent resize-none text-sm text-[#161817] placeholder:text-[#161817]/40 focus:outline-none"
            />
            <div className="flex items-center justify-between pt-2 border-t border-[#161817]/5">
              <span className="text-[11px] text-[#161817]/40 hidden sm:inline">
                Press <strong>Enter</strong> to send
              </span>
              <button
                type="button"
                onClick={() => handleGenericSend(inputValue)}
                disabled={!inputValue.trim()}
                className="ml-auto p-2 rounded-xl bg-[#161817] text-[#F7F6F0] hover:bg-[#282b29] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                aria-label="Send instruction"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* 3 Short Real Workflow Suggestions */}
          <div className="space-y-2 mb-8">
            <p className="text-[11px] font-semibold text-[#161817]/50 uppercase tracking-wider font-mono">
              Suggested workflows
            </p>
            <div className="flex flex-wrap gap-2">
              {tradeContext === 'barber' ? (
                <>
                  <button
                    onClick={startFillOpeningsTask}
                    className="px-3.5 py-2 rounded-xl bg-white border border-[#161817]/10 text-xs font-medium text-[#161817] hover:border-[#161817]/30 hover:bg-[#161817]/5 transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>• Fill tomorrow’s open slots</span>
                  </button>
                  <button
                    onClick={() => handleGenericSend('Add a walk-in for a haircut with Dele now.')}
                    className="px-3.5 py-2 rounded-xl bg-white border border-[#161817]/10 text-xs font-medium text-[#161817] hover:border-[#161817]/30 hover:bg-[#161817]/5 transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>• Add a walk-in</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedBookingModal({
                        clientName: 'Tobi Adebayo',
                        phone: '+234 803 999 1122',
                        service: 'Haircut and beard',
                        time: '1:00 PM today',
                        barber: 'Dele',
                        chair: 'Chair 1',
                        deposit: '₦2,000 paid · ₦8,000 balance at shop'
                      });
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white border border-[#161817]/10 text-xs font-medium text-[#161817] hover:border-[#161817]/30 hover:bg-[#161817]/5 transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>• Show my next client</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={startAmakaQuoteTask}
                    className="px-3.5 py-2 rounded-xl bg-white border border-[#161817]/10 text-xs font-medium text-[#161817] hover:border-[#161817]/30 hover:bg-[#161817]/5 transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>• Prepare a quotation</span>
                  </button>
                  <button
                    onClick={() => handleGenericSend('Follow up unpaid deposits')}
                    className="px-3.5 py-2 rounded-xl bg-white border border-[#161817]/10 text-xs font-medium text-[#161817] hover:border-[#161817]/30 hover:bg-[#161817]/5 transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>• Follow up unpaid deposits</span>
                  </button>
                  <button
                    onClick={startFridayShootTask}
                    className="px-3.5 py-2 rounded-xl bg-white border border-[#161817]/10 text-xs font-medium text-[#161817] hover:border-[#161817]/30 hover:bg-[#161817]/5 transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>• Get Friday’s shoot ready</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Two Compact Practical Question Rows */}
          <div className="space-y-2 pt-2 border-t border-[#161817]/10">
            <p className="text-[11px] font-semibold text-[#161817]/50 uppercase tracking-wider font-mono">
              Live updates
            </p>
            
            {/* Row 1: Up next */}
            <div className="bg-white border border-[#161817]/10 rounded-xl p-3 sm:px-4 sm:py-3 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#16a34a] flex-shrink-0"></span>
                <p className="text-xs sm:text-[13px] text-[#161817] truncate font-medium">
                  Up next · Tobi · Haircut and beard · 1:00 pm
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedBookingModal({
                    clientName: 'Tobi Adebayo',
                    phone: '+234 803 999 1122',
                    service: 'Haircut and beard',
                    time: '1:00 PM today',
                    barber: 'Dele',
                    chair: 'Chair 1',
                    deposit: '₦2,000 paid · ₦8,000 balance at shop'
                  });
                }}
                className="px-3 py-1.5 bg-[#161817]/5 hover:bg-[#161817]/10 text-[#161817] rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
              >
                Open booking
              </button>
            </div>

            {/* Row 2: Friday's wedding shoot missing venue */}
            <div className="bg-white border border-[#161817]/10 rounded-xl p-3 sm:px-4 sm:py-3 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#f59e0b] flex-shrink-0"></span>
                <p className="text-xs sm:text-[13px] text-[#161817] truncate font-medium">
                  Friday’s wedding shoot is missing the venue address.
                </p>
              </div>
              <button
                onClick={startFridayShootTask}
                className="px-3 py-1.5 bg-[#161817] hover:bg-[#282b29] text-[#F7F6F0] rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
              >
                Prepare message
              </button>
            </div>

            {/* Row 3 (Setup): For new merchant */}
            <div className="bg-[#C5F36A]/15 border border-[#C5F36A]/50 rounded-xl p-3 sm:px-4 sm:py-2.5 flex items-center justify-between gap-3 mt-1">
              <p className="text-xs text-[#161817] font-medium">
                Want to link services to your public gallery?
              </p>
              <Link
                to="/dashboard/portfolio"
                className="text-xs font-bold text-[#161817] underline hover:opacity-80"
              >
                View gallery
              </Link>
            </div>
          </div>

        </div>
      ) : (

        /* ─────────────────────────────────────────────────────────────────────────
           STATE B: ACTIVE CONVERSATION-FIRST WORKSPACE
           ───────────────────────────────────────────────────────────────────────── */
        <div className="flex-1 flex flex-col min-h-0 relative">
          
          {/* Active Task Bar */}
          <div className="h-12 px-4 sm:px-6 bg-white/70 backdrop-blur-md border-b border-[#161817]/10 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#C5F36A] border border-[#161817]/40 flex-shrink-0"></span>
              <h2 className="text-xs sm:text-sm font-semibold text-[#161817] truncate">
                {activeTask.title}
              </h2>
              <span className="text-[11px] text-[#161817]/40 hidden sm:inline">
                · {activeTask.category}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setActiveTask(null);
                  setSearchParams({});
                }}
                className="px-2.5 py-1 text-xs text-[#161817]/70 hover:text-[#161817] hover:bg-[#161817]/5 rounded-lg transition-colors font-medium"
              >
                Close task
              </button>
            </div>
          </div>

          {/* Conversation Thread - Scrollable central column */}
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 custom-scrollbar pb-32">
            <div className="max-w-2xl mx-auto space-y-6">
              
              {activeTask.messages.map((msg) => (
                <div key={msg.id} className="space-y-3">
                  
                  {/* Sender Header */}
                  <div className="flex items-center gap-2">
                    {msg.sender === 'user' ? (
                      <div className="w-5 h-5 rounded-full bg-[#161817] text-[#F7F6F0] flex items-center justify-center text-[10px] font-bold">
                        U
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <VelaLogo size="sm" />
                      </div>
                    )}
                    <span className="text-[11px] text-[#161817]/40 font-mono">
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Message Prose */}
                  <div className={cn(
                    'text-sm leading-relaxed text-[#161817]',
                    msg.sender === 'user' ? 'font-medium pl-7' : 'font-normal'
                  )}>
                    {msg.text}
                  </div>

                  {/* ─────────────────────────────────────────────────────────────
                      INTERACTIVE WIDGET 1: Fill Openings Card
                      ───────────────────────────────────────────────────────────── */}
                  {msg.widgetType === 'fill_openings' && msg.widgetData && (
                    <div className="bg-white border border-[#161817]/15 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 animate-in fade-in duration-200">
                      
                      {/* Slots Header */}
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-[#161817]/50 uppercase tracking-wider font-mono">
                          Available Slots Tomorrow (Dele)
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {msg.widgetData.slots.map((s: any, idx: number) => (
                            <div key={idx} className="p-2.5 rounded-xl bg-[#F7F6F0] border border-[#161817]/10 flex flex-col justify-between">
                              <span className="text-sm font-bold text-[#161817]">{s.time}</span>
                              <span className="text-[11px] text-[#161817]/60">Finishes {s.finishTime} · Buffer {s.bufferEnd}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Candidate Audience */}
                      <div className="space-y-2 pt-2 border-t border-[#161817]/10">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-[#161817]/50 uppercase tracking-wider font-mono">
                            Eligible Customers ({msg.widgetData.recipients.length})
                          </span>
                          <span className="text-[11px] text-[#161817]/50">Owner approval required</span>
                        </div>

                        {msg.widgetData.recipients.length === 0 ? (
                          <div className="p-4 bg-[#F7F6F0] rounded-xl text-center text-xs text-[#161817]/60">
                            All recipients removed.
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {msg.widgetData.recipients.map((rec: any) => (
                              <div key={rec.id} className="p-3 bg-[#F7F6F0]/80 rounded-xl border border-[#161817]/10 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="text-xs font-bold text-[#161817] flex items-center gap-1.5">
                                      <span>{rec.name}</span>
                                      <span className="text-[10px] text-[#161817]/50 font-normal font-mono">{rec.phone}</span>
                                    </div>
                                    <span className="inline-block mt-0.5 text-[10.5px] px-2 py-0.5 rounded-md bg-[#C5F36A] text-[#161817] font-semibold">
                                      {rec.reason}
                                    </span>
                                  </div>
                                  {msg.widgetData.status === 'draft' && (
                                    <button
                                      onClick={() => handleRemoveRecipient(rec.id)}
                                      className="p-1 text-[#161817]/40 hover:text-red-600 rounded transition-colors"
                                      title="Remove recipient"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>

                                <div className="text-xs text-[#161817]/80 bg-white p-2.5 rounded-lg border border-[#161817]/10 italic">
                                  “{rec.proposedMessage}”
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action Bar */}
                      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5 border-t border-[#161817]/10">
                        {msg.widgetData.status === 'draft' ? (
                          <>
                            <button
                              onClick={() => handleSendSlotOutreach(msg.widgetData.recipients.length)}
                              disabled={msg.widgetData.recipients.length === 0 || isProcessing}
                              className="w-full sm:w-auto px-4 py-2 bg-[#161817] text-[#F7F6F0] hover:bg-[#282b29] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                            >
                              <Send className="w-3.5 h-3.5 text-[#C5F36A]" />
                              <span>Send to {msg.widgetData.recipients.length} customers</span>
                            </button>

                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(msg.widgetData.shareLink);
                                setCopiedLink(true);
                                setTimeout(() => setCopiedLink(false), 2000);
                              }}
                              className="w-full sm:w-auto px-3 py-2 bg-white border border-[#161817]/15 hover:bg-[#161817]/5 rounded-xl text-xs font-semibold text-[#161817] flex items-center justify-center gap-1.5 transition-colors"
                            >
                              {copiedLink ? <Check className="w-3.5 h-3.5 text-[#16a34a]" /> : <Share2 className="w-3.5 h-3.5" />}
                              <span>{copiedLink ? 'Link copied!' : 'Create shareable link'}</span>
                            </button>
                          </>
                        ) : (
                          <div className="w-full p-2.5 bg-[#16a34a]/10 border border-[#16a34a]/30 rounded-xl flex items-center justify-between text-xs text-[#16a34a] font-semibold">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Delivered to {msg.widgetData.sentCount} customers · Sent {msg.widgetData.sentTime}</span>
                            </span>
                            <span className="text-[11px] text-[#161817]/60 font-normal">Slots remain bookable</span>
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      INTERACTIVE WIDGET 2: Wedding Quote Card
                      ───────────────────────────────────────────────────────────── */}
                  {msg.widgetType === 'wedding_quote' && msg.widgetData && (
                    <div className="bg-white border border-[#161817]/15 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 animate-in fade-in duration-200">
                      
                      {/* Quote Top Bar */}
                      <div className="flex items-center justify-between border-b border-[#161817]/10 pb-3">
                        <div>
                          <div className="text-[10px] font-bold text-[#161817]/50 uppercase tracking-wider font-mono">
                            Quotation #{msg.widgetData.quoteNumber}
                          </div>
                          <h3 className="text-sm font-bold text-[#161817]">
                            {msg.widgetData.clientName}
                          </h3>
                        </div>
                        <span className={cn(
                          'text-[10.5px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono',
                          msg.widgetData.status === 'draft' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                          msg.widgetData.status === 'sent' ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                          'bg-[#C5F36A] text-[#161817] border border-[#161817]/20'
                        )}>
                          {msg.widgetData.status === 'draft' ? 'Draft' : msg.widgetData.status === 'sent' ? 'Sent · Awaiting Deposit' : 'Deposit Paid'}
                        </span>
                      </div>

                      {/* Event Details */}
                      <div className="space-y-1.5 text-xs text-[#161817]">
                        <p><strong>Event:</strong> {msg.widgetData.eventDate} ({msg.widgetData.venue})</p>
                        <p><strong>Coverage:</strong> {msg.widgetData.coverage}</p>
                        <p className="text-[#161817]/70"><strong>Deliverables:</strong> {msg.widgetData.deliverables}</p>
                      </div>

                      {/* Pricing Breakdown */}
                      <div className="bg-[#F7F6F0] p-3 rounded-xl border border-[#161817]/10 space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#161817]/60">Total Agreed Fee:</span>
                          <span className="font-bold text-[#161817]">₦{msg.widgetData.totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs font-semibold text-[#161817]">
                          <span>Initial Deposit ({msg.widgetData.depositPercent}%):</span>
                          <span>₦{msg.widgetData.depositAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs text-[#161817]/60 border-t border-[#161817]/10 pt-1">
                          <span>Remaining Balance (upon delivery):</span>
                          <span>₦{msg.widgetData.remainingBalance.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Quote Action Buttons */}
                      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5 border-t border-[#161817]/10">
                        {msg.widgetData.status === 'draft' && (
                          <>
                            <button
                              onClick={handleApproveAndSendQuote}
                              disabled={isProcessing}
                              className="w-full sm:w-auto px-4 py-2 bg-[#161817] text-[#F7F6F0] hover:bg-[#282b29] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-[#C5F36A]" />
                              <span>Approve and send</span>
                            </button>
                            <span className="text-[11px] text-[#161817]/50">
                              Terms: 7 days validity
                            </span>
                          </>
                        )}

                        {msg.widgetData.status === 'sent' && (
                          <div className="w-full space-y-2">
                            <div className="flex items-center justify-between text-xs text-[#161817]/70">
                              <span>Sent via WhatsApp · Link active</span>
                              <span className="font-mono text-[10px]">portal.vela.ng/q/{msg.widgetData.quoteNumber}</span>
                            </div>
                            <button
                              onClick={handleSimulateQuotePayment}
                              disabled={isProcessing}
                              className="w-full py-2 bg-[#C5F36A] hover:bg-[#b5e755] text-[#161817] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all border border-[#161817]/20 shadow-xs"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Simulate: Amaka accepts &amp; pays ₦180,000 deposit</span>
                            </button>
                          </div>
                        )}

                        {msg.widgetData.status === 'paid' && (
                          <div className="w-full space-y-2">
                            <div className="p-2.5 bg-[#16a34a]/10 border border-[#16a34a]/30 rounded-xl text-xs text-[#16a34a] font-semibold flex items-center justify-between">
                              <span>✓ ₦180,000 verified via Paystack (Receipt #{msg.widgetData.receiptNumber})</span>
                              <span>Job #{msg.widgetData.jobId} created</span>
                            </div>
                            <div className="p-3 bg-[#F7F6F0] rounded-xl border border-[#161817]/10 space-y-1.5 text-xs">
                              <p className="font-semibold text-[#161817]">Amaka’s Onboarding Checklist:</p>
                              <p className="text-[#16a34a]">✓ Event date &amp; venue prefilled</p>
                              <p className="text-amber-700">⏳ Awaiting client shot list &amp; family coordinator contact</p>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      INTERACTIVE WIDGET 3: Friday Shoot Prep Card
                      ───────────────────────────────────────────────────────────── */}
                  {msg.widgetType === 'friday_shoot' && msg.widgetData && (
                    <div className="bg-white border border-[#161817]/15 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 animate-in fade-in duration-200">
                      
                      {/* Job Header */}
                      <div className="flex items-center justify-between border-b border-[#161817]/10 pb-3">
                        <div>
                          <div className="text-[10px] font-bold text-[#161817]/50 uppercase tracking-wider font-mono">
                            Job #{msg.widgetData.jobId} · Wedding Shoot
                          </div>
                          <h3 className="text-sm font-bold text-[#161817]">
                            {msg.widgetData.clientName}
                          </h3>
                        </div>
                        <span className={cn(
                          'text-[10.5px] font-bold px-2 py-0.5 rounded-full font-mono uppercase tracking-wider',
                          msg.widgetData.status === 'address_received' ? 'bg-[#C5F36A] text-[#161817]' : 'bg-amber-100 text-amber-900'
                        )}>
                          {msg.widgetData.status === 'address_received' ? 'Ready' : 'Action Required'}
                        </span>
                      </div>

                      {/* Operational Details */}
                      <div className="space-y-1 text-xs text-[#161817]">
                        <p><strong>Time:</strong> {msg.widgetData.dateTime}</p>
                        <p><strong>Team:</strong> {msg.widgetData.photographer}</p>
                        <p><strong>Payment:</strong> ₦{msg.widgetData.depositPaid.toLocaleString()} deposit paid · ₦{msg.widgetData.balanceDue.toLocaleString()} balance due</p>
                      </div>

                      {/* Checklist */}
                      <div className="bg-[#F7F6F0] p-3 rounded-xl border border-[#161817]/10 space-y-1.5">
                        <span className="text-[10px] font-bold text-[#161817]/50 uppercase tracking-wider font-mono">
                          Client Checklist
                        </span>
                        {msg.widgetData.checklist.map((item: any) => (
                          <div key={item.id} className="flex items-start gap-2 text-xs">
                            {item.done ? (
                              <CheckCircle2 className="w-4 h-4 text-[#16a34a] flex-shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-[#f59e0b] flex-shrink-0 mt-0.5" />
                            )}
                            <div className="min-w-0">
                              <span className={item.missing ? 'font-semibold text-amber-900' : 'text-[#161817]'}>
                                {item.label}
                              </span>
                              {item.value && (
                                <p className="text-[11px] text-[#161817]/70 font-medium">{item.value}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Prepared Message Box */}
                      {msg.widgetData.status !== 'address_received' && (
                        <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-xl space-y-2">
                          <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider font-mono">
                            Prepared Message for Mrs. Balogun
                          </p>
                          <p className="text-xs text-amber-950 italic">
                            “{msg.widgetData.preparedMessage}”
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5 border-t border-[#161817]/10">
                        {msg.widgetData.status === 'pending_venue' && (
                          <button
                            onClick={handleSendVenueRequest}
                            disabled={isProcessing}
                            className="w-full sm:w-auto px-4 py-2 bg-[#161817] text-[#F7F6F0] hover:bg-[#282b29] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                          >
                            <Send className="w-3.5 h-3.5 text-[#C5F36A]" />
                            <span>Send message via WhatsApp</span>
                          </button>
                        )}

                        {msg.widgetData.status === 'message_sent' && (
                          <div className="w-full space-y-2">
                            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between">
                              <span>✓ Message sent to client. Waiting for address...</span>
                            </div>
                            <button
                              onClick={handleSimulateAddressReceived}
                              disabled={isProcessing}
                              className="w-full py-2 bg-[#C5F36A] hover:bg-[#b5e755] text-[#161817] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all border border-[#161817]/20 shadow-xs"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Simulate: Client replies with Lekki Church address</span>
                            </button>
                          </div>
                        )}

                        {msg.widgetData.status === 'address_received' && (
                          <div className="w-full p-2.5 bg-[#16a34a]/10 border border-[#16a34a]/30 rounded-xl text-xs text-[#16a34a] font-semibold flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Address confirmed: Catholic Church of Divine Mercy, Lekki · Operational brief updated</span>
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      INTERACTIVE WIDGET 4: Walk-in Booking
                      ───────────────────────────────────────────────────────────── */}
                  {msg.widgetType === 'walk_in' && msg.widgetData && (
                    <div className="bg-white border border-[#161817]/15 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                      <div className="text-xs space-y-1">
                        <p><strong>Professional:</strong> {msg.widgetData.barber} ({msg.widgetData.chair})</p>
                        <p><strong>Service:</strong> {msg.widgetData.service}</p>
                        <p><strong>Status:</strong> Immediate walk-in (consumes chair capacity now)</p>
                      </div>
                      <button
                        onClick={() => {
                          const updated = activeTask.messages.map(m => {
                            if (m.id === msg.id) {
                              return { ...m, widgetData: { ...m.widgetData, confirmed: true } };
                            }
                            return m;
                          });
                          setActiveTask({ ...activeTask, messages: updated });
                        }}
                        disabled={msg.widgetData.confirmed}
                        className={cn(
                          'w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all',
                          msg.widgetData.confirmed
                            ? 'bg-[#16a34a]/10 text-[#16a34a] border border-[#16a34a]/30'
                            : 'bg-[#161817] text-[#F7F6F0] hover:bg-[#282b29]'
                        )}
                      >
                        {msg.widgetData.confirmed ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Walk-in confirmed · Added to Dele’s chair</span>
                          </>
                        ) : (
                          <span>Confirm Walk-in Now</span>
                        )}
                      </button>
                    </div>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      INTERACTIVE WIDGET 5: Gallery Publishing Shortcut
                      ───────────────────────────────────────────────────────────── */}
                  {msg.widgetType === 'gallery_upload' && (
                    <div className="bg-white border border-[#161817]/15 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                      <div className="flex items-center gap-3">
                        <img
                          src="/stylist-portrait.jpg"
                          alt="Style reference"
                          className="w-16 h-16 rounded-xl object-cover border border-[#161817]/10"
                        />
                        <div className="text-xs space-y-1">
                          <p className="font-bold text-[#161817]">Boho Knotless Braids</p>
                          <p className="text-[#161817]/60">Linked service: Boho Knotless (₦35,000)</p>
                          <p className="text-[11px] text-[#16a34a] font-medium">✓ Client photo consent confirmed</p>
                        </div>
                      </div>
                      <div className="pt-2 flex items-center gap-2">
                        <Link
                          to="/dashboard/portfolio"
                          className="px-3.5 py-2 bg-[#161817] text-[#F7F6F0] rounded-xl text-xs font-semibold hover:bg-[#282b29] transition-all"
                        >
                          Open Gallery Manager
                        </Link>
                        <span className="text-[11px] text-[#161817]/50">
                          Adds “Book this look” action for visitors
                        </span>
                      </div>
                    </div>
                  )}

                </div>
              ))}

              {isProcessing && (
                <div className="flex items-center gap-2 text-xs text-[#161817]/60 font-medium py-2">
                  <div className="w-2 h-2 rounded-full bg-[#161817] animate-ping"></div>
                  <span>Vela is checking business records…</span>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>
          </div>

          {/* Docked Bottom Instruction Box (Thumb-reachable on mobile) */}
          <div className="fixed sm:sticky bottom-14 sm:bottom-0 left-0 right-0 z-20 bg-[#F7F6F0]/95 backdrop-blur-md border-t border-[#161817]/10 p-3 sm:p-4">
            <div className="max-w-2xl mx-auto flex items-end gap-2 bg-white border border-[#161817]/15 rounded-2xl shadow-sm focus-within:border-[#161817] focus-within:ring-2 focus-within:ring-[#161817]/10 p-2 sm:p-2.5">
              <textarea
                rows={1}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Give Vela your next instruction…"
                className="flex-1 bg-transparent resize-none text-xs sm:text-sm text-[#161817] placeholder:text-[#161817]/40 focus:outline-none max-h-24 py-1.5 px-2"
              />
              <button
                type="button"
                onClick={() => handleGenericSend(inputValue)}
                disabled={!inputValue.trim()}
                className="p-2 rounded-xl bg-[#161817] text-[#F7F6F0] hover:bg-[#282b29] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center flex-shrink-0"
                aria-label="Send next instruction"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          Booking Detail Modal (when tapping [Open booking])
          ───────────────────────────────────────────────────────────────────────── */}
      {selectedBookingModal && (
        <div className="fixed inset-0 z-50 bg-[#161817]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-[#161817]/15 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#161817]/10 pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#161817]/50 uppercase tracking-wider font-mono">
                  Upcoming Appointment
                </span>
                <h3 className="text-base font-bold text-[#161817]">
                  {selectedBookingModal.clientName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBookingModal(null)}
                className="p-1 text-[#161817]/40 hover:text-[#161817] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-[#161817]">
              <p><strong>Service:</strong> {selectedBookingModal.service}</p>
              <p><strong>Time:</strong> {selectedBookingModal.time}</p>
              <p><strong>Staff &amp; Chair:</strong> {selectedBookingModal.barber} · {selectedBookingModal.chair}</p>
              <p><strong>Payment:</strong> {selectedBookingModal.deposit}</p>
              <p><strong>Phone:</strong> {selectedBookingModal.phone}</p>
            </div>

            <div className="pt-2 flex items-center gap-2 border-t border-[#161817]/10">
              <a
                href={`https://wa.me/${selectedBookingModal.phone.replace(/\D/g, '')}?text=Hi%20${selectedBookingModal.clientName.split(' ')[0]}!%20Looking%20forward%20to%20your%20appointment%20today.`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 bg-[#161817] text-[#F7F6F0] rounded-xl text-xs font-semibold text-center hover:bg-[#282b29] transition-all"
              >
                Message on WhatsApp
              </a>
              <button
                onClick={() => setSelectedBookingModal(null)}
                className="px-4 py-2 bg-[#161817]/5 hover:bg-[#161817]/10 text-[#161817] rounded-xl text-xs font-semibold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
