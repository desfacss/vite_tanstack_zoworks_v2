// src/modules/shop/pages/ShopLayout.tsx
import React, { useState, useCallback } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Search, User, Store, Menu, X } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useWishlist } from '../hooks/useWishlist';
import { ShopProvider } from '../context/ShopContext';
import '../shop.css';

const ShopLayout: React.FC = () => {
  const navigate = useNavigate();
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  }, [searchQuery, navigate]);

  return (
    <ShopProvider>
      <div className="shop-root">
        {/* ── Header ── */}
        <header className="shop-header">
          <div className="shop-header-inner">
            <Link to="/shop" className="shop-logo">
              <Store size={20} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Zo<span>Works</span>
            </Link>

            <nav className="shop-nav" style={{ display: mobileMenuOpen ? 'flex' : undefined }}>
              <Link to="/shop">Home</Link>
              <Link to="/shop/products">Products</Link>
              <Link to="/shop/booking">Book a Service</Link>
              <Link to="/shop/support/faq">Help</Link>
            </nav>

            <form onSubmit={handleSearch} className="shop-search-bar">
              <Search size={16} className="shop-search-icon" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </form>

            <div className="shop-header-actions">
              <button
                className="shop-icon-btn"
                title="Wishlist"
                onClick={() => navigate('/shop/wishlist')}
              >
                <Heart size={20} />
                {wishlistCount > 0 && <span className="shop-badge">{wishlistCount}</span>}
              </button>
              <button
                className="shop-icon-btn"
                title="Cart"
                onClick={() => navigate('/shop/cart')}
              >
                <ShoppingCart size={20} />
                {itemCount > 0 && <span className="shop-badge">{itemCount}</span>}
              </button>
              <button
                className="shop-icon-btn"
                title="My Account"
                onClick={() => navigate('/shop/account')}
              >
                <User size={20} />
              </button>
              <button
                className="shop-icon-btn"
                title="Menu"
                style={{ display: 'none' }}
                onClick={() => setMobileMenuOpen(v => !v)}
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </header>

        {/* ── Main content ── */}
        <main>
          <Outlet />
        </main>

        {/* ── Footer ── */}
        <footer className="shop-footer">
          <div className="shop-footer-inner">
            <div className="shop-footer-grid">
              <div className="shop-footer-col">
                <h4>🛍️ ZoWorks Shop</h4>
                <p style={{ fontSize: 13, marginTop: 0 }}>
                  Your one-stop platform for products, services, and digital solutions.
                </p>
              </div>
              <div className="shop-footer-col">
                <h4>Browse</h4>
                <Link to="/shop">Home</Link>
                <Link to="/shop/products">All Products</Link>
                <Link to="/shop/booking">Book Service</Link>
                <Link to="/shop/wishlist">Wishlist</Link>
              </div>
              <div className="shop-footer-col">
                <h4>Account</h4>
                <Link to="/shop/account">Dashboard</Link>
                <Link to="/shop/account/orders">My Orders</Link>
                <Link to="/shop/account/profile">Profile</Link>
                <Link to="/shop/account/addresses">Addresses</Link>
              </div>
              <div className="shop-footer-col">
                <h4>Support</h4>
                <Link to="/shop/support/faq">FAQ</Link>
                <Link to="/shop/support/contact">Contact Us</Link>
                <Link to="/shop/support/policy/returns">Return Policy</Link>
                <Link to="/shop/support/policy/privacy">Privacy Policy</Link>
              </div>
            </div>
            <div className="shop-footer-bottom">
              <span>© {new Date().getFullYear()} ZoWorks. All rights reserved.</span>
              <span>Powered by ZoWorks Platform</span>
            </div>
          </div>
        </footer>
      </div>
    </ShopProvider>
  );
};

export default ShopLayout;
