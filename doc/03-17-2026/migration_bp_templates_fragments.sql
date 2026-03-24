-- ============================================================
-- Migration: Seed automation.bp_fragments and automation.bp_templates
-- Reverse-engineered from automation.bp_process_blueprints
-- Run AFTER creating the tables via DDL in ddl.sql
-- ============================================================

-- ============================================================
-- PART 1: bp_fragments
-- Reusable logic blocks extracted from real blueprints.
-- Categories: sla, automation, approval, notification
-- ============================================================

INSERT INTO automation.bp_fragments (key, name, category, definition, metadata) VALUES

-- -------- SLA FRAGMENTS --------

('sla-response-4h',
 'Initial Response (4h)',
 'sla',
 '{
   "type": "sla_rule",
   "description": "Alert if no response/contact within 4 hours",
   "check_frequency": "0 * * * *",
   "time_threshold_hours": 4,
   "escalation_levels": 1,
   "action": {
     "type": "send_email",
     "config": {
       "template_id": "sla-breach",
       "subject": "SLA BREACH: {{entity.display_id}} - No Response in 4h"
     }
   },
   "config_schema": [
     { "key": "time_threshold_hours", "label": "Response Time (hours)", "type": "number", "defaultValue": 4 },
     { "key": "escalation_levels",   "label": "Escalation Levels",     "type": "number", "defaultValue": 1 }
   ]
 }',
 '{"icon": "Clock", "color": "#f59e0b", "intent": "SLA_RESPONSE"}'
),

('sla-response-24h',
 'Initial Response (24h)',
 'sla',
 '{
   "type": "sla_rule",
   "description": "Alert if no response/contact within 24 hours",
   "check_frequency": "0 0 * * *",
   "time_threshold_hours": 24,
   "escalation_levels": 1,
   "action": {
     "type": "send_email",
     "config": {
       "template_id": "sla-breach",
       "subject": "SLA BREACH: {{entity.display_id}} - No Response in 24h"
     }
   },
   "config_schema": [
     { "key": "time_threshold_hours", "label": "Response Time (hours)", "type": "number", "defaultValue": 24 },
     { "key": "escalation_levels",   "label": "Escalation Levels",     "type": "number", "defaultValue": 1 }
   ]
 }',
 '{"icon": "Clock", "color": "#f59e0b", "intent": "SLA_RESPONSE"}'
),

('sla-review-48h',
 'Review / Approval SLA (48h)',
 'sla',
 '{
   "type": "sla_rule",
   "description": "Alert reviewer/approver if item not actioned within 48 hours",
   "check_frequency": "0 0 * * *",
   "time_threshold_hours": 48,
   "escalation_levels": 2,
   "action": {
     "type": "send_email",
     "config": {
       "template_id": "sla-breach",
       "subject": "Action Required: {{entity.display_id}} Pending Review (48h overdue)"
     }
   },
   "config_schema": [
     { "key": "time_threshold_hours", "label": "Review Window (hours)", "type": "number", "defaultValue": 48 },
     { "key": "escalation_levels",   "label": "Escalation Levels",     "type": "number", "defaultValue": 2 }
   ]
 }',
 '{"icon": "Clock", "color": "#f59e0b", "intent": "SLA_REVIEW"}'
),

('sla-review-72h',
 'Review / Approval SLA (72h)',
 'sla',
 '{
   "type": "sla_rule",
   "description": "Alert reviewer/approver if item not actioned within 72 hours",
   "check_frequency": "0 0 * * *",
   "time_threshold_hours": 72,
   "escalation_levels": 2,
   "action": {
     "type": "send_email",
     "config": {
       "template_id": "sla-breach",
       "subject": "URGENT: {{entity.display_id}} Review Overdue (72h)"
     }
   },
   "config_schema": [
     { "key": "time_threshold_hours", "label": "Review Window (hours)", "type": "number", "defaultValue": 72 },
     { "key": "escalation_levels",   "label": "Escalation Levels",     "type": "number", "defaultValue": 2 }
   ]
 }',
 '{"icon": "Clock", "color": "#ef4444", "intent": "SLA_REVIEW"}'
),

('sla-stagnancy-24h',
 'Stage Stagnancy Alert (24h)',
 'sla',
 '{
   "type": "sla_rule",
   "description": "Alert owner if entity has not moved from a stage within 24 hours",
   "check_frequency": "0 */4 * * *",
   "time_threshold_hours": 24,
   "escalation_levels": 1,
   "action": {
     "type": "send_email",
     "config": {
       "template_id": "sla-breach",
       "subject": "Action Needed: {{entity.display_id}} Stagnant for 24h"
     }
   },
   "config_schema": [
     { "key": "time_threshold_hours", "label": "Stagnancy Threshold (hours)", "type": "number", "defaultValue": 24 },
     { "key": "escalation_levels",   "label": "Escalation Levels",           "type": "number", "defaultValue": 1 }
   ]
 }',
 '{"icon": "AlertTriangle", "color": "#f59e0b", "intent": "SLA_STAGNANCY"}'
),

('sla-stagnancy-72h',
 'Stage Stagnancy Alert (72h)',
 'sla',
 '{
   "type": "sla_rule",
   "description": "Alert sales director / manager if deal/entity is stagnant for 72 hours",
   "check_frequency": "0 0 * * *",
   "time_threshold_hours": 72,
   "escalation_levels": 2,
   "action": {
     "type": "send_email",
     "config": {
       "template_id": "sla-breach",
       "subject": "SLA BREACH: {{entity.display_id}} Stagnant for 72h"
     }
   },
   "config_schema": [
     { "key": "time_threshold_hours", "label": "Stagnancy Threshold (hours)", "type": "number", "defaultValue": 72 },
     { "key": "escalation_levels",   "label": "Escalation Levels",           "type": "number", "defaultValue": 2 }
   ]
 }',
 '{"icon": "AlertTriangle", "color": "#ef4444", "intent": "SLA_STAGNANCY"}'
),

('sla-signature-48h',
 'Document Signature SLA (48h)',
 'sla',
 '{
   "type": "sla_rule",
   "description": "Notify legal/admin if document not signed within 48 hours",
   "check_frequency": "0 0 * * *",
   "time_threshold_hours": 48,
   "escalation_levels": 1,
   "action": {
     "type": "send_email",
     "config": {
       "template_id": "sla-breach",
       "subject": "Notice: {{entity.display_id}} still unsigned after 48h"
     }
   },
   "config_schema": [
     { "key": "time_threshold_hours", "label": "Signature Deadline (hours)", "type": "number", "defaultValue": 48 }
   ]
 }',
 '{"icon": "FileSignature", "color": "#6366f1", "intent": "SLA_SIGNATURE"}'
),

('sla-auto-approve-1h',
 'Auto-Approve if No Action (1h)',
 'sla',
 '{
   "type": "sla_rule",
   "description": "Automatically approve entity if no action taken within 1 hour",
   "check_frequency": "*/15 * * * *",
   "time_threshold_hours": 1,
   "escalation_levels": 0,
   "action": {
     "type": "update_entity",
     "config": {
       "payload": { "stage_id": "{{config.approved_stage_id}}" }
     }
   },
   "config_schema": [
     { "key": "time_threshold_hours",  "label": "Auto-Approve After (hours)", "type": "number", "defaultValue": 1 },
     { "key": "approved_stage_id",     "label": "Target Stage on Auto-Approve", "type": "text", "defaultValue": "Approved" }
   ]
 }',
 '{"icon": "CheckCircle", "color": "#10b981", "intent": "SLA_AUTO_APPROVE"}'
),

('sla-overdue-task',
 'Task Overdue Alert',
 'sla',
 '{
   "type": "sla_rule",
   "description": "Notify assignee and manager when a task passes its scheduled end time",
   "check_frequency": "*/15 * * * *",
   "time_threshold_hours": 1,
   "escalation_levels": 1,
   "conditions": {
     "type": "AND",
     "rules": [
       { "field": "new.event_end_at", "value": "NOW()", "operator": "less_than" },
       { "field": "new.event_end_at", "operator": "is_not_null" }
     ]
   },
   "action": {
     "type": "send_email",
     "config": {
       "template_id": "TASK_OVERDUE",
       "subject": "Task Overdue: {{entity.display_id}}"
     }
   },
   "config_schema": []
 }',
 '{"icon": "AlertCircle", "color": "#ef4444", "intent": "TASK_OVERDUE"}'
),

-- -------- AUTOMATION / NOTIFICATION FRAGMENTS --------

('automation-acknowledge-new',
 'Acknowledge New Record to Customer',
 'automation',
 '{
   "type": "on_stage_entry",
   "description": "Send an automated acknowledgement email when a new entity is created",
   "trigger_stage": "{{config.trigger_stage}}",
   "actions": [
     {
       "name": "Acknowledge to Customer",
       "action_type": "send_email",
       "priority": 10,
       "config": {
         "template_id": "ticket-acknowledge",
         "subject": "We have received your {{config.entity_label}}: {{new.display_id}}"
       }
     }
   ],
   "config_schema": [
     { "key": "trigger_stage",  "label": "Stage to Trigger On", "type": "text", "defaultValue": "New" },
     { "key": "entity_label",   "label": "Entity Human Label",   "type": "text", "defaultValue": "request" }
   ]
 }',
 '{"icon": "Mail", "color": "#3b82f6", "intent": "NOTIFICATION"}'
),

('automation-notify-owner-stage-entry',
 'Notify Owner on Stage Entry',
 'automation',
 '{
   "type": "on_stage_entry",
   "description": "Notify the entity owner when a stage is entered",
   "trigger_stage": "{{config.trigger_stage}}",
   "actions": [
     {
       "name": "Notify Owner",
       "action_type": "send_email",
       "priority": 10,
       "config": {
         "template_id": "sla-breach",
         "subject": "{{entity.display_id}} has entered stage: {{config.trigger_stage}}"
       }
     }
   ],
   "config_schema": [
     { "key": "trigger_stage", "label": "Stage to Trigger On", "type": "text", "defaultValue": "Submitted" }
   ]
 }',
 '{"icon": "Bell", "color": "#8b5cf6", "intent": "NOTIFICATION"}'
),

('automation-create-task-on-stage',
 'Create Task on Stage Entry',
 'automation',
 '{
   "type": "on_stage_entry",
   "description": "Automatically create a follow-up task when a stage is entered",
   "trigger_stage": "{{config.trigger_stage}}",
   "actions": [
     {
       "name": "Create Follow-up Task",
       "action_type": "create_entity",
       "priority": 10,
       "config": {
         "entity_name": "tasks",
         "entity_schema": "blueprint",
         "payload": {
           "name": "{{config.task_name_template}}",
           "assignee_id": "{{new.owner_id}}",
           "task_category": "{{config.task_category}}",
           "organization_id": "{{new.organization_id}}",
           "parent_entity_id": "{{new.id}}",
           "parent_entity_type": "{{config.parent_entity_type}}",
           "parent_entity_schema": "{{config.parent_entity_schema}}"
         }
       }
     }
   ],
   "config_schema": [
     { "key": "trigger_stage",          "label": "Trigger Stage",           "type": "text", "defaultValue": "Contacted" },
     { "key": "task_name_template",     "label": "Task Name Template",      "type": "text", "defaultValue": "Follow-up: {{new.name}}" },
     { "key": "task_category",          "label": "Task Category",           "type": "select", "defaultValue": "Sales Call",
       "options": [
         { "value": "Sales Call",      "label": "Sales Call" },
         { "value": "Onboarding",      "label": "Onboarding" },
         { "value": "Follow-up",       "label": "Follow-up" },
         { "value": "Meeting",         "label": "Meeting" },
         { "value": "work_order",      "label": "Work Order" }
       ]
     },
     { "key": "parent_entity_type",     "label": "Parent Entity Type",      "type": "text", "defaultValue": "leads" },
     { "key": "parent_entity_schema",   "label": "Parent Entity Schema",    "type": "text", "defaultValue": "crm" }
   ]
 }',
 '{"icon": "CheckSquare", "color": "#10b981", "intent": "AUTOMATION_TASK"}'
),

('automation-deduct-leave-ledger',
 'Deduct Leave Ledger on Approval',
 'automation',
 '{
   "type": "on_stage_entry",
   "description": "Deduct leave balance from ledger when a leave application is approved",
   "trigger_stage": "Approved",
   "actions": [
     {
       "name": "Deduct Leave Ledger",
       "action_type": "create_entity",
       "config": {
         "entity_name": "leave_ledger",
         "entity_schema": "workforce",
         "payload": {
           "amount": "-{{new.leave_duration_days}}",
           "user_id": "{{new.user_id}}",
           "description": "Approved Leave: {{new.id}}",
           "leave_type_id": "{{new.leave_type_id}}",
           "effective_date": "{{new.start_date}}",
           "transaction_type": "USAGE"
         }
       }
     }
   ],
   "config_schema": []
 }',
 '{"icon": "Minus", "color": "#f59e0b", "intent": "LEDGER_DEDUCT"}'
),

('automation-reverse-ledger-on-cancel',
 'Reverse Ledger on Cancellation',
 'automation',
 '{
   "type": "on_stage_entry",
   "description": "Reverse any leave/expense ledger entries when a record is cancelled",
   "trigger_stage": "Cancelled",
   "actions": [
     {
       "name": "Reverse Ledger Impact",
       "action_type": "rpc",
       "config": {
         "rpc": "workforce.util_ledger_reverse",
         "args": {
           "p_table": "leave_ledger",
           "p_ref_key": "application_id",
           "p_ref_value": "{{new.id}}"
         }
       }
     }
   ],
   "config_schema": [
     { "key": "p_table",   "label": "Ledger Table Name", "type": "text", "defaultValue": "leave_ledger" },
     { "key": "p_ref_key", "label": "Reference Key",     "type": "text", "defaultValue": "application_id" }
   ]
 }',
 '{"icon": "RefreshCw", "color": "#ef4444", "intent": "LEDGER_REVERSE"}'
),

('automation-notify-finance-on-win',
 'Notify Finance on Deal Won / Invoice',
 'automation',
 '{
   "type": "on_stage_entry",
   "description": "Notify finance team when a deal is closed won or invoice is generated",
   "trigger_stage": "{{config.trigger_stage}}",
   "actions": [
     {
       "name": "Notify Finance",
       "action_type": "send_email",
       "priority": 10,
       "config": {
         "template_id": "INVOICE_NEW",
         "subject": "Action Required: {{entity.display_id}} - Financial Action Needed"
       }
     }
   ],
   "config_schema": [
     { "key": "trigger_stage", "label": "Trigger Stage", "type": "text", "defaultValue": "closed_won" }
   ]
 }',
 '{"icon": "DollarSign", "color": "#10b981", "intent": "FINANCE_NOTIFICATION"}'
),

-- -------- APPROVAL FRAGMENTS --------

('approval-manager-level-1',
 'Direct Manager Approval (L1)',
 'approval',
 '{
   "type": "approval_rules",
   "description": "Single-level approval requiring only the direct manager (L1)",
   "phases": [
     {
       "window_tag": "L1_MANAGER",
       "time_window_hours": 48,
       "approvers": [
         { "type": "MANAGER_LEVEL", "level_start": 1, "level_end": 1 }
       ]
     }
   ],
   "config_schema": [
     { "key": "time_window_hours", "label": "Approval Window (hours)", "type": "number", "defaultValue": 48 }
   ]
 }',
 '{"icon": "UserCheck", "color": "#6366f1", "intent": "APPROVAL"}'
),

('approval-manager-chain-with-hr',
 'Manager Chain + HR Approval (Time-Based)',
 'approval',
 '{
   "type": "approval_rules",
   "description": "L1 manager first (48h window), then full manager chain + HR after deadline",
   "phases": [
     {
       "window_tag": "L1_OR_CEO_48H",
       "time_window_hours": 48,
       "approvers": [
         { "type": "MANAGER_LEVEL", "level_start": 1, "level_end": 1 }
       ]
     },
     {
       "window_tag": "FULL_POOL_AFTER_48H",
       "time_window_hours": null,
       "approvers": [
         { "type": "MANAGER_LEVEL", "level_start": 1, "level_end": "infinity" },
         { "type": "ROLE", "role_id": "{{config.hr_role_id}}" }
       ]
     }
   ],
   "config_schema": [
     { "key": "hr_role_id",      "label": "HR Role ID",                "type": "text",   "defaultValue": "" },
     { "key": "l1_window_hours", "label": "L1 Approval Window (hours)", "type": "number", "defaultValue": 48 }
   ]
 }',
 '{"icon": "Users", "color": "#6366f1", "intent": "APPROVAL"}'
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  definition = EXCLUDED.definition,
  metadata = EXCLUDED.metadata;


-- ============================================================
-- PART 2: bp_templates
-- Macro Process Templates for the wizard to use.
-- Reverse-engineered from real blueprints + onboardingData.ts
-- ============================================================

INSERT INTO automation.bp_templates (key, name, entity_type, blueprint_type, definition, metadata) VALUES

-- -------- LIFECYCLE TEMPLATES --------

('lifecycle-hr-recruitment',
 'HR Recruitment Funnel',
 'applications',
 'lifecycle',
 '{
   "description": "Standard hiring funnel from job submission to hired/rejected",
   "stages": [
     { "id": "applied",    "name": "Applied",    "category": "NEW",         "sequence": 1 },
     { "id": "screening",  "name": "Screening",  "category": "NEW",         "sequence": 2 },
     { "id": "interview",  "name": "Interview",  "category": "IN_PROGRESS", "sequence": 3 },
     { "id": "offer",      "name": "Offer",      "category": "IN_PROGRESS", "sequence": 4 },
     { "id": "hired",      "name": "Hired",      "category": "CLOSED_WON",  "sequence": 5 },
     { "id": "rejected",   "name": "Rejected",   "category": "CLOSED_LOST", "sequence": 6 }
   ],
   "transitions": [
     { "from": "applied",   "to": "screening", "action": "Review Application" },
     { "from": "screening", "to": "interview", "action": "Move to Interview" },
     { "from": "interview", "to": "offer",     "action": "Make Offer" },
     { "from": "offer",     "to": "hired",     "action": "Hire Candidate" },
     { "from": "offer",     "to": "rejected",  "action": "Reject Offer" },
     { "from": "screening", "to": "rejected",  "action": "Reject Candidate" }
   ],
   "startStateId": "applied",
   "suggested_fragments": ["sla-response-24h", "automation-acknowledge-new"],
   "sub_processes": [
     { "id": "sp-sourcing",    "name": "Sourcing to Application",  "sequence": 1, "entity_type": "candidates" },
     { "id": "sp-screening",   "name": "Screening to Interview",   "sequence": 2, "entity_type": "candidates" },
     { "id": "sp-offer",       "name": "Offer to Acceptance",      "sequence": 3, "entity_type": "offers"     }
   ]
 }',
 '{"icon": "Users", "color": "#8b5cf6", "intent": "HR_RECRUITMENT", "industry": ["hr", "services", "technology"]}'
),

('lifecycle-crm-lead',
 'CRM Lead to Customer',
 'contacts',
 'lifecycle',
 '{
   "description": "Contact lifecycle from new lead through active customer or churn",
   "stages": [
     { "id": "new_lead",        "name": "New Lead",        "category": "NEW",         "sequence": 1 },
     { "id": "attempted",       "name": "Attempted",       "category": "IN_PROGRESS", "sequence": 2 },
     { "id": "contacted",       "name": "Contacted",       "category": "IN_PROGRESS", "sequence": 3 },
     { "id": "qualified",       "name": "Qualified",       "category": "IN_PROGRESS", "sequence": 4 },
     { "id": "won",             "name": "Won",             "category": "CLOSED_WON",  "sequence": 5 },
     { "id": "disqualified",    "name": "Disqualified",    "category": "CLOSED_LOST", "sequence": 6 },
     { "id": "onboarded",       "name": "Onboarded",       "category": "IN_PROGRESS", "sequence": 7 },
     { "id": "active_customer", "name": "Active Customer", "category": "IN_PROGRESS", "sequence": 8 },
     { "id": "churned",         "name": "Churned",         "category": "CLOSED_LOST", "sequence": 9 }
   ],
   "transitions": [
     { "from": "new_lead",     "to": "attempted"    },
     { "from": "attempted",    "to": "contacted"    },
     { "from": "contacted",    "to": "qualified"    },
     { "from": "qualified",    "to": "won"          },
     { "from": "qualified",    "to": "disqualified" },
     { "from": "won",          "to": "onboarded"    },
     { "from": "onboarded",    "to": "active_customer" },
     { "from": "active_customer", "to": "churned"   },
     { "from": "new_lead",     "to": "disqualified" }
   ],
   "startStateId": "new_lead",
   "suggested_fragments": ["sla-response-4h", "sla-stagnancy-24h", "automation-create-task-on-stage", "automation-notify-owner-stage-entry"],
   "sub_processes": [
     { "id": "sp-lead-capture",   "name": "Lead Capture & Initial Contact", "sequence": 1 },
     { "id": "sp-qualification",  "name": "Qualification & Nurturing",      "sequence": 2 },
     { "id": "sp-closing",        "name": "Deal Closing",                   "sequence": 3 },
     { "id": "sp-onboarding",     "name": "Customer Onboarding",            "sequence": 4 }
   ]
 }',
 '{"icon": "TrendingUp", "color": "#3b82f6", "intent": "CRM_LEAD", "industry": ["crm", "sales", "services"]}'
),

('lifecycle-sales-deal',
 'Sales Deal Pipeline',
 'deals',
 'lifecycle',
 '{
   "description": "Standard sales process: Lead → Outreach → Negotiation → Closure",
   "stages": [
     { "id": "lead",        "name": "Lead",        "category": "NEW",         "sequence": 1 },
     { "id": "outreach",    "name": "Outreach",    "category": "IN_PROGRESS", "sequence": 2 },
     { "id": "negotiation", "name": "Negotiation", "category": "IN_PROGRESS", "sequence": 3 },
     { "id": "closed_won",  "name": "Closed Won",  "category": "CLOSED_WON",  "sequence": 4 },
     { "id": "closed_lost", "name": "Closed Lost", "category": "CLOSED_LOST", "sequence": 5 }
   ],
   "transitions": [
     { "from": "lead",        "to": "outreach",    "action": "Start Outreach"     },
     { "from": "outreach",    "to": "negotiation", "action": "Move to Negotiation" },
     { "from": "negotiation", "to": "closed_won",  "action": "Mark Won"            },
     { "from": "negotiation", "to": "closed_lost", "action": "Mark Lost"           }
   ],
   "startStateId": "lead",
   "suggested_fragments": ["sla-stagnancy-72h", "automation-notify-finance-on-win", "automation-create-task-on-stage"]
 }',
 '{"icon": "BarChart2", "color": "#10b981", "intent": "CRM_LEAD", "industry": ["crm", "sales"]}'
),

('lifecycle-project-management',
 'Project Lifecycle',
 'projects',
 'lifecycle',
 '{
   "description": "Standard project lifecycle from planning to completion or cancellation",
   "stages": [
     { "id": "planned",   "name": "Planned",    "category": "NEW",         "sequence": 1 },
     { "id": "active",    "name": "Active",      "category": "IN_PROGRESS", "sequence": 2 },
     { "id": "on_hold",   "name": "On Hold",     "category": "IN_PROGRESS", "sequence": 3 },
     { "id": "completed", "name": "Completed",   "category": "CLOSED_WON",  "sequence": 4 },
     { "id": "cancelled", "name": "Cancelled",   "category": "CLOSED_LOST", "sequence": 5 }
   ],
   "transitions": [
     { "from": "planned",  "to": "active",    "action": "Activate Project", "trigger": "manual" },
     { "from": "active",   "to": "on_hold",   "action": "Place On Hold",    "trigger": "manual" },
     { "from": "on_hold",  "to": "active",    "action": "Resume Project",   "trigger": "manual" },
     { "from": "active",   "to": "completed", "action": "Complete Project", "trigger": "manual" },
     { "from": "planned",  "to": "cancelled", "action": "Cancel",           "trigger": "manual" }
   ],
   "startStateId": "planned",
   "suggested_fragments": ["sla-stagnancy-72h", "automation-create-task-on-stage"]
 }',
 '{"icon": "Briefcase", "color": "#6366f1", "intent": "PROJECT_MANAGEMENT", "industry": ["operations", "construction", "services"]}'
),

('lifecycle-service-ticket',
 'Service Ticket (Field / Support)',
 'tickets',
 'lifecycle',
 '{
   "description": "Service ticket from new → triage → assigned → completed with scheduling and invoicing",
   "stages": [
     { "id": "New",          "name": "New",           "category": "NEW",         "sequence": 1  },
     { "id": "Triage",       "name": "Triage",        "category": "IN_PROGRESS", "sequence": 2  },
     { "id": "Awaiting Info","name": "Awaiting Info", "category": "IN_PROGRESS", "sequence": 3  },
     { "id": "Assigned",     "name": "Assigned",      "category": "IN_PROGRESS", "sequence": 4  },
     { "id": "Scheduled",    "name": "Scheduled",     "category": "IN_PROGRESS", "sequence": 5  },
     { "id": "In Progress",  "name": "In Progress",   "category": "IN_PROGRESS", "sequence": 6  },
     { "id": "Resolved",     "name": "Resolved",      "category": "IN_PROGRESS", "sequence": 7  },
     { "id": "Completed",    "name": "Completed",     "category": "CLOSED_WON",  "sequence": 8  },
     { "id": "Cancelled",    "name": "Cancelled",     "category": "CANCELLED",   "sequence": 9  }
   ],
   "startStateId": "New",
   "suggested_fragments": ["sla-response-4h", "automation-acknowledge-new", "automation-create-task-on-stage"]
 }',
 '{"icon": "Wrench", "color": "#f59e0b", "intent": "CUSTOMER_SUPPORT", "industry": ["esm", "services", "field-service"]}'
),

('lifecycle-invoice',
 'Invoice Lifecycle',
 'invoices',
 'lifecycle',
 '{
   "description": "Invoice from draft → sent → paid or overdue → void",
   "stages": [
     { "id": "Draft",   "name": "Draft",   "category": "NEW",         "sequence": 1 },
     { "id": "Sent",    "name": "Sent",    "category": "IN_PROGRESS", "sequence": 2 },
     { "id": "Paid",    "name": "Paid",    "category": "CLOSED_WON",  "sequence": 3 },
     { "id": "Overdue", "name": "Overdue", "category": "IN_PROGRESS", "sequence": 4 },
     { "id": "Void",    "name": "Void",    "category": "CANCELLED",   "sequence": 5 }
   ],
   "transitions": [
     { "from": "Draft",   "to": "Sent",    "label": "Send",            "trigger": "manual"    },
     { "from": "Sent",    "to": "Paid",    "label": "Receive Payment", "trigger": "manual"    },
     { "from": "Sent",    "to": "Overdue", "label": "Mark Overdue",    "trigger": "automatic" },
     { "from": "Overdue", "to": "Paid",    "label": "Receive Payment", "trigger": "manual"    },
     { "from": "Draft",   "to": "Void",    "label": "Void",            "trigger": "manual"    }
   ],
   "startStateId": "Draft",
   "suggested_fragments": ["sla-stagnancy-72h", "automation-notify-finance-on-win"]
 }',
 '{"icon": "FileText", "color": "#10b981", "intent": "FINANCE_INVOICE", "industry": ["finance", "services"]}'
),

('lifecycle-contract',
 'Contract Lifecycle',
 'contracts',
 'lifecycle',
 '{
   "description": "Contract lifecycle: Draft → Signed → Expired/Terminated",
   "stages": [
     { "id": "draft",      "name": "Draft",      "category": "NEW",         "sequence": 1 },
     { "id": "signed",     "name": "Signed",      "category": "CLOSED_WON",  "sequence": 2 },
     { "id": "expired",    "name": "Expired",     "category": "IN_PROGRESS", "sequence": 3 },
     { "id": "terminated", "name": "Terminated",  "category": "CLOSED_LOST", "sequence": 4 }
   ],
   "transitions": [
     { "from": "draft",  "to": "signed",     "action": "Sign Contract" },
     { "from": "signed", "to": "expired",    "action": "Expire"        },
     { "from": "signed", "to": "terminated", "action": "Terminate"     }
   ],
   "startStateId": "draft",
   "suggested_fragments": ["sla-signature-48h", "automation-notify-owner-stage-entry"]
 }',
 '{"icon": "FileCheck", "color": "#6366f1", "intent": "LEGAL_CONTRACT", "industry": ["legal", "ctrm", "services"]}'
),

('lifecycle-shipment',
 'Shipment Workflow',
 'shipments',
 'lifecycle',
 '{
   "description": "Shipment from pending → loading → at sea → discharging → delivered",
   "stages": [
     { "id": "pending",     "name": "Pending",     "category": "NEW",         "sequence": 1 },
     { "id": "loading",     "name": "Loading",     "category": "IN_PROGRESS", "sequence": 2 },
     { "id": "at_sea",      "name": "At Sea",      "category": "IN_PROGRESS", "sequence": 3 },
     { "id": "discharging", "name": "Discharging", "category": "IN_PROGRESS", "sequence": 4 },
     { "id": "delivered",   "name": "Delivered",   "category": "CLOSED_WON",  "sequence": 5 },
     { "id": "cancelled",   "name": "Cancelled",   "category": "CANCELLED",   "sequence": 6 }
   ],
   "transitions": [
     { "from": "pending",     "to": "loading",     "action": "Start Loading"    },
     { "from": "loading",     "to": "at_sea",      "action": "Vessel Departed"  },
     { "from": "at_sea",      "to": "discharging", "action": "Start Discharge"  },
     { "from": "discharging", "to": "delivered",   "action": "Complete Delivery"},
     { "from": "pending",     "to": "cancelled",   "action": "Cancel"           }
   ],
   "startStateId": "pending",
   "suggested_fragments": ["sla-stagnancy-24h", "automation-notify-owner-stage-entry"]
 }',
 '{"icon": "Ship", "color": "#0ea5e9", "intent": "LOGISTICS_SHIPMENT", "industry": ["logistics", "ctrm"]}'
),

-- -------- APPROVAL TEMPLATES --------

('approval-expense-sheet',
 'Expense Sheet Approval',
 'expense_sheets',
 'approval',
 '{
   "description": "Approval flow for employee expense sheets: Draft → Submitted → Approved/Rejected",
   "stages": [
     { "id": "Draft",     "name": "Draft",     "category": "NEW",         "sequence": 1 },
     { "id": "Submitted", "name": "Submitted", "category": "IN_PROGRESS", "sequence": 2 },
     { "id": "Approved",  "name": "Approved",  "category": "CLOSED_WON",  "sequence": 3 },
     { "id": "Rejected",  "name": "Rejected",  "category": "CLOSED_LOST", "sequence": 4 }
   ],
   "transitions": [
     { "id": "T_SUBMIT",  "from": "Draft",     "to": "Submitted" },
     { "id": "T_APPROVE", "from": "Submitted", "to": "Approved",  "name": "Approve Expense" },
     { "id": "T_REJECT",  "from": "Submitted", "to": "Rejected",  "name": "Reject Expense"  },
     { "id": "T_REOPEN",  "from": "Rejected",  "to": "Draft"     }
   ],
   "startStateId": "Draft",
   "suggested_fragments": ["approval-manager-chain-with-hr", "sla-review-72h", "automation-notify-owner-stage-entry", "automation-reverse-ledger-on-cancel"]
 }',
 '{"icon": "Receipt", "color": "#f59e0b", "intent": "GOVERNANCE_APPROVAL", "industry": ["workforce", "hr", "finance"]}'
),

('approval-leave',
 'Leave Application Approval',
 'leave_applications',
 'approval',
 '{
   "description": "Time-based leave approval: L1 manager first, then full chain + HR",
   "stages": [
     { "id": "Draft",     "name": "Draft",                       "category": "NEW",         "sequence": 1 },
     { "id": "Submitted", "name": "Submitted (Pending Approval)", "category": "IN_PROGRESS", "sequence": 2 },
     { "id": "Approved",  "name": "Approved",                    "category": "CLOSED_WON",  "sequence": 3 },
     { "id": "Rejected",  "name": "Rejected",                    "category": "CLOSED_LOST", "sequence": 4 },
     { "id": "Cancelled", "name": "Cancelled",                   "category": "CLOSED_LOST", "sequence": 5 }
   ],
   "transitions": [
     { "id": "T_SUBMIT",          "from": "Draft",     "to": "Submitted", "name": "Submit Leave Request" },
     { "id": "T_APPROVE",         "from": "Submitted", "to": "Approved",  "name": "Approve Leave"        },
     { "id": "T_REJECT",          "from": "Submitted", "to": "Rejected",  "name": "Reject Leave"         },
     { "id": "T_CANCEL_SUBMITTED","from": "Submitted", "to": "Cancelled", "name": "Cancel Request"       },
     { "id": "T_CANCEL_APPROVED", "from": "Approved",  "to": "Cancelled", "name": "Cancel Approved Leave"}
   ],
   "startStateId": "Draft",
   "suggested_fragments": ["approval-manager-chain-with-hr", "sla-review-48h", "automation-deduct-leave-ledger", "automation-reverse-ledger-on-cancel"]
 }',
 '{"icon": "Calendar", "color": "#8b5cf6", "intent": "GOVERNANCE_APPROVAL", "industry": ["workforce", "hr"]}'
),

('approval-timesheet',
 'Timesheet Approval',
 'timesheets',
 'approval',
 '{
   "description": "Approval flow for timesheets submitted by employees",
   "stages": [
     { "id": "Draft",     "name": "Draft",     "category": "NEW",         "sequence": 1 },
     { "id": "Submitted", "name": "Submitted", "category": "IN_PROGRESS", "sequence": 2 },
     { "id": "Approved",  "name": "Approved",  "category": "CLOSED_WON",  "sequence": 3 },
     { "id": "Rejected",  "name": "Rejected",  "category": "CLOSED_LOST", "sequence": 4 }
   ],
   "transitions": [
     { "id": "T_SUBMIT",  "from": "Draft",     "to": "Submitted" },
     { "id": "T_APPROVE", "from": "Submitted", "to": "Approved",  "name": "Approve Timesheet" },
     { "id": "T_REJECT",  "from": "Submitted", "to": "Rejected",  "name": "Reject Timesheet"  },
     { "id": "T_REOPEN",  "from": "Rejected",  "to": "Draft"     }
   ],
   "startStateId": "Draft",
   "suggested_fragments": ["approval-manager-level-1", "sla-review-48h"]
 }',
 '{"icon": "Clock", "color": "#6366f1", "intent": "GOVERNANCE_APPROVAL", "industry": ["workforce", "hr"]}'
),

('approval-service-report',
 'Service Report Approval (Auto-Approve)',
 'service_reports',
 'approval',
 '{
   "description": "Service report approval with auto-approval if no action in 1 hour",
   "stages": [
     { "id": "Draft",     "name": "Draft",     "category": "NEW",         "sequence": 1 },
     { "id": "Submitted", "name": "Submitted", "category": "IN_PROGRESS", "sequence": 2 },
     { "id": "Approved",  "name": "Approved",  "category": "CLOSED_WON",  "sequence": 3 },
     { "id": "Rejected",  "name": "Rejected",  "category": "IN_PROGRESS", "sequence": 4 }
   ],
   "transitions": [
     { "from": "Draft",     "to": "Submitted", "label": "Submit for Approval", "trigger": "manual"    },
     { "from": "Submitted", "to": "Approved",  "label": "Approve Report",      "trigger": "manual"    },
     { "from": "Submitted", "to": "Rejected",  "label": "Reject Report",       "trigger": "manual"    },
     { "from": "Rejected",  "to": "Draft",     "label": "Make Corrections",    "trigger": "manual"    }
   ],
   "startStateId": "Draft",
   "suggested_fragments": ["sla-auto-approve-1h", "approval-manager-level-1"]
 }',
 '{"icon": "ClipboardCheck", "color": "#10b981", "intent": "SERVICE_FULFILLMENT", "industry": ["esm", "field-service"]}'
),

-- -------- ORCHESTRATION TEMPLATES --------

('orchestration-sales-to-delivery',
 'Sales to Delivery Orchestration',
 'opportunities',
 'orchestration',
 '{
   "description": "End-to-end orchestration from Closed Won → Project → Resourcing → Live Delivery",
   "stages": [
     { "id": "opportunity_won",      "name": "Opportunity Won",             "category": "IN_PROGRESS", "sequence": 1 },
     { "id": "project_created",      "name": "Project Created",             "category": "IN_PROGRESS", "sequence": 2 },
     { "id": "resourcing_started",   "name": "Resourcing Started",          "category": "IN_PROGRESS", "sequence": 3 },
     { "id": "team_assigned",        "name": "Team 80% Assigned",           "category": "IN_PROGRESS", "sequence": 4 },
     { "id": "project_live",         "name": "Project Live (Revenue Rec.)", "category": "IN_PROGRESS", "sequence": 5 }
   ],
   "transitions": [],
   "startStateId": "opportunity_won",
   "pulse_lane": "Sales → Delivery",
   "dashboard_visible": true,
   "suggested_fragments": []
 }',
 '{"icon": "ArrowRight", "color": "#0ea5e9", "intent": "ORCHESTRATION", "industry": ["services", "technology"]}'
),

('orchestration-recruitment-to-onboarding',
 'Recruitment to Onboarding Orchestration',
 'recruitment_requisitions',
 'orchestration',
 '{
   "description": "Approved requisition → Hire → Onboarding → Billable Resource",
   "stages": [
     { "id": "requisition_live",    "name": "Requisition Live",           "category": "IN_PROGRESS", "sequence": 1 },
     { "id": "offer_extended",      "name": "Offer Extended",             "category": "IN_PROGRESS", "sequence": 2 },
     { "id": "employee_created",    "name": "Offer Accepted → Employee",  "category": "IN_PROGRESS", "sequence": 3 },
     { "id": "onboarding_started",  "name": "Onboarding Started",         "category": "IN_PROGRESS", "sequence": 4 },
     { "id": "onboarded_billable",  "name": "Onboarded & Billable",       "category": "IN_PROGRESS", "sequence": 5 }
   ],
   "transitions": [],
   "startStateId": "requisition_live",
   "pulse_lane": "Recruitment → Onboarding",
   "dashboard_visible": true,
   "suggested_fragments": []
 }',
 '{"icon": "Users", "color": "#8b5cf6", "intent": "ORCHESTRATION", "industry": ["hr", "services"]}'
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  entity_type = EXCLUDED.entity_type,
  blueprint_type = EXCLUDED.blueprint_type,
  definition = EXCLUDED.definition,
  metadata = EXCLUDED.metadata;

-- ============================================================
-- VERIFY inserts
-- ============================================================
SELECT 'bp_fragments'  AS table_name, COUNT(*) AS count FROM automation.bp_fragments
UNION ALL
SELECT 'bp_templates', COUNT(*) FROM automation.bp_templates;
