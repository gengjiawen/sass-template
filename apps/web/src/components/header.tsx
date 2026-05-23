'use client';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Route } from 'next';

import { cn } from '@/lib/utils';

import { LanguageToggle } from './language-toggle';
import { ModeToggle } from './mode-toggle';
import { Button } from './ui/button';
import UserMenu from './user-menu';

export default function Header() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const links = useMemo(
    () =>
      [
        { to: '/', label: t('Home') },
        { to: '/dashboard', label: t('Dashboard') },
        { to: '/todos', label: t('Todos') },
        { to: '/docs', label: t('Docs') },
      ] as const,
    [t],
  );

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const isActiveLink = (to: (typeof links)[number]['to']) => {
    if (to === '/') {
      return pathname === '/';
    }

    return pathname === to || pathname?.startsWith(`${to}/`);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/72">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="rounded-full px-2 py-1 text-sm font-semibold tracking-[0.16em] text-foreground/80 uppercase transition-colors hover:text-foreground"
          >
            Sass
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map(({ to, label }) => {
              const isActive = isActiveLink(to);

              return (
                <Link
                  key={to}
                  href={to as Route}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-sm font-medium text-foreground/65 transition-all duration-200 hover:bg-foreground/[0.04] hover:text-foreground',
                    isActive && 'bg-foreground/[0.08] text-foreground shadow-sm',
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageToggle />
          <ModeToggle />
          <UserMenu />
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageToggle />
          <ModeToggle />
          <Button
            variant="outline"
            size="icon"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={isMobileMenuOpen ? t('Close navigation menu') : t('Open navigation menu')}
            onClick={() => {
              setIsMobileMenuOpen((current) => !current);
            }}
            className="rounded-full"
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      <div
        id="mobile-navigation"
        className={cn(
          'overflow-hidden bg-background/92 transition-all duration-300 md:hidden',
          isMobileMenuOpen
            ? 'max-h-96 border-t border-border/60 opacity-100'
            : 'pointer-events-none max-h-0 opacity-0',
        )}
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6">
          {links.map(({ to, label }) => {
            const isActive = isActiveLink(to);

            return (
              <Link
                key={to}
                href={to as Route}
                className={cn(
                  'rounded-2xl px-4 py-3 text-base font-medium text-foreground/80 transition-colors hover:bg-foreground/[0.04] hover:text-foreground',
                  isActive && 'bg-foreground/[0.08] text-foreground',
                )}
              >
                {label}
              </Link>
            );
          })}

          <div className="mt-3 border-t border-border/60 pt-3">
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
