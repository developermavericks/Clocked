'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, User, Settings, LogOut, Calendar, Moon, Sun, IndianRupee, ChevronLeft, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { Loader } from '@/components/Loader';

const menuItems = [
  { name: 'My Allocations', icon: Users, href: '/dashboard/team', color: 'text-emerald-600' },
  { name: 'Core Portal', icon: Settings, href: '/dashboard/core', color: 'text-orange-600' },
  { name: 'Manager Portal', icon: LayoutDashboard, href: '/dashboard/manager', color: 'text-indigo-600' },
  { name: 'Finance Portal', icon: IndianRupee, href: '/dashboard/finance', color: 'text-blue-600' },
];

const CORE_EMAILS = [
  'archana@themavericksindia.com',
  'arunkumar@themavericksindia.com',
  'avinash@themavericksindia.com',
  'chetan@themavericksindia.com',
  'developerteam@themavericksindia.com',
  'divyanshsharma@themavericksindia.com',
  'gaurav@themavericksindia.com',
  'mitali.p@themavericksindia.com',
  'pooja@themavericksindia.com',
  'satyam.singh@themavericksindia.com',
  'smriti@themavericksindia.com'
];

const MANAGER_EMAILS = [
  'aashna@themavericksindia.com',
  'akshay@themavericksindia.com',
  'alisha@themavericksindia.com',
  'ananya@themavericksindia.com',
  'anil@themavericksindia.com',
  'chhavi.a@themavericksindia.com',
  'ila@themavericksindia.com',
  'ishmeet@themavericksindia.com',
  'kavita@themavericksindia.com',
  'mahek@themavericksindia.com',
  'manaswi@themavericksindia.com',
  'muskaan@themavericksindia.com',
  'pavithra@themavericksindia.com',
  'rajvi@themavericksindia.com',
  'samrat@themavericksindia.com',
  'shrestha@themavericksindia.com',
  'srishtee@themavericksindia.com',
  'vibhuti@themavericksindia.com'
];

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState('team');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [dbUser, setDbUser] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark = savedTheme === 'dark' || (savedTheme === null && systemPrefersDark);
      
      setIsDarkMode(shouldBeDark);
      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  const toggleDarkMode = () => {
    if (typeof document !== 'undefined') {
      if (isDarkMode) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        setIsDarkMode(false);
      } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        setIsDarkMode(true);
      }
    }
  };

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const { data: { user } } = await supabase.auth.getUser();
        let role = 'team';

        if (user) {
          setCurrentUser(user);
        }

        const response = await apiFetch(`${apiUrl}/api/teams/me`);
        if (response.ok) {
          const data = await response.json();
          role = data.role || 'team';
          setDbUser(data);
        }

        // Hardcoded overrides (useful for new users or list updates)
        if (user?.email) {
          const email = user.email.toLowerCase();
          if (CORE_EMAILS.includes(email)) role = 'core';
          else if (MANAGER_EMAILS.includes(email) && role === 'team') role = 'manager';
        }

        setUserRole(role);
      } catch (err) {
        console.error('Failed to fetch role:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRole();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const filteredItems = menuItems.filter(item => {
    if (item.name === 'My Allocations') return true;

    const email = currentUser?.email?.toLowerCase() || '';
    const financeEmails = [
      'avinash@themavericksindia.com',
      'chetan@themavericksindia.com',
      'satyam.singh@themavericksindia.com'
    ];
    
    const isFinanceAdmin = financeEmails.includes(email);

    if (item.name === 'Finance Portal') {
      return isFinanceAdmin; // ONLY Avinash, Chetan, Satyam
    }

    if (item.name === 'Manager Portal') {
      return userRole === 'manager' || userRole === 'core'; // Managers & Core (including Avinash, Chetan, Satyam)
    }

    if (item.name === 'Core Portal') {
      return userRole === 'core'; // Core (including Avinash, Chetan, Satyam)
    }

    return false;
  });

  return (
    <aside className="w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen sticky top-0 transition-colors z-50">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h2 className="text-xl font-display font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
          <Clock className="w-6 h-6 text-blue-600 flex-shrink-0" />
          <span className="truncate">Clocked</span>
        </h2>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          title="Collapse Sidebar"
        >
          <ChevronLeft className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {loading ? (
          <div className="flex justify-center py-4 w-full">
            <Loader size="sm" />
          </div>
        ) : filteredItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50'
              }`}
            >
              <Icon className={`w-5 h-5 ${item.color}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
        {currentUser && (
          <div className="flex items-center gap-3 px-2 py-2 mb-2 profile-box cursor-default">
            {currentUser.user_metadata?.avatar_url ? (
              <img src={currentUser.user_metadata.avatar_url} alt="Profile" className="w-10 h-10 rounded-full border-2 border-orange-200" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold border-2 border-orange-200">
                {(currentUser.user_metadata?.full_name || currentUser.email || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="overflow-hidden w-[140px]">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate leading-tight">
                {dbUser?.name || currentUser.user_metadata?.full_name || currentUser.email.split('@')[0]}
              </p>
              {dbUser?.title && (
                <div className="marquee-wrapper mt-0.5">
                  <span className="marquee-content text-[10px] font-black text-blue-600 dark:text-blue-400 tracking-wider uppercase">
                    {dbUser.title}
                  </span>
                </div>
              )}
              <div className="marquee-wrapper mt-1">
                <span className="marquee-content text-[10px] text-slate-400 dark:text-slate-500 leading-none">
                  {currentUser.email}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={toggleDarkMode}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {isDarkMode ? 'Light' : 'Dark'}
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
