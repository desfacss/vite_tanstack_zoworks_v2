export const widgetConfigs: WidgetConfigs = {
  Text: {
    dataSchema: {
      type: "string",
    },
    uiSchema: {
      "ui:widget": "text",
      "ui:placeholder": "Enter text",
    },
    requiresOptions: false,
  },
  Textarea: {
    dataSchema: {
      type: "string",
    },
    uiSchema: {
      "ui:widget": "textarea",
    },
    requiresOptions: false,
  },
  Number: {
    dataSchema: {
      type: "number",
    },
    uiSchema: {
      "ui:widget": "updown",
    },
  },
  Phone: {
    dataSchema: {
      type: "string",
    },
    uiSchema: {
      "ui:options": {
        inputType: "tel",
      },
    },
  },
  Email: {
    dataSchema: {
      type: "string",
      format: "email"
    },
    uiSchema: {},
  },
  URL: {
    dataSchema: {
      type: "string",
      format: "uri"
    },
    uiSchema: {},
  },
  Password: {
    dataSchema: {
      type: "string",
    },
    uiSchema: {
      "ui:widget": "password",
    },
  },
  Select: {
    dataSchema: {
      type: "string",
      enum: [],
    },
    uiSchema: {
      "ui:widget": "select",
      "ui:placeholder": "Select an option",
    },
    requiresOptions: true,
  },
  SelectMultiple: {
    dataSchema: {
      type: "string",
      enum: [],
    },
    uiSchema: {
      "ui:widget": "SelectCustomWidget",
      "ui:placeholder": "Select an option",
      "ui:options": {
        allowClear: true,
        mode: "multiple",
        showSearch: true,
      },
    },
    requiresLookup: true,
  },
  SelectMultiTags: {
    dataSchema: {
      type: "string",
      enum: [],
    },
    uiSchema: {
      "ui:widget": "SelectCustomWidget",
      "ui:placeholder": "Select an option",
      "ui:options": {
        allowClear: true,
        mode: "tags",
        showSearch: true,
      },
    },
    requiresLookup: true,
  },
  SelectSingle: {
    dataSchema: {
      type: "string",
      enum: [],
    },
    uiSchema: {
      "ui:widget": "SelectCustomWidget",
      "ui:options": {
        allowClear: false,
        showSearch: false,
        mode: "single",
      },
      "ui:placeholder": "Select an option",
    },
    requiresLookup: true,
  },
  MultipleChoicesList: {
    dataSchema: {
      type: "array",
      title: "A multiple choices list",
      items: {
        type: "string",
        enum: [
          "f2427a1e-9a2e-47c0-8bdd-26168a237490",
          "a23481a8-bd96-4dff-b59a-5e5b1216af8e",
          "ba3a518b-b8e7-4cf7-b32f-ea7bb00f4202",
          "8162d716-2c44-4bf4-8ff6-9a509b64c09a",
          "8ecc7ede-b694-4b4e-b59e-f84083facc9b",
          "ef002980-f878-4fb0-8675-e27b1e4c8769",
          "23f7aa36-d889-41a9-8b1a-3f8c0867eb01",
          "5b88f0d8-ae94-487b-83c3-d595e12cccd3",
          "deae1015-7b7c-41c0-93ae-7c42a8b6295b",
          "123e4567-e89b-12d3-a456-426614174000",
        ],
        enumNames: [
          "IBCN",
          "Arvind Alagappan Rajkumar",
          "Meena Sevugen",
          "Meena Ravi",
          "Deivarayan S",
          "Palaniappan Cho",
          "Ramanathan L",
          "Vayeravan vairavan",
          "Ganesh Raikar",
          "Demo User",
        ],
      },
      uniqueItems: true,
    },
    uiSchema: {
      "ui:widget": "SelectableTags",
    },
  },
  SelectableTags: {
    dataSchema: {
      type: "string",
      enum: [],
    },
    uiSchema: {
      "ui:widget": "SelectableTags",
    },
    requiresLookup: true,
  },
  "Select-Filters": {
    dataSchema: {
      type: "string",
      enum: [],
    },
    uiSchema: {
      "ui:widget": "select",
      "ui:placeholder": "Select with filters",
    },
    requiresLookup: true,  // Fixed: was requiresOptions
  },
  Radio: {
    dataSchema: {
      type: "string",
      enum: [],  // Fixed: was type boolean
    },
    uiSchema: {
      "ui:widget": "radio",
    },
    requiresOptions: true,
  },
  Checkboxes: {
    dataSchema: {
      type: "boolean",
    },
    uiSchema: {},
  },
  Range: {
    dataSchema: {
      type: "integer",
      minimum: 0,
      maximum: 100,
    },
    uiSchema: {
      "ui:widget": "range",
    },
  },
  "Web Widget": {
    dataSchema: {
      type: "string",
      format: "uri",
    },
    uiSchema: {
      "ui:widget": "WebWidget",  // Fixed: removed incorrect nesting
      "ui:placeholder": "https://example.com",
    },
  },
  Date: {
    dataSchema: {
      type: "string",
      format: "date",
    },
    uiSchema: {
      "ui:widget": "date",
    },
    requiresOptions: false,
  },
  DateTime: {
    dataSchema: {
      type: "string",
      format: "date-time",
    },
    uiSchema: {
      "ui:widget": "date-time",
    },
    requiresOptions: false,
  },
  "Datetime-Range": {
    dataSchema: {
      type: "array",
      items: {
        type: "string",
        format: "date-time",
      },
    },
    uiSchema: {
      "ui:widget": "DateTimeRangePickerWidget",
    },
    requiresOptions: false,
  },
  File: {
    dataSchema: {
      type: "string",
      format: "data-url",
    },
    uiSchema: {
      "ui:widget": "file",
      "ui:options": {
        accept: ".pdf",
      },
    },
    requiresOptions: false,
    hasFileOptions: true,
  },
  Hidden: {
    dataSchema: {
      type: "string",
    },
    uiSchema: {
      "ui:widget": "hidden",
    },
    requiresOptions: false,
  },
  "ReadOnly-Datetime": {
    dataSchema: {
      type: "string",
      format: "date-time",
      readOnly: true,
    },
    uiSchema: {
      "ui:widget": "date-time",
      "ui:readonly": true,
    },
    requiresOptions: false,
  },
  "Lookup-Select": {
    dataSchema: {
      type: "string",
      enum: {
        table: "",
        column: "",
      },
    },
    uiSchema: {
      "ui:widget": "select",
      "ui:placeholder": "Select from lookup",
    },
    requiresLookup: true,
  },
  Table: {
    dataSchema: {
      type: "array",
      items: {
        $ref: "#/definitions/TableItem",
      },
      title: "Editable Table",
      definitions: {
        // Generic definition - should be customized per form
        "TableItem": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "title": "Name"
            },
            "value": {
              "type": "string",
              "title": "Value"
            }
          }
        }
      },
    },
    uiSchema: {
      "ui:widget": "EditableTableWidget",
      "ui:options": {
        addable: true,
        orderable: true,
        removable: true,
        columnOrder: ["name", "value"],
      },
    },
  },
  // NEW: Date Range (without time)
  "Date-Range": {
    dataSchema: {
      type: "array",
      items: {
        type: "string",
        format: "date",
      },
    },
    uiSchema: {
      "ui:widget": "DateRangePickerWidget",
    },
    requiresOptions: false,
  },
  // NEW: Tags (free-form input)
  Tags: {
    dataSchema: {
      type: "array",
      items: {
        type: "string",
      },
    },
    uiSchema: {
      "ui:widget": "TagsWidget",
    },
    requiresOptions: false,
  },
  // NEW: Info Widget (section headers)
  Info: {
    dataSchema: {
      type: "null",
    },
    uiSchema: {
      "ui:widget": "InfoWidget",
      "ui:options": {
        text: "Section Title",
        type: "title",  // "title" or "description"
        level: 3,       // 1-5 for heading level
      },
    },
    requiresOptions: false,
  },
  // NEW: Description Widget (with help tooltip)
  Description: {
    dataSchema: {
      type: "null",
    },
    uiSchema: {
      "ui:widget": "CustomDescriptionWidget",
      "ui:options": {
        name: "Section Name",
        description: "Optional description text",
        helpText: "Help text shown on hover/click",
      },
    },
    requiresOptions: false,
  },
};

interface WidgetConfig {
  dataSchema: any;
  uiSchema: any;
  requiresOptions?: boolean;
  requiresLookup?: boolean;
  hasFileOptions?: boolean;
}

interface WidgetConfigs {
  [key: string]: WidgetConfig;
}
