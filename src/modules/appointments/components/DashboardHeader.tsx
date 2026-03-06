import { Calendar, User } from 'lucide-react';
import { UserProfile } from '../lib/types';

interface DashboardHeaderProps {
  user: UserProfile;
}

export default function DashboardHeader({ user }: DashboardHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Scheduler</h1>
          </div>

          <div className="flex items-center gap-3">
            {user.avatar_url && (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            )}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900">{user.name}</span>
              <span className="text-xs text-gray-500">{user.email}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
