'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavbarProps {
  title?: string;
  user?: {
    email?: string;
    subscriptionLevel?: string;
  };
  onLogout?: () => void;
}

export function Navbar({ title, user, onLogout }: NavbarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/signals', label: 'All Signals' },
    { href: '/watchlist', label: 'Watchlist' },
    { href: '/alerts', label: 'Alerts' },
    { href: '/subscription', label: 'Subscription' },
    { href: '/settings', label: 'Settings' },
  ];

  return (
    <nav className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-8">
            {title && (
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                {title}
              </h1>
            )}
            <nav className="hidden md:flex gap-4">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-sm font-medium ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {user.email}
              </span>
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded">
                {user.subscriptionLevel}
              </span>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50"
                >
                  Logout
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

