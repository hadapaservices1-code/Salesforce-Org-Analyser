'use client';

import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon, QuestionMarkCircleIcon, Squares2X2Icon } from '@heroicons/react/24/outline';

interface HeaderProps {
  userName?: string;
  userInitial?: string;
}

export default function Header({ userName, userInitial = 'U' }: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/connect');
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-6">
      <div className="flex items-center">
        <div className="flex items-center">
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-500 via-green-500 to-yellow-500 bg-clip-text text-transparent">
            Org
          </span>
          <span className="text-2xl font-normal text-gray-700 ml-1">Analyzer</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full">
          <MagnifyingGlassIcon className="h-5 w-5" />
        </button>
        <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full">
          <QuestionMarkCircleIcon className="h-5 w-5" />
        </button>
        <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full">
          <Squares2X2Icon className="h-5 w-5" />
        </button>
        <button
          onClick={handleLogout}
          className="w-8 h-8 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center hover:bg-blue-700 transition-colors"
          title={userName || 'User'}
        >
          {userInitial}
        </button>
      </div>
    </header>
  );
}
