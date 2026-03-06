import {
  Resource,
  ResourceWithSkills,
  Skill,
  Territory,
  UseCaseConfig,
  AssignmentResult,
  Booking,
  ResourceAvailabilityRule,
  ResourceDateOverride,
} from '../types';

export interface ResourceFilter {
  requiredSkills?: string[];
  territoryId?: string;
  locationId?: string;
  resourceType?: string[];
  status?: string;
}

export function filterResourcesBySkills(
  resources: ResourceWithSkills[],
  requiredSkillNames: string[]
): ResourceWithSkills[] {
  if (!requiredSkillNames || requiredSkillNames.length === 0) {
    return resources;
  }

  return resources.filter((resource) => {
    if (!resource.skills || resource.skills.length === 0) {
      return false;
    }

    const resourceSkillNames = resource.skills.map((s) => s.name);
    return requiredSkillNames.some((required) =>
      resourceSkillNames.includes(required)
    );
  });
}

export function filterResourcesByTerritory(
  resources: ResourceWithSkills[],
  territoryId?: string
): ResourceWithSkills[] {
  if (!territoryId) {
    return resources;
  }

  return resources.filter((resource) => {
    if (!resource.territories || resource.territories.length === 0) {
      return false;
    }
    return resource.territories.some((t) => t.id === territoryId);
  });
}

export function filterResourcesByType(
  resources: Resource[],
  types?: string[]
): Resource[] {
  if (!types || types.length === 0) {
    return resources;
  }
  return resources.filter((r) => types.includes(r.type));
}

export function assignResourceRoundRobin(
  availableResources: Resource[],
  recentBookings: Booking[]
): AssignmentResult | null {
  if (availableResources.length === 0) {
    return null;
  }

  const bookingCounts = new Map<string, number>();
  availableResources.forEach((r) => bookingCounts.set(r.id, 0));

  recentBookings.forEach((booking) => {
    if (booking.assigned_resource_id) {
      const count = bookingCounts.get(booking.assigned_resource_id) || 0;
      bookingCounts.set(booking.assigned_resource_id, count + 1);
    }
  });

  let minCount = Infinity;
  let selectedResource: Resource | null = null;

  availableResources.forEach((resource) => {
    const count = bookingCounts.get(resource.id) || 0;
    if (count < minCount) {
      minCount = count;
      selectedResource = resource;
    }
  });

  if (!selectedResource) {
    return null;
  }

  return {
    resource: selectedResource,
    reason: `Round-robin assignment: ${minCount} recent bookings`,
    confidence: 1.0,
  };
}

export function assignResourceWeighted(
  availableResources: ResourceWithSkills[],
  recentBookings: Booking[]
): AssignmentResult | null {
  if (availableResources.length === 0) {
    return null;
  }

  const scores = availableResources.map((resource) => {
    let score = 0;

    const performanceScore = resource.metadata?.performance_score || 0.5;
    score += performanceScore * 50;

    const seniority = resource.metadata?.seniority || 1;
    score += seniority * 20;

    const expertSkills = resource.skills?.filter(
      (s) => s.proficiency_level === 'expert'
    ).length || 0;
    score += expertSkills * 10;

    const recentBookingCount = recentBookings.filter(
      (b) => b.assigned_resource_id === resource.id
    ).length;
    score -= recentBookingCount * 5;

    return { resource, score };
  });

  scores.sort((a, b) => b.score - a.score);

  return {
    resource: scores[0].resource,
    reason: `Weighted score: ${scores[0].score.toFixed(1)}`,
    confidence: 0.9,
  };
}

export function assignResourceFirstAvailable(
  availableResources: Resource[]
): AssignmentResult | null {
  if (availableResources.length === 0) {
    return null;
  }

  return {
    resource: availableResources[0],
    reason: 'First available resource',
    confidence: 1.0,
  };
}

export function assignResourceGeoClustered(
  availableResources: Resource[],
  targetLocationId: string,
  recentBookings: Booking[]
): AssignmentResult | null {
  if (availableResources.length === 0) {
    return null;
  }

  const resourcesWithSameLocation = availableResources.filter((resource) => {
    const todaysBookings = recentBookings.filter(
      (b) =>
        b.assigned_resource_id === resource.id &&
        new Date(b.scheduled_at).toDateString() === new Date().toDateString()
    );

    return todaysBookings.some((b) => b.location_id === targetLocationId);
  });

  if (resourcesWithSameLocation.length > 0) {
    return {
      resource: resourcesWithSameLocation[0],
      reason: 'Geo-clustered: already scheduled in this location today',
      confidence: 1.0,
    };
  }

  return {
    resource: availableResources[0],
    reason: 'First available (no geo-cluster match)',
    confidence: 0.7,
  };
}

export function assignResourceByStrategy(
  strategy: string,
  availableResources: ResourceWithSkills[],
  recentBookings: Booking[],
  targetLocationId?: string
): AssignmentResult | null {
  switch (strategy) {
    case 'round-robin':
      return assignResourceRoundRobin(availableResources, recentBookings);

    case 'weighted':
      return assignResourceWeighted(availableResources, recentBookings);

    case 'first-available':
      return assignResourceFirstAvailable(availableResources);

    case 'geo-clustered':
      return assignResourceGeoClustered(
        availableResources,
        targetLocationId || '',
        recentBookings
      );

    case 'manual':
      return availableResources.length > 0
        ? {
            resource: availableResources[0],
            reason: 'Manual selection required',
            confidence: 0.5,
          }
        : null;

    default:
      return assignResourceFirstAvailable(availableResources);
  }
}

export function getResourceAvailability(
  resource: Resource,
  date: Date,
  rules: ResourceAvailabilityRule[],
  overrides: ResourceDateOverride[]
): { isAvailable: boolean; startTime?: string; endTime?: string } {
  const dateStr = date.toISOString().split('T')[0];
  const override = overrides.find(
    (o) => o.resource_id === resource.id && o.date === dateStr
  );

  if (override) {
    return {
      isAvailable: override.is_available,
      startTime: override.start_time,
      endTime: override.end_time,
    };
  }

  const dayOfWeek = date.getDay();
  const rule = rules.find(
    (r) => r.resource_id === resource.id && r.day_of_week === dayOfWeek && r.is_available
  );

  if (!rule) {
    return { isAvailable: false };
  }

  return {
    isAvailable: true,
    startTime: rule.start_time,
    endTime: rule.end_time,
  };
}

export function matchResourcesForEventType(
  allResources: ResourceWithSkills[],
  config: UseCaseConfig,
  filter: ResourceFilter
): ResourceWithSkills[] {
  let matched = allResources.filter((r) => r.status === 'active');

  if (config.config_json.requires_resources) {
    matched = filterResourcesByType(matched, config.config_json.requires_resources);
  }

  if (config.config_json.requires_skills) {
    matched = filterResourcesBySkills(matched, config.config_json.requires_skills);
  }

  if (filter.territoryId) {
    matched = filterResourcesByTerritory(matched, filter.territoryId);
  }

  return matched;
}
