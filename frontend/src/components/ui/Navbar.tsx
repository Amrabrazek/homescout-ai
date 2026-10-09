'use client';

import Link from 'next/link';
import { Heart, MessageCircle, UserCircle } from 'lucide-react';
import pathsConfig from '@/config/paths.config';
import { Logo } from '@/components/brand/Logo';

export default function Navbar() {
  return (
    <nav className='fixed top-0 left-0 right-0 h-16 bg-background/90 backdrop-blur border-b z-50 px-4 md:px-6'>
      <div className='max-w-7xl mx-auto h-full flex items-center justify-between'>
        <Link href={pathsConfig.home.index} aria-label='HomeScout home'>
          <Logo />
        </Link>

        <div className='flex items-center gap-4'>
          <Link
            href={pathsConfig.home.concierge}
            className='flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors'
          >
            <MessageCircle className='h-5 w-5' />
            <span className='hidden sm:inline'>Concierge</span>
          </Link>
          <Link
            href={pathsConfig.home.preferences}
            className='flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors'
          >
            <Heart className='h-5 w-5' />
            <span className='hidden sm:inline'>My preferences</span>
          </Link>
          <Link
            href={pathsConfig.units.new}
            aria-label='Add a unit'
            className='flex items-center'
          >
            <UserCircle className='h-8 w-8 text-muted-foreground hover:text-primary transition-colors' />
          </Link>
        </div>
      </div>
    </nav>
  );
}
