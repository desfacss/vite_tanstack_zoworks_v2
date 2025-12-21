// src/components/DynamicForm/FieldTemplate.tsx

import React from "react";
import { Form, Typography } from "antd";
import { FieldTemplateProps } from "@rjsf/utils";

const { Text } = Typography;

const CustomFieldTemplate = (props: FieldTemplateProps) => {
  const { id, children, rawErrors, uiSchema } = props;

  // List of widgets that should not have a label or field wrapper
  const widgetsWithoutLabel = ["InfoWidget", "CustomDescriptionWidget"];
//   const widgetsWithoutLabel = ["InfoWidget"];

  // Check if the current widget should have no label
  const uiWidget = uiSchema?.["ui:widget"];
  const shouldHideLabel = widgetsWithoutLabel.includes(uiWidget as string);
  
  if (shouldHideLabel) {
    // Render the widget directly without any label or help text
    return <div id={id}>{children}</div>;
  }

  // Standard Ant Design field rendering for other widgets
  return (
    <Form.Item
      label={props.label}
      help={props.rawHelp}
      validateStatus={rawErrors && rawErrors.length > 0 ? "error" : undefined}
      extra={rawErrors && rawErrors.map((error, i) => <Text key={i} type="danger">{error}</Text>)}
      labelCol={{ span: 24 }}
  wrapperCol={{ span: 24 }}
    >
      {children}
    </Form.Item>
  );
};

export default CustomFieldTemplate;