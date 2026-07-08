'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  getInvitationForToken,
  trackInvitationOpened,
  submitBid,
  declineInvitation,
  TokenBidContext,
  BidSubmissionData,
} from '@/lib/hoa/invitations';

type SectionKey = 'company' | 'license' | 'insurance' | 'financial' | 'references';

const SECTIONS: Array<{ key: SectionKey; label: string; description: string }> = [
  { key: 'company', label: 'Company Info', description: 'Basic company credentials and experience' },
  { key: 'license', label: 'CAM License', description: 'Community association manager licensure' },
  { key: 'insurance', label: 'Insurance', description: 'Liability, E&O, and fidelity coverage' },
  { key: 'financial', label: 'Financial', description: 'Revenue, portfolio size, and fees' },
  { key: 'references', label: 'References', description: 'HOA client references (min. 1 required)' },
];

interface Reference {
  name: string;
  company: string;
  email: string;
  phone: string;
}

interface FormState {
  companyDescription: string;
  yearsInBusiness: string;
  camLicenseNumber: string;
  camLicenseState: string;
  camLicenseExpiry: string;
  generalLiabilityAmount: string;
  generalLiabilityExpiry: string;
  errorsOmissionsAmount: string;
  errorsOmissionsExpiry: string;
  fidelityBondAmount: string;
  insuranceCarrier: string;
  annualRevenue: string;
  portfolioUnitCount: string;
  managementFeeBase: string;
  managementFeeAdditional: string;
  references: Reference[];
  disclaimerAcknowledged: boolean;
}

const INITIAL_FORM: FormState = {
  companyDescription: '',
  yearsInBusiness: '',
  camLicenseNumber: '',
  camLicenseState: '',
  camLicenseExpiry: '',
  generalLiabilityAmount: '',
  generalLiabilityExpiry: '',
  errorsOmissionsAmount: '',
  errorsOmissionsExpiry: '',
  fidelityBondAmount: '',
  insuranceCarrier: '',
  annualRevenue: '',
  portfolioUnitCount: '',
  managementFeeBase: '',
  managementFeeAdditional: '',
  references: [{ name: '', company: '', email: '', phone: '' }],
  disclaimerAcknowledged: false,
};

function isSectionComplete(section: SectionKey, form: FormState): boolean {
  switch (section) {
    case 'company':
      return form.companyDescription.trim().length > 10 && form.yearsInBusiness.trim().length > 0;
    case 'license':
      return form.camLicenseNumber.trim().length > 0;
    case 'insurance':
      return form.generalLiabilityAmount.trim().length > 0 && form.insuranceCarrier.trim().length > 0;
    case 'financial':
      return form.managementFeeBase.trim().length > 0;
    case 'references':
      return form.references.some((r) => r.name.trim().length > 0 && r.email.trim().length > 0);
  }
}

function SectionNav({
  activeSection,
  form,
  onSelect,
}: {
  activeSection: SectionKey;
  form: FormState;
  onSelect: (s: SectionKey) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
      {SECTIONS.map((s, idx) => {
        const complete = isSectionComplete(s.key, form);
        const isActive = s.key === activeSection;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onSelect(s.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.85rem',
              borderRadius: 99,
              fontSize: '0.82rem',
              fontWeight: isActive ? 700 : 500,
              border: isActive ? '2px solid #1e40af' : '2px solid #e2e8f0',
              background: isActive ? '#dbeafe' : complete ? '#f0fdf4' : '#f8fafc',
              color: isActive ? '#1e40af' : complete ? '#065f46' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <span
              style={{
                width: '1.1rem',
                height: '1.1rem',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 700,
                background: complete ? '#059669' : '#cbd5e1',
                color: complete ? '#fff' : '#64748b',
                flexShrink: 0,
              }}
            >
              {complete ? '✓' : idx + 1}
            </span>
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

function CompanySection({ form, onChange }: { form: FormState; onChange: (patch: Partial<FormState>) => void }) {
  return (
    <div>
      <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.15rem' }}>Company Information</h2>
      <p className="muted" style={{ marginBottom: '1.25rem' }}>Provide an overview of your management company and experience.</p>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem' }}>
          Years in Business <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <input
          type="number"
          min="0"
          value={form.yearsInBusiness}
          onChange={(e) => onChange({ yearsInBusiness: e.target.value })}
          placeholder="e.g. 12"
          style={{ width: '140px' }}
        />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem' }}>
          Company Description <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <textarea
          value={form.companyDescription}
          onChange={(e) => onChange({ companyDescription: e.target.value })}
          rows={5}
          placeholder="Describe your company, services, geographic coverage, and why you are a strong fit for this community."
          style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box' }}
        />
      </div>
    </div>
  );
}

function LicenseSection({ form, onChange }: { form: FormState; onChange: (patch: Partial<FormState>) => void }) {
  return (
    <div>
      <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.15rem' }}>CAM License &amp; Credentials</h2>
      <p className="muted" style={{ marginBottom: '1.25rem' }}>
        Provide community association manager licensure information for the staff who will manage this community.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem' }}>
            CAM License Number <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            value={form.camLicenseNumber}
            onChange={(e) => onChange({ camLicenseNumber: e.target.value })}
            placeholder="e.g. CAM12345"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem' }}>
            License State
          </label>
          <input
            type="text"
            value={form.camLicenseState}
            onChange={(e) => onChange({ camLicenseState: e.target.value })}
            placeholder="e.g. FL"
            maxLength={2}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem' }}>
            License Expiry Date
          </label>
          <input
            type="date"
            value={form.camLicenseExpiry}
            onChange={(e) => onChange({ camLicenseExpiry: e.target.value })}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>
      </div>
      <div
        className="card"
        style={{ marginTop: '1.25rem', background: '#f8fafc', fontSize: '0.85rem', color: '#475569' }}
      >
        <strong>Note:</strong> The board may request copies of licenses and certifications during the review process. Ensure all information matches your official license records.
      </div>
    </div>
  );
}

function InsuranceSection({ form, onChange }: { form: FormState; onChange: (patch: Partial<FormState>) => void }) {
  return (
    <div>
      <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.15rem' }}>Insurance Certificates</h2>
      <p className="muted" style={{ marginBottom: '1.25rem' }}>
        Provide current insurance coverage details. Certificates of insurance will be required before contract execution.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem' }}>
            Insurance Carrier <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            value={form.insuranceCarrier}
            onChange={(e) => onChange({ insuranceCarrier: e.target.value })}
            placeholder="e.g. Travelers, Chubb"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem' }}>
            General Liability Amount <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            value={form.generalLiabilityAmount}
            onChange={(e) => onChange({ generalLiabilityAmount: e.target.value })}
            placeholder="e.g. $2,000,000"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem' }}>
            GL Policy Expiry
          </label>
          <input
            type="date"
            value={form.generalLiabilityExpiry}
            onChange={(e) => onChange({ generalLiabilityExpiry: e.target.value })}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem' }}>
            Errors &amp; Omissions Amount
          </label>
          <input
            type="text"
            value={form.errorsOmissionsAmount}
            onChange={(e) => onChange({ errorsOmissionsAmount: e.target.value })}
            placeholder="e.g. $1,000,000"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem' }}>
            E&amp;O Policy Expiry
          </label>
          <input
            type="date"
            value={form.errorsOmissionsExpiry}
            onChange={(e) => onChange({ errorsOmissionsExpiry: e.target.value })}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem' }}>
            Fidelity Bond Amount
          </label>
          <input
            type="text"
            value={form.fidelityBondAmount}
            onChange={(e) => onChange({ fidelityBondAmount: e.target.value })}
            placeholder="e.g. $500,000"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>
      </div>
    </div>
  );
}

function FinancialSection({ form, onChange }: { form: FormState; onChange: (patch: Partial<FormState>) => void }) {
  return (
    <div>
      <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.15rem' }}>Financial Information</h2>
      <p className="muted" style={{ marginBottom: '1.25rem' }}>
        Provide your proposed management fees and company financial profile to enable apples-to-apples comparison.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem' }}>
            Annual Company Revenue
          </label>
          <input
            type="text"
            value={form.annualRevenue}
            onChange={(e) => onChange({ annualRevenue: e.target.value })}
            placeholder="e.g. $5M–$10M"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem' }}>
            Total Portfolio Units Under Management
          </label>
          <input
            type="number"
            min="0"
            value={form.portfolioUnitCount}
            onChange={(e) => onChange({ portfolioUnitCount: e.target.value })}
            placeholder="e.g. 2500"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem' }}>
            Base Management Fee (monthly) <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            value={form.managementFeeBase}
            onChange={(e) => onChange({ managementFeeBase: e.target.value })}
            placeholder="e.g. $X/unit/month or flat $X/month"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem' }}>
            Additional / À la Carte Services &amp; Fees
          </label>
          <textarea
            value={form.managementFeeAdditional}
            onChange={(e) => onChange({ managementFeeAdditional: e.target.value })}
            rows={3}
            placeholder="List any additional fees not included in the base rate (e.g. after-hours calls, enforcement letters)."
            style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>
      </div>
    </div>
  );
}

function ReferencesSection({ form, onChange }: { form: FormState; onChange: (patch: Partial<FormState>) => void }) {
  function addReference() {
    onChange({ references: [...form.references, { name: '', company: '', email: '', phone: '' }] });
  }

  function removeReference(idx: number) {
    const updated = form.references.filter((_, i) => i !== idx);
    onChange({ references: updated.length > 0 ? updated : [{ name: '', company: '', email: '', phone: '' }] });
  }

  function updateReference(idx: number, patch: Partial<Reference>) {
    onChange({
      references: form.references.map((ref, i) => (i === idx ? { ...ref, ...patch } : ref)),
    });
  }

  return (
    <div>
      <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.15rem' }}>HOA References</h2>
      <p className="muted" style={{ marginBottom: '1.25rem' }}>
        Provide at least 1 reference from a current or recent HOA client. The board may contact references during evaluation.
      </p>
      {form.references.map((ref, idx) => (
        <div
          key={idx}
          className="card"
          style={{ marginBottom: '1rem', position: 'relative' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>Reference {idx + 1}</span>
            {form.references.length > 1 && (
              <button
                type="button"
                className="btn secondary"
                onClick={() => removeReference(idx)}
                style={{ fontSize: '0.78rem', padding: '0.2rem 0.6rem' }}
              >
                Remove
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.3rem' }}>
                Contact Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                value={ref.name}
                onChange={(e) => updateReference(idx, { name: e.target.value })}
                placeholder="Jane Smith"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.3rem' }}>
                Community / HOA Name
              </label>
              <input
                type="text"
                value={ref.company}
                onChange={(e) => updateReference(idx, { company: e.target.value })}
                placeholder="Oakwood Estates HOA"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.3rem' }}>
                Email <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="email"
                value={ref.email}
                onChange={(e) => updateReference(idx, { email: e.target.value })}
                placeholder="jsmith@oakwood.org"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.3rem' }}>
                Phone
              </label>
              <input
                type="tel"
                value={ref.phone}
                onChange={(e) => updateReference(idx, { phone: e.target.value })}
                placeholder="(555) 000-0000"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>
      ))}
      {form.references.length < 5 && (
        <button
          type="button"
          className="btn secondary"
          onClick={addReference}
          style={{ fontSize: '0.85rem' }}
        >
          + Add Reference
        </button>
      )}
    </div>
  );
}

export default function BidPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<TokenBidContext | null>(null);
  const [tokenError, setTokenError] = useState('');
  const [activeSection, setActiveSection] = useState<SectionKey>('company');
  const [submitted, setSubmitted] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  function patchForm(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  const load = useCallback(async () => {
    try {
      const ctx = await getInvitationForToken(token);
      if (!ctx) {
        setTokenError('This invitation link is invalid or has expired. Please contact the board for assistance.');
        setLoading(false);
        return;
      }
      setContext(ctx);
      if (ctx.invitation.status === 'submitted') setSubmitted(true);
      else if (ctx.invitation.status === 'declined') setDeclined(true);
      setLoading(false);
      await trackInvitationOpened(token);
    } catch {
      setTokenError('Failed to load invitation. Please try refreshing the page.');
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const completedCount = SECTIONS.filter((s) => isSectionComplete(s.key, form)).length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');
    if (!form.disclaimerAcknowledged) {
      setSubmitError('You must acknowledge the self-reported data disclaimer before submitting.');
      return;
    }

    const data: BidSubmissionData = {
      yearsInBusiness: form.yearsInBusiness ? parseInt(form.yearsInBusiness, 10) : null,
      companyDescription: form.companyDescription,
      camLicenseNumber: form.camLicenseNumber,
      camLicenseState: form.camLicenseState.toUpperCase(),
      camLicenseExpiry: form.camLicenseExpiry,
      generalLiabilityAmount: form.generalLiabilityAmount,
      generalLiabilityExpiry: form.generalLiabilityExpiry,
      errorsOmissionsAmount: form.errorsOmissionsAmount,
      errorsOmissionsExpiry: form.errorsOmissionsExpiry,
      fidelityBondAmount: form.fidelityBondAmount,
      insuranceCarrier: form.insuranceCarrier,
      annualRevenue: form.annualRevenue,
      portfolioUnitCount: form.portfolioUnitCount ? parseInt(form.portfolioUnitCount, 10) : null,
      managementFeeBase: form.managementFeeBase,
      managementFeeAdditional: form.managementFeeAdditional,
      references: form.references.filter((r) => r.name.trim().length > 0),
      selfReportedDisclaimerAcknowledged: form.disclaimerAcknowledged,
    };

    setSubmitting(true);
    const result = await submitBid(token, data);
    if (result.success) {
      setSubmitted(true);
    } else {
      setSubmitError(result.error ?? 'Submission failed. Please try again.');
    }
    setSubmitting(false);
  }

  async function handleDecline() {
    if (!window.confirm('Are you sure you want to decline this bid invitation? This action cannot be undone.')) return;
    const result = await declineInvitation(token);
    if (result.success) setDeclined(true);
    else setSubmitError(result.error ?? 'Failed to decline. Please try again.');
  }

  if (loading) {
    return (
      <main style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div style={{ height: 28, width: '55%', borderRadius: 6, background: '#e2e8f0', marginBottom: '0.75rem' }} />
        <div style={{ height: 16, width: '35%', borderRadius: 4, background: '#f1f5f9', marginBottom: '2rem' }} />
        <div className="card" style={{ height: '120px', background: '#f8fafc' }} />
      </main>
    );
  }

  if (tokenError) {
    return (
      <main style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div className="empty">
          <div style={{ fontSize: '3rem', lineHeight: 1, marginBottom: '1rem' }}>🔒</div>
          <h1 style={{ fontSize: '1.3rem' }}>Invalid Invitation Link</h1>
          <p style={{ color: '#64748b', maxWidth: '380px', margin: '0 auto' }}>{tokenError}</p>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div className="empty" style={{ background: '#f0fdf4', borderColor: '#86efac' }}>
          <div style={{ fontSize: '3rem', lineHeight: 1, marginBottom: '1rem' }}>✅</div>
          <h1 style={{ fontSize: '1.3rem', color: '#065f46' }}>Bid Submitted Successfully</h1>
          <p style={{ color: '#166534', maxWidth: '420px', margin: '0 auto' }}>
            Thank you, <strong>{context?.invitation.company_name}</strong>. Your bid for{' '}
            <strong>{context?.rfpTitle}</strong> has been received. The board will contact you during the review process.
          </p>
        </div>
      </main>
    );
  }

  if (declined) {
    return (
      <main style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div className="empty">
          <div style={{ fontSize: '3rem', lineHeight: 1, marginBottom: '1rem' }}>📋</div>
          <h1 style={{ fontSize: '1.3rem' }}>Invitation Declined</h1>
          <p style={{ color: '#64748b', maxWidth: '380px', margin: '0 auto' }}>
            You have declined the bid invitation for <strong>{context?.rfpTitle}</strong>. Thank you for your response.
          </p>
        </div>
      </main>
    );
  }

  const currentSectionDef = SECTIONS.find((s) => s.key === activeSection)!;
  const currentIdx = SECTIONS.findIndex((s) => s.key === activeSection);
  const prevSection = currentIdx > 0 ? SECTIONS[currentIdx - 1] : null;
  const nextSection = currentIdx < SECTIONS.length - 1 ? SECTIONS[currentIdx + 1] : null;

  return (
    <main style={{ maxWidth: '760px', margin: '0 auto' }}>
      <style>{`
        @media (max-width: 600px) {
          .bid-main { padding: 0 0.25rem; }
          .bid-nav-label { display: none; }
        }
      `}</style>

      <div className="bid-main">
        <div style={{ marginBottom: '0.5rem' }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.2rem 0.6rem',
              borderRadius: 99,
              background: '#dbeafe',
              color: '#1e40af',
            }}
          >
            Bid Submission Portal
          </span>
        </div>
        <h1 style={{ margin: '0.35rem 0 0.15rem', fontSize: '1.45rem' }}>{context?.rfpTitle}</h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
          {context?.communityName && `${context.communityName} · `}
          Submitting as <strong>{context?.invitation.company_name}</strong>
        </p>

        <div
          className="card"
          style={{ marginTop: '1.25rem', marginBottom: '1.25rem', background: '#f8fafc' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                Progress: {completedCount} of {SECTIONS.length} sections complete
              </span>
            </div>
            <div
              style={{
                flex: 1,
                maxWidth: '200px',
                height: '8px',
                borderRadius: '4px',
                background: '#e2e8f0',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${(completedCount / SECTIONS.length) * 100}%`,
                  background: completedCount === SECTIONS.length ? '#059669' : '#3b82f6',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>

        <SectionNav activeSection={activeSection} form={form} onSelect={setActiveSection} />

        <form onSubmit={handleSubmit}>
          <div className="card">
            {activeSection === 'company' && <CompanySection form={form} onChange={patchForm} />}
            {activeSection === 'license' && <LicenseSection form={form} onChange={patchForm} />}
            {activeSection === 'insurance' && <InsuranceSection form={form} onChange={patchForm} />}
            {activeSection === 'financial' && <FinancialSection form={form} onChange={patchForm} />}
            {activeSection === 'references' && <ReferencesSection form={form} onChange={patchForm} />}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', gap: '0.75rem' }}>
            <div>
              {prevSection && (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setActiveSection(prevSection.key)}
                  style={{ fontSize: '0.85rem' }}
                >
                  ← {prevSection.label}
                </button>
              )}
            </div>
            <div>
              {nextSection ? (
                <button
                  type="button"
                  onClick={() => setActiveSection(nextSection.key)}
                  style={{ fontSize: '0.85rem' }}
                >
                  {nextSection.label} →
                </button>
              ) : null}
            </div>
          </div>

          {activeSection === 'references' && (
            <div style={{ marginTop: '2rem' }}>
              <div
                className="card"
                style={{ background: '#fffbeb', border: '1px solid #fde68a', marginBottom: '1.25rem' }}
              >
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', color: '#92400e' }}>
                  Self-Reported Data Disclaimer
                </h3>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: '#78350f', lineHeight: 1.6 }}>
                  All information submitted in this bid form is self-reported. The board does not independently verify
                  the accuracy of credentials, license numbers, insurance coverage amounts, or references at this stage.
                  Misrepresentation of any submitted information may result in immediate disqualification. By submitting
                  this form, you attest that all information provided is accurate and complete to the best of your knowledge.
                </p>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: '#78350f' }}>
                  <input
                    type="checkbox"
                    checked={form.disclaimerAcknowledged}
                    onChange={(e) => patchForm({ disclaimerAcknowledged: e.target.checked })}
                    style={{ marginTop: '2px', flexShrink: 0 }}
                  />
                  I acknowledge this disclaimer and confirm all submitted information is accurate.
                </label>
              </div>

              {submitError && (
                <div
                  className="card"
                  style={{ background: '#fef2f2', border: '1px solid #fecaca', marginBottom: '1rem' }}
                >
                  <p style={{ margin: 0, color: '#991b1b', fontSize: '0.875rem' }}>⚠ {submitError}</p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={handleDecline}
                  style={{ fontSize: '0.85rem', color: '#64748b' }}
                >
                  Decline Invitation
                </button>
                <button
                  type="submit"
                  disabled={submitting || !form.disclaimerAcknowledged}
                  style={{
                    fontSize: '0.95rem',
                    padding: '0.65rem 2rem',
                    opacity: form.disclaimerAcknowledged ? 1 : 0.5,
                    cursor: form.disclaimerAcknowledged ? 'pointer' : 'not-allowed',
                  }}
                >
                  {submitting ? 'Submitting…' : 'Submit Bid'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
