'use client';

import { supabase } from '@/lib/supabase';
import { LogIn, Clock } from 'lucide-react';

export default function LoginPage() {
  const handleLogin = async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      alert("⚠️ ERROR: NEXT_PUBLIC_SUPABASE_URL is not set in Vercel!");
      return;
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'placeholder') {
      alert("⚠️ ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in Vercel!");
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard/team`,
        scopes: 'https://www.googleapis.com/auth/calendar.readonly'
      },
    });
  };

  return (
    <div className="min-h-screen flex bg-slate-50 overflow-x-hidden font-sans">
      {/* BRAND PANEL: Visible on Desktop/Large Screens (Left Side) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-7/12 bg-[#e31b23] relative items-center justify-center p-12 overflow-hidden shadow-2xl z-10">
        {/* Sleek subtle gradient overlay for rich depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-white/5 pointer-events-none" />
        
        {/* Brand Art container - perfectly centered, never cropped */}
        <div 
          className="w-full h-full max-w-[620px] max-h-[620px] bg-center bg-no-repeat bg-contain transition-transform duration-700 hover:scale-102"
          style={{ backgroundImage: `url('/bg-brand.png')` }}
          role="img"
          aria-label="The Mavericks - From 8 to infinity"
        />

        {/* Floating background aesthetic elements for premium feel */}
        <div className="absolute top-10 left-10 w-24 h-24 rounded-full bg-white/5 blur-xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-32 h-32 rounded-full bg-black/10 blur-2xl pointer-events-none" />
      </div>

      {/* LOGIN/INTERACTIVE PANEL: Always visible (Right Side on Desktop, Full Screen on Mobile) */}
      <div className="w-full lg:w-1/2 xl:w-5/12 flex flex-col justify-between p-6 sm:p-12 md:p-16 lg:p-20 bg-white min-h-screen">
        
        {/* Header / Logo bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Clock className="w-5 h-5 text-white" strokeWidth={3} />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-800">Clocked</span>
          </div>
          <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200/50">
            v1.2.0
          </span>
        </div>

        {/* Main Content Area */}
        <div className="my-auto py-10 max-w-md w-full mx-auto space-y-8">
          
          {/* Mobile Brand Graphic: Only visible on mobile/tablet screens */}
          <div className="lg:hidden w-full rounded-2xl overflow-hidden bg-[#e31b23] p-6 text-center shadow-lg relative border border-red-500/10">
            <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/10 pointer-events-none" />
            <div 
              className="w-full h-44 bg-center bg-no-repeat bg-contain mx-auto"
              style={{ backgroundImage: `url('/bg-brand.png')` }}
            />
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Welcome back
            </h1>
            <p className="text-slate-500 text-lg leading-relaxed">
              Please sign in with your enterprise account to access your time allocations and dashboard.
            </p>
          </div>

          {/* Action / Google Button */}
          <div className="space-y-4 pt-2">
            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-4 bg-white border-2 border-slate-200 text-slate-800 py-4 px-6 rounded-2xl font-bold hover:bg-slate-50 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-100 transition-all active:scale-[0.98] cursor-pointer group"
            >
              {/* Premium Custom SVG Google Icon with hover micro-animation */}
              <svg className="w-5.5 h-5.5 transition-transform group-hover:scale-110 duration-300" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-slate-800 text-[17px]">Continue with Google</span>
            </button>
          </div>

          {/* Beautiful high-contrast notice alert */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3.5 shadow-sm shadow-amber-100/50">
            <span className="text-amber-600 text-lg leading-none mt-0.5">⚠️</span>
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-900">Authorized Personnel Only</p>
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                This system is secured. Access is strictly limited to active <strong className="font-semibold">@themavericksindia.com</strong> Google workspace accounts.
              </p>
            </div>
          </div>

        </div>

        {/* Footer Area */}
        <div className="text-slate-400 text-xs flex flex-col sm:flex-row gap-4 sm:gap-0 justify-between items-center border-t border-slate-100 pt-6">
          <p className="font-medium">© {new Date().getFullYear()} The Mavericks India. All rights reserved.</p>
          <div className="flex gap-5 font-semibold">
            <a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Terms of Service</a>
          </div>
        </div>

      </div>
    </div>
  );
}
