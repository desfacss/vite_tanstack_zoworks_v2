// src/modules/shop/components/product/ReviewSystem.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MessageSquare } from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { getProductReviews, submitReview } from '../../services/dataService';
import type { Review, RatingSummary } from '../../types';

interface ReviewSystemProps {
  offeringId: string;
  orgId: string;
}

const StarRating: React.FC<{ rating: number; size?: number; interactive?: boolean; onChange?: (r: number) => void }> = ({ 
  rating, size = 16, interactive = false, onChange 
}) => {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <span 
          key={star}
          style={{ cursor: interactive ? 'pointer' : 'default', transition: 'transform 0.1s' }}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onChange?.(star)}
        >
          <Star 
            size={size} 
            fill={(hover || rating) >= star ? '#facc15' : 'transparent'} 
            color={(hover || rating) >= star ? '#facc15' : '#d1d5db'} 
          />
        </span>
      ))}
    </div>
  );
};

const ReviewSystem: React.FC<ReviewSystemProps> = ({ offeringId, orgId }) => {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Form state
  const [newRating, setNewRating] = useState(5);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const summary: RatingSummary = useMemo(() => {
    if (reviews.length === 0) return { average_rating: 0, total_reviews: 0, rating_distribution: {} };
    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => dist[r.rating]++);
    return {
      average_rating: Math.round((sum / total) * 10) / 10,
      total_reviews: total,
      rating_distribution: dist
    };
  }, [reviews]);

  useEffect(() => {
    loadReviews();
  }, [offeringId, orgId]);

  async function loadReviews() {
    setLoading(true);
    const data = await getProductReviews(orgId, offeringId);
    setReviews(data);
    setLoading(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setIsSubmitting(true);
    const success = await submitReview(orgId, {
      offering_id: offeringId,
      customer_id: user.id,
      rating: newRating,
      title: newTitle,
      content: newContent
    });
    if (success) {
      setSubmitted(true);
      setShowForm(false);
    }
    setIsSubmitting(false);
  };

  if (loading) return <div className="shop-loading-shimmer" style={{ height: 200, marginTop: 40 }} />;

  return (
    <div className="shop-review-system" style={{ marginTop: 48 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        Customer Reviews <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--shop-muted)' }}>({summary.total_reviews})</span>
      </h2>

      <div className="shop-review-summary-layout">
        <div className="shop-review-overall">
          <div style={{ fontSize: 48, fontWeight: 800 }}>{summary.average_rating}</div>
          <StarRating rating={summary.average_rating} size={20} />
          <div style={{ fontSize: 13, color: 'var(--shop-muted)', marginTop: 8 }}>Based on {summary.total_reviews} reviews</div>
        </div>

        <div className="shop-review-bars">
          {[5, 4, 3, 2, 1].map(star => (
            <div key={star} className="shop-review-bar-row">
              <span style={{ fontSize: 12, width: 12 }}>{star}</span>
              <div className="shop-review-bar-bg">
                <div 
                  className="shop-review-bar-fill" 
                  style={{ width: `${summary.total_reviews ? (summary.rating_distribution[star] / summary.total_reviews) * 100 : 0}%` }} 
                />
              </div>
              <span style={{ fontSize: 12, color: 'var(--shop-muted)', width: 20, textAlign: 'right' }}>
                {summary.rating_distribution[star] || 0}
              </span>
            </div>
          ))}
        </div>

        <div className="shop-review-cta">
          <h4>Share your thoughts</h4>
          <p style={{ fontSize: 13, color: 'var(--shop-muted)', marginBottom: 16 }}>If you've used this product, let others know what you think!</p>
          {!user ? (
            <button className="shop-btn shop-btn-outline shop-btn-sm" onClick={() => navigate('/login')}>Login to Review</button>
          ) : submitted ? (
            <div style={{ color: '#16a34a', fontSize: 14, fontWeight: 500 }}>✅ Your review has been submitted for moderation.</div>
          ) : (
            <button className="shop-btn shop-btn-primary shop-btn-sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : 'Write a Review'}
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <form className="shop-review-form shop-fade-in" onSubmit={handleSubmit} style={{ marginTop: 32, padding: 24, border: '1px solid var(--shop-border)', borderRadius: 12 }}>
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>Your Review</h3>
          <div className="shop-form-group">
            <label className="shop-form-label">Rating</label>
            <StarRating rating={newRating} interactive onChange={setNewRating} size={24} />
          </div>
          <div className="shop-form-group">
            <label className="shop-form-label">Review Title</label>
            <input 
              className="shop-form-input" 
              placeholder="Summary of your experience" 
              value={newTitle} 
              onChange={e => setNewTitle(e.target.value)}
              required
            />
          </div>
          <div className="shop-form-group">
            <label className="shop-form-label">Review Content</label>
            <textarea 
              className="shop-form-input" 
              rows={4} 
              placeholder="What did you like or dislike?" 
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              style={{ height: 'auto' }}
              required
            />
          </div>
          <button className="shop-btn shop-btn-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      )}

      <div className="shop-review-list" style={{ marginTop: 40 }}>
        {reviews.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--shop-muted)' }}>
            <MessageSquare size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
            <p>No reviews yet. Be the first to review!</p>
          </div>
        ) : (
          reviews.map(review => (
            <div key={review.id} className="shop-review-item" style={{ padding: '24px 0', borderBottom: '1px solid var(--shop-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>{review.customer_name}</span>
                <span style={{ fontSize: 12, color: 'var(--shop-muted)' }}>{new Date(review.created_at).toLocaleDateString()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <StarRating rating={review.rating} />
                {review.title && <span style={{ fontWeight: 600, fontSize: 14 }}>{review.title}</span>}
              </div>
              <p style={{ fontSize: 14, color: 'var(--shop-text)', lineHeight: 1.6 }}>{review.content}</p>
              {review.is_verified_purchase && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#16a34a', fontWeight: 500 }}>
                  <span style={{ fontSize: 14 }}>✓</span> Verified Purchase
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReviewSystem;
