# eSign & Review Flow: Manual Testing Guide

This document outlines how to access and test the new eSign module, including the envelope creation wizard and the recipient signing flow.

## 1. Access URLs

### Internal / Admin (Requires Authentication)
- **Envelopes Dashboard:** `/esign`
  - *View all outgoing and incoming envelopes, their statuses, and recipients.*
- **Create Envelope Wizard:** `/esign/create`
  - *Initiate a new eSign request. Can be accessed directly or via entity actions.*

### Recipient / Public (No Authentication Required)
- **Signing Page:** `/sign/:envelopeId`
  - *The public URL sent to recipients to review and sign the document.*
  - *Example: `/sign/6f8e7b9c-2d1a-4e5f-8d7c-3a2b1c4d5e6f`*

---

## 2. Manual Testing Workflow

### Phase A: Initiate eSign from Entity
1.  Navigate to a **Service Report** or **Contract** record (e.g., `/blueprint/service_reports` or `/crm/contracts`).
2.  In the row actions (or detail page header), look for the **"Send for E-Sign"** button (lucide `FileCheck` icon).
3.  Click the button. You should be automatically redirected to the **Create Envelope Wizard** with the `entityId` and `entityType` pre-filled in the URL.

### Phase B: Create Envelope (Wizard)
1.  **Upload:** (Currently simulated or using FileUpload component) Ensure the document preview loads.
2.  **Recipients:** Add at least one recipient with a name and email.
3.  **Editor:**
    *   Drag the **Signature** field from the sidebar onto the document.
    *   Assign the field to a recipient.
    *   Adjust the position and size of the field.
4.  **Send:** Click the **"Send Envelope"** button. This will persist the envelope, recipients, and fields to the `documents` schema in Supabase.

### Phase C: Review & Sign (Recipient Flow)
1.  Since emails are currently simulated, manually copy the `envelope_id` generated in Step B (you can find this in the URL of the success page or the network tab).
2.  Navigate to `http://localhost:5173/sign/:envelopeId` (replace `:envelopeId` with your ID).
3.  **Review:** Verify the document title and "Step: Review and Sign" are visible in the sticky header.
4.  **Progress Bar:** Note that the progress bar shows 0% initially.
5.  **Sign:**
    *   Scroll to the signature field.
    *   Click the highlighted signature area.
    *   In the **Signature Drawer**, sign your name or upload a signature image.
    *   Click **"Save Signature"**.
6.  **Complete:**
    *   Verify the progress bar updates to 100%.
    *   The **"Finish and Close"** button should now be enabled.
    *   Click "Finish" to view the success message.

---

## 3. Data Verification (Supabase)

To verify the data in the backend, check the following tables in the `documents` schema:
- `envelopes`: The parent record for the eSign request.
- `recipients`: Details of who needs to sign.
- `signature_fields`: Positions, types, and the `signature_data` (base64) once signed.
- `audit_logs`: Tracking of creation and signing events.

---

> [!TIP]
> **Pro-Tip:** If you need a quick `envelopeId` for testing the signing page directly without going through the wizard, you can query the `documents.envelopes` table in your Supabase SQL editor:
> ```sql
> SELECT id FROM documents.envelopes ORDER BY created_at DESC LIMIT 1;
> ```
