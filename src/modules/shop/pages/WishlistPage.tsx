// src/modules/shop/pages/WishlistPage.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useWishlist } from '../hooks/useWishlist';
import { useCart } from '../hooks/useCart';
import { useShopConfig } from '../hooks/useShopConfig';

const WishlistPage: React.FC = () => {
  const config = useShopConfig();
  const { wishlist, remove } = useWishlist();
  const { addItem } = useCart();
  const navigate = useNavigate();

  if (!config.features?.wishlist) {
    return (
      <div className="shop-container shop-page">
        <div className="shop-empty">
          <div className="shop-empty-icon">🚫</div>
          <h3>Wishlist disabled</h3>
          <p>The wishlist feature is not enabled for this store.</p>
          <Link to="/shop/products" className="shop-btn shop-btn-primary">Browse Products</Link>
        </div>
      </div>
    );
  }

  if (wishlist.length === 0) return (
    <div className="shop-container shop-page">
      <div className="shop-empty">
        <div className="shop-empty-icon"><Heart size={52} /></div>
        <h3>Your wishlist is empty</h3>
        <p>Save items you love and revisit them any time.</p>
        <Link to="/shop/products" className="shop-btn shop-btn-primary">Shop Now</Link>
      </div>
    </div>
  );

  return (
    <div className="shop-container shop-page shop-fade-in">
      <div className="shop-page-header">
        <h1 className="shop-page-title">My Wishlist</h1>
        <span style={{ fontSize: 14, color: 'var(--shop-muted)' }}>{wishlist.length} item{wishlist.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="shop-product-grid" style={{ '--shop-plp-cols': config.plp_columns ?? 3 } as React.CSSProperties}>
        {wishlist.map(product => {
          const images: string[] = product.meta?.images || [];
          return (
            <div key={product.id} className="shop-product-card shop-fade-in">
              <div className="shop-product-image" onClick={() => navigate(`/shop/products/${product.id}`)}>
                {images[0] ? <img src={images[0]} alt={product.name} /> : (
                  <span className="shop-product-image-placeholder">
                    {product.type === 'service' ? '🔧' : '📦'}
                  </span>
                )}
                <button
                  className="shop-wishlist-btn active"
                  title="Remove from wishlist"
                  onClick={e => { e.stopPropagation(); remove(product.id); }}
                >❤️</button>
              </div>
              <div className="shop-product-body">
                <div className="shop-product-name">{product.name}</div>
                <div className="shop-product-price-row">
                  <span className="shop-price">₹{(product.price ?? 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="shop-add-btn" style={{ flex: 1 }}
                    disabled={(product.stock ?? 0) === 0}
                    onClick={() => { addItem(product, null, 1); remove(product.id); }}>
                    Move to Cart
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WishlistPage;
