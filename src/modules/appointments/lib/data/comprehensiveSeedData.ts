import { supabase } from '@/lib/supabase';

export interface UseCaseData {
    organization: {
        name: string;
        slug: string;
        timezone: string;
        logo_url?: string;
    };
    useCase: {
        name: string;
        slug: string;
        category: string;
        icon: string;
        description: string;
        config_json: any;
    };
    skills: Array<{
        name: string;
        category: string;
        description: string;
    }>;
    locations: Array<{
        name: string;
        address: string;
        city: string;
        state: string;
        postal_code: string;
        latitude: number;
        longitude: number;
        type: string;
    }>;
    territories?: Array<{
        name: string;
        polygon_geojson: any;
    }>;
    resources: Array<{
        type: string;
        name: string;
        email?: string;
        phone?: string;
        timezone: string;
        status: string;
        metadata?: any;
        skills?: string[];
        availability?: Array<{
            day_of_week: number;
            start_time: string;
            end_time: string;
        }>;
    }>;
    eventTypes: Array<{
        title: string;
        slug: string;
        duration: number;
        description: string;
        color: string;
        booking_mode?: string;
        assignment_strategy?: string;
        capacity_limit?: number;
        requires_multi_resource?: boolean;
        credit_cost?: number;
        buffer_minutes?: number;
        required_skills?: string[];
        resource_roles?: Array<{ resourceName: string; role: string }>;
    }>;
}

const STANDARD_AVAILABILITY = [
    { day_of_week: 1, start_time: '09:00', end_time: '17:00' },
    { day_of_week: 2, start_time: '09:00', end_time: '17:00' },
    { day_of_week: 3, start_time: '09:00', end_time: '17:00' },
    { day_of_week: 4, start_time: '09:00', end_time: '17:00' },
    { day_of_week: 5, start_time: '09:00', end_time: '17:00' },
];

export const useCasesSeedData: Record<string, UseCaseData> = {
    'field-service-ops': {
        organization: {
            name: 'TechFix Maintenance',
            slug: 'techfix-ops',
            timezone: 'America/New_York',
        },
        useCase: {
            name: 'Field Service Operations',
            slug: 'field-service',
            category: 'field_operations',
            icon: 'Wrench',
            description: 'Geo-clustered scheduling for HVAC technicians with territory management',
            config_json: {
                scheduling_mode: 'geo_clustering',
                assignment_strategy: 'nearest_available',
                buffer_type: 'travel_time',
                requires_location: true,
                max_distance_miles: 25,
            },
        },
        skills: [
            { name: 'HVAC Certification', category: 'certification', description: 'EPA 608 Universal Certification' },
            { name: 'Electrical Work', category: 'certification', description: 'Licensed electrician' },
            { name: 'Emergency Response', category: 'specialty', description: 'Available for urgent calls' },
            { name: 'Commercial Systems', category: 'specialty', description: 'Large commercial HVAC systems' },
            { name: 'Residential Systems', category: 'specialty', description: 'Home HVAC systems' },
        ],
        locations: [
            {
                name: 'North Manhattan Branch',
                address: '1234 Broadway',
                city: 'New York',
                state: 'NY',
                postal_code: '10001',
                latitude: 40.7589,
                longitude: -73.9851,
                type: 'branch',
            },
            {
                name: 'Brooklyn Service Center',
                address: '567 Atlantic Ave',
                city: 'Brooklyn',
                state: 'NY',
                postal_code: '11217',
                latitude: 40.6840,
                longitude: -73.9772,
                type: 'branch',
            },
            {
                name: 'Queens Warehouse',
                address: '890 Queens Blvd',
                city: 'Queens',
                state: 'NY',
                postal_code: '11374',
                latitude: 40.7392,
                longitude: -73.8693,
                type: 'warehouse',
            },
        ],
        territories: [
            {
                name: 'Manhattan North',
                polygon_geojson: {
                    type: 'Polygon',
                    coordinates: [[
                        [-73.9851, 40.7589],
                        [-73.9551, 40.7789],
                        [-73.9251, 40.7489],
                        [-73.9551, 40.7289],
                        [-73.9851, 40.7589],
                    ]],
                },
            },
            {
                name: 'Brooklyn Central',
                polygon_geojson: {
                    type: 'Polygon',
                    coordinates: [[
                        [-73.9772, 40.6840],
                        [-73.9472, 40.7040],
                        [-73.9172, 40.6740],
                        [-73.9472, 40.6540],
                        [-73.9772, 40.6840],
                    ]],
                },
            },
        ],
        resources: [
            {
                type: 'person',
                name: 'Mike Rodriguez',
                email: 'mike@techfix.com',
                phone: '555-0101',
                timezone: 'America/New_York',
                status: 'active',
                skills: ['HVAC Certification', 'Emergency Response', 'Commercial Systems'],
                metadata: { round_robin_weight: 1, total_bookings: 45 },
                availability: [
                    { day_of_week: 1, start_time: '08:00', end_time: '17:00' },
                    { day_of_week: 2, start_time: '08:00', end_time: '17:00' },
                    { day_of_week: 3, start_time: '08:00', end_time: '17:00' },
                    { day_of_week: 4, start_time: '08:00', end_time: '17:00' },
                    { day_of_week: 5, start_time: '08:00', end_time: '17:00' },
                ],
            },
            {
                type: 'person',
                name: 'Sarah Chen',
                email: 'sarah@techfix.com',
                phone: '555-0102',
                timezone: 'America/New_York',
                status: 'active',
                skills: ['HVAC Certification', 'Electrical Work', 'Residential Systems'],
                metadata: { round_robin_weight: 1, total_bookings: 52 },
                availability: [
                    { day_of_week: 1, start_time: '07:00', end_time: '16:00' },
                    { day_of_week: 2, start_time: '07:00', end_time: '16:00' },
                    { day_of_week: 3, start_time: '07:00', end_time: '16:00' },
                    { day_of_week: 4, start_time: '07:00', end_time: '16:00' },
                    { day_of_week: 5, start_time: '07:00', end_time: '16:00' },
                ],
            },
            {
                type: 'person',
                name: 'James Wilson',
                email: 'james@techfix.com',
                phone: '555-0103',
                timezone: 'America/New_York',
                status: 'active',
                skills: ['HVAC Certification', 'Emergency Response'],
                metadata: { round_robin_weight: 1, total_bookings: 38 },
                availability: [
                    { day_of_week: 1, start_time: '09:00', end_time: '18:00' },
                    { day_of_week: 2, start_time: '09:00', end_time: '18:00' },
                    { day_of_week: 3, start_time: '09:00', end_time: '18:00' },
                    { day_of_week: 4, start_time: '09:00', end_time: '18:00' },
                    { day_of_week: 5, start_time: '09:00', end_time: '18:00' },
                ],
            },
            {
                type: 'vehicle',
                name: 'Service Van #1',
                timezone: 'America/New_York',
                status: 'active',
                metadata: { license_plate: 'TF-101', capacity: 2 },
                availability: STANDARD_AVAILABILITY,
            },
            {
                type: 'vehicle',
                name: 'Service Van #2',
                timezone: 'America/New_York',
                status: 'active',
                metadata: { license_plate: 'TF-102', capacity: 2 },
                availability: STANDARD_AVAILABILITY,
            },
        ],
        eventTypes: [
            {
                title: '15-Minute Consultation',
                slug: 'techfix-15min',
                duration: 15,
                description: 'Quick consultation for minor issues or questions',
                color: '#10b981',
                booking_mode: 'appointment',
                assignment_strategy: 'round-robin',
                buffer_minutes: 5,
                required_skills: ['HVAC Certification'],
            },
            {
                title: '30-Minute Service Call',
                slug: 'techfix-30min',
                duration: 30,
                description: 'Standard service call for diagnostics and minor repairs',
                color: '#3b82f6',
                booking_mode: 'arrival-window',
                assignment_strategy: 'geo-clustered',
                buffer_minutes: 15,
                required_skills: ['HVAC Certification'],
            },
            {
                title: '60-Minute Repair',
                slug: 'techfix-60min',
                duration: 60,
                description: 'Standard repair or maintenance appointment',
                color: '#f59e0b',
                booking_mode: 'arrival-window',
                assignment_strategy: 'geo-clustered',
                buffer_minutes: 30,
                required_skills: ['HVAC Certification'],
            },
            {
                title: 'Emergency Repair',
                slug: 'techfix-emergency',
                duration: 120,
                description: 'Urgent HVAC system failure requiring immediate attention',
                color: '#ef4444',
                booking_mode: 'arrival-window',
                assignment_strategy: 'skill-based',
                buffer_minutes: 30,
                required_skills: ['HVAC Certification', 'Emergency Response'],
            },
        ],
    },
};

export async function seedUseCaseData(useCaseKey: string) {
    const data = useCasesSeedData[useCaseKey];
    if (!data) {
        throw new Error(`Use case data not found for: ${useCaseKey}`);
    }

    console.log(`Seeding data for ${data.organization.name}...`);

    const { data: org, error: orgError } = await supabase
        .schema('calendar')
        .from('organizations')
        .upsert(data.organization, { onConflict: 'slug' })
        .select()
        .single();

    if (orgError) throw orgError;
    console.log('✓ Organization created/updated');

    const { data: useCase, error: useCaseError } = await supabase
        .schema('calendar')
        .from('use_case_configs')
        .upsert({
            ...data.useCase,
        }, { onConflict: 'slug' })
        .select()
        .single();

    if (useCaseError) throw useCaseError;
    console.log('✓ Use case config created/updated');

    const skillMap = new Map();
    for (const skill of data.skills) {
        const { data: insertedSkill, error: skillError } = await supabase
            .schema('calendar')
            .from('skills')
            .upsert({
                ...skill,
                organization_id: org.id,
            }, { onConflict: 'organization_id, name' })
            .select()
            .single();

        if (skillError) throw skillError;
        skillMap.set(skill.name, insertedSkill.id);
    }
    console.log(`✓ ${data.skills.length} skills created/updated`);

    const locationMap = new Map();
    if (data.locations && data.locations.length > 0) {
        for (const location of data.locations) {
            const { data: insertedLocation, error: locationError } = await supabase
                .schema('calendar')
                .from('locations')
                .upsert({
                    ...location,
                    organization_id: org.id,
                }, { onConflict: 'organization_id, name' })
                .select()
                .single();

            if (locationError) throw locationError;
            locationMap.set(location.name, insertedLocation.id);
        }
        console.log(`✓ ${data.locations.length} locations created/updated`);
    }

    const resourceMap = new Map();
    for (const resource of data.resources) {
        const { skills: resourceSkills, availability, ...resourceData } = resource;

        const { data: insertedResource, error: resourceError } = await supabase
            .schema('calendar')
            .from('resources')
            .upsert({
                ...resourceData,
                organization_id: org.id,
            }, { onConflict: 'organization_id, name' })
            .select()
            .single();

        if (resourceError) throw resourceError;
        resourceMap.set(resource.name, insertedResource.id);

        if (resourceSkills && resourceSkills.length > 0) {
            for (const skillName of resourceSkills) {
                const skillId = skillMap.get(skillName);
                if (skillId) {
                    await supabase.schema('calendar').from('resource_skills').upsert({
                        resource_id: insertedResource.id,
                        skill_id: skillId,
                        proficiency_level: 'proficient',
                    }, { onConflict: 'resource_id, skill_id' });
                }
            }
        }

        if (availability && availability.length > 0) {
            for (const avail of availability) {
                await supabase.schema('calendar').from('resource_availability_rules').upsert({
                    resource_id: insertedResource.id,
                    ...avail,
                }, { onConflict: 'resource_id, day_of_week, start_time, end_time' });
            }
        }
    }
    console.log(`✓ ${data.resources.length} resources created/updated`);

    for (const eventType of data.eventTypes) {
        const { required_skills, resource_roles, ...eventTypeData } = eventType;

        const eventTypePayload = {
            title: eventTypeData.title,
            slug: eventTypeData.slug,
            duration_minutes: eventTypeData.duration,
            description: eventTypeData.description,
            color: eventTypeData.color,
            booking_mode: eventTypeData.booking_mode || 'appointment',
            assignment_strategy: eventTypeData.assignment_strategy || 'round-robin',
            capacity_limit: eventTypeData.capacity_limit,
            requires_multi_resource: eventTypeData.requires_multi_resource || false,
            credit_cost: eventTypeData.credit_cost || 0,
            buffer_minutes: eventTypeData.buffer_minutes || 0,
            is_active: true,
            organization_id: org.id,
            use_case_config_id: useCase.id,
        };

        const { data: insertedEventType, error: eventTypeError } = await supabase
            .schema('calendar')
            .from('event_types')
            .upsert(eventTypePayload, { onConflict: 'slug' })
            .select()
            .single();

        if (eventTypeError) throw eventTypeError;

        if (resource_roles && resource_roles.length > 0) {
            let isFirst = true;
            for (const roleAssignment of resource_roles) {
                const resourceId = resourceMap.get(roleAssignment.resourceName);
                if (resourceId) {
                    await supabase.schema('calendar').from('event_type_resources').upsert({
                        event_type_id: insertedEventType.id,
                        resource_id: resourceId,
                        role: (isFirst && eventTypePayload.requires_multi_resource) ? 'primary' : roleAssignment.role,
                        is_required: true,
                    }, { onConflict: 'event_type_id, resource_id' });
                    isFirst = false;
                }
            }
        } else if (data.resources.length > 0) {
            for (const resource of data.resources) {
                const resourceId = resourceMap.get(resource.name);
                if (resourceId) {
                    await supabase.schema('calendar').from('event_type_resources').upsert({
                        event_type_id: insertedEventType.id,
                        resource_id: resourceId,
                        role: 'primary',
                        is_required: true,
                    }, { onConflict: 'event_type_id, resource_id' });
                }
            }
        }
    }
    console.log(`✓ ${data.eventTypes.length} event types created`);
    return org.id;
}

export async function seedAllUseCases() {
    const useCaseKeys = Object.keys(useCasesSeedData);
    const results = [];

    let completed = 0;
    for (const key of useCaseKeys) {
        try {
            console.log(`[${++completed}/${useCaseKeys.length}] 🌱 Seeding: ${key}...`);
            await seedUseCaseData(key);
            results.push({ key, status: 'success' });
        } catch (error) {
            console.error(`❌ Failed to seed ${key}:`, error);
            results.push({ key, status: 'error', error });
            throw error;
        }
    }

    console.log('🎉 All use cases seeded successfully!');
    return results;
}
