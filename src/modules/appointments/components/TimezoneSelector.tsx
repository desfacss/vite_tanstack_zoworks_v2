import { Globe } from 'lucide-react';
import { COMMON_TIMEZONES, detectUserTimezone } from '../lib/utils/timezoneUtils';

interface TimezoneSelectorProps {
  selectedTimezone: string;
  onTimezoneChange: (timezone: string) => void;
}

export default function TimezoneSelector({
  selectedTimezone,
  onTimezoneChange,
}: TimezoneSelectorProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Globe className="w-4 h-4 text-gray-500" />
      <select
        value={selectedTimezone}
        onChange={(e) => onTimezoneChange(e.target.value)}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
      >
        {COMMON_TIMEZONES.map((tz) => (
          <option key={tz.value} value={tz.value}>
            {tz.label}
          </option>
        ))}
      </select>
    </div>
  );
}
