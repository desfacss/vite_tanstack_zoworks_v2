import { UseCaseConfig } from '../lib/types';
import {
  Wrench,
  Stethoscope,
  Users,
  Briefcase,
  Building2,
  GraduationCap,
  Truck,
  DollarSign,
  Clock,
  Home,
  Info,
  ArrowLeft,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Wrench,
  Stethoscope,
  Users,
  Briefcase,
  Building2,
  GraduationCap,
  Truck,
  DollarSign,
  Clock,
  Home,
};

interface UseCaseBannerProps {
  useCase: UseCaseConfig;
  mode: 'admin' | 'public';
  onBack: () => void;
}

export default function UseCaseBanner({ useCase, mode, onBack }: UseCaseBannerProps) {
  const IconComponent = ICON_MAP[useCase.icon] || Info;
  const config = useCase.config_json;

  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white border-b-4 border-slate-900">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Use Cases</span>
        </button>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <IconComponent className="w-6 h-6 text-white" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold">{useCase.name}</h2>
              <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
                {mode === 'admin' ? 'Admin View' : 'Public Booking'}
              </span>
            </div>

            <p className="text-slate-200 text-sm mb-3">{useCase.description}</p>

            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-slate-900/50 rounded-lg text-xs font-medium">
                Mode: {config.scheduling_mode}
              </span>

              {config.assignment_strategy && (
                <span className="px-3 py-1 bg-slate-900/50 rounded-lg text-xs font-medium">
                  Assignment: {config.assignment_strategy}
                </span>
              )}

              {config.capacity_enabled && (
                <span className="px-3 py-1 bg-blue-500/30 rounded-lg text-xs font-medium">
                  Capacity: {config.capacity_limit || 'Enabled'}
                </span>
              )}

              {config.buffer_strategy && config.buffer_strategy !== 'none' && (
                <span className="px-3 py-1 bg-orange-500/30 rounded-lg text-xs font-medium">
                  Buffer: {config.buffer_minutes}min ({config.buffer_strategy})
                </span>
              )}

              {config.location_required && (
                <span className="px-3 py-1 bg-green-500/30 rounded-lg text-xs font-medium">
                  Location Required
                </span>
              )}

              {config.credit_system_enabled && (
                <span className="px-3 py-1 bg-yellow-500/30 rounded-lg text-xs font-medium">
                  Credit-Based
                </span>
              )}

              {config.requires_resources && config.requires_resources.length > 0 && (
                <span className="px-3 py-1 bg-purple-500/30 rounded-lg text-xs font-medium">
                  Resources: {config.requires_resources.join(', ')}
                </span>
              )}

              {config.min_resources && (
                <span className="px-3 py-1 bg-red-500/30 rounded-lg text-xs font-medium">
                  Min Resources: {config.min_resources}
                </span>
              )}

              {config.slot_display === 'arrival-window' && (
                <span className="px-3 py-1 bg-cyan-500/30 rounded-lg text-xs font-medium">
                  Arrival Window
                </span>
              )}

              {config.queue_management && (
                <span className="px-3 py-1 bg-pink-500/30 rounded-lg text-xs font-medium">
                  Queue Management
                </span>
              )}

              {config.waitlist_enabled && (
                <span className="px-3 py-1 bg-indigo-500/30 rounded-lg text-xs font-medium">
                  Waitlist
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
