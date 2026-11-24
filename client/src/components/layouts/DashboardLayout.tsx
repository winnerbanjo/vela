import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Calendar,
  Users,
  DollarSign,
  Globe,
  GalleryHorizontal,
  ChevronRight,
  Plus,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Sparkles,
  Clock,
  Settings,
  Scissors,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { VelaLogo } from '../ui/VelaLogo';
import { getStorefrontUrl } from '../../lib/subdomain';
import { PageErrorBoundary } from './PageErrorBoundary';

interface TaskItem {
  id: string;
  title: string;
  category: string;
  updatedAt: string;
}

const DEFAULT_RECENT_TASKS: TaskItem[] = [
  { id: 'task-amaka-quote', title: 'Amaka’s wedding quotation', category: 'Quotes', updatedAt: '10m ago' },
  { id: 'task-fill-slots', title: 'Fill tomorrow’s open slots', category: 'Outreach', updatedAt: '1h ago' },
  { id: 'task-friday-shoot', title: 'Friday shoot preparation', category: 'Shoot prep', updatedAt: '3h ago' },
];

export const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [websiteMenuOpen, setWebsiteMenuOpen] = useState(false);
  const [recentTasks, setRecentTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = localStorage.getItem('vela_recent_tasks');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return DEFAULT_RECENT_TASKS;
  });

  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Listen for task changes
  useEffect(() => {
    const handleTaskUpdated = () => {
      try {
        const saved = localStorage.getItem('vela_recent_tasks');
        if (saved) setRecentTasks(JSON.parse(saved));
      } catch (e) {}
    };
    window.addEventListener('vela_tasks_updated', handleTaskUpdated);
    return () => window.removeEventListener('vela_tasks_updated', handleTaskUpdated);
  }, []);

  const handleStartNewTask = () => {
    navigate('/dashboard?new=true');
    setSidebarOpen(false);
    window.dispatchEvent(new CustomEvent('vela_new_task'));
  };

  const handleOpenTask = (taskId: string) => {
    navigate(`/dashboard?task=${taskId}`);
    setSidebarOpen(false);
    window.dispatchEvent(new CustomEvent('vela_open_task', { detail: { taskId } }));
  };

  const isAgentActive = location.pathname === '/dashboard';
  const isBookingsActive = location.pathname.startsWith('/dashboard/bookings') || location.pathname.startsWith('/dashboard/calendar');
  const isClientsActive = location.pathname.startsWith('/dashboard/customers');
  const isMoneyActive = location.pathname.startsWith('/dashboard/invoices') || location.pathname.startsWith('/dashboard/financial');
  const isWebsiteActive = location.pathname.startsWith('/dashboard/profile') || location.pathname.startsWith('/dashboard/domains');
  const isGalleryActive = location.pathname.startsWith('/dashboard/portfolio');

  return (
    <div className="min-h-screen bg-[#F7F6F0] text-[#161817] flex flex-col font-sans">
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-[#161817]/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop Collapsible & Mobile Drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 bg-[#F7F6F0] border-r border-[#161817]/10 flex flex-col transition-all duration-200 ease-in-out',
          sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0',
          sidebarExpanded ? 'lg:w-64' : 'lg:w-16'
        )}
      >
        {/* Sidebar Header & Brand */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-[#161817]/10 flex-shrink-0">
          {(sidebarExpanded || sidebarOpen) && (
            <Link to="/dashboard" className="flex items-center gap-2">
              <VelaLogo size="sm" />
            </Link>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className="hidden lg:flex p-1.5 hover:bg-[#161817]/5 rounded-md text-[#161817]/60 transition-colors"
              title={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-label="Toggle sidebar"
            >
              <ChevronRight className={cn('h-4 w-4 transition-transform', sidebarExpanded && 'rotate-180')} />
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 hover:bg-[#161817]/5 rounded-md text-[#161817]"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* New Task Action Button */}
        <div className="p-3 border-b border-[#161817]/5">
          <button
            onClick={handleStartNewTask}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#161817] text-[#F7F6F0] hover:bg-[#252826] transition-colors text-xs font-semibold shadow-xs',
              !sidebarExpanded && !sidebarOpen && 'px-0'
            )}
            title="Start a new instruction"
          >
            <Plus className="h-4 w-4 text-[#C5F36A]" />
            {(sidebarExpanded || sidebarOpen) && <span>New task</span>}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto custom-scrollbar">
          {/* Agent */}
          <Link
            to="/dashboard"
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'flex items-center px-3 py-2 text-xs font-medium rounded-xl transition-colors',
              isAgentActive
                ? 'bg-[#161817] text-[#F7F6F0]'
                : 'text-[#161817]/75 hover:bg-[#161817]/5 hover:text-[#161817]'
            )}
          >
            <Sparkles className={cn('h-4 w-4 flex-shrink-0', (sidebarExpanded || sidebarOpen) ? 'mr-3' : 'mx-auto', isAgentActive && 'text-[#C5F36A]')} />
            {(sidebarExpanded || sidebarOpen) && <span>Agent</span>}
          </Link>

          {/* Bookings */}
          <Link
            to="/dashboard/bookings"
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'flex items-center px-3 py-2 text-xs font-medium rounded-xl transition-colors',
              isBookingsActive
                ? 'bg-[#161817] text-[#F7F6F0]'
                : 'text-[#161817]/75 hover:bg-[#161817]/5 hover:text-[#161817]'
            )}
          >
            <Calendar className={cn('h-4 w-4 flex-shrink-0', (sidebarExpanded || sidebarOpen) ? 'mr-3' : 'mx-auto')} />
            {(sidebarExpanded || sidebarOpen) && <span>Bookings</span>}
          </Link>

          {/* Clients */}
          <Link
            to="/dashboard/customers"
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'flex items-center px-3 py-2 text-xs font-medium rounded-xl transition-colors',
              isClientsActive
                ? 'bg-[#161817] text-[#F7F6F0]'
                : 'text-[#161817]/75 hover:bg-[#161817]/5 hover:text-[#161817]'
            )}
          >
            <Users className={cn('h-4 w-4 flex-shrink-0', (sidebarExpanded || sidebarOpen) ? 'mr-3' : 'mx-auto')} />
            {(sidebarExpanded || sidebarOpen) && <span>Clients</span>}
          </Link>

          {/* Money */}
          <Link
            to="/dashboard/invoices"
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'flex items-center px-3 py-2 text-xs font-medium rounded-xl transition-colors',
              isMoneyActive
                ? 'bg-[#161817] text-[#F7F6F0]'
                : 'text-[#161817]/75 hover:bg-[#161817]/5 hover:text-[#161817]'
            )}
          >
            <DollarSign className={cn('h-4 w-4 flex-shrink-0', (sidebarExpanded || sidebarOpen) ? 'mr-3' : 'mx-auto')} />
            {(sidebarExpanded || sidebarOpen) && <span>Money</span>}
          </Link>

          {/* Website & Nested Gallery */}
          <div>
            <div
              className={cn(
                'flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-colors cursor-pointer',
                (isWebsiteActive || isGalleryActive)
                  ? 'bg-[#161817] text-[#F7F6F0]'
                  : 'text-[#161817]/75 hover:bg-[#161817]/5 hover:text-[#161817]'
              )}
              onClick={() => {
                if (sidebarExpanded || sidebarOpen) {
                  setWebsiteMenuOpen(!websiteMenuOpen);
                } else {
                  navigate('/dashboard/profile');
                }
              }}
            >
              <Link
                to="/dashboard/profile"
                onClick={(e) => {
                  if (sidebarExpanded || sidebarOpen) {
                    e.stopPropagation();
                    setSidebarOpen(false);
                  }
                }}
                className="flex items-center flex-1"
              >
                <Globe className={cn('h-4 w-4 flex-shrink-0', (sidebarExpanded || sidebarOpen) ? 'mr-3' : 'mx-auto')} />
                {(sidebarExpanded || sidebarOpen) && <span>Website</span>}
              </Link>
              {(sidebarExpanded || sidebarOpen) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setWebsiteMenuOpen(!websiteMenuOpen);
                  }}
                  className="p-1 hover:text-white"
                >
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', websiteMenuOpen && 'rotate-180')} />
                </button>
              )}
            </div>

            {/* Gallery Nested Shortcut */}
            {(sidebarExpanded || sidebarOpen) && (websiteMenuOpen || isGalleryActive) && (
              <div className="pl-7 pr-2 py-1 space-y-1">
                <Link
                  to="/dashboard/portfolio"
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-2 px-2.5 py-1.5 text-[11.5px] rounded-lg transition-colors',
                    isGalleryActive
                      ? 'bg-[#161817]/10 text-[#161817] font-semibold'
                      : 'text-[#161817]/70 hover:text-[#161817] hover:bg-[#161817]/5'
                  )}
                >
                  <GalleryHorizontal className="h-3.5 w-3.5" />
                  <span>Gallery</span>
                </Link>
              </div>
            )}
          </div>

          {[{ path: 'services', label: 'Services', Icon: Scissors }, { path: 'settings', label: 'Settings', Icon: Settings }].map(({ path, label, Icon }) => (
            <Link key={path} to={`/dashboard/${path}`} title={label} aria-label={label}
              aria-current={location.pathname === `/dashboard/${path}` ? 'page' : undefined}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-xl hover:bg-black/5 aria-[current=page]:bg-black/10">
              <Icon className="h-4 w-4 shrink-0" />
              {(sidebarExpanded || sidebarOpen) && <span>{label}</span>}
            </Link>
          ))}

          {/* Recent Tasks in Sidebar */}
          {(sidebarExpanded || sidebarOpen) && (
            <div className="pt-5 mt-4 border-t border-[#161817]/10">
              <div className="px-3 mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#161817]/45 tracking-wider uppercase font-mono">
                  Recent tasks
                </span>
                <Clock className="w-3 h-3 text-[#161817]/35" />
              </div>
              <div className="space-y-0.5">
                {recentTasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleOpenTask(t.id)}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-[#161817]/80 hover:text-[#161817] hover:bg-[#161817]/5 transition-colors group flex items-center justify-between"
                  >
                    <span className="truncate pr-2 font-medium">{t.title}</span>
                    <span className="text-[10px] text-[#161817]/40 flex-shrink-0 group-hover:text-[#161817]/60">
                      {t.updatedAt}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* User Account / Storefront Footer */}
        <div className="p-3 border-t border-[#161817]/10 bg-[#F7F6F0]/80">
          {(sidebarExpanded || sidebarOpen) && (
            <div className="mb-2 px-1 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <p className="text-xs font-semibold text-[#161817] truncate">
                  {user?.businessName || user?.name || 'Studio Teni'}
                </p>
                <p className="text-[10.5px] text-[#161817]/50 truncate">{user?.email || 'owner@example.com'}</p>
              </div>
              <a
                href={getStorefrontUrl(user?.slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-[#161817]/50 hover:text-[#161817] hover:bg-[#161817]/5 rounded"
                title="View live website"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
          <button
            onClick={logout}
            className={cn(
              'w-full flex items-center px-2 py-1.5 text-xs font-medium text-[#161817]/60 hover:text-[#161817] hover:bg-[#161817]/5 rounded-lg transition-colors',
              !sidebarExpanded && !sidebarOpen && 'justify-center px-0'
            )}
            title="Log out"
          >
            <LogOut className={cn('h-3.5 w-3.5', (sidebarExpanded || sidebarOpen) ? 'mr-2' : '')} />
            {(sidebarExpanded || sidebarOpen) && <span>Log out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Trigger Header */}
      <header className="lg:hidden sticky top-0 z-30 bg-[#F7F6F0]/95 backdrop-blur-md border-b border-[#161817]/10 h-13 px-4 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 text-[#161817] hover:bg-[#161817]/5 rounded-lg"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/dashboard" className="flex items-center gap-1.5">
          <VelaLogo size="sm" />
        </Link>
        <button
          onClick={handleStartNewTask}
          className="p-1.5 bg-[#161817] text-[#C5F36A] rounded-lg text-xs font-semibold flex items-center gap-1"
          title="New task"
        >
          <Plus className="h-4 w-4" />
        </button>
      </header>

      {/* Main Content Workspace */}
      <div className={cn('flex-1 flex flex-col transition-all duration-200 min-h-0', sidebarExpanded ? 'lg:pl-64' : 'lg:pl-16')}>
        <main className="flex-1 flex flex-col min-h-0">
          <PageErrorBoundary>
            <Outlet />
          </PageErrorBoundary>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Thumb reachable) */}
      <nav aria-label="Mobile Navigation" className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#F7F6F0] border-t border-[#161817]/10 px-2 py-1.5 flex items-center justify-around shadow-lg">
        <Link
          to="/dashboard"
          className={cn(
            'flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors',
            isAgentActive ? 'text-[#161817] font-bold' : 'text-[#161817]/60'
          )}
        >
          <Sparkles className={cn('h-4 w-4 mb-0.5', isAgentActive && 'text-[#161817]')} />
          <span>Agent</span>
        </Link>
        <Link
          to="/dashboard/bookings"
          className={cn(
            'flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors',
            isBookingsActive ? 'text-[#161817] font-bold' : 'text-[#161817]/60'
          )}
        >
          <Calendar className="h-4 w-4 mb-0.5" />
          <span>Bookings</span>
        </Link>
        <Link
          to="/dashboard/customers"
          className={cn(
            'flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors',
            isClientsActive ? 'text-[#161817] font-bold' : 'text-[#161817]/60'
          )}
        >
          <Users className="h-4 w-4 mb-0.5" />
          <span>Clients</span>
        </Link>
        <Link
          to="/dashboard/invoices"
          className={cn(
            'flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors',
            isMoneyActive ? 'text-[#161817] font-bold' : 'text-[#161817]/60'
          )}
        >
          <DollarSign className="h-4 w-4 mb-0.5" />
          <span>Money</span>
        </Link>
        <Link
          to="/dashboard/profile"
          className={cn(
            'flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors',
            isWebsiteActive || isGalleryActive ? 'text-[#161817] font-bold' : 'text-[#161817]/60'
          )}
        >
          <Globe className="h-4 w-4 mb-0.5" />
          <span>Website</span>
        </Link>
      </nav>
    </div>
  );
};
