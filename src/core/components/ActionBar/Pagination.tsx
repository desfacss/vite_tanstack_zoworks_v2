import { Pagination as AntPagination, Button } from 'antd';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDeviceType } from '@/utils/deviceTypeStore';

interface PaginationProps {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
    showSizeChanger?: boolean;
    simple?: boolean;
}

/**
 * Pagination - Unified responsive pagination component
 * 
 * Responsive behavior:
 * - Desktop: Full pagination with page numbers
 * - Tablet: Simple pagination (prev/next + text)
 * - Mobile: Mini pagination (just icons or dots)
 */
export const Pagination: React.FC<PaginationProps> = ({
    current,
    pageSize,
    total,
    onChange,
    showSizeChanger = true,
    simple = false,
}) => {
    const deviceType = useDeviceType();
    const isMobile = deviceType === 'mobile';
    const isTablet = deviceType === 'tablet';

    if (total <= 0) return null;

    if (isMobile) {
        return (
            <div className="flex items-center gap-2">
                <Button
                    type="text"
                    size="small"
                    icon={<ChevronLeft size={18} />}
                    disabled={current <= 1}
                    onClick={() => onChange(current - 1, pageSize)}
                />
                <span className="text-xs font-medium text-slate-500">
                    {current} / {Math.ceil(total / pageSize)}
                </span>
                <Button
                    type="text"
                    size="small"
                    icon={<ChevronRight size={18} />}
                    disabled={current >= Math.ceil(total / pageSize)}
                    onClick={() => onChange(current + 1, pageSize)}
                />
            </div>
        );
    }

    return (
        <AntPagination
            current={current}
            pageSize={pageSize}
            total={total}
            onChange={onChange}
            showSizeChanger={showSizeChanger}
            simple={simple || isTablet}
            size={isTablet ? 'small' : 'default'}
            className="action-bar-pagination"
        />
    );
};

export default Pagination;
