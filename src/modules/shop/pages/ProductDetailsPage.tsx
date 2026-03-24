// src/modules/shop/pages/ProductDetailsPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Heart, Share2, Shield, Truck, RefreshCw } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { useCart } from '../hooks/useCart';
import { useWishlist } from '../hooks/useWishlist';
import { getProductById, getFeaturedProducts } from '../services/dataService';
import type { Product, ProductVariant } from '../types';

const ProductDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { orgId, config } = useShop();
  const { addItem } = useCart();
  const { toggle, isInWishlist } = useWishlist();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<string>(config.pdp_tabs?.[0] ?? 'description');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getProductById(orgId, id).then(p => {
      setProduct(p);
      setSelectedImageIdx(0);
      setSelectedVariant(null);
    }).finally(() => setLoading(false));
    getFeaturedProducts(orgId, 4).then(setRelated);
  }, [id, orgId]);

  const images: string[] = product?.meta?.images || [];
  const wishlisted = product ? isInWishlist(product.id) : false;

  const price = selectedVariant?.price_adjustment
    ? (product?.price ?? 0) + selectedVariant.price_adjustment
    : (product?.price ?? 0);

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    if (product.type === 'service') { navigate('/shop/booking'); return; }
    addItem(product, selectedVariant, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }, [product, selectedVariant, qty, addItem, navigate]);

  const handleBuyNow = useCallback(() => {
    if (!product) return;
    addItem(product, selectedVariant, qty);
    navigate('/shop/cart');
  }, [product, selectedVariant, qty, addItem, navigate]);

  if (loading) return (
    <div className="shop-container shop-page">
      <div className="shop-empty"><div className="shop-empty-icon">⏳</div><h3>Loading product...</h3></div>
    </div>
  );

  if (!product) return (
    <div className="shop-container shop-page">
      <div className="shop-empty">
        <div className="shop-empty-icon">😕</div>
        <h3>Product not found</h3>
        <Link to="/shop/products" className="shop-btn shop-btn-primary">Browse Products</Link>
      </div>
    </div>
  );

  // Unique attribute keys from variants
  const variantAttributes: Record<string, string[]> = {};
  product.variants?.forEach(v => {
    Object.entries(v.attributes).forEach(([k, val]) => {
      if (!variantAttributes[k]) variantAttributes[k] = [];
      if (!variantAttributes[k].includes(val)) variantAttributes[k].push(val);
    });
  });

  const pdpLayout = config.pdp_image_position === 'right'
    ? 'shop-pdp-layout' // override gallery to right via CSS Grid order
    : 'shop-pdp-layout';

  return (
    <div className="shop-container shop-page shop-fade-in">
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: 'var(--shop-muted)', marginBottom: 24 }}>
        <Link to="/shop" style={{ color: 'var(--shop-primary)', textDecoration: 'none' }}>Home</Link>
        {' / '}
        <Link to="/shop/products" style={{ color: 'var(--shop-primary)', textDecoration: 'none' }}>Products</Link>
        {' / '}{product.name}
      </div>

      <div className={pdpLayout}
        style={config.pdp_image_position === 'right' ? { direction: 'rtl' } : undefined}
      >
        {/* ── Gallery ── */}
        <div className="shop-pdp-gallery" style={{ direction: 'ltr' }}>
          <div className="shop-pdp-main-image">
            {images[selectedImageIdx]
              ? <img src={images[selectedImageIdx]} alt={product.name} />
              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 80, opacity: 0.3 }}>
                  {product.type === 'service' ? '🔧' : product.type === 'digital' ? '💾' : '📦'}
                </div>
            }
          </div>
          {images.length > 1 && (
            <div className="shop-pdp-thumbnails">
              {images.map((img, i) => (
                <div key={i} className={`shop-pdp-thumb ${i === selectedImageIdx ? 'active' : ''}`} onClick={() => setSelectedImageIdx(i)}>
                  <img src={img} alt={`View ${i + 1}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Info Panel ── */}
        <div style={{ direction: 'ltr' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--shop-text)', lineHeight: 1.3 }}>{product.name}</h1>
            <div style={{ display: 'flex', gap: 8 }}>
              {config.features?.wishlist && (
                <button
                  className={`shop-wishlist-btn ${wishlisted ? 'active' : ''}`}
                  style={{ position: 'static', width: 36, height: 36 }}
                  onClick={() => toggle(product)}
                  title={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
                >
                  <Heart size={16} fill={wishlisted ? '#ef4444' : 'none'} color={wishlisted ? '#ef4444' : 'currentColor'} />
                </button>
              )}
              <button
                className="shop-wishlist-btn"
                style={{ position: 'static', width: 36, height: 36 }}
                title="Share"
                onClick={() => navigator.share?.({ title: product.name, url: window.location.href }).catch(() => {})}
              >
                <Share2 size={16} />
              </button>
            </div>
          </div>

          {product.brand && <div style={{ fontSize: 13, color: 'var(--shop-muted)', marginBottom: 4 }}>by <strong>{product.brand}</strong></div>}

          <div className="shop-pdp-price">₹{price.toLocaleString()}</div>
          {product.discount_percent ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span className="shop-price-original">₹{(product.original_price ?? 0).toLocaleString()}</span>
              <span className="shop-discount-badge">{product.discount_percent}% off</span>
            </div>
          ) : null}

          {/* Stock */}
          <div className={`shop-stock-badge ${(product.stock ?? 0) === 0 ? 'out-of-stock' : (product.stock ?? 0) < 5 ? 'low-stock' : 'in-stock'}`}
            style={{ fontSize: 13, marginBottom: 16 }}>
            {(product.stock ?? 0) === 0 ? '❌ Out of stock' : (product.stock ?? 0) < 5 ? `⚠️ Only ${product.stock} left` : '✅ In stock'}
          </div>

          {/* Variants */}
          {Object.entries(variantAttributes).map(([attr, values]) => (
            <div key={attr} className="shop-variants">
              <div className="shop-variant-label">{attr}</div>
              {attr.toLowerCase() === 'color' ? (
                <div className="shop-color-swatches">
                  {values.map(val => {
                    const variant = product.variants?.find(v => v.attributes[attr] === val);
                    const isSelected = selectedVariant?.attributes[attr] === val;
                    return (
                      <div
                        key={val}
                        className={`shop-color-swatch ${isSelected ? 'selected' : ''}`}
                        style={{ background: val.toLowerCase() }}
                        title={val}
                        onClick={() => setSelectedVariant(variant ?? null)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="shop-size-chips">
                  {values.map(val => {
                    const variant = product.variants?.find(v => v.attributes[attr] === val);
                    const isSelected = selectedVariant?.attributes[attr] === val;
                    return (
                      <div key={val} className={`shop-size-chip ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedVariant(variant ?? null)}>
                        {val}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Quantity */}
          {product.type !== 'service' && (
            <div style={{ marginBottom: 20 }}>
              <div className="shop-variant-label">Quantity</div>
              <div className="shop-qty-stepper" style={{ width: 'auto' }}>
                <button className="shop-qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                <span className="shop-qty-value">{qty}</span>
                <button className="shop-qty-btn" onClick={() => setQty(q => Math.min(product.stock ?? 10, q + 1))}>+</button>
              </div>
            </div>
          )}

          {/* CTAs */}
          <div className="shop-pdp-actions">
            <button className="shop-add-to-cart-btn" disabled={(product.stock ?? 0) === 0} onClick={handleAddToCart}>
              {added ? '✓ Added!' : product.type === 'service' ? '📅 Book Now' : '🛒 Add to Cart'}
            </button>
            {product.type !== 'service' && (
              <button className="shop-buy-now-btn" disabled={(product.stock ?? 0) === 0} onClick={handleBuyNow}>
                Buy Now
              </button>
            )}
          </div>

          {/* Trust badges */}
          <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
            {[
              { icon: <Truck size={14} />, text: `Free shipping over ₹${config.cart_free_shipping_threshold ?? 999}` },
              { icon: <RefreshCw size={14} />, text: 'Easy returns' },
              { icon: <Shield size={14} />, text: 'Secure checkout' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--shop-muted)' }}>
                {icon} {text}
              </div>
            ))}
          </div>

          {/* Tabs */}
          {config.pdp_tabs && config.pdp_tabs.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div style={{ display: 'flex', gap: 0, borderBottom: '1.5px solid var(--shop-border)', marginBottom: 20 }}>
                {config.pdp_tabs.map(tab => (
                  <button key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: '10px 20px', border: 'none', background: 'none',
                      cursor: 'pointer', fontWeight: 600, fontSize: 13,
                      color: activeTab === tab ? 'var(--shop-primary)' : 'var(--shop-muted)',
                      borderBottom: activeTab === tab ? '2px solid var(--shop-primary)' : '2px solid transparent',
                      marginBottom: -1.5, transition: 'all 0.2s',
                    }}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
              {activeTab === 'description' && (
                <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--shop-text)' }}>
                  {product.description || 'No description available for this product.'}
                </p>
              )}
              {activeTab === 'specs' && (
                <div>
                  {product.sku && <div style={{ fontSize: 13, marginBottom: 8 }}><strong>SKU:</strong> {product.sku}</div>}
                  <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Type:</strong> {product.type}</div>
                  {product.brand && <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Brand:</strong> {product.brand}</div>}
                  {product.meta?.tags?.length && (
                    <div style={{ fontSize: 13, marginBottom: 8 }}>
                      <strong>Tags:</strong>{' '}
                      {product.meta.tags.map((t: string) => (
                        <span key={t} style={{ background: 'rgba(var(--color-primary-rgb),0.1)', padding: '2px 8px', borderRadius: 20, fontSize: 11, marginRight: 4, color: 'var(--shop-primary)' }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'reviews' && (
                <div className="shop-empty" style={{ padding: '40px 0' }}>
                  <div className="shop-empty-icon">⭐</div>
                  <h3>No Reviews Yet</h3>
                  <p>Be the first to review this product.</p>
                </div>
              )}
              {activeTab === 'faq' && (
                <div className="shop-empty" style={{ padding: '40px 0' }}>
                  <div className="shop-empty-icon">❓</div>
                  <h3>No FAQs Yet</h3>
                  <p>Questions will appear here once added.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      {related.filter(r => r.id !== product.id).length > 0 && (
        <div className="shop-section">
          <div className="shop-section-header">
            <h2 className="shop-section-title">You Might Also Like</h2>
          </div>
          <div className="shop-product-grid" style={{ '--shop-plp-cols': 4 } as React.CSSProperties}>
            {related.filter(r => r.id !== product.id).slice(0, 4).map(p => (
              <div key={p.id} className="shop-product-card" onClick={() => navigate(`/shop/products/${p.id}`)}>
                <div className="shop-product-image">
                  {p.meta?.images?.[0] ? <img src={p.meta.images[0]} alt={p.name} /> : <span className="shop-product-image-placeholder">📦</span>}
                </div>
                <div className="shop-product-body">
                  <div className="shop-product-name">{p.name}</div>
                  <div className="shop-price">₹{(p.price ?? 0).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailsPage;
