// src/modules/shop/components/layout/ProductSearchBar.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2 } from 'lucide-react';
import { getSearchSuggestions } from '../../services/dataService';
import type { Product } from '../../types';

interface ProductSearchBarProps {
  orgId: string;
}

const ProductSearchBar: React.FC<ProductSearchBarProps> = ({ orgId }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    const results = await getSearchSuggestions(orgId, q);
    setSuggestions(results);
    setLoading(false);
    setShowDropdown(results.length > 0);
  }, [orgId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/shop/search?q=${encodeURIComponent(query.trim())}`);
      setShowDropdown(false);
    }
  };

  const selectSuggestion = (p: Product) => {
    navigate(`/shop/products/${p.id}`);
    setQuery('');
    setShowDropdown(false);
  };

  return (
    <div className="shop-search-wrapper" style={{ position: 'relative', flex: 1, maxWidth: 500 }} ref={dropdownRef}>
      <form onSubmit={handleSearch} className="shop-search-bar">
        <Search size={16} className="shop-search-icon" />
        <input
          type="text"
          placeholder="Search items..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && suggestions.length > 0 && setShowDropdown(true)}
        />
        {loading && <Loader2 size={14} className="shop-search-spinner shop-spin" style={{ marginRight: 8, color: 'var(--shop-muted)' }} />}
        {query && (
          <button type="button" className="shop-search-clear" onClick={() => setQuery('')}>
            <X size={14} />
          </button>
        )}
      </form>

      {showDropdown && (
        <div className="shop-search-dropdown shop-fade-in" style={{
          position: 'absolute', top: '100%', left: 0, right: 0, 
          background: 'white', border: '1px solid var(--shop-border)',
          borderRadius: 8, marginTop: 4, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          zIndex: 100, overflow: 'hidden'
        }}>
          {suggestions.map(s => (
            <div 
              key={s.id} 
              className="shop-search-suggestion" 
              onClick={() => selectSuggestion(s)}
              style={{
                padding: '10px 16px', cursor: 'pointer', transition: 'background 0.2s',
                display: 'flex', alignItems: 'center', gap: 10, fontSize: 13
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--shop-bg-alt)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ opacity: 0.6 }}>
                {s.type === 'service' ? '🔧' : s.type === 'digital' ? '💾' : '📦'}
              </span>
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
              <span style={{ fontSize: 10, color: 'var(--shop-muted)', textTransform: 'uppercase' }}>{s.type}</span>
            </div>
          ))}
          <div 
            style={{ padding: '8px 16px', background: 'var(--shop-bg-alt)', borderTop: '1px solid var(--shop-border)', fontSize: 11, textAlign: 'center' }}
          >
            Press Enter to see all results
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductSearchBar;
