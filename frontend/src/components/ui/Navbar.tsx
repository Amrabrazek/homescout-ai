'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, MessageCircle, UserCircle } from 'lucide-react';
import pathsConfig from '@/config/paths.config';

export default function Navbar() {
  return (
    <nav className='fixed top-0 left-0 right-0 h-16 bg-white shadow-sm z-50 px-4 md:px-6'>
      <div className='max-w-7xl mx-auto h-full flex items-center justify-between'>
        <Link href={pathsConfig.home.index} className='flex items-center'>
          <div className='relative h-8 w-24'>
            {/* You can replace this with your actual logo */}
            <div className='font-bold text-xl'>HomeScout AI</div>
          </div>
        </Link>

        <div className='flex items-center gap-4'>
          <Link
            href={pathsConfig.home.concierge}
            className='flex items-center gap-1 text-gray-700 hover:text-primary transition-colors'
          >
            <MessageCircle className='h-6 w-6' />
            <span className='hidden sm:inline'>Concierge</span>
          </Link>
          <Link
            href={pathsConfig.home.preferences}
            className='flex items-center gap-1 text-gray-700 hover:text-primary transition-colors'
          >
            <Heart className='h-6 w-6' />
            <span className='hidden sm:inline'>My preferences</span>
          </Link>
          <Link href={pathsConfig.units.new} className='flex items-center'>
            <UserCircle className='h-8 w-8 text-gray-700 hover:text-primary transition-colors' />
          </Link>
        </div>
      </div>
    </nav>
  );
}
