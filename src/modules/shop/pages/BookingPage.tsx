// src/modules/shop/pages/BookingPage.tsx
// Public calendar booking page (uses calendar schema event_types)
import React, { useEffect, useState } from 'react';
import { Clock, ChevronLeft, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useShop } from '../context/ShopContext';
import type { EventType } from '../types';

type ViewState = 'LIST' | 'SLOTS' | 'FORM' | 'SUCCESS';

const BOOKING_MODES: Record<string, string> = {
  appointment: 'Appointment',
  queue: 'Queue',
  'arrival-window': 'Arrival Window',
};

const BookingPage: React.FC = () => {
  const { orgId, config } = useShop();
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewState>('LIST');

  // Selected slot
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    supabase.schema('calendar').from('event_types')
      .select('*').eq('organization_id', orgId).eq('is_active', true)
      .then(({ data }) => { setEventTypes(data || []); setLoading(false); });
  }, [orgId]);

  // Generate mock time slots for the next 7 days
  const generateSlots = () => {
    const slots = [];
    for (let h = 9; h <= 17; h++) {
      for (const m of ['00', '30']) {
        if (h === 17 && m === '30') break;
        slots.push(`${String(h).padStart(2, '0')}:${m}`);
      }
    }
    return slots;
  };

  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i + 1);
    return d.toISOString().split('T')[0];
  });

  const handleSelectEvent = (et: EventType) => {
    setSelectedEvent(et);
    setSelectedDate(next7Days[0]);
    setView('SLOTS');
  };

  const handleSelectSlot = (time: string) => {
    setSelectedTime(time);
    setView('FORM');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    if (!selectedEvent || !form.name || !form.email) { setSubmitting(false); return; }
    const { error } = await supabase.schema('calendar').from('bookings').insert({
      event_type_id: selectedEvent.id,
      invitee_name: form.name,
      invitee_email: form.email,
      invitee_notes: form.notes,
      scheduled_at: `${selectedDate}T${selectedTime}:00`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      status: 'confirmed',
    });
    setSubmitting(false);
    if (!error) setView('SUCCESS');
  };

  if (!config.features?.booking) return (
    <div className="shop-container shop-page">
      <div className="shop-empty">
        <div className="shop-empty-icon">🚫</div>
        <h3>Booking not available</h3>
        <p>Service booking is not enabled for this store.</p>
      </div>
    </div>
  );

  if (loading) return (
    <div className="shop-container shop-page">
      <div className="shop-empty"><div className="shop-empty-icon">⏳</div><h3>Loading services...</h3></div>
    </div>
  );

  // ── Success ──
  if (view === 'SUCCESS') return (
    <div className="shop-container shop-page shop-fade-in">
      <div className="shop-confirmation">
        <div className="shop-confirmation-icon">✅</div>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>Booking Confirmed!</h1>
        <p style={{ color: 'var(--shop-muted)', marginBottom: 24 }}>
          Your <strong>{selectedEvent?.title}</strong> appointment on{' '}
          <strong>{new Date(selectedDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}</strong> at{' '}
          <strong>{selectedTime}</strong> has been confirmed.
        </p>
        <button className="shop-btn shop-btn-primary" onClick={() => { setView('LIST'); setSelectedEvent(null); }}>
          Book Another
        </button>
      </div>
    </div>
  );

  // ── Booking form ──
  if (view === 'FORM' && selectedEvent) return (
    <div className="shop-container shop-page shop-fade-in">
      <button className="shop-btn shop-btn-outline shop-btn-sm" style={{ marginBottom: 20 }} onClick={() => setView('SLOTS')}>
        <ChevronLeft size={14} /> Back
      </button>
      <div className="shop-page-header">
        <h1 className="shop-page-title">{selectedEvent.title}</h1>
        <p className="shop-page-subtitle">
          {new Date(selectedDate).toLocaleDateString('en-IN', { dateStyle: 'long' })} at {selectedTime} 
          {' · '}{selectedEvent.duration_minutes} min
        </p>
      </div>
      <div style={{ maxWidth: 480 }}>
        <div className="shop-checkout-section">
          <h3>Your Details</h3>
          <div className="shop-form-grid full" style={{ gap: 12 }}>
            <div className="shop-form-group">
              <label className="shop-form-label">Full Name *</label>
              <input className="shop-form-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Jane Doe" />
            </div>
            <div className="shop-form-group">
              <label className="shop-form-label">Email *</label>
              <input className="shop-form-input" type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="you@example.com" />
            </div>
            <div className="shop-form-group">
              <label className="shop-form-label">Phone</label>
              <input className="shop-form-input" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="+91 9XXXXXXXXX" />
            </div>
            <div className="shop-form-group">
              <label className="shop-form-label">Notes</label>
              <textarea className="shop-form-input" rows={3} style={{ height: 'auto', resize: 'vertical' }} value={form.notes}
                onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Anything you'd like us to know..." />
            </div>
          </div>
          <button className="shop-btn shop-btn-primary" style={{ width: '100%', marginTop: 16 }}
            disabled={!form.name || !form.email || submitting} onClick={handleSubmit}>
            {submitting ? 'Confirming...' : 'Confirm Booking →'}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Slot picker ──
  if (view === 'SLOTS' && selectedEvent) return (
    <div className="shop-container shop-page shop-fade-in">
      <button className="shop-btn shop-btn-outline shop-btn-sm" style={{ marginBottom: 20 }} onClick={() => setView('LIST')}>
        <ChevronLeft size={14} /> All Services
      </button>
      <div className="shop-page-header">
        <h1 className="shop-page-title">{selectedEvent.title}</h1>
        <p className="shop-page-subtitle">{selectedEvent.duration_minutes} min · {BOOKING_MODES[selectedEvent.booking_mode] ?? selectedEvent.booking_mode}</p>
      </div>
      <div className="shop-booking-grid">
        {/* Calendar */}
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {next7Days.map(d => (
              <button key={d}
                className={`shop-btn ${selectedDate === d ? 'shop-btn-primary' : 'shop-btn-outline'} shop-btn-sm`}
                onClick={() => setSelectedDate(d)}>
                {new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              </button>
            ))}
          </div>
          <div className="shop-filter-title" style={{ marginBottom: 12 }}>
            <Calendar size={14} style={{ display: 'inline', marginRight: 6 }} />
            Available slots for {new Date(selectedDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}
          </div>
          <div className="shop-time-slot-grid">
            {generateSlots().map(t => (
              <div key={t} className={`shop-time-slot ${selectedTime === t ? 'selected' : ''}`} onClick={() => handleSelectSlot(t)}>{t}</div>
            ))}
          </div>
        </div>
        {/* Summary */}
        <div className="shop-cart-summary">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Booking Summary</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div className="shop-event-type-dot" style={{ background: selectedEvent.color }} />
            <strong style={{ fontSize: 14 }}>{selectedEvent.title}</strong>
          </div>
          {selectedEvent.description && <p style={{ fontSize: 13, color: 'var(--shop-muted)', marginBottom: 10 }}>{selectedEvent.description}</p>}
          <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--shop-muted)', marginBottom: 8 }}>
            <Clock size={14} /> {selectedEvent.duration_minutes} minutes
          </div>
          {selectedDate && selectedTime && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(var(--color-primary-rgb,99,102,241),0.08)', borderRadius: 8, fontSize: 13 }}>
              📅 {new Date(selectedDate).toLocaleDateString('en-IN', { dateStyle: 'long' })} at <strong>{selectedTime}</strong>
            </div>
          )}
          <button className="shop-btn shop-btn-primary" style={{ width: '100%', marginTop: 16 }}
            disabled={!selectedTime} onClick={() => setView('FORM')}>
            Continue →
          </button>
        </div>
      </div>
    </div>
  );

  // ── Event type list ──
  return (
    <div className="shop-container shop-page shop-fade-in">
      <div className="shop-page-header">
        <h1 className="shop-page-title">Book a Service</h1>
        <p className="shop-page-subtitle">Choose a service type to get started</p>
      </div>
      {eventTypes.length === 0 ? (
        <div className="shop-empty">
          <div className="shop-empty-icon">📅</div>
          <h3>No services available</h3>
          <p>Check back later or contact us directly.</p>
        </div>
      ) : (
        <div style={{ maxWidth: 640 }}>
          {eventTypes.map(et => (
            <div key={et.id} className="shop-event-type-card" onClick={() => handleSelectEvent(et)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="shop-event-type-dot" style={{ background: et.color ?? '#6366f1' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{et.title}</div>
                  {et.description && <div style={{ fontSize: 13, color: 'var(--shop-muted)', marginTop: 2 }}>{et.description}</div>}
                  <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 12, color: 'var(--shop-muted)' }}>
                    <span><Clock size={12} style={{ display: 'inline' }} /> {et.duration_minutes} min</span>
                    {et.credit_cost ? <span>💳 {et.credit_cost} credit{et.credit_cost !== 1 ? 's' : ''}</span> : <span style={{ color: '#16a34a' }}>✅ Free</span>}
                    <span>{BOOKING_MODES[et.booking_mode] ?? et.booking_mode}</span>
                  </div>
                </div>
                <button className="shop-btn shop-btn-primary shop-btn-sm">Book →</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingPage;
