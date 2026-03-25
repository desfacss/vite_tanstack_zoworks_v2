// src/modules/shop/components/product/FAQSection.tsx
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

interface FAQ {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  faqs?: FAQ[];
}

const FAQSection: React.FC<FAQSectionProps> = ({ faqs = [] }) => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  if (faqs.length === 0) {
    return (
      <div className="shop-empty" style={{ padding: '48px 0' }}>
        <div className="shop-empty-icon">❓</div>
        <h3>No FAQs yet</h3>
        <p>If you have a question, please contact our support.</p>
      </div>
    );
  }

  return (
    <div className="shop-faq-section" style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {faqs.map((faq, idx) => (
          <div 
            key={idx} 
            className="shop-faq-item"
            style={{ 
              border: '1px solid var(--shop-border)', 
              borderRadius: 12, 
              overflow: 'hidden',
              transition: 'all 0.2s'
            }}
          >
            <button
              onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                background: openIdx === idx ? 'var(--shop-bg-alt)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontWeight: 600,
                fontSize: 14,
                color: 'var(--shop-text)',
                gap: 12
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <HelpCircle size={16} color="var(--shop-primary)" />
                {faq.question}
              </span>
              {openIdx === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openIdx === idx && (
              <div 
                style={{ 
                  padding: '16px 20px 20px 46px', 
                  fontSize: 14, 
                  lineHeight: 1.6, 
                  color: 'var(--shop-muted)',
                  background: 'var(--shop-bg-alt)'
                }}
                className="shop-fade-in"
              >
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQSection;
