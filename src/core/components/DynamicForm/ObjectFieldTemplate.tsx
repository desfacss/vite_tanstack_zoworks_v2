import React from 'react';
import {
    FormContextType,
    ObjectFieldTemplateProps,
    RJSFSchema,
    StrictRJSFSchema,
    canExpand,
    getUiOptions,
} from '@rjsf/utils';
import { Col, Row, ConfigProvider } from 'antd';

const { ConfigContext } = ConfigProvider;

const ObjectFieldTemplate = <
    T = any,
    S extends StrictRJSFSchema = RJSFSchema,
    F extends FormContextType = any
>(
    props: ObjectFieldTemplateProps<T, S, F>
) => {
    const { disabled, formData, idSchema, onAddClick, properties, readonly, registry, schema, uiSchema,
    } = props;

    function validateAndFixGridOrder(uiGrid: any[], uiOrder: string[]) {
        if (!uiOrder) return uiGrid;
        return uiGrid?.map((row) => {
            const orderedRow: any = {};
            Object.keys(row)
                ?.sort((a, b) => {
                    const indexA = uiOrder.indexOf(a);
                    const indexB = uiOrder.indexOf(b);
                    if (indexA === -1) return 1;
                    if (indexB === -1) return -1;
                    return indexA - indexB;
                })
                ?.forEach((key) => {
                    orderedRow[key] = row[key];
                });
            return orderedRow;
        });
    }

    const uiOptions = getUiOptions<T, S, F>(uiSchema);
    const rowGutter = (uiOptions.gutter as any) || 24;
    const uiGrid = uiOptions.grid as any[];
    const uiOrder = uiOptions.order as string[];

    const processedGrid = uiGrid ? validateAndFixGridOrder(uiGrid, uiOrder || []) : null;

    const getColSpan = (property: any) => {
        const fieldUiOptions = getUiOptions(property.content.props.uiSchema);
        const defaultColSpan = 24;

        if (fieldUiOptions && fieldUiOptions.colSpan) {
            return fieldUiOptions.colSpan;
        }

        return defaultColSpan;
    };

    const configProps = React.useContext(ConfigContext);
    const { getPrefixCls } = configProps;
    const prefixCls = getPrefixCls('form');
    console.debug('[ObjectFieldTemplate] Using prefixCls:', prefixCls);

    return (
        <fieldset id={idSchema.$id}>
            <Row gutter={rowGutter}>
                {properties.map((property) => {
                    if (processedGrid) {
                        return null; // Handled by grid logic
                    }
                    return (
                        <Col key={property.name} span={getColSpan(property) as any}>
                            {property.content}
                        </Col>
                    );
                })}

                {processedGrid &&
                    processedGrid.map((row, rowIndex) => (
                        <Col key={rowIndex} span={24}>
                            <Row gutter={rowGutter}>
                                {Object.keys(row).map((key) => {
                                    const property = properties.find((p) => p.name === key);
                                    if (!property) return null;
                                    return (
                                        <Col key={key} span={row[key]}>
                                            {property.content}
                                        </Col>
                                    );
                                })}
                            </Row>
                        </Col>
                    ))}

                {canExpand(schema, uiSchema, formData) && (
                    <Col span={24}>
                        <Row gutter={rowGutter} justify='end'>
                            <Col flex='192px'>
                                <AddButton
                                    className='object-property-expand'
                                    disabled={!!(disabled || readonly)}
                                    onClick={onAddClick(schema)}
                                    registry={registry}
                                />
                            </Col>
                        </Row>
                    </Col>
                )}
            </Row>
        </fieldset>
    );
};

const AddButton = ({
    className,
    disabled,
    onClick,
    registry,
}: {
    className: string;
    disabled: boolean;
    onClick: (event: any) => void;
    registry: any;
}) => {
    const {
        templates: { ButtonTemplates },
    } = registry;
    const { AddButton: RJSFAddButton } = ButtonTemplates;
    return (
        <RJSFAddButton
            className={className}
            onClick={onClick}
            disabled={disabled}
            registry={registry}
        />
    );
};

export default ObjectFieldTemplate;