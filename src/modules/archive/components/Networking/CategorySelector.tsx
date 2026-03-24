// src/modules/archive/components/Networking/CategorySelector.tsx
import React from 'react';
import { Select, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Filter } from 'lucide-react';

const { Text } = Typography;

interface CategorySelectorProps {
  categories: string[];
  selectedCategory: string | null;
  onSelect: (category: string | null) => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ 
  categories, 
  selectedCategory, 
  onSelect 
}) => {
  const { t } = useTranslation('archive');

  return (
    <div style={{ marginBottom: '16px' }}>
      <Space>
        <Filter size={14} />
        <Text strong>{t('label.category') || 'Category'}:</Text>
        <Select
          style={{ width: 200 }}
          placeholder={t('label.select_category') || 'Select Category'}
          allowClear
          value={selectedCategory}
          onChange={onSelect}
          options={categories.map(cat => ({ label: cat, value: cat }))}
        />
      </Space>
    </div>
  );
};

export default CategorySelector;

