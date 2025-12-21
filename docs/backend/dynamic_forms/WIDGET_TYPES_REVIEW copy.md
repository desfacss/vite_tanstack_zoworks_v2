# FormBuilder Widget Types - Architectural Review

> **Review Date:** 2025-12-12  
> **Reviewer:** Senior Architect  
> **Scope:** `widgets.ts` - 26 widget configurations  
> **Status:** ✅ Fixes Applied

---

## Executive Summary

| Category | Count | Status |
|----------|-------|--------|
| ✅ Correct | 23 | Working as expected |
| ⚠️ Kept for compatibility | 2 | MultipleChoicesList, Select-Filters (original version) |
| ✅ Fixed | 5 | Radio, Web Widget, Table, Select-Filters, naming |

---

## Widget Categories

### 1. Text Input Types

| Widget | Type | Format | Widget | Status |
|--------|------|--------|--------|--------|
| **Text** | `string` | - | `text` | ✅ |
| **Textarea** | `string` | - | `textarea` | ✅ |
| **Phone** | `string` | - | `inputType: tel` | ✅ |
| **Email** | `string` | `email` | - | ✅ |
| **URL** | `string` | `uri` | - | ✅ |
| **Password** | `string` | - | `password` | ✅ |

**Verdict:** All text inputs are correctly configured.

---

### 2. Numeric Types

| Widget | Type | Constraints | Widget | Status |
|--------|------|-------------|--------|--------|
| **Number** | `number` | - | `updown` | ✅ |
| **Range** | `integer` | min:0, max:100 | `range` | ✅ |

**Verdict:** Correct. Consider adding min/max configuration to FormBuilder UI.

---

### 3. Date/Time Types

| Widget | Type | Format | Widget | Status |
|--------|------|--------|--------|--------|
| **Date** | `string` | `date` | `date` | ✅ |
| **DateTime** | `string` | `date-time` | `date-time` | ✅ |
| **Datetime-Range** | `array` | `date-time` items | `DateTimeRangePickerWidget` | ✅ |
| **ReadOnly-Datetime** | `string` | `date-time` | `date-time` + `ui:readonly` | ✅ |

**Verdict:** All date types are correct and align with DynamicForm.

---

### 4. Select Types (Static Options)

| Widget | Type | Options Source | Widget | Status |
|--------|------|----------------|--------|--------|
| **Select** | `string` | `requiresOptions: true` (comma-separated) | `select` | ✅ |
| **radio** | `boolean` | `requiresOptions: true` | `radio` | ⚠️ |

**Issues with `radio`:**
- Name should be `Radio` (capitalized for consistency)
- `type: boolean` is incorrect for radio with options - should be `string` with `enum`
- `requiresOptions: true` but `type: boolean` contradicts

**Recommended Fix:**
```typescript
Radio: {
  dataSchema: { type: "string", enum: [] },
  uiSchema: { "ui:widget": "radio" },
  requiresOptions: true,
}
```

---

### 5. Select Types (Dynamic Lookup)

| Widget | Lookup | Mode | Widget | Status |
|--------|--------|------|--------|--------|
| **SelectSingle** | ✅ | `single` | `SelectCustomWidget` | ✅ |
| **SelectMultiple** | ✅ | `multiple` | `SelectCustomWidget` | ✅ |
| **SelectMultiTags** | ✅ | `tags` | `SelectCustomWidget` | ✅ |
| **Lookup-Select** | ✅ | - | `select` | ✅ |
| **SelectableTags** | ✅ | - | `SelectableTags` | ✅ |
| **Select-Filters** | ✅ | - | `select` | ⚠️ |

**Issues with `Select-Filters`:**
- Hardcoded example filter values
- `requiresOptions: true` should be `requiresLookup: true`
- Missing `type: "string"` before `enum`

**Verdict:** Dynamic selects work but `Select-Filters` needs cleanup.

---

### 6. Boolean Types

| Widget | Type | Widget | Status |
|--------|------|--------|--------|
| **Checkboxes** | `boolean` | - (default checkbox) | ✅ |

**Verdict:** Correct.

---

### 7. File Types

| Widget | Type | Format | Options | Status |
|--------|------|--------|---------|--------|
| **File** | `string` | `data-url` | `accept: .pdf` | ✅ |

**Verdict:** Correct. File types are configurable via `acceptedFileTypes`.

---

### 8. Special/Utility Types

| Widget | Type | Widget | Status |
|--------|------|--------|--------|
| **Hidden** | `string` | `hidden` | ✅ |
| **Web Widget** | `string` | `WebWidget` | ⚠️ |

**Issues with `Web Widget`:**
- uiSchema structure is incorrect:
  ```typescript
  // WRONG:
  uiSchema: { website: { "ui:widget": "WebWidget" } }
  // CORRECT:
  uiSchema: { "ui:widget": "WebWidget" }
  ```

---

### 9. Complex/Array Types

| Widget | Type | Items | Widget | Status |
|--------|------|-------|--------|--------|
| **Table** | `array` | `$ref: #/definitions/Users` | `EditableTableWidget` | ⚠️ |
| **MultipleChoicesList** | `array` | string enum | `SelectableTags` | ❌ |

**Issues with `Table`:**
- Hardcoded `Users` definition with specific fields
- FormBuilder cannot dynamically configure the definition
- Should be made generic

**Issues with `MultipleChoicesList`:**
- **DEPRECATED/DUPLICATE** - Same as `SelectableTags` but with hardcoded UUIDs
- Should be removed entirely

---

## Critical Issues Summary

### 🔴 High Priority

1. **`radio`** - Wrong `type: boolean`, should be `type: string` with enum
2. **`Web Widget`** - Incorrect uiSchema structure
3. **`MultipleChoicesList`** - Deprecated, remove it

### 🟡 Medium Priority

4. **`Table`** - Hardcoded definition, cannot be configured dynamically
5. **`Select-Filters`** - `requiresOptions` should be `requiresLookup`

### 🟢 Low Priority

6. Inconsistent naming: `radio` (lowercase) vs others (PascalCase)

---

## FormBuilder Integration Analysis

### Fields Correctly Handled

| Feature | FormBuilder | DynamicForm | Match |
|---------|-------------|-------------|-------|
| Schema prefix | ✅ New | ✅ | ✅ |
| no_id flag | ✅ New | ✅ | ✅ |
| dependsOn cascade | ✅ New | ✅ | ✅ |
| Static filters | ✅ New | ✅ | ✅ |
| Default value | ✅ New | ✅ | ✅ |
| Required field | ✅ | ✅ | ✅ |
| Hidden field | ✅ | ✅ | ✅ |
| Readonly field | ✅ | ✅ | ✅ |
| Placeholder | ✅ | ✅ | ✅ |

### Fields NOT Handled by FormBuilder

| Feature | DynamicForm | FormBuilder | Gap |
|---------|-------------|-------------|-----|
| `dependencies` (oneOf) | ✅ | ❌ | Conditional visibility |
| `definitions` (nested) | ✅ | ❌ | Array item schemas |
| `ui:submitButtons` | ✅ | ❌ | Multiple submit buttons |
| min/max for Range | ✅ | ❌ | Number constraints |

---

## Recommendations

1. **Remove `MultipleChoicesList`** - Use `SelectableTags` instead
2. **Fix `radio` type** - Change to `string` with enum
3. **Fix `Web Widget` uiSchema** - Remove nesting
4. **Fix `Select-Filters`** - Change `requiresOptions` to `requiresLookup`
5. **Add `Radio` (PascalCase)** - For consistency, rename
6. **Make `Table` generic** - Allow definition configuration in FormBuilder UI
