# RPC Interaction Flow

This document outlines the Remote Procedure Calls (RPCs) made from the client to the Supabase backend, organized by the user's natural flow of interactions.

| S.No | RPC Function Name | Schema | Component / Page | Purpose | Version | Is Duplicate / Conflict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `auth.getSession()`, `jwt_get_user_session_v2` | public | `useUserSession.ts` | Fetches the current user's session details, including organization and role context. | - | - |
***| 2 | `get_user_module_permissions_v3` | public | `supabase.ts` | Retrieves the list of modules and permissions accessible to the logged-in user. | v3 | - |
***| 3 | `idt_utils_get_merged_app_settings` | public | `supabase.ts` | Fetches application settings merged from organization and location levels. | - | - |

MERGED APP SETTINGS FOR LOCATIONS & ORG - FROM SESSION DATA - Sender Email or Whatsapp

| 4 | `fn_get_or_calc_metric_data_v4` | analytics | `Dashboard.tsx` | Calculates and retrieves metric data for dashboard widgets. | v3 | `fn_get_or_calc_metric_data`, `fn_get_or_calc_metric_data_v2` |

fn_get_or_calc_metric_data_v3
src\pages\Dashboard.tsx

| 5 | `core_get_entity_data_v30` | public | `DynamicViews/index.tsx` | The main data fetching function for dynamic views, handling filtering, sorting, and pagination. | v29 | `core_get_entity_data_details`, `core_get_entity_data_metadata_v13` |

core_get_entity_data_v5
components\common\details\EntityImages.tsx

core_get_entity_data_with_multi_joins_v2
components\common\doc\DocumentFormModal.tsx

core_get_entity_data_with_joins_v2
components\pages\MapComponents\index.tsx

core_get_entity_data_with_joins_v2
components\pages\tickets\Messages.tsx

***| 6 | `get_unread_counts` | public | `Channels/index.tsx` | Fetches unread message counts for chat channels. | - | - |
| 7 | `core_upsert_data_v8` | public | `GlobalActions.tsx` | Handles the creation of new records for generic entities. | v8 | `core_upsert_data_v7` |
***| 8 | `core_upsert_data_v7` | public | `RowActions.tsx` | Handles the update and cloning of existing records. | v7 | `core_upsert_data_v8` |

core_upsert_data_v7
src\components\common\details\ApprovalActionButtons.tsx
src\components\DynamicViews\RowActions.tsx
src\components\DynamicViews\KanbanView.tsx

| 9 | `maps_get_clients_with_wkt` | public | `MapComponents/index.tsx` | Retrieves client locations with Well-Known Text (WKT) geometry for map visualization. | - | - |
| 10 | `update_client_geofence` | public | `CustomerMap.tsx` | Updates the geofence data for a specific client. | - | - |
| 11 | `get_ticket_messages` | public | `tickets/Messages.tsx` | Fetches the conversation history for a specific ticket. | - | - |
| 12 | `tkt_wrapper_create_manual_ticket_v8` | organization | `TicketForm.tsx` | Specialized RPC for creating tickets with specific business logic. | v8 | - |
| 13 | `tkt_wrapper_create_qr_ticket_v5` | public | `QrTicketForm.tsx` | Creates a ticket from a QR code scan. | v5 | - |
| 14 | `tkt_utils_sync_conversation_receivers` | public | `TicketForm.tsx` | Syncs conversation participants for a ticket. | - | - |
| 15 | `get_automation_logs_v3` | automation | `AutomationLogViewer.tsx` | Retrieves execution logs for automation workflows. | v3 | - |
| 16 | `get_module_hierarchy` | public | `Settings/ModuleForm.tsx` | Fetches the hierarchy of system modules for configuration. | - | - |
| 17 | `get_organization_module_configs` | public | `Settings/ModuleForm.tsx` | Retrieves module configurations specific to the current organization. | - | - |
| 18 | `save_module_configs` | public | `Settings/ModuleForm.tsx` | Saves updated module configurations. | - | - |
| 19 | `get_project_details_with_project_users_v2` | public | `Settings/LeaveSettings.tsx` | Fetches project details along with assigned users. | v2 | - |
| 20 | `get_leave_details_for_user` | public | `LeaveDetails.tsx` | Retrieves leave balance and history for a user. | - | - |
| 21 | `meta_entity_publish_version` | public | `EntityVersionManager.tsx` | Publishes a new version of an entity's metadata configuration. | - | - |
| 22 | `meta_entity_optimize_v4` | public | `EntityVersionManager.tsx` | Optimizes the entity's database structure (e.g., indexes). | v2 | `entity_optimize` |
| 23 | `core_config_get_entity_columns` | public | `MetadataV.tsx` | Fetches the column definitions for an entity. | - | `meta_config_get_entity_columns_v7` |
| 24 | `meta_config_get_entity_columns_v7` | core | `MetadataV.tsx` | Fetches entity column definitions (likely a newer or schema-specific version). | - | `core_config_get_entity_columns` |
| 25 | `entity_metadata_save` | core | `MetadataV.tsx` | Saves changes to entity metadata. | - | - |
| 26 | `core_get_entity_data_with_joins_v2` | public | `Messages.tsx`, `MapComponents` | Fetches entity data with configurable joins (e.g., tickets with contacts). | v2 | - |
| 27 | `tkt_add_reply_to_conversation` | public | `Messages.tsx` | Adds a reply to a ticket conversation. | - | - |
| 28 | `auth_user_rollback` | public | `WebRegister.tsx` | Rolls back user creation if registration fails. | - | - |
| 29 | `get_contract_details` | public | `_ServiceContracts.tsx` | Fetches detailed information for a specific service contract. | - | - |
| 30 | `meta_config_get_entity_columns_v7` | core | `Metadata.tsx` | Fetches entity column definitions (v4). | v4 | `core_config_get_entity_columns` |
| 31 | `meta_entity_metadata_save_v2` | core | `Metadata.tsx` | Saves entity metadata (v2). | v2 | `entity_metadata_save` |




upsert_service_report_and_task_v2. - used from public
-- SELECT * FROM core.util_helper_find_code_references('base_trigger_display_id');

-- | object_type | schema_name  | object_name                       | context_snippet                                                                                |
-- | ----------- | ------------ | --------------------------------- | ---------------------------------------------------------------------------------------------- |
-- | FUNCTION    | core         | core_trigger_set_display_id       | END IF; NEW.display_id := core.base_trigger_display_id(TG_TABLE_SCHEMA, TG_TABLE_NAME, to_json |
-- | FUNCTION    | organization | upsert_service_report_and_task_v2 | v_display_id := core.base_trigger_display_id('blueprint', 'service_reports', p_paylo           |
-- | FUNCTION    | public       | upsert_service_report_and_task_v2 | v_display_id := core.base_trigger_display_id('organization', 'service_reports', p_pa           |

