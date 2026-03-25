// src/modules/shop/pages/BrandPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { useCart } from '../hooks/useCart';
import { useWishlist } from '../hooks/useWishlist';
import { getProducts } from '../services/dataService';
import type { Product, ProductFilters } from '../types';

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
        <button
          className={`shop-wishlist-btn ${wishlisted ? 'active' : ''}`}
          onClick={e => { e.stopPropagation(); onWishlist(); }}
        >{wishlisted ? '❤️' : '🤍'}</button>
      </div>
      <div className="shop-product-body">
        <div className="shop-product-name">{product.name}</div>
        <div className="shop-product-price-row">
          <span className="shop-price">₹{(product.price ?? 0).toLocaleString()}</span>
        </div>
        <button className="shop-add-btn" disabled={(product.stock ?? 0) === 0} onClick={onAdd}>
          {product.type === 'service' ? '📅 Book' : '🛒 Add to Cart'}
        </button>
      </div>
    </div>
  );
};

const SORT_OPTIONS = [
  { value: 'newest',    label: 'Newest First' },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popularity', label: 'Most Popular' },
];

const BrandPage: React.FC = () => {
  const { brandName } = useParams<{ brandName: string }>();
  const { orgId, config } = useShop();
  const { addItem } = useCart();
  const { toggle, isInWishlist } = useWishlist();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState(config.plp_default_sort || 'newest');

  const loadProducts = async () => {
    if (!brandName) return;
    setLoading(true);
    const decodedBrand = decodeURIComponent(brandName);
    const filters: ProductFilters = {
      brand: decodedBrand,
      sort: sort as any,
      page,
      limit: 24,
    };
    const { products: prods, total: t } = await getProducts(orgId, filters);
    setProducts(prods);
    setTotal(t);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, [brandName, page, sort, orgId]);

  if (loading) return <div className="shop-container"><div className="shop-loading-shimmer" style={{ height: 400 }} /></div>;
  if (!brandName) return <div className="shop-container shop-empty"><h3>Brand Not Found</h3><Link to="/shop">Back to Shop</Link></div>;

  return (
    <div className="shop-container shop-page shop-fade-in">
      <div className="shop-breadcrumb">
        <Link to="/shop">Home</Link> <ChevronRight size={12} /> <span>Brands</span> <ChevronRight size={12} /> <span>{decodeURIComponent(brandName)}</span>
      </div>

      <header className="shop-category-header" style={{ marginBottom: 32 }}>
        <h1 className="shop-page-title">{decodeURIComponent(brandName)}</h1>
        <p className="shop-category-description" style={{ color: 'var(--shop-muted)', marginTop: 8 }}>
          Discover the latest collection from {decodeURIComponent(brandName)}.
        </p>
      </header>

      <div className="shop-toolbar" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="shop-results-count">{total} products found</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <select 
            className="shop-sort-select" 
            value={sort} 
            onChange={e => setSort(e.target.value as any)}
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="shop-empty" style={{ padding: '64px 0' }}>
          <div className="shop-empty-icon">🏷️</div>
          <h3>No products found for this brand</h3>
          <p>Check back later for new arrivals from {decodeURIComponent(brandName)}!</p>
        </div>
      ) : (
        <>
          <div className="shop-product-grid" style={{ '--shop-plp-cols': config.plp_columns || 4 } as any}>
            {products.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onAdd={() => addItem(product, null, 1)}
                wishlisted={isInWishlist(product.id)}
                onWishlist={() => toggle(product)}
              />
            ))}
          </div>
          
          {total > 24 && (
            <div className="shop-pagination" style={{ marginTop: 40 }}>
              <button className="shop-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
              <span className="shop-page-info">Page {page} of {Math.ceil(total / 24)}</span>
              <button className="shop-page-btn" disabled={page >= Math.ceil(total / 24)} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BrandPage;
