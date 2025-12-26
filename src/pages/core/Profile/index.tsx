// src/pages/core/Profile/index.tsx
/**
 * Profile Page
 * Comprehensive user identity page showing all tenant-related data
 */
import React from 'react';
import { Spin, Alert, Row, Col } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  PageActionBar,
  ActionBarLeft,
  PageTitle,
} from '@/core/components/ActionBar';
import { useAuthStore } from '@/core/lib/store';
import { useUserProfile } from '@/core/hooks/useUserProfile';
import {
  UserCard,
  OrganizationInfo,
  RolesSection,
  TeamsSection,
  LocationsSection,
  ReportingLine,
} from './components';

const Profile: React.FC = () => {
  const { t } = useTranslation();
  
  // Get session data from store
  const { 
    user, 
    organization, 
    location, 
    roles, 
    teams, 
    locations, 
    permissions 
  } = useAuthStore();

  // Fetch extended profile data (manager info, etc.)
  const { data: profileData, isLoading: isProfileLoading, error: profileError } = useUserProfile();

  // Calculate subordinate count from session data if available
  // The jwt_get_user_session returns subordinates array
  const subordinateCount = 0; // Will be populated when we have subordinates in store

  if (!user) {
    return (
      <div className="page-content layout-canvas">
        <PageActionBar>
          <ActionBarLeft>
            <PageTitle title={t('common.label.profile')} />
          </ActionBarLeft>
        </PageActionBar>
        <div className="page-card">
          <Spin size="large" tip="Loading profile..." />
        </div>
      </div>
    );
  }

  return (
    <div className="page-content layout-canvas">
      <PageActionBar>
        <ActionBarLeft>
          <PageTitle title={t('common.label.profile')} />
        </ActionBarLeft>
      </PageActionBar>

      <div className="page-card">
        {profileError && (
          <Alert
            type="warning"
            message="Could not load extended profile data"
            description={profileError.message}
            className="mb-4"
            closable
          />
        )}

        <Row gutter={[16, 16]}>
          {/* Left Column - User Info */}
          <Col xs={24} lg={12}>
            <div className="space-y-4">
              {/* User Identity Card */}
              <UserCard user={user} />

              {/* Organization Context */}
              <OrganizationInfo
                organization={organization}
                location={location}
                memberSince={profileData?.organizationUser?.created_at}
                isActive={profileData?.organizationUser?.is_active ?? true}
              />

              {/* Reporting Line */}
              <ReportingLine
                manager={profileData?.manager}
                isLoading={isProfileLoading}
                subordinateCount={subordinateCount}
              />
            </div>
          </Col>

          {/* Right Column - Access & Assignments */}
          <Col xs={24} lg={12}>
            <div className="space-y-4">
              {/* Roles & Permissions */}
              <RolesSection roles={roles} permissions={permissions} />

              {/* Teams */}
              <TeamsSection teams={teams} />

              {/* Locations */}
              <LocationsSection
                locations={locations}
                currentLocationId={location?.id}
              />
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default Profile;
