# Frontend Ticket Implementation & Migration Plan

This document outlines the findings from the `mini_project` frontend implementation of tickets and provides a plan to migrate the functionality to the new `esm` schema for the V5 architecture.

## Current Implementation Details

The existing ticket functionality in the `mini_project` is located in `src/modules/tickets`. Key components include:

### Key Components
- **TicketForm.tsx**: The primary form for creating and editing tickets.
- **Messages.tsx**: Handles conversation rendering and sending replies.
- **QrTicketForm.tsx**: Specialized form for ticket creation via QR codes.
- **TicketNew.tsx**: A wrapper for [TicketForm](file:///Users/macbookpro/zo_v2/mini_project/src/modules/tickets/components/TicketForm.tsx#51-937) used in global actions (drawers).

### Schema Dependencies
The current frontend relies on the following schemas and RPCs:
| Schema | Object/Function | Purpose |
| :--- | :--- | :--- |
| `public` | `tickets` | Main physical table (legacy location). |
| `blueprint` | `tickets` | The logical entity table (newer V4/V5 location). |
| `external` | `contacts`, `messages`, `conversations` | Supporting entities for ESM. |
| `organization` | `tkt_wrapper_create_manual_ticket_v8` | Complex RPC for manual ticket creation. |
| `public` | `tkt_add_reply_to_conversation` | Sends/saves replies. |
| `public` | `tkt_wrapper_create_qr_ticket_v5` | Specialized QR creation. |
| `public` | `core_get_entity_data_with_joins_v2` | General data fetcher with joins. |

## Migration & Restoration Strategy

To align with the V5 ESM architecture, we must migrate these calls from the `public`/`organization` schemas to the `esm` schema.

### 1. Database Function Migration
Based on the screenshots and frontend analysis, the following functions should be migrated to `esm.functions.sql`:

#### **Restoration of Legacy Logic into ESM**
- **`esm.fn_tkt_core_create_ticket`**: This is our new V5 standard. It replaces the logic in `tkt_wrapper_create_manual_ticket`.
- **`esm.fn_tkt_add_reply`**: Already implemented in our recent work. Replaces `tkt_add_reply_to_conversation`.
- **`esm.fn_tkt_process_new_email`**: Replaces `tkt_process_new_email_and_create_ticket`.

#### **Missing Functions to Migrate**
- **`tkt_wrapper_create_qr_ticket`**: Needs to be moved to `esm.fn_tkt_create_qr_v1`. It should use the new `esm.v_tickets` logical view for insertion.
- **`tkt_utils_sync_conversation_receivers`**: Move to `esm.fn_tkt_sync_receivers`. This is critical for keeping CC lists in sync.

### 2. Frontend Component Updates
For each component in `src/modules/tickets/components`, we need to update the `supabase.rpc` calls:

- **TicketForm.tsx**: 
  - Change `supabase.schema('organization').rpc('tkt_wrapper_create_manual_ticket_v8', ...)` to `supabase.schema('esm').rpc('fn_tkt_core_create_ticket', ...)`.
- **Messages.tsx**:
  - Change `supabase.rpc('tkt_add_reply_to_conversation', ...)` to `supabase.schema('esm').rpc('fn_tkt_add_reply', ...)`.
  - Update any `external.messages` queries to use `esm.v_messages` if strict sharding is required.
- **QrTicketForm.tsx**:
  - Change `supabase.rpc('tkt_wrapper_create_qr_ticket_v5', ...)` to `supabase.schema('esm').rpc('fn_tkt_create_qr_v1', ...)`.

### 3. Blueprint Alignment
Ensure `esm.conversations` and `esm.messages` are correctly bootstrapped (Completed). This allows the frontend to use `esm.v_conversations` and `esm.v_messages` which handle standard columns like `updated_at` automatically.

## Recommended Next Steps
1. **Implement `esm.fn_tkt_create_qr_v1`**: Port the logic from `public.tkt_wrapper_create_qr_ticket_v5` to `esm`.
2. **Implement `esm.fn_tkt_sync_receivers`**: Port the sync logic to ensure notification groups stay updated.
3. **Update Frontend Constants**: Create a `COMMUNICATION_SCHEMA = 'esm'` constant in the frontend to quickly swap all RPC targets.
