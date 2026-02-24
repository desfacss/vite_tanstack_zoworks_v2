import React, { useEffect, useState } from "react";
import { DatePicker, Input, Select, Tag, Tooltip, Typography } from "antd";
import dayjs, { Dayjs } from "dayjs";
import EditableTableWidget from "./TableWidget";
import { Check, HelpCircle, Phone } from "lucide-react";
import { WidgetProps } from "@rjsf/utils";

const { RangePicker } = DatePicker;

interface InfoWidgetOptions {
  text?: string;
  level?: 1 | 2 | 3 | 4 | 5;
  type?: "title" | "description";
  style?: React.CSSProperties;
}

export const InfoWidget: React.FC<WidgetProps & { options: InfoWidgetOptions }> = ({
  options,
  schema,
}) => {
  const { text, level = 3, type = "title", style = {} } = options;

  const defaultStyles: React.CSSProperties = {
    margin: 0,
    padding: 0,
    color: type === "title" ? "#000" : "#595959",
    fontWeight: type === "title" ? "bold" : "normal",
    ...style,
  };

  if (type === "description") {
    return (
      <Typography.Text style={defaultStyles}>
        {text || schema.description || schema.title || "Description"}
      </Typography.Text>
    );
  }

  return (
    <Typography.Title level={level} style={defaultStyles}>
      {text || schema.title || "Section Header"}
    </Typography.Title>
  );
};

interface SelectOptions {
  enumOptions?: { value: string | number; label: string }[];
  placeholder?: string;
  allowClear?: boolean;
  mode?: "multiple" | "tags" | undefined;
  showSearch?: boolean;
  optionFilterProp?: string;
}

interface TagOptions {
  enumOptions?: { value: string; label: string }[];
  maxItems?: number;
  title?: string;
}

export const DateRangePickerWidget: React.FC<WidgetProps> = ({ value, onChange, readonly }) => {
  const handleChange = (dates: [Dayjs, Dayjs] | null, dateStrings: [string, string]) => {
    if (!readonly) {
      onChange(dateStrings);
    }
  };

  return (
    <RangePicker
      value={value && Array.isArray(value) ? [dayjs(value[0]), dayjs(value[1])] : null}
      onChange={handleChange}
      disabled={readonly}
    />
  );
};

export const DateTimeRangePickerWidget: React.FC<WidgetProps> = ({ value, onChange, readonly }) => {
  const handleChange = (dates: [Dayjs, Dayjs] | null, dateStrings: [string, string]) => {
    if (!readonly) {
      onChange(dateStrings);
    }
  };

  return (
    <RangePicker
      showTime
      value={value && Array.isArray(value) ? [dayjs(value[0]), dayjs(value[1])] : null}
      onChange={handleChange}
      disabled={readonly}
    />
  );
};

export const TagsWidget: React.FC<WidgetProps & { options: SelectOptions }> = ({
  options,
  value,
  onChange,
  id,
  schema,
  readonly,
}) => {
  const { enumOptions } = options;

  const handleChange = (selectedValues: string[]) => {
    if (!readonly) {
      onChange(selectedValues);
    }
  };

  return (
    <Select
      id={id}
      showSearch
      mode="tags"
      style={{ width: "100%" }}
      value={value || []}
      onChange={handleChange}
      tokenSeparators={[","]}
      disabled={readonly}
      options={enumOptions?.map((option) => ({
        value: option.value,
        label: option.label,
      }))}
    />
  );
};

export const SelectCustomWidget: React.FC<WidgetProps & { options: any }> = ({
  id,
  options,
  value,
  onChange,
  onBlur,
  onFocus,
  readonly,
  schema,
}) => {
  const { enumOptions, placeholder, allowClear, mode: optionMode, showSearch, optionFilterProp } = options;
  const mode = optionMode || (schema?.type === "array" ? "multiple" : undefined);

  return (
    <Select
      id={id}
      value={value}
      onChange={readonly ? undefined : (val) => onChange(val)}
      onBlur={() => onBlur(id, value)}
      onFocus={() => onFocus(id, value)}
      placeholder={placeholder || (schema?.title ? `Select ${schema.title}` : "Select...")}
      allowClear={allowClear ?? true}
      mode={mode}
      showSearch={showSearch ?? true}
      optionFilterProp={optionFilterProp || "children"}
      style={{ width: "100%" }}
      disabled={readonly}
      options={enumOptions?.map((opt: any) => ({
        label: opt.label || opt.value,
        value: opt.value
      }))}
    />
  );
};

export const WebWidget: React.FC<WidgetProps> = ({ value, onChange, readonly }) => {
  const [inputValue, setInputValue] = useState<string>(
    value ? value.replace("https://", "").replace(".com", "") : ""
  );

  useEffect(() => {
    setInputValue(value ? value.replace("https://", "").replace(".com", "") : "");
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!readonly) {
      const newValue = e.target.value;
      setInputValue(newValue);
      onChange("https://" + newValue + ".com");
    }
  };

  return (
    <Input
      addonBefore="https://"
      addonAfter=".com"
      value={inputValue}
      onChange={handleChange}
      placeholder="example"
      readOnly={readonly}
    />
  );
};

export const PhoneWidget: React.FC<WidgetProps> = ({
  id,
  value,
  onChange,
  onBlur,
  onFocus,
  readonly,
  schema,
}) => {
  return (
    <Input
      id={id}
      type="tel"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => onBlur(id, value)}
      onFocus={() => onFocus(id, value)}
      placeholder={schema?.title ? `Enter ${schema.title}` : "Enter phone number..."}
      prefix={<Phone size={14} className="text-muted-foreground" />}
      disabled={readonly}
    />
  );
};

export const SelectableTags: React.FC<WidgetProps & { options: TagOptions }> = ({
  options,
  value,
  onChange,
  readonly,
}) => {
  const { enumOptions, maxItems } = options;
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (value) {
      setSelectedTags(Array.isArray(value) ? value : [value]);
    } else {
      setSelectedTags([]);
    }
  }, [value, enumOptions]);

  const handleTagClick = (tag: string) => {
    if (readonly) return;
    const isSelected = selectedTags.includes(tag);
    let newTags = [...selectedTags];
    if (isSelected) {
      newTags = newTags.filter((t) => t !== tag);
    } else if (newTags.length < (maxItems || 100)) {
      newTags.push(tag);
    } else {
      return;
    }
    setSelectedTags(newTags);
    onChange(newTags);
  };

  return (
    <div>
      <div>
        {enumOptions?.map((tag) => {
          const isSelected = selectedTags.includes(tag.value);
          return (
            <Tag
              key={tag.value}
              onClick={() => handleTagClick(tag.value)}
              style={{
                margin: "5px",
                cursor: readonly ? "default" : "pointer",
                display: "inline-flex",
                alignItems: "center",
              }}
              className={isSelected ? "selected-tag" : ""}
            >
              <Check
                size={12}
                style={{ marginRight: "2px", color: "green", visibility: "hidden" }}
              />
              {tag.label}
              <Check
                size={12}
                style={{
                  marginLeft: "2px",
                  color: "green",
                  visibility: !isSelected ? "hidden" : "visible",
                }}
              />
            </Tag>
          );
        })}
      </div>
      <style jsx>{`
        .selected-tag {
          border-color: #1890ff;
          background-color: #e6f7ff;
        }
      `}</style>
    </div>
  );
};

export const CustomDescriptionWidget = ({ options }: { options: any }) => {
  const { name, description, helpText } = options;
  const [isMobile, setIsMobile] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleHelpClick = () => {
    if (isMobile) {
      setShowHelp((prev) => !prev);
    }
  };

  return (
    <div style={{ padding: "10px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {name ? <Typography.Title level={4} style={{ margin: 0 }}>{name}</Typography.Title> : <></>}
        {helpText && name && (
          isMobile ? (
            <HelpCircle
              onClick={handleHelpClick}
              size={18}
              style={{ color: "var(--color-primary)", cursor: "pointer" }}
            />
          ) : (
            <Tooltip title={helpText} placement="right">
              <HelpCircle
                size={18}
                style={{ color: "var(--color-primary)", cursor: "pointer" }}
              />
            </Tooltip>
          )
        )}
      </div>
      {description && (
        <Typography.Paragraph style={{ margin: "4px 0 0" }}>
          {description}
        </Typography.Paragraph>
      )}
      {isMobile && showHelp && helpText && (
        <Typography.Text type="secondary" style={{ display: "block", marginTop: 6 }}>
          {helpText}
        </Typography.Text>
      )}
    </div>
  );
};

const widgets = {
  TagsWidget,
  SelectCustomWidget,
  WebWidget,
  DateRangePickerWidget,
  DateTimeRangePickerWidget,
  EditableTableWidget,
  SelectableTags,
  InfoWidget,
  CustomDescriptionWidget,
  phone: PhoneWidget
};

export default widgets;