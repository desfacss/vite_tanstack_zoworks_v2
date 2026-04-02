# Technical Reference: Column Rendering Customization

**Session**: 2026-04-02 ~16:00–22:20 IST
**Topic**: `dayjs` and `columnRenderers.tsx` for Data Visualization

## Overview
The platform uses a semi-automatic column rendering system to handle data types like currency, dates, percentages, and statuses consistently across **Table** and **Grid** views.

## 1. The Auto-Renderer Hub (`columnRenderers.tsx`)
The `getAutoRenderer` function identifies columns by their name or data type and assigns a specialized formatting function.

- **Date Mapping**: Column names ending with `_at`, `_date`, or containing `created`, `updated`, or `timestamp` are mapped to `dateRenderer`.
- **Date Customization**:
    - **Previous Behavior**: Displayed relative time (`fromNow()`) as main text.
    - **Current Behavior**: Displays **absolute date** (`MMM D, YYYY`) as main text to provide a "single source of truth" for the record. The relative time is moved to a `Tooltip` for convenience.

## 2. Formatting Constants
The `dateRenderer` dynamically adjusts based on the value's precision:
- **Timestamp (Date + Time)**: `MMM D, YYYY, h:mm A` (e.g., `Apr 2, 2026, 9:46 PM`).
- **Date (Plain Date)**: `MMM D, YYYY` (e.g., `Apr 2, 2026`).

## 3. Propagation across Components
Both `TableView.tsx` and `GridView.tsx` use `getAutoRenderer` in their mapping logic.
- **TableView**:
    ```tsx
    const autoRenderer = getAutoRenderer(field.fieldPath, field.dataType);
    if (autoRenderer) return autoRenderer(value);
    ```
- **GridView**:
    ```tsx
    const autoRenderer = getAutoRenderer(fieldConfig.fieldPath);
    if (autoRenderer) return autoRenderer(value);
    ```

## Modified Components
- `src/core/components/utils/columnRenderers.tsx`
- `src/core/components/DynamicViews/TableView.tsx` (Fallback logic)
- `src/core/components/DynamicViews/GridView.tsx` (Internal formatting logic)
