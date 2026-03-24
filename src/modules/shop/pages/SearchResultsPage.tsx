// src/modules/shop/pages/SearchResultsPage.tsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { useCart } from '../hooks/useCart';
import { searchProducts } from '../services/dataService';
import type { Product } from '../types';

const SearchResultsPage: React.FC = () => {
  const { orgId, config } = useShop();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    searchProducts(orgId, q).then(setResults).finally(() => setLoading(false));
  }, [q, orgId]);

  return (
    <div className="shop-container shop-page shop-fade-in">
      <div className="shop-page-header">
        <h1 className="shop-page-title">
          {q ? `Search: "${q}"` : 'Search'}
        </h1>
        {!loading && q && <p className="shop-page-subtitle">{results.length} result{results.length !== 1 ? 's' : ''} found</p>}
      </div>

      {!q && (
        <div className="shop-empty">
          <div className="shop-empty-icon"><Search size={52} /></div>
          <h3>Type something to search</h3>
          <p>Use the search bar in the header to find products.</p>
        </div>
      )}

      {loading && (
        <div className="shop-empty"><div className="shop-empty-icon">⏳</div><h3>Searching...</h3></div>
      )}

      {!loading && q && results.length === 0 && (
        <div className="shop-empty">
          <div className="shop-empty-icon">🔍</div>
          <h3>No results for "{q}"</h3>
          <p>Try a different keyword or browse all products.</p>
          <Link to="/shop/products" className="shop-btn shop-btn-primary">Browse All Products</Link>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="shop-product-grid" style={{ '--shop-plp-cols': config.plp_columns ?? 3 } as React.CSSProperties}>
          {results.map(product => {
            const images: string[] = product.meta?.images || [];
            return (
              <div key={product.id} className="shop-product-card shop-fade-in">
                <div className="shop-product-image" onClick={() => navigate(`/shop/products/${product.id}`)}>
                  {images[0] ? <img src={images[0]} alt={product.name} /> : (
                    <span className="shop-product-image-placeholder">
                      {product.type === 'service' ? '🔧' : '📦'}
                    </span>
                  )}
                  <span className={`shop-product-type-badge badge-${product.type}`}>{product.type}</span>
                </div>
                <div className="shop-product-body">
                  <div className="shop-product-name">{product.name}</div>
                  <div className="shop-product-price-row">
                    <span className="shop-price">₹{(product.price ?? 0).toLocaleString()}</span>
                  </div>
                  <button className="shop-add-btn" onClick={() => addItem(product, null, 1)}>
                    Add to Cart
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SearchResultsPage;
