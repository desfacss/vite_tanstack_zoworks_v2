INSERT INTO identity.user_teams (
  organization_user_id,
  team_id,
  created_by,
  organization_id
) VALUES (
  'b39d41b9-a510-43ae-8abc-e4b7691fdce2',  -- organization_user_id
  'a9b79e41-1da0-4e4b-84f7-811bac64b345',  -- team_id
  '6ba504d2-65b7-4018-b8a1-323dd686996c',  -- created_by
  'a41b2216-736c-4c00-99ca-30a0cd8ca0d2'   -- organization_id (required for RLS)
);


the organization id is not passed


api_new_upsert v_user_teams