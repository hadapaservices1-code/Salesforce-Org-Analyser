'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  UserIcon, 
  ShieldCheckIcon, 
  UsersIcon,
  CreditCardIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { 
  HomeIcon as HomeIconSolid 
} from '@heroicons/react/24/solid';

const navigation = [
  { name: 'Home', href: '/dashboard', icon: HomeIcon, iconSolid: HomeIconSolid },
  { name: 'Org Info', href: '/dashboard/org', icon: UserIcon },
  { name: 'Security', href: '/dashboard/security', icon: ShieldCheckIcon },
  { name: 'Compare Scans', href: '/compare', icon: UsersIcon },
  { name: 'Reports', href: '/dashboard/reports', icon: CreditCardIcon },
  { name: 'About', href: '/dashboard/about', icon: InformationCircleIcon },
];

function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-64 bg-white border-r border-gray-200 min-h-screen fixed left-0 top-0 pt-16">
      <div className="px-4 py-2 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname?.startsWith(item.href));
          const Icon = isActive && item.iconSolid ? item.iconSolid : item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center px-3 py-2.5 text-sm font-medium rounded-r-lg transition-colors
                ${isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
              {item.name}
            </Link>
          );
        })}
        <div className="border-t border-gray-200 mt-2 pt-2">
          <Link
            href="/dashboard/about"
            className="flex items-center px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-r-lg"
          >
            <InformationCircleIcon className="mr-3 h-5 w-5 text-gray-500" />
            About
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Sidebar;
