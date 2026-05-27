'use client';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  inline?: boolean;
}

export function Loader({
  size = 'md',
  text,
  className = '',
  inline = false,
}: LoaderProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const borderSizes = {
    sm: 'border-2',
    md: 'border-3',
    lg: 'border-4',
  };

  const loaderContent = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className={`relative ${sizes[size]}`}>
        {/* Track circle (semi-transparent gray/slate) */}
        <div className={`absolute inset-0 rounded-full ${borderSizes[size]} border-slate-200/50 dark:border-slate-800/50`}></div>
        {/* Active spinning circle (orange accent) */}
        <div className={`absolute inset-0 rounded-full ${borderSizes[size]} border-t-orange-600 border-r-orange-600 animate-spin`}></div>
      </div>
      {text && (
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 animate-pulse uppercase tracking-widest text-center mt-1">
          {text}
        </p>
      )}
    </div>
  );

  if (inline) {
    return loaderContent;
  }

  return (
    <div className="w-full py-12 flex items-center justify-center animate-in fade-in duration-300">
      {loaderContent}
    </div>
  );
}

interface ErrorDisplayProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorDisplay({
  message = 'Failed to load data. Please try again.',
  onRetry,
  className = '',
}: ErrorDisplayProps) {
  return (
    <div className={`w-full py-8 px-6 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-300 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400 flex-shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{message}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Please check your network or try refreshing.</p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-red-200 dark:shadow-none flex-shrink-0 cursor-pointer"
        >
          TRY AGAIN
        </button>
      )}
    </div>
  );
}
