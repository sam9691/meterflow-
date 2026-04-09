import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Zap, Key, BarChart3, CreditCard,
  Webhook, Settings, LogOut, ChevronLeft, Activity,
  Globe, BookOpen, User,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { useAuth } from '../hooks/useAuth';
import { PlanBadge } from '../components/ui/Badge';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/apis', icon: Zap, label: 'My APIs' },
  { to: '/keys', icon: Key, label: 'API Keys' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/playground', icon: Activity, label: 'Playground' },
  { to: '/marketplace', icon: Globe, label: 'Marketplace' },
  { divider: true },
  { to: '/billing', icon: CreditCard, label: 'Billing' },
  { to: '/webhooks', icon: Webhook, label: 'Webhooks' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { user } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { logout } = useAuth();

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 240 : 64 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="relative flex flex-col h-screen bg-dark-900 border-r border-dark-700 overflow-hidden flex-shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-dark-700">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="text-white font-bold text-lg tracking-tight"
            >
              MeterFlow
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item, i) => {
          if (item.divider) {
            return <div key={i} className="my-3 border-t border-dark-700" />;
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx('sidebar-link', isActive && 'active')
              }
              title={!sidebarOpen ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-dark-700 p-3">
        <div className="flex items-center gap-3 px-1 py-2">
          <div className="w-8 h-8 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-brand-400" />
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <PlanBadge plan={user?.subscriptionPlan} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={logout}
          className="sidebar-link w-full mt-1"
          title={!sidebarOpen ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute top-5 -right-3 w-6 h-6 rounded-full bg-dark-700 border border-dark-600 flex items-center justify-center text-dark-400 hover:text-white transition-colors z-10"
      >
        <motion.div animate={{ rotate: sidebarOpen ? 0 : 180 }}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </motion.div>
      </button>
    </motion.aside>
  );
}
