export interface UserProfile {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
    bio?: string;
    timezone: string;
    created_at: string;
}

export interface EventType {
    id: string;
    user_id?: string;
    organization_id?: string;
    use_case_config_id?: string;
    location_id?: string;
    title: string;
    slug: string;
    duration_minutes: number;
    description?: string;
    color: string;
    booking_mode?: string;
    assignment_strategy?: string;
    capacity_limit?: number;
    requires_multi_resource?: boolean;
    credit_cost?: number;
    buffer_minutes?: number;
    is_active: boolean;
    created_at: string;
}

export interface AvailabilityRule {
    id: string;
    user_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
    created_at: string;
}

export interface DateOverride {
    id: string;
    user_id: string;
    date: string;
    is_available: boolean;
    start_time?: string;
    end_time?: string;
    created_at: string;
}

export interface Booking {
    id: string;
    event_type_id: string;
    invitee_name: string;
    invitee_email: string;
    invitee_notes?: string;
    scheduled_at: string;
    timezone: string;
    status: string;
    created_at: string;
    assigned_resource_id?: string;
    location_id?: string;
    assignment_strategy?: string;
    metadata?: Record<string, any>;
}

export interface TimeSlot {
    time: string;
    datetime: Date;
    available: boolean;
}

export type ViewState = 'HOME' | 'DASHBOARD' | 'BOOKING_PAGE' | 'SUCCESS' | 'CLASSIC_DEMO';

export interface BookingData {
    eventType: EventType;
    selectedDate: Date;
    selectedTime: string;
    inviteeName: string;
    inviteeEmail: string;
    inviteeNotes: string;
    timezone: string;
}

export interface Organization {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
    timezone: string;
    metadata?: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export type ResourceType = 'person' | 'room' | 'equipment' | 'vehicle' | 'asset';
export type ResourceStatus = 'active' | 'inactive' | 'maintenance' | 'unavailable';

export interface Resource {
    id: string;
    organization_id: string;
    type: ResourceType;
    name: string;
    email?: string;
    phone?: string;
    avatar_url?: string;
    status: ResourceStatus;
    timezone: string;
    metadata?: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export type SkillCategory = 'certification' | 'language' | 'specialty' | 'equipment_type' | 'role' | 'other';

export interface Skill {
    id: string;
    organization_id: string;
    name: string;
    category: SkillCategory;
    description?: string;
    metadata?: Record<string, any>;
    created_at: string;
}

export type ProficiencyLevel = 'beginner' | 'intermediate' | 'proficient' | 'expert';

export interface ResourceSkill {
    id: string;
    resource_id: string;
    skill_id: string;
    proficiency_level: ProficiencyLevel;
    verified_at?: string;
    created_at: string;
}

export type LocationType = 'branch' | 'zone' | 'warehouse' | 'office' | 'facility' | 'other';

export interface Location {
    id: string;
    organization_id: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country: string;
    latitude?: number;
    longitude?: number;
    type: LocationType;
    metadata?: Record<string, any>;
    created_at: string;
}

export interface Territory {
    id: string;
    organization_id: string;
    name: string;
    polygon_geojson?: Record<string, any>;
    parent_territory_id?: string;
    metadata?: Record<string, any>;
    created_at: string;
}

export interface ResourceTerritory {
    id: string;
    resource_id: string;
    territory_id: string;
    is_primary: boolean;
    created_at: string;
}

export type UseCaseCategory = 'field_operations' | 'healthcare' | 'corporate' | 'facilities';
export type SchedulingMode = '1-to-1' | '1-to-many' | 'many-to-1' | 'panel' | 'asset-booking' | 'broadcast-claim';
export type AssignmentStrategy = 'manual' | 'round-robin' | 'weighted' | 'first-available' | 'geo-clustered' | 'first-come-first-serve';
export type BufferStrategy = 'none' | 'fixed' | 'travel-time' | 'pre-meeting';

export interface UseCaseConfig {
    id: string;
    name: string;
    slug: string;
    category: UseCaseCategory;
    icon: string;
    description?: string;
    config_json: {
        scheduling_mode: SchedulingMode;
        assignment_strategy?: AssignmentStrategy;
        capacity_enabled?: boolean;
        capacity_limit?: number;
        requires_resources?: ResourceType[];
        requires_skills?: string[];
        location_required?: boolean;
        confirmation_model?: 'immediate' | 'request-to-book';
        latency_monitoring?: boolean;
        buffer_strategy?: BufferStrategy;
        buffer_minutes?: number;
        credit_system_enabled?: boolean;
        waitlist_enabled?: boolean;
        queue_management?: boolean;
        walk_in_enabled?: boolean;
        smart_grouping?: boolean;
        calendar_overlay?: boolean;
        min_resources?: number;
        slot_display?: 'exact-time' | 'arrival-window';
        fairness_tracking?: boolean;
        open_slot_broadcast?: boolean;
    };
    is_template: boolean;
    display_order: number;
    created_at: string;
}

export interface EnhancedEventType extends EventType {
    organization_id?: string;
    use_case_config_id?: string;
    location_id?: string;
    capacity_limit?: number;
    requires_multi_resource?: boolean;
    credit_cost?: number;
    buffer_minutes?: number;
}

export interface EventTypeResource {
    id: string;
    event_type_id: string;
    resource_id: string;
    role: 'primary' | 'secondary' | 'optional' | 'required';
    is_required: boolean;
    created_at: string;
}

export interface ResourceAvailabilityRule {
    id: string;
    resource_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
    created_at: string;
}

export interface ResourceDateOverride {
    id: string;
    resource_id: string;
    date: string;
    is_available: boolean;
    start_time?: string;
    end_time?: string;
    reason?: string;
    created_at: string;
}

export interface ClientCredits {
    id: string;
    client_email: string;
    event_type_id: string;
    credits_remaining: number;
    credits_total: number;
    expires_at?: string;
    metadata?: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface BookingResource {
    id: string;
    booking_id: string;
    resource_id: string;
    role?: string;
    created_at: string;
}

export interface EnhancedTimeSlot extends TimeSlot {
    capacity?: number;
    booked?: number;
    waitlist?: boolean;
    resource_id?: string;
    resource_name?: string;
}

export interface ResourceWithSkills extends Resource {
    skills?: Skill[];
    territories?: Territory[];
}

export interface AssignmentResult {
    resource: Resource;
    reason: string;
    confidence: number;
}
