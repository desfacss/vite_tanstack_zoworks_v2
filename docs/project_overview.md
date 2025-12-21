# Project Overview

This project is a React-based client application designed to be highly dynamic and configuration-driven. It leverages a Supabase backend for data storage, authentication, and server-side logic (Edge Functions, RPCs).

## Key Architectural Concepts

The core philosophy of this application is **Metadata-Driven UI**. Instead of hardcoding views and forms for every entity (e.g., Users, Tickets, Orders), the application reads configuration (metadata) to generate the UI dynamically.

### 1. Dynamic Views
The `DynamicViews` module is the heart of the data presentation layer. It can render data in various formats based on configuration:
-   **Table View**: Standard tabular data.
-   **Grid View**: Card-based layout.
-   **Kanban View**: Drag-and-drop boards for workflow management.
-   **Calendar View**: Date-based visualization.
-   **Gantt View**: Timeline visualization.
-   **Map View**: Geospatial visualization.
-   **Dashboard View**: Aggregated metrics and widgets.

### 2. Dynamic Forms
The `DynamicForm` module generates forms on the fly using JSON Schemas. It supports:
-   **Data Schema**: Defines the data structure and validation rules.
-   **UI Schema**: Defines the layout, widgets, and field ordering.
-   **Dynamic Enums**: Fetches options from the database (e.g., foreign keys, workflow stages) at runtime.
-   **Multi-page Forms**: Breaks down complex forms into steps.

### 3. Supabase Backend
The application relies heavily on Supabase for:
-   **Authentication**: Managed via `useAuthStore` and Supabase Auth.
-   **Data Access**: Uses RPC functions (e.g., `core_get_entity_data_v30`) to fetch data with server-side filtering, sorting, and pagination.
-   **Metadata Storage**: Configuration for views and forms is stored in the database (e.g., `y_view_config` table) or JSON files.

### 4. Configuration & Metadata
The application behavior is controlled by metadata schemas. These schemas define:
-   Which fields to display in views.
-   How to format data (dates, currency, etc.).
-   Form layouts and validation.
-   Filter configurations.

## Directory Structure

-   `src/components/DynamicViews`: Contains the logic for rendering different view types.
-   `src/components/common/DynamicForm`: Contains the JSON Schema form implementation.
-   `src/schemas`: JSON schema definitions for various entities.
-   `src/lib`: Core utilities, including the Supabase client (`supabase.ts`) and state management (`store.ts`).
-   `src/pages`: Top-level page components that instantiate `DynamicViews`.

## Getting Started

To add a new entity to the system:
1.  Define the database table in Supabase.
2.  Create the view configuration (metadata) in the database or `src/schemas`.
3.  Create a route in the React app that renders `DynamicViews` with the appropriate `entityType`.
