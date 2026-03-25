import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Clock, Search, MapPin, CreditCard, Users, Calendar, ChevronRight, Loader2 } from 'lucide-react';

interface ServiceSelectionProps {
  organizationId: string;
  onSelectService: (eventType: EnhancedEventType) => void;
  onBack?: () => void;
}

interface EnhancedEventType {
  id: string;
  title: string;
  slug: string;
  description?: string;
  duration: number;
  color: string;
  capacity_limit?: number;
  credit_cost?: number;
  booking_mode?: string;
  location_id?: string;
  location_name?: string;
  is_active: boolean;
}

export function ServiceSelection({ organizationId, onSelectService, onBack }: ServiceSelectionProps) {
  const [services, setServices] = useState<EnhancedEventType[]>([]);
  const [filteredServices, setFilteredServices] = useState<EnhancedEventType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCategory, _setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    loadServices();
  }, [organizationId]);

  useEffect(() => {
    filterServices();
  }, [searchQuery, selectedCategory, services]);

  async function loadServices() {
    try {
      setLoading(true);

      const { data: eventTypes, error } = await supabase
        .schema('calendar')
        .from('event_types')
        .select(`
          id,
          title,
          slug,
          description,
          duration,
          color,
          capacity_limit,
          credit_cost,
          booking_mode,
          location_id,
          is_active
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('title');

      if (error) throw error;

      // Load location names for services that have locations
      const servicesWithLocations = await Promise.all(
        (eventTypes || []).map(async (et) => {
          if (et.location_id) {
            const { data: location } = await supabase
              .schema('identity')
              .from('locations')
              .select('name')
              .eq('id', et.location_id)
              .maybeSingle();

            return { ...et, location_name: location?.name };
          }
          return et;
        })
      );

      setServices(servicesWithLocations);
      setFilteredServices(servicesWithLocations);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterServices() {
    let filtered = services;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (service) =>
          service.title.toLowerCase().includes(query) ||
          service.description?.toLowerCase().includes(query)
      );
    }

    // Apply category filter (placeholder - you can expand this)
    if (selectedCategory !== 'all') {
      // This would filter by category if you have categories in your data
      // For now, it's a placeholder
    }

    setFilteredServices(filtered);
  }

  const getBookingModeLabel = (mode?: string) => {
    switch (mode) {
      case 'queue':
        return 'Walk-in Queue';
      case 'arrival-window':
        return 'Arrival Window';
      case 'open-shift':
        return 'Open Shift';
      default:
        return 'Book Appointment';
    }
  };

  const getBookingModeIcon = (mode?: string) => {
    switch (mode) {
      case 'queue':
        return <Users className="w-4 h-4" />;
      case 'arrival-window':
        return <Clock className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Select a Service</h1>
          <p className="text-gray-600">Choose the service you'd like to book</p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchQuery ? 'No services match your search' : 'No services available'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <div
                key={service.id}
                onClick={() => onSelectService(service)}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3 flex-1">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: service.color }}
                    />
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {service.title}
                    </h3>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>

                {service.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {service.description}
                  </p>
                )}

                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-gray-700">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{service.duration} minutes</span>
                  </div>

                  {service.location_name && (
                    <div className="flex items-center space-x-2 text-sm text-gray-700">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{service.location_name}</span>
                    </div>
                  )}

                  {service.capacity_limit && (
                    <div className="flex items-center space-x-2 text-sm text-gray-700">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span>Max {service.capacity_limit} participants</span>
                    </div>
                  )}

                  {service.credit_cost && service.credit_cost > 0 && (
                    <div className="flex items-center space-x-2 text-sm text-gray-700">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      <span>{service.credit_cost} credits</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 text-sm pt-3 border-t border-gray-100">
                    {getBookingModeIcon(service.booking_mode)}
                    <span className="font-medium text-blue-600">
                      {getBookingModeLabel(service.booking_mode)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {onBack && (
          <div className="mt-8 text-center">
            <button
              onClick={onBack}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
