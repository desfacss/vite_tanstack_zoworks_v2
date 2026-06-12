import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/authStore';
import HomePage from '../components/HomePage';
import PublicBookingPage from '../components/PublicBookingPage';
import BookingSuccess from '../components/BookingSuccess';
import { EventType, UserProfile, Booking, UseCaseConfig } from '../lib/types';
import NavigationHeader from '../components/NavigationHeader';
import { Spin } from 'antd';
import { ToastProvider } from '../components/common/Toast';

export default function PublicAppointmentsPage() {
    const authOrganization = useAuthStore((state) => state.organization);
    const [organization, setOrganization] = useState<any>(authOrganization);
    const [view, setView] = useState<'HOME' | 'BOOKING_PAGE' | 'SUCCESS'>('HOME');

    useEffect(() => {
        if (authOrganization) {
            setOrganization(authOrganization);
        } else {
            const publicOrgId = import.meta.env.VITE_PUBLIC_ORG_ID;
            if (publicOrgId) {
                supabase.schema('identity').from('organizations').select('*').eq('id', publicOrgId).single()
                    .then(({ data }) => {
                        if (data) setOrganization(data);
                    });
            }
        }
    }, [authOrganization]);
    const [eventTypes, setEventTypes] = useState<EventType[]>([]);
    const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
    const [availabilityRules, setAvailabilityRules] = useState<any[]>([]);
    const [dateOverrides, setDateOverrides] = useState<any[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [resources, setResources] = useState<any[]>([]);
    const [resourceAvailabilityRules, setResourceAvailabilityRules] = useState<any[]>([]);
    const [resourceDateOverrides, setResourceDateOverrides] = useState<any[]>([]);
    const [eventTypeResources, setEventTypeResources] = useState<any[]>([]);
    const [bookingResources, setBookingResources] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [selectedUseCase, setSelectedUseCase] = useState<UseCaseConfig | null>(null);

    useEffect(() => {
        if (organization?.id) {
            loadData();
        }
    }, [organization?.id]);

    async function loadData() {
        if (!organization?.id) return;
        setIsLoading(true);
        try {
            const { data: etData } = await supabase.schema('cal').from('event_types').select('*').eq('organization_id', organization.id);
            setEventTypes(etData || []);

            // Load app settings for use case info if needed
            const { data: orgData } = await supabase.schema('identity').from('organizations').select('app_settings').eq('id', organization.id).single();
            if (orgData?.app_settings?.use_case) {
                // This is a simplification, in source it comes from a specific table or config
                setSelectedUseCase({
                    id: 'default',
                    name: organization.name,
                    slug: organization.name.toLowerCase().replace(/\s+/g, '-'),
                    category: 'corporate',
                    icon: 'calendar',
                    config_json: orgData.app_settings.use_case,
                    is_template: false,
                    display_order: 0,
                    created_at: new Date().toISOString()
                });
            }

            // Mocking user profile for the public page as it usually shows the consultant's info
            setUserProfile({
                id: 'org-consultant',
                name: organization.name,
                email: 'consultant@' + organization.name.toLowerCase().replace(/\s+/g, '') + '.com',
                timezone: 'UTC',
                created_at: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    }

    const handleSelectEventType = async (eventType: EventType) => {
        setSelectedEventType(eventType);
        setIsLoading(true);
        try {
            // Load rules and bookings for the selected event type
            const [books, res, resRules, resOverrides, etRes, bookRes] = await Promise.all([
                supabase.schema('cal').from('v_bookings').select('*').eq('event_type_id', eventType.id),
                supabase.schema('cal').from('v_bookable_resources').select('*').eq('organization_id', organization?.id),
                supabase.schema('cal').from('resource_availability_rules').select('*'),
                supabase.schema('unified').from('resource_unavailability').select('*'),
                supabase.schema('cal').from('event_type_resources').select('*').eq('event_type_id', eventType.id),
                supabase.schema('unified').from('task_assignments').select('*')
            ]);

            // Map cal views and unified tables to old interface shapes for frontend availability engine compat
            const mappedBookings = (books.data || []).map((b: any) => ({
                ...b,
                id: b.booking_id,
                scheduled_at: b.scheduled_start
            }));

            const mappedOverrides = (resOverrides.data || []).map((o: any) => ({
                ...o,
                start_time: o.start_at,
                end_time: o.end_at,
                date: o.start_at ? o.start_at.split('T')[0] : ''
            }));

            const mappedBookingResources = (bookRes.data || []).map((br: any) => ({
                ...br,
                booking_id: br.task_id
            }));

            setAvailabilityRules([]); // Global rules not used in resource-centric model
            setDateOverrides([]); // Global overrides not used in resource-centric model
            setBookings(mappedBookings);
            setResources(res.data || []);
            setResourceAvailabilityRules(resRules.data || []);
            setResourceDateOverrides(mappedOverrides);
            setEventTypeResources(etRes.data || []);
            setBookingResources(mappedBookingResources);

            setView('BOOKING_PAGE');
        } catch (error) {
            console.error('Error loading booking data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBookingSubmit = async (data: any) => {
        setIsLoading(true);
        try {
            const selectedRes = resources.find(r => r.id === data.assignedResourceId);
            const resourceKind = selectedRes?.resource_kind || 'contact';

            const { error } = await supabase.schema('cal').rpc('book_appointment', {
                p_event_type_id: selectedEventType?.id,
                p_slot_start: data.selectedSlot.datetime,
                p_invitee_name: data.name,
                p_invitee_email: data.email,
                p_invitee_notes: data.notes,
                p_timezone: data.timezone,
                p_resource_id: data.assignedResourceId || null,
                p_resource_kind: resourceKind,
                p_location_id: selectedEventType?.location_id || null
            });

            if (error) throw error;
            setView('SUCCESS');
        } catch (error) {
            console.error('Error creating booking:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ToastProvider>
            <div className="min-h-screen bg-gray-50">
                {/* <NavigationHeader
                    viewState="PUBLIC"
                    onSetViewState={() => { }}
                /> */}

                {!organization ? (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                        <h2 className="text-xl font-semibold text-gray-900">Please select an organization to view appointments</h2>
                    </div>
                ) : (
                    <>
                        {isLoading && (
                            <div className="fixed inset-0 bg-white/50 z-50 flex items-center justify-center">
                                <Spin size="large" />
                            </div>
                        )}

                        {view === 'HOME' && (
                            <HomePage
                                user={userProfile}
                                eventTypes={eventTypes}
                                onSelectEventType={handleSelectEventType}
                                selectedUseCase={selectedUseCase}
                            />
                        )}

                        {view === 'BOOKING_PAGE' && selectedEventType && (
                            <PublicBookingPage
                                user={userProfile!}
                                eventType={selectedEventType}
                                availabilityRules={availabilityRules}
                                dateOverrides={dateOverrides}
                                bookings={bookings}
                                resources={resources}
                                resourceAvailabilityRules={resourceAvailabilityRules}
                                resourceDateOverrides={resourceDateOverrides}
                                eventTypeResources={eventTypeResources}
                                bookingResources={bookingResources}
                                onBookingSubmit={handleBookingSubmit}
                                onBack={() => setView('HOME')}
                                selectedUseCase={selectedUseCase}
                            />
                        )}

                        {view === 'SUCCESS' && selectedEventType && (
                            <BookingSuccess
                                bookingData={{
                                    eventType: selectedEventType,
                                    selectedDate: new Date(),
                                    selectedTime: '10:00 AM',
                                    inviteeName: 'Customer',
                                    inviteeEmail: 'customer@example.com',
                                    inviteeNotes: '',
                                    timezone: 'UTC'
                                }}
                                onBackToDashboard={() => setView('HOME')}
                            />
                        )}
                    </>
                )}
            </div>
        </ToastProvider>
    );
}
