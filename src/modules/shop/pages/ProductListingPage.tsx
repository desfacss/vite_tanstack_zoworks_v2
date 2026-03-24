import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { useCart } from '../hooks/useCart';
import { useWishlist } from '../hooks/useWishlist';
import { getProducts, getCategories } from '../services/dataService';
import type { Product, Category, ProductFilters } from '../types';

const SORT_OPTIONS = [
  { value: 'newest',    label: 'Newest First' },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popularity', label: 'Most Popular' },
];

const ProductCard: React.FC<{
  product: Product;
  onAdd: () => void;
  wishlisted: boolean;
  onWishlist: () => void;
}> = ({ product, onAdd, wishlisted, onWishlist }) => {
  const navigate = useNavigate();
  const images: string[] = product.meta?.images || [];
  return (
    <div className="shop-product-card shop-fade-in">
      <div className="shop-product-image" onClick={() => navigate(`/shop/products/${product.id}`)}>
        {images[0] ? <img src={images[0]} alt={product.name} /> : (
          <span className="shop-product-image-placeholder">
            {product.type === 'service' ? '🔧' : product.type === 'digital' ? '💾' : '📦'}
          </span>
        )}
        <span className={`shop-product-type-badge badge-${product.type}`}>
          {product.type === 'product' ? 'Product' : product.type === 'service' ? 'Service' : 'Digital'}
        </span>
        <button
          className={`shop-wishlist-btn ${wishlisted ? 'active' : ''}`}
          onClick={e => { e.stopPropagation(); onWishlist(); }}
        >{wishlisted ? '❤️' : '🤍'}</button>
      </div>
      <div className="shop-product-body">
        <div className="shop-product-name">{product.name}</div>
        <div className="shop-product-price-row">
          <span className="shop-price">₹{(product.price ?? 0).toLocaleString()}</span>
          {product.discount_percent ? (
            <>
              <span className="shop-price-original">₹{(product.original_price ?? 0).toLocaleString()}</span>
              <span className="shop-discount-badge">{product.discount_percent}% off</span>
            </>
          ) : null}
        </div>
        <div className={`shop-stock-badge ${(product.stock ?? 0) === 0 ? 'out-of-stock' : (product.stock ?? 0) < 5 ? 'low-stock' : 'in-stock'}`}>
          {(product.stock ?? 0) === 0 ? 'Out of stock' : (product.stock ?? 0) < 5 ? `Only ${product.stock} left` : 'In stock'}
        </div>
        <button className="shop-add-btn" disabled={(product.stock ?? 0) === 0} onClick={onAdd}>
          {product.type === 'service' ? '📅 Book' : '🛒 Add to Cart'}
        </button>
      </div>
    </div>
  );
};

const ProductListingPage: React.FC = () => {
  const { orgId, config } = useShop();
  const { addItem } = useCart();
  const { toggle, isInWishlist } = useWishlist();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  // Filters from URL + local state
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedType, setSelectedType] = useState('');

  const categoryId = searchParams.get('category') || '';
  const sort = (searchParams.get('sort') || config.plp_default_sort || 'newest') as ProductFilters['sort'];
  const perPage = config.plp_per_page ?? 24;
  const columns = config.plp_columns ?? 3;

  useEffect(() => { getCategories(orgId).then(setCategories); }, [orgId]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const filters: ProductFilters = {
      category_id: categoryId || undefined,
      sort,
      page,
      limit: perPage,
      min_price: minPrice ? parseFloat(minPrice) : undefined,
      max_price: maxPrice ? parseFloat(maxPrice) : undefined,
      type: selectedType || undefined,
    };
    const { products: prods, total: t } = await getProducts(orgId, filters);
    setProducts(prods);
    setTotal(t);
    setLoading(false);
  }, [orgId, categoryId, sort, page, perPage, minPrice, maxPrice, selectedType]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const handleSortChange = (v: string) => {
    setSearchParams(prev => { prev.set('sort', v); return prev; });
    setPage(1);
  };

  const handleAdd = (product: Product) => {
    if (product.type === 'service') { navigate('/shop/booking'); return; }
    addItem(product, null, 1);
  };

  const activeFilters: string[] = [];
  if (categoryId) activeFilters.push(`Category: ${categories.find(c => c.id === categoryId)?.name ?? categoryId}`);
  if (minPrice) activeFilters.push(`Min: ₹${minPrice}`);
  if (maxPrice) activeFilters.push(`Max: ₹${maxPrice}`);
  if (selectedType) activeFilters.push(`Type: ${selectedType}`);

  const totalPages = Math.ceil(total / perPage);
  const selectedCategory = categories.find(c => c.id === categoryId);

  return (
    <div className="shop-container shop-page shop-fade-in">
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: 'var(--shop-muted)', marginBottom: 20 }}>
        <Link to="/shop" style={{ color: 'var(--shop-primary)', textDecoration: 'none' }}>Home</Link>
        {' / '}
        {selectedCategory ? (
          <><Link to="/shop/products" style={{ color: 'var(--shop-primary)', textDecoration: 'none' }}>Products</Link> / {selectedCategory.name}</>
        ) : 'All Products'}
      </div>

      {config.plp_filter_position === 'sidebar' ? (
        <div className="shop-layout-with-sidebar">
          {/* ── Sidebar Filters ── */}
          <aside className="shop-sidebar">
            <div className="shop-filter-title">Filters</div>

            {/* Categories */}
            {categories.length > 0 && (
              <div className="shop-filter-section">
                <div className="shop-filter-title">Category</div>
                <label className="shop-filter-option">
                  <input type="radio" name="cat" checked={!categoryId} onChange={() => { setSearchParams(prev => { prev.delete('category'); return prev; }); }} />
                  All
                </label>
                {categories.map(cat => (
                  <label key={cat.id} className="shop-filter-option">
                    <input type="radio" name="cat" checked={categoryId === cat.id}
                      onChange={() => setSearchParams(prev => { prev.set('category', cat.id); return prev; })} />
                    {cat.name}
                  </label>
                ))}
              </div>
            )}

            {/* Type */}
            <div className="shop-filter-section">
              <div className="shop-filter-title">Product Type</div>
              {['', 'product', 'service', 'digital'].map(t => (
                <label key={t} className="shop-filter-option">
                  <input type="radio" name="type" checked={selectedType === t} onChange={() => setSelectedType(t)} />
                  {t === '' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}
                </label>
              ))}
            </div>

            {/* Price Range */}
            <div className="shop-filter-section">
              <div className="shop-filter-title">Price Range</div>
              <div className="shop-price-inputs">
                <input className="shop-price-input" type="number" placeholder="Min ₹" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
                <input className="shop-price-input" type="number" placeholder="Max ₹" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
              </div>
              <button className="shop-btn shop-btn-primary shop-btn-sm" style={{ marginTop: 10, width: '100%' }} onClick={() => setPage(1)}>
                Apply
              </button>
            </div>

            {/* Clear all */}
            {activeFilters.length > 0 && (
              <button className="shop-btn shop-btn-outline shop-btn-sm" style={{ width: '100%', marginTop: 8 }}
                onClick={() => { setSearchParams({}); setMinPrice(''); setMaxPrice(''); setSelectedType(''); setPage(1); }}>
                Clear All
              </button>
            )}
          </aside>

          {/* ── Product Area ── */}
          <div>
            {/* Active filters chips */}
            {activeFilters.length > 0 && (
              <div className="shop-active-filters">
                {activeFilters.map(f => (
                  <span key={f} className="shop-filter-chip">
                    {f}
                    <button onClick={() => { setSearchParams({}); setMinPrice(''); setMaxPrice(''); setSelectedType(''); }}><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}

            {/* Toolbar */}
            <div className="shop-toolbar">
              <span className="shop-results-count">{total} products found</span>
              <select className="shop-sort-select" value={sort} onChange={e => handleSortChange(e.target.value)}>
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="shop-empty"><div className="shop-empty-icon">⏳</div><h3>Loading products...</h3></div>
            ) : products.length === 0 ? (
              <div className="shop-empty">
                <div className="shop-empty-icon">🔍</div>
                <h3>No products found</h3>
                <p>Try adjusting your filters or search query.</p>
              </div>
            ) : (
              <div className="shop-product-grid" style={{ '--shop-plp-cols': columns } as React.CSSProperties}>
                {products.map(p => (
                  <ProductCard key={p.id} product={p}
                    onAdd={() => handleAdd(p)}
                    wishlisted={isInWishlist(p.id)}
                    onWishlist={() => toggle(p)}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && config.plp_pagination !== 'infinite' && (
              <div className="shop-pagination">
                <button className="shop-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} className={`shop-page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="shop-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
              </div>
            )}
            {config.plp_pagination === 'load_more' && products.length < total && (
              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <button className="shop-btn shop-btn-outline" onClick={() => setPage(p => p + 1)}>
                  Load More ({total - products.length} remaining)
                </button>
              </div>
            )}
          </div>
        </div>
      ) : config.plp_filter_position === 'top' ? (
        /* ── Top Filters Implementation ── */
        <div>
          <div className="shop-filter-bar-top">
            <div className="shop-filter-bar-group">
              <span className="shop-filter-group-label">Category:</span>
              <select className="shop-sort-select" value={categoryId} onChange={e => setSearchParams(prev => { if (e.target.value) prev.set('category', e.target.value); else prev.delete('category'); return prev; })}>
                <option value="">All Categories</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            
            <div className="shop-filter-bar-group">
              <span className="shop-filter-group-label">Type:</span>
              <select className="shop-sort-select" value={selectedType} onChange={e => setSelectedType(e.target.value)}>
                <option value="">All Types</option>
                <option value="product">Product</option>
                <option value="service">Service</option>
                <option value="digital">Digital</option>
              </select>
            </div>

            <div className="shop-filter-bar-group">
              <span className="shop-filter-group-label">Price:</span>
              <div className="shop-price-inputs" style={{ display: 'inline-flex', width: 'auto' }}>
                <input className="shop-price-input small" type="number" placeholder="Min ₹" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
                <input className="shop-price-input small" type="number" placeholder="Max ₹" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
                <button className="shop-btn shop-btn-primary shop-btn-sm" onClick={() => setPage(1)}>Ok</button>
              </div>
            </div>

            <div style={{ flex: 1 }} />

            <div className="shop-filter-bar-group">
              <span className="shop-filter-group-label">Sort:</span>
              <select className="shop-sort-select" value={sort} onChange={e => handleSortChange(e.target.value)}>
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Active filters chips */}
          {activeFilters.length > 0 && (
            <div className="shop-active-filters">
              {activeFilters.map(f => (
                <span key={f} className="shop-filter-chip">
                  {f}
                  <button onClick={() => { setSearchParams({}); setMinPrice(''); setMaxPrice(''); setSelectedType(''); }}><X size={10} /></button>
                </span>
              ))}
            </div>
          )}

          {/* Results Count Bar */}
          <div className="shop-toolbar" style={{ borderTop: 'none', marginTop: 0 }}>
            <span className="shop-results-count">{total} products found</span>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="shop-empty"><div className="shop-empty-icon">⏳</div><h3>Loading products...</h3></div>
          ) : products.length === 0 ? (
            <div className="shop-empty">
              <div className="shop-empty-icon">🔍</div>
              <h3>No products found</h3>
              <p>Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="shop-product-grid" style={{ '--shop-plp-cols': columns } as React.CSSProperties}>
              {products.map(p => (
                <ProductCard key={p.id} product={p}
                  onAdd={() => handleAdd(p)}
                  wishlisted={isInWishlist(p.id)}
                  onWishlist={() => toggle(p)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && config.plp_pagination !== 'infinite' && (
            <div className="shop-pagination">
              <button className="shop-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} className={`shop-page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="shop-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
            </div>
          )}
        </div>
      ) : (
        /* Filter position = none — just grid */
        <div>
          <div className="shop-toolbar">
            <span className="shop-results-count">{total} products</span>
            <select className="shop-sort-select" value={sort} onChange={e => handleSortChange(e.target.value)}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="shop-product-grid" style={{ '--shop-plp-cols': columns } as React.CSSProperties}>
            {products.map(p => (
              <ProductCard key={p.id} product={p}
                onAdd={() => handleAdd(p)}
                wishlisted={isInWishlist(p.id)}
                onWishlist={() => toggle(p)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductListingPage;
