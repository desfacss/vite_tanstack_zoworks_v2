// src/modules/shop/pages/HomePage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Package, Wrench, Download, Zap } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { useCart } from '../hooks/useCart';
import { useWishlist } from '../hooks/useWishlist';
import { getCategories, getFeaturedProducts } from '../services/dataService';
import type { Category, Product } from '../types';

const CATEGORY_ICONS: Record<string, string> = {
  default: '📦', electronics: '💻', clothing: '👕', food: '🍕',
  services: '🔧', digital: '💾', health: '🏥', home: '🏠',
  sports: '⚽', beauty: '💄', books: '📚', travel: '✈️',
};

const ProductCard: React.FC<{
  product: Product;
  onAdd: (p: Product) => void;
  wishlisted: boolean;
  onWishlist: (p: Product) => void;
}> = ({ product, onAdd, wishlisted, onWishlist }) => {
  const images: string[] = product.meta?.images || [];
  const navigate = useNavigate();
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
          onClick={e => { e.stopPropagation(); onWishlist(product); }}
          title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          {wishlisted ? '❤️' : '🤍'}
        </button>
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
        <div className={`shop-stock-badge ${
          (product.stock ?? 0) === 0 ? 'out-of-stock' :
          (product.stock ?? 0) < 5  ? 'low-stock' : 'in-stock'
        }`}>
          {(product.stock ?? 0) === 0 ? 'Out of stock' :
           (product.stock ?? 0) < 5  ? `Only ${product.stock} left` : 'In stock'}
        </div>
        <button
          className="shop-add-btn"
          disabled={(product.stock ?? 0) === 0}
          onClick={() => onAdd(product)}
        >
          {product.type === 'service' ? '📅 Book Now' : '🛒 Add to Cart'}
        </button>
      </div>
    </div>
  );
};

const HomePage: React.FC = () => {
  const { orgId, config } = useShop();
  const { addItem } = useCart();
  const { toggle, isInWishlist } = useWishlist();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getCategories(orgId), getFeaturedProducts(orgId, 8)])
      .then(([cats, prods]) => {
        setCategories(cats);
        setFeaturedProducts(prods);
      })
      .finally(() => setLoading(false));
  }, [orgId]);

  const handleAdd = useCallback((product: Product) => {
    if (product.type === 'service') {
      navigate('/shop/booking');
      return;
    }
    addItem(product, null, 1);
  }, [addItem, navigate]);

  // Config-driven column count
  const catCols = Math.min(categories.length || 6, 8);

  return (
    <div className="shop-fade-in">
      {/* ── Hero ── */}
      {config.hero_type !== 'none' && (
        <div className="shop-hero">
          <h1>{config.hero_title}</h1>
          <p>{config.hero_subtitle}</p>
          <div className="shop-hero-cta">
            <Link to="/shop/products" className="shop-btn shop-btn-white shop-btn-lg">
              Shop Now <ArrowRight size={16} />
            </Link>
            {config.features?.booking && (
              <Link to="/shop/booking" className="shop-btn shop-btn-lg" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', backdropFilter: 'blur(4px)' }}>
                Book a Service <Zap size={16} />
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="shop-container">
        {/* ── Value Props ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, margin: '32px 0', textAlign: 'center' }}>
          {[
            { icon: <Package size={20} />, title: 'Physical Products', desc: 'Curated catalog with fast delivery' },
            { icon: <Wrench size={20} />, title: 'Professional Services', desc: 'Expert providers, easy booking' },
            { icon: <Download size={20} />, title: 'Digital Goods', desc: 'Instant download, lifetime access' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="shop-card" style={{ padding: '20px 16px' }}>
              <div style={{ color: 'var(--shop-primary)', marginBottom: 8, display: 'flex', justifyContent: 'center' }}>{icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 12, color: 'var(--shop-muted)' }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* ── Categories ── */}
        {categories.length > 0 && (
          <div className="shop-section">
            <div className="shop-section-header">
              <h2 className="shop-section-title">Browse Categories</h2>
              <Link to="/shop/products" className="shop-section-link">All products →</Link>
            </div>
            <div className="shop-category-grid" style={{ '--shop-cat-cols': Math.min(catCols, 6) } as React.CSSProperties}>
              {categories.slice(0, 12).map(cat => (
                <Link
                  key={cat.id}
                  to={`/shop/products?category=${cat.id}`}
                  className="shop-category-card"
                >
                  <div className="shop-category-icon" style={{ background: 'rgba(var(--color-primary-rgb,99,102,241),0.1)' }}>
                    {CATEGORY_ICONS[cat.slug] || CATEGORY_ICONS.default}
                  </div>
                  <div className="shop-category-name">{cat.name}</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Featured Products ── */}
        {!loading && featuredProducts.length > 0 && (
          <div className="shop-section">
            <div className="shop-section-header">
              <h2 className="shop-section-title">⭐ Featured Products</h2>
              <Link to="/shop/products" className="shop-section-link">See all →</Link>
            </div>
            <div className="shop-product-grid" style={{ '--shop-plp-cols': config.plp_columns ?? 3 } as React.CSSProperties}>
              {featuredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={handleAdd}
                  wishlisted={isInWishlist(product.id)}
                  onWishlist={toggle}
                />
              ))}
            </div>
          </div>
        )}

        {!loading && featuredProducts.length === 0 && categories.length === 0 && (
          <div className="shop-empty">
            <div className="shop-empty-icon">🛍️</div>
            <h3>Coming Soon</h3>
            <p>Products and services will appear here once your catalog is set up.</p>
          </div>
        )}

        {/* ── Why Choose Us ── */}
        <div className="shop-section">
          <div className="shop-section-header">
            <h2 className="shop-section-title">Why Choose Us</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { emoji: '🔒', text: 'Secure Payments' },
              { emoji: '🚚', text: 'Fast Delivery' },
              { emoji: '🔄', text: 'Easy Returns' },
              { emoji: '⭐', text: 'Verified Reviews' },
              { emoji: '📞', text: '24/7 Support' },
              { emoji: '🎁', text: 'Exclusive Offers' },
            ].map(({ emoji, text }) => (
              <div key={text} className="shop-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
                <span style={{ fontSize: 24 }}>{emoji}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
