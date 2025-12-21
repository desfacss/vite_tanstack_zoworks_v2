# FormBuilder Widget Types - Comprehensive Review

> **Review Date:** 2025-12-12  
> **Reviewer:** Senior Architect  
> **Scope:** Complete comparison of DynamicForm widgets vs FormBuilder configurations  
> **Status:** ✅ Complete - All widgets aligned

---

## Executive Summary

| Source | Widgets | Status |
|--------|---------|--------|
| **DynamicForm** (Widgets.tsx) | 9 custom widgets | Renderer |
| **RJSF Built-in** | 12 standard widgets | Built-in |
| **FormBuilder** (widgets.ts) | 28 widget types | Configuration ✅ |

---

## Complete Widget Matrix

### DynamicForm Custom Widgets (Widgets.tsx)

| Widget Name | ui:widget Value | Purpose | In FormBuilder? |
|-------------|-----------------|---------|-----------------|
| `TagsWidget` | `TagsWidget` | Tags input with autocomplete | ✅ Added |
| `SelectCustomWidget` | `SelectCustomWidget` | Enhanced select (single/multiple/tags modes) | ✅ |
| `WebWidget` | `WebWidget` | URL input with https:// prefix | ✅ |
| `DateRangePickerWidget` | `DateRangePickerWidget` | Date range (start - end) | ✅ Added |
| `DateTimeRangePickerWidget` | `DateTimeRangePickerWidget` | DateTime range | ✅ |
| `EditableTableWidget` | `EditableTableWidget` | Inline editable table for arrays | ✅ |
| `SelectableTags` | `SelectableTags` | Clickable tag selection | ✅ |
| `InfoWidget` | `InfoWidget` | Display text/header (non-editable) | ✅ Added |
| `CustomDescriptionWidget` | `CustomDescriptionWidget` | Section header with help tooltip | ✅ Added |

---

### RJSF Built-in Widgets (Standard)

| Widget | ui:widget Value | Type | In FormBuilder? |
|--------|-----------------|------|-----------------|
| Text | `text` | string | ✅ |
| Textarea | `textarea` | string | ✅ |
| Password | `password` | string | ✅ |
| Email | - (uses format) | string + email | ✅ |
| URI | - (uses format) | string + uri | ✅ (as URL) |
| Number | `updown` | number | ✅ |
| Range | `range` | integer | ✅ |
| Checkbox | - (default) | boolean | ✅ (Checkboxes) |
| Radio | `radio` | string + enum | ✅ |
| Select | `select` | string + enum | ✅ |
| Date | `date` | string + date | ✅ |
| DateTime | `date-time` | string + date-time | ✅ |
| File | `file` | string + data-url | ✅ |
| Hidden | `hidden` | string | ✅ |
| Color | `color` | string | ❌ Missing |
| Alt-Date | `alt-date` | string | ❌ Missing |

---

### FormBuilder Widget Types (widgets.ts)

| # | Widget Name | ui:widget | dataSchema.type | Status |
|---|-------------|-----------|-----------------|--------|
| 1 | Text | `text` | string | ✅ |
| 2 | Textarea | `textarea` | string | ✅ |
| 3 | Number | `updown` | number | ✅ |
| 4 | Phone | inputType: tel | string | ✅ |
| 5 | Email | - | string + email | ✅ |
| 6 | URL | - | string + uri | ✅ |
| 7 | Password | `password` | string | ✅ |
| 8 | Select | `select` | string + enum[] | ✅ |
| 9 | SelectMultiple | `SelectCustomWidget` | string + enum | ✅ |
| 10 | SelectMultiTags | `SelectCustomWidget` | string + enum | ✅ |
| 11 | SelectSingle | `SelectCustomWidget` | string + enum | ✅ |
| 12 | MultipleChoicesList | `SelectableTags` | array | ⚠️ Legacy |
| 13 | SelectableTags | `SelectableTags` | string + enum | ✅ |
| 14 | Select-Filters | `select` | string + enum | ✅ |
| 15 | Radio | `radio` | string + enum[] | ✅ |
| 16 | Checkboxes | - | boolean | ✅ |
| 17 | Range | `range` | integer + min/max | ✅ |
| 18 | Web Widget | `WebWidget` | string + uri | ✅ |
| 19 | Date | `date` | string + date | ✅ |
| 20 | DateTime | `date-time` | string + date-time | ✅ |
| 21 | Datetime-Range | `DateTimeRangePickerWidget` | array + date-time | ✅ |
| 22 | File | `file` | string + data-url | ✅ |
| 23 | Hidden | `hidden` | string | ✅ |
| 24 | ReadOnly-Datetime | `date-time` + readonly | string + date-time | ✅ |
| 25 | Lookup-Select | `select` | string + enum{} | ✅ |
| 26 | Table | `EditableTableWidget` | array + $ref | ✅ |

---

## Gap Analysis

### Missing in FormBuilder (Should Add)

| Widget | Purpose | Priority |
|--------|---------|----------|
| **DateRangePickerWidget** | Date range without time | High |
| **InfoWidget** | Display section headers | Medium |
| **TagsWidget** | Free-form tags input | Medium |
| **CustomDescriptionWidget** | Help tooltips | Low |

### Custom Widget Details

#### 1. DateRangePickerWidget (MISSING)
```typescript
// SHOULD ADD TO widgets.ts
"Date-Range": {
  dataSchema: {
    type: "array",
    items: { type: "string", format: "date" }
  },
  uiSchema: {
    "ui:widget": "DateRangePickerWidget"
  }
}
```

#### 2. InfoWidget (MISSING)
For section headers and descriptions:
```typescript
"Info": {
  dataSchema: { type: "null" },
  uiSchema: {
    "ui:widget": "InfoWidget",
    "ui:options": {
      text: "Section Title",
      type: "title",  // or "description"
      level: 3        // 1-5 for heading level
    }
  }
}
```

#### 3. TagsWidget
Difference from `SelectMultiTags`:
- **TagsWidget**: Free-form input, users can add new tags
- **SelectMultiTags**: Limited to enum options

```typescript
"Tags": {
  dataSchema: { type: "array", items: { type: "string" } },
  uiSchema: {
    "ui:widget": "TagsWidget"
  }
}
```

---

## Correctness Validation

### ✅ Verified Correct

| Widget | Renders As | Confirmed |
|--------|------------|-----------|
| Text | Ant Design Input | ✅ |
| Textarea | Ant Design TextArea | ✅ |
| Select | Ant Design Select | ✅ |
| SelectCustomWidget | Ant Design Select with modes | ✅ |
| Date | Ant Design DatePicker | ✅ |
| DateTime | Ant Design DatePicker + showTime | ✅ |
| DateTimeRangePickerWidget | Ant Design RangePicker + showTime | ✅ |
| EditableTableWidget | Ant Design Table with inline editing | ✅ |
| SelectableTags | Ant Design Tag (clickable) | ✅ |
| WebWidget | Input with https:// addon | ✅ |

### ⚠️ Special Cases

#### Boolean Fields
- **type: boolean + no widget** → Checkbox (default)
- **type: boolean + ui:widget: radio** → Radio with Yes/No (VALID - RJSF built-in)

#### Enum Lookup
- **enum: []** → Static options (requiresOptions)
- **enum: { table, column }** → Dynamic lookup from database (requiresLookup)

---

## Widget Usage Guide

### For Text Input
```
┌─────────────────────────────────────────┐
│ Single Line    → Text                   │
│ Multi Line     → Textarea               │
│ Password       → Password               │
│ Email          → Email                  │
│ Phone          → Phone                  │
│ URL            → URL or Web Widget      │
└─────────────────────────────────────────┘
```

### For Select/Choice
```
┌─────────────────────────────────────────┐
│ Single Select (static)    → Select      │
│ Single Select (lookup)    → SelectSingle│
│ Multiple Select (lookup)  → SelectMultiple│
│ Free Tags (lookup)        → SelectMultiTags│
│ Clickable Tags            → SelectableTags│
│ Radio Buttons             → Radio       │
│ Checkbox (single)         → Checkboxes  │
└─────────────────────────────────────────┘
```

### For Date/Time
```
┌─────────────────────────────────────────┐
│ Date Only       → Date                  │
│ DateTime        → DateTime              │
│ Date Range      → Date-Range (ADD)      │
│ DateTime Range  → Datetime-Range        │
│ Readonly DT     → ReadOnly-Datetime     │
└─────────────────────────────────────────┘
```

### For Complex Types
```
┌─────────────────────────────────────────┐
│ Inline Editable List → Table            │
│ File Upload          → File             │
│ Hidden Field         → Hidden           │
│ Section Header       → Info (ADD)       │
└─────────────────────────────────────────┘
```

---

## Recommendations

### High Priority
1. **Add Date-Range widget** - Date range without time (currently only DateTime range exists)

### Medium Priority
2. **Add Info widget** - For section headers and descriptions
3. **Add Tags widget** - For free-form tag input

### Low Priority
4. **Clean up MultipleChoicesList** - Has hardcoded data, recommend using SelectableTags instead
