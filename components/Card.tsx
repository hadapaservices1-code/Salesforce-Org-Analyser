import { ReactNode } from 'react';

interface CardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: {
    label: string;
    href: string;
  };
  children?: ReactNode;
}

export default function Card({ title, description, icon, action, children }: CardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
        </div>
        {icon && (
          <div className="ml-4 flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
      {children}
      {action && (
        <div className="mt-4">
          <a
            href={action.href}
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium"
          >
            {action.label}
          </a>
        </div>
      )}
    </div>
  );
}
