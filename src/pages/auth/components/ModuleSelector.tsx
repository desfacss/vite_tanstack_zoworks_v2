import { useEffect, useState } from 'react';
import { Spin, Tag } from 'antd';
import { CheckCircle2, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Offering {
  id: string;
  name: string;
  short_code: string;
  type: string;
  short_description: string | null;
  meta: Record<string, any> | null;
}

interface ModuleSelectorProps {
  /** IDs already selected (from URL ?modules= or parent state) */
  preSelected?: string[];
  onChange: (selectedIds: string[]) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Render a simple emoji / icon from meta.icon if set, else fall back to Package */
const OfferingIcon = ({ meta }: { meta: Record<string, any> | null }) => {
  if (meta?.emoji) return <span className="text-2xl">{meta.emoji}</span>;
  return <Package size={22} className="text-primary" />;
};

/** Badge colour per offering type */
const TYPE_COLORS: Record<string, string> = {
  product: 'blue',
  service: 'green',
  digital: 'purple',
  subscription: 'gold',
  bundle: 'orange',
  custom: 'cyan',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ModuleSelector
 *
 * Fetches available sellable offerings from catalog.offerings (Zoworks platform org)
 * via the public RPC `public.onboard_get_available_modules` and renders them as
 * interactive selection cards.
 *
 * Selected offering IDs are passed back via `onChange`.
 */
const ModuleSelector = ({ preSelected = [], onChange }: ModuleSelectorProps) => {
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(preSelected));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Sync if preSelected changes (e.g. URL param parsed after mount) ──────
  useEffect(() => {
    setSelected(new Set(preSelected));
  }, [preSelected.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch offerings ───────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('onboard_get_available_modules');
        if (error) throw error;
        setOfferings(data || []);
      } catch (err: any) {
        console.error('[ModuleSelector] Failed to load offerings:', err);
        setError('Could not load available modules. Please refresh.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Toggle selection ──────────────────────────────────────────────────────
  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      onChange(Array.from(next));
      return next;
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spin tip="Loading available modules…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-sm text-center py-4">{error}</div>
    );
  }

  if (offerings.length === 0) {
    return (
      <div className="text-gray-400 text-sm text-center py-4">
        No modules available at this time.
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-800">
        <Package size={16} className="text-primary" />
        Select Modules
        {selected.size > 0 && (
          <span className="ml-auto text-xs text-primary font-normal">
            {selected.size} selected
          </span>
        )}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {offerings.map(offering => {
          const isSelected = selected.has(offering.id);
          return (
            <button
              key={offering.id}
              type="button"          /* prevent accidental form submit */
              onClick={() => toggle(offering.id)}
              className={[
                'relative text-left rounded-xl border-2 p-4 transition-all duration-150',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm shadow-primary/20'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm',
              ].join(' ')}
            >
              {/* Checkmark badge */}
              {isSelected && (
                <CheckCircle2
                  size={16}
                  className="absolute top-3 right-3 text-primary"
                />
              )}

              <OfferingIcon meta={offering.meta} />

              <p className="mt-2 text-sm font-semibold text-gray-800 leading-tight">
                {offering.name}
              </p>

              {offering.short_description && (
                <p className="mt-1 text-xs text-gray-500 leading-snug line-clamp-2">
                  {offering.short_description}
                </p>
              )}

              <Tag
                color={TYPE_COLORS[offering.type] || 'default'}
                className="mt-2 text-[10px]"
              >
                {offering.type}
              </Tag>
            </button>
          );
        })}
      </div>

      {/* Validation hint */}
      {selected.size === 0 && (
        <p className="text-xs text-orange-500 mt-2">
          Please select at least one module to continue.
        </p>
      )}
    </div>
  );
};

export default ModuleSelector;
