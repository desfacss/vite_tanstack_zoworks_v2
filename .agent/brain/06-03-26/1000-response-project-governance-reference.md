# Project Reference: SDD Specs, Skills, Workflows, and Folders

**Session**: 2026-06-03 ~09:58–10:05 IST

---

## 1. SDD Spec-Driven Development Files (Use Cases & Test Cases)

Below is the list of all SDD-related files mapping out specifications, use cases, and tests:

### Core Constitution and Master Index
*   **[doc/SDD/01_CONSTITUTION.md](file:///Users/macbookpro/zo_v2/mini_project/doc/SDD/01_CONSTITUTION.md)**
    *   *Expected Content*: Establishes the immutable platform rules, database standards (tenant isolation, RLS, audits), backend/frontend contracts, and SDD development guidelines that all agents and developers must strictly follow.
*   **[doc/SDD/modules/00_INDEX.md](file:///Users/macbookpro/zo_v2/mini_project/doc/SDD/modules/00_INDEX.md)**
    *   *Expected Content*: Serves as the master registry tracking active modules, planned modules, their dependency graph, and their current test phase statuses.

### Core Composer Module Spec and Tests
*   **[doc/SDD/modules/core_composer/MODULE_SPEC.md](file:///Users/macbookpro/zo_v2/mini_project/doc/SDD/modules/core_composer/MODULE_SPEC.md)**
    *   *Expected Content*: Defines the business rules, schema design, sharding logic, and API contracts for compiling declarative entity blueprints into active views and triggers.
*   **[doc/SDD/modules/core_composer/CHANGE_LOG.md](file:///Users/macbookpro/zo_v2/mini_project/doc/SDD/modules/core_composer/CHANGE_LOG.md)**
    *   *Expected Content*: Records chronological updates, revisions, and evolution history for the Core Composer specification.
*   **[doc/SDD/modules/core_composer/fix-for-blueprint.md](file:///Users/macbookpro/zo_v2/mini_project/doc/SDD/modules/core_composer/fix-for-blueprint.md)**
    *   *Expected Content*: Outlines specific troubleshooting steps, issues, and manual remediation plans related to entity blueprint generation.
*   **[doc/SDD/modules/core_composer/tests/sql_tests.sql](file:///Users/macbookpro/zo_v2/mini_project/doc/SDD/modules/core_composer/tests/sql_tests.sql)**
    *   *Expected Content*: Implements SQL scripts and queries to verify schema validity, trigger execution, and blueprint compiling outcomes.

### Identity Module Spec and Tests
*   **[doc/SDD/modules/identity/MODULE_SPEC.md](file:///Users/macbookpro/zo_v2/mini_project/doc/SDD/modules/identity/MODULE_SPEC.md)**
    *   *Expected Content*: Outlines the authentication, tenant isolation, role management, team hierarchies, locations, and onboarding structures.
*   **[doc/SDD/modules/identity/CHANGE_LOG.md](file:///Users/macbookpro/zo_v2/mini_project/doc/SDD/modules/identity/CHANGE_LOG.md)**
    *   *Expected Content*: Logs all major design decisions, database schema migrations, and specification updates for the identity module.
*   **[doc/SDD/modules/identity/IDENTITY_GAP_ANALYSIS.md](file:///Users/macbookpro/zo_v2/mini_project/doc/SDD/modules/identity/IDENTITY_GAP_ANALYSIS.md)**
    *   *Expected Content*: Analyzes differences, gaps, and technical debts between the actual database implementation and the target specifications of the identity module.
*   **[doc/SDD/modules/identity/tests/edge_function_tests.http](file:///Users/macbookpro/zo_v2/mini_project/doc/SDD/modules/identity/tests/edge_function_tests.http)**
    *   *Expected Content*: Declares HTTP requests to test Auth invitations, organization switching, and Edge Function endpoints.
*   **[doc/SDD/modules/identity/tests/sql_tests.sql](file:///Users/macbookpro/zo_v2/mini_project/doc/SDD/modules/identity/tests/sql_tests.sql)**
    *   *Expected Content*: Houses database-level integration tests to validate RLS policies, role checks, and user assignment functions.
*   **[doc/SDD/modules/identity/tests/update_missing_data.sql](file:///Users/macbookpro/zo_v2/mini_project/doc/SDD/modules/identity/tests/update_missing_data.sql)**
    *   *Expected Content*: Provides database patch scripts to inject required seed data and resolve foreign key violations during test suite execution.
*   **[doc/SDD/TODOFix/identity.md](file:///Users/macbookpro/zo_v2/mini_project/doc/SDD/TODOFix/identity.md)**
    *   *Expected Content*: Lists urgent identity-related bugs, test failures, and legacy columns requiring refactoring.

### Frontend and UI Spec Documents
*   **[doc/SDD/ui/routes_use_cases.md](file:///Users/macbookpro/zo_v2/mini_project/doc/SDD/ui/routes_use_cases.md)**
    *   *Expected Content*: Documents UI routing configurations, permissions, page access lists, and frontend-to-backend mappings.
*   **[doc/SDD/ui/rjsf_details.md](file:///Users/macbookpro/zo_v2/mini_project/doc/SDD/ui/rjsf_details.md)**
    *   *Expected Content*: Outlines integration details, widget options, and schema mappings for React JSON Schema Forms.
*   **[doc/SDD/ui/technical_features.md](file:///Users/macbookpro/zo_v2/mini_project/doc/SDD/ui/technical_features.md)**
    *   *Expected Content*: Details frontend capabilities including layout structures, theme tokens, styling guidelines, and optimization metrics.

---

## 2. Skills and Workflows

### Skills Reference
*   **a11y-debugging**
    *   *When to Run*: Run when auditing UI layouts, semantic HTML tags, ARIA attributes, color contrast, and focus states.
    *   *Expected Outcome*: An accessibility audit report detailing violations and code modifications to ensure complete compliance.
*   **android-cli**
    *   *When to Run*: Run when building, launching, or debugging applications targeting the Android ecosystem.
    *   *Expected Outcome*: A successfully compiled, tested, or deployed Android package/emulator session.
*   **chrome-devtools**
    *   *When to Run*: Run when debugging network requests, inspecting client-side elements, or simulating user interactions in the browser.
    *   *Expected Outcome*: Accurate console output analysis, network inspection reports, or automated interaction results.
*   **chrome-extensions**
    *   *When to Run*: Run when building, debugging, or publishing Chrome Extensions utilizing Manifest V3 patterns.
    *   *Expected Outcome*: Structured extension packages, working manifest configurations, or deployment-ready zip archives.
*   **debug-optimize-lcp**
    *   *When to Run*: Run when debugging slow page rendering, Core Web Vitals issues, or hero image loading performance.
    *   *Expected Outcome*: Optimized assets, updated fetch priorities, and improved Largest Contentful Paint metric scores.
*   **google-antigravity-sdk**
    *   *When to Run*: Run when designing, setting up, or orchestrating multi-agent systems using the Google Antigravity SDK.
    *   *Expected Outcome*: Properly initialized agents, defined goals, and coordinated execution routines.
*   **memory-leak-debugging**
    *   *When to Run*: Run when troubleshooting high memory consumption, JavaScript memory bloats, or Node.js out-of-memory errors.
    *   *Expected Outcome*: Identified memory leak sources, analyzed heap snapshots, and code fixes resolving memory leaks.
*   **modern-web-guidance**
    *   *When to Run*: Run first prior to implementing any CSS, HTML5 layouts, or interactive JavaScript widgets.
    *   *Expected Outcome*: A list of modern, performant web patterns (e.g. HSL variables, container queries) to guide UI development.
*   **troubleshooting**
    *   *When to Run*: Run when Chrome DevTools connection issues, target page failures, or list_pages errors occur.
    *   *Expected Outcome*: Resolved debugger connections, clean socket targets, and functional devtools integration.

### Workflows Reference
*   **/Add Module Permissions ([add-module-permissions.md](file:///Users/macbookpro/zo_v2/mini_project/.agent/workflows/add-module-permissions.md))**
    *   *When to Run*: Run when configuring the database rules, schema, and API permissions for a newly added module or UI route.
    *   *Expected Outcome*: Verified RLS policies, initialized permission tables, and fully accessible endpoint scopes.
*   **/add-component ([add-component.md](file:///Users/macbookpro/zo_v2/mini_project/.agent/workflows/add-component.md))**
    *   *When to Run*: Run when creating and integrating a new UI component, view, or form template.
    *   *Expected Outcome*: A registered component adhering to registry rules, style tokens, and TanStack state query hooks.
*   **/add-entity-crud ([add-entity-crud.md](file:///Users/macbookpro/zo_v2/mini_project/.agent/workflows/add-entity-crud.md))**
    *   *When to Run*: Run when developing complete CRUD pages and forms for a newly defined database entity.
    *   *Expected Outcome*: A functional list/detail UI utilizing `RJSFCoreForm` bound to database views.
*   **/archive-docs ([archive-docs.md](file:///Users/macbookpro/zo_v2/mini_project/.agent/workflows/archive-docs.md))**
    *   *When to Run*: Run at the end of every active agent session to preserve plans, walkthroughs, or system analysis.
    *   *Expected Outcome*: A timestamped session markdown file stored under the `.agent/brain/{MM-DD-YY}/` path.
*   **/archive-feature ([archive-feature.md](file:///Users/macbookpro/zo_v2/mini_project/.agent/workflows/archive-feature.md))**
    *   *When to Run*: Run upon completion of a new feature branch to log components, routes, database tables, and logic.
    *   *Expected Outcome*: A compiled, structured feature report archived for documentation and future audits.
*   **/code-health-audit ([code-health-audit.md](file:///Users/macbookpro/zo_v2/mini_project/.agent/workflows/code-health-audit.md))**
    *   *When to Run*: Run when reviewing the codebase to detect redundant dependencies, style violations, or design anti-patterns.
    *   *Expected Outcome*: A detailed health audit highlighting code debt issues and proposed cleanup changes.
*   **/general-rules ([general-rules.md](file:///Users/macbookpro/zo_v2/mini_project/.agent/workflows/general-rules.md))**
    *   *When to Run*: Read at the beginning of each session to ensure code conventions, comments, and constraints are respected.
    *   *Expected Outcome*: Strict adherence to formatting, security principles, and model behavior guidelines.
*   **/log ([log.md](file:///Users/macbookpro/zo_v2/mini_project/.agent/workflows/log.md))**
    *   *When to Run*: Run at the end of a developer session to summarize what was done, what was verified, and outstanding actions.
    *   *Expected Outcome*: A clear progress log and task handoff description for the next working session.
*   **/pre-deploy ([pre-deploy.md](file:///Users/macbookpro/zo_v2/mini_project/.agent/workflows/pre-deploy.md))**
    *   *When to Run*: Run prior to building a production bundle and deploying to Vercel/Supabase hosting.
    *   *Expected Outcome*: Successful verification of type checking, lint rules, environment variables, and optimized builds.
*   **/replace-antd-icons ([replace-antd-icons.md](file:///Users/macbookpro/zo_v2/mini_project/.agent/workflows/replace-antd-icons.md))**
    *   *When to Run*: Run during refactoring phases to replace legacy Ant Design icons with Lucide icons.
    *   *Expected Outcome*: Elimination of `@ant-design/icons` dependency calls and a unified modern icon theme.
*   **/save-walkthrough ([save-walkthrough.md](file:///Users/macbookpro/zo_v2/mini_project/.agent/workflows/save-walkthrough.md))**
    *   *When to Run*: Run after successfully implementing a feature or task to generate a chronological walkthrough of changes.
    *   *Expected Outcome*: A formatted walkthrough markdown file saved in the system's brain archive.
*   **/styling-component-checklist ([styling-component-checklist.md](file:///Users/macbookpro/zo_v2/mini_project/.agent/workflows/styling-component-checklist.md))**
    *   *When to Run*: Run during UI reviews to ensure elements conform to CSS variables, responsive design, and CSS token standards.
    *   *Expected Outcome*: A styling checklist verify report and cleaner frontend presentation layer.
*   **/update-approval-flow-ui ([update-approval-flow-ui.md](file:///Users/macbookpro/zo_v2/mini_project/.agent/workflows/update-approval-flow-ui.md))**
    *   *When to Run*: Run when updating or customizing approval actions, workflow buttons, or state machine transitions in the UI.
    *   *Expected Outcome*: Configured layout buttons and logic reflecting correct ESM lifecycle states.
*   **/write-sdd ([write-sdd.md](file:///Users/macbookpro/zo_v2/mini_project/.agent/workflows/write-sdd.md))**
    *   *When to Run*: Run before writing any new code or database schema for a feature module to define spec contracts first.
    *   *Expected Outcome*: A complete Software Design Document (SDD) defining use cases, table columns, RPC functions, and test plans.

---

## 3. Feature / Module Folder Summaries

The following is a high-level summary of each documentation directory located within the `docs/` path:

*   **[docs/antigravity_for_enterprise_data](file:///Users/macbookpro/zo_v2/mini_project/docs/antigravity_for_enterprise_data/)**
    *   *Summary*: Outlines optimal agent architecture, best practices, memory state configurations, and workflows for utilizing autonomous AI systems in enterprise development.
*   **[docs/architecture](file:///Users/macbookpro/zo_v2/mini_project/docs/architecture/)**
    *   *Summary*: Holds core system architecture diagrams, multi-tenant database designs, bundle optimizations, modular design specs, and verification checklists.
*   **[docs/backend](file:///Users/macbookpro/zo_v2/mini_project/docs/backend/)**
    *   *Summary*: Houses database migration dumps, entity spreadsheets, database triggers schemas, identity specs, and planning documents.
*   **[docs/commerce-catalog](file:///Users/macbookpro/zo_v2/mini_project/docs/commerce-catalog/)**
    *   *Summary*: Focuses on plans, pages layouts, flow diagrams, and implementation checklists for the e-commerce catalog modules.
*   **[docs/frontend](file:///Users/macbookpro/zo_v2/mini_project/docs/frontend/)**
    *   *Summary*: Documents frontend user interface evolution, mobile applications, web design patterns, and responsive layout systems.
*   **[docs/guides](file:///Users/macbookpro/zo_v2/mini_project/docs/guides/)**
    *   *Summary*: Provides procedural guides for setting up edge functions, RPC database flows, adding new organization records, and vercel deployment details.
*   **[docs/logs](file:///Users/macbookpro/zo_v2/mini_project/docs/logs/)**
    *   *Summary*: Contains historical session logs, progress statements, and architectural audits to trace work history chronologically.
*   **[docs/modules](file:///Users/macbookpro/zo_v2/mini_project/docs/modules/)**
    *   *Summary*: Documents module features like authentications, organization switches, configuration models, and dynamic forms/views mechanisms.
*   **[docs/modules-config](file:///Users/macbookpro/zo_v2/mini_project/docs/modules-config/)**
    *   *Summary*: Contains SQL configurations, module mapping scripts, and CSV metadata representing features assigned to specific organizations.
*   **[docs/reference](file:///Users/macbookpro/zo_v2/mini_project/docs/reference/)**
    *   *Summary*: Offers general reference details including API caching strategies, project overviews, subdomain flow designs, and target implementation plans.
*   **[docs/tasks](file:///Users/macbookpro/zo_v2/mini_project/docs/tasks/)**
    *   *Summary*: Tracks focused refactoring checklists and performance optimization tasks (such as Ant Design bundle reductions).

---

## Document Changes
*   *Reference Files*: All documents in `/Users/macbookpro/zo_v2/mini_project/doc/` and `/Users/macbookpro/zo_v2/mini_project/docs/`
*   *Database Objects*: None
