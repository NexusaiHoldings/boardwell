'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createIntakeAndRfp, getCurrentUser } from '@/lib/hoa/rfp-generator';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

const AMENITY_OPTIONS = [
  { value: 'pool', label: 'Swimming Pool' },
  { value: 'clubhouse', label: 'Clubhouse / Community Center' },
  { value: 'gym', label: 'Fitness Center' },
  { value: 'tennis', label: 'Tennis / Pickleball Courts' },
  { value: 'playground', label: 'Playground' },
  { value: 'trails', label: 'Walking Trails / Paths' },
  { value: 'gated', label: 'Gated Entry / Security' },
  { value: 'parking', label: 'Shared Parking / Garage' },
  { value: 'landscaping', label: 'Common Area Landscaping' },
  { value: 'irrigation', label: 'Irrigation Systems' },
  { value: 'lake', label: 'Pond / Lake' },
  { value: 'dog_park', label: 'Dog Park' },
];

interface WizardData {
  communityName: string;
  unitCount: string;
  state: string;
  amenityMix: string[];
  budgetMin: string;
  budgetMax: string;
  painPoints: string;
  currentManagement: string;
}

const STEPS = [
  { num: 1, label: 'Community Info' },
  { num: 2, label: 'Amenities' },
  { num: 3, label: 'Budget' },
  { num: 4, label: 'Challenges' },
  { num: 5, label: 'Review' },
];

function ProgressRail({ currentStep }: { currentStep: number }) {
  return (
    <nav aria-label="Intake progress" style={{ marginBottom: '2rem' }}>
      <ol style={{ display: 'flex', gap: '0', listStyle: 'none', padding: 0, margin: 0 }}>
        {STEPS.map((step, idx) => {
          const done = currentStep > step.num;
          const active = currentStep === step.num;
          return (
            <li
              key={step.num}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}
            >
              {idx > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '14px',
                    left: '-50%',
                    right: '50%',
                    height: '2px',
                    background: done ? 'var(--substrate-accent, #2563eb)' : '#e2e8f0',
                  }}
                />
              )}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: done || active ? 'var(--substrate-accent, #2563eb)' : '#e2e8f0',
                  color: done || active ? '#fff' : '#64748b',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {done ? '✓' : step.num}
              </div>
              <span
                style={{
                  marginTop: '0.35rem',
                  fontSize: '0.7rem',
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--substrate-accent, #2563eb)' : '#64748b',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function SkeletonBlock({ height = 40 }: { height?: number }) {
  return (
    <div
      style={{
        height,
        borderRadius: 6,
        background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite',
        marginBottom: 12,
      }}
    />
  );
}

export default function IntakePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<WizardData>({
    communityName: '',
    unitCount: '',
    state: '',
    amenityMix: [],
    budgetMin: '',
    budgetMax: '',
    painPoints: '',
    currentManagement: '',
  });

  function updateField(field: keyof WizardData, value: string | string[]) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  function toggleAmenity(val: string) {
    setData((prev) => ({
      ...prev,
      amenityMix: prev.amenityMix.includes(val)
        ? prev.amenityMix.filter((a) => a !== val)
        : [...prev.amenityMix, val],
    }));
  }

  function validateStep(): string {
    if (step === 1) {
      if (!data.communityName.trim()) return 'Community name is required.';
      const units = parseInt(data.unitCount, 10);
      if (!data.unitCount || isNaN(units) || units < 1) return 'Please enter a valid unit count.';
      if (!data.state) return 'Please select your state.';
    }
    if (step === 3) {
      const min = parseInt(data.budgetMin, 10);
      const max = parseInt(data.budgetMax, 10);
      if (!data.budgetMin || isNaN(min) || min < 0) return 'Please enter a valid minimum budget.';
      if (!data.budgetMax || isNaN(max) || max < min) return 'Maximum budget must be greater than minimum budget.';
    }
    if (step === 4) {
      if (!data.painPoints.trim()) return 'Please describe your current management challenges.';
    }
    return '';
  }

  function handleNext() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep((s) => s + 1);
  }

  function handleBack() {
    setError('');
    setStep((s) => s - 1);
  }

  async function handleSubmit() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setSubmitting(true);

    startTransition(async () => {
      try {
        const user = await getCurrentUser();
        const rfpId = await createIntakeAndRfp({
          communityName: data.communityName.trim(),
          unitCount: parseInt(data.unitCount, 10),
          amenityMix: data.amenityMix,
          budgetRangeMin: parseInt(data.budgetMin, 10),
          budgetRangeMax: parseInt(data.budgetMax, 10),
          state: data.state,
          painPoints: data.painPoints.trim(),
          currentManagement: data.currentManagement.trim() || undefined,
          orgId: user.orgId,
          createdBy: user.userId,
        });
        router.push(`/rfps/${rfpId}`);
      } catch (ex) {
        setError('Something went wrong. Please try again.');
        setSubmitting(false);
      }
    });
  }

  const isLoading = submitting || isPending;

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .step-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 2rem 2.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          margin-bottom: 1.5rem;
        }
        .step-label {
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--substrate-accent, #2563eb);
          margin-bottom: 0.5rem;
        }
        .step-question {
          font-size: 1.4rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 0.5rem;
        }
        .step-hint {
          font-size: 0.9rem;
          color: #64748b;
          margin-bottom: 1.5rem;
        }
        .amenity-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 0.75rem;
        }
        .amenity-chip {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 0.9rem;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
          font-size: 0.875rem;
          user-select: none;
        }
        .amenity-chip.selected {
          border-color: var(--substrate-accent, #2563eb);
          background: #eff6ff;
          color: var(--substrate-accent, #2563eb);
          font-weight: 500;
        }
        .budget-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .field-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .field-group label {
          font-size: 0.85rem;
          font-weight: 500;
          color: #374151;
        }
        .nav-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }
        .error-msg {
          color: #dc2626;
          font-size: 0.875rem;
          margin-bottom: 0.75rem;
        }
        .review-row {
          display: flex;
          gap: 0.5rem;
          padding: 0.6rem 0;
          border-bottom: 1px solid #f1f5f9;
          font-size: 0.9rem;
        }
        .review-row:last-child { border-bottom: none; }
        .review-label { color: #64748b; min-width: 180px; flex-shrink: 0; }
        .review-value { color: #0f172a; font-weight: 500; }
      `}</style>

      <main>
        <h1>Start Your RFP</h1>
        <p>Answer a few questions about your community and we'll generate a professional, state-compliant RFP in minutes.</p>

        <ProgressRail currentStep={step} />

        {step === 1 && (
          <div className="step-card">
            <div className="step-label">Step 1 of 5</div>
            <h2 className="step-question">Tell us about your community</h2>
            <p className="step-hint">Basic info to personalize your RFP.</p>
            <div className="field-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="communityName">Community Name</label>
              <input
                id="communityName"
                type="text"
                placeholder="e.g. Lakewood Estates HOA"
                value={data.communityName}
                onChange={(e) => updateField('communityName', e.target.value)}
                autoFocus
              />
            </div>
            <div className="budget-row" style={{ marginBottom: '1rem' }}>
              <div className="field-group">
                <label htmlFor="unitCount">Number of Units / Homes</label>
                <input
                  id="unitCount"
                  type="number"
                  min="1"
                  placeholder="e.g. 250"
                  value={data.unitCount}
                  onChange={(e) => updateField('unitCount', e.target.value)}
                />
              </div>
              <div className="field-group">
                <label htmlFor="state">State</label>
                <select
                  id="state"
                  value={data.state}
                  onChange={(e) => updateField('state', e.target.value)}
                >
                  <option value="">— Select state —</option>
                  {US_STATES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>
            {error && <p className="error-msg">{error}</p>}
            <div className="nav-row">
              <span />
              <button onClick={handleNext}>Continue →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-card">
            <div className="step-label">Step 2 of 5</div>
            <h2 className="step-question">What amenities does your community have?</h2>
            <p className="step-hint">Select all that apply — this helps us scope services accurately.</p>
            <div className="amenity-grid">
              {AMENITY_OPTIONS.map((opt) => (
                <div
                  key={opt.value}
                  className={`amenity-chip${data.amenityMix.includes(opt.value) ? ' selected' : ''}`}
                  onClick={() => toggleAmenity(opt.value)}
                  role="checkbox"
                  aria-checked={data.amenityMix.includes(opt.value)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && toggleAmenity(opt.value)}
                >
                  <span>{data.amenityMix.includes(opt.value) ? '✓' : '○'}</span>
                  {opt.label}
                </div>
              ))}
            </div>
            {data.amenityMix.length === 0 && (
              <p className="muted" style={{ marginTop: '1rem' }}>No amenities selected — you can continue with basic common areas only.</p>
            )}
            {error && <p className="error-msg" style={{ marginTop: '1rem' }}>{error}</p>}
            <div className="nav-row" style={{ marginTop: '1.5rem' }}>
              <button className="btn secondary" onClick={handleBack}>← Back</button>
              <button onClick={handleNext}>Continue →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step-card">
            <div className="step-label">Step 3 of 5</div>
            <h2 className="step-question">What's your annual management budget range?</h2>
            <p className="step-hint">This helps management companies submit appropriately scoped proposals.</p>
            <div className="budget-row" style={{ marginBottom: '1.5rem' }}>
              <div className="field-group">
                <label htmlFor="budgetMin">Minimum ($/year)</label>
                <input
                  id="budgetMin"
                  type="number"
                  min="0"
                  placeholder="e.g. 60000"
                  value={data.budgetMin}
                  onChange={(e) => updateField('budgetMin', e.target.value)}
                  autoFocus
                />
              </div>
              <div className="field-group">
                <label htmlFor="budgetMax">Maximum ($/year)</label>
                <input
                  id="budgetMax"
                  type="number"
                  min="0"
                  placeholder="e.g. 90000"
                  value={data.budgetMax}
                  onChange={(e) => updateField('budgetMax', e.target.value)}
                />
              </div>
            </div>
            {data.budgetMin && data.budgetMax && !error && (
              <p className="muted">
                Range: ${parseInt(data.budgetMin || '0', 10).toLocaleString()} – ${parseInt(data.budgetMax || '0', 10).toLocaleString()} per year
              </p>
            )}
            {error && <p className="error-msg">{error}</p>}
            <div className="nav-row" style={{ marginTop: '1rem' }}>
              <button className="btn secondary" onClick={handleBack}>← Back</button>
              <button onClick={handleNext}>Continue →</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="step-card">
            <div className="step-label">Step 4 of 5</div>
            <h2 className="step-question">What are your biggest management pain points?</h2>
            <p className="step-hint">Be specific — this shapes how the RFP scopes vendor accountability.</p>
            <div className="field-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="painPoints">Current Challenges</label>
              <textarea
                id="painPoints"
                rows={5}
                placeholder="e.g. Slow vendor response times, unclear financial reporting, poor communication with residents, delinquent accounts piling up..."
                value={data.painPoints}
                onChange={(e) => updateField('painPoints', e.target.value)}
                style={{ resize: 'vertical' }}
                autoFocus
              />
            </div>
            <div className="field-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="currentManagement">Current Management Company (optional)</label>
              <input
                id="currentManagement"
                type="text"
                placeholder="Leave blank if self-managed"
                value={data.currentManagement}
                onChange={(e) => updateField('currentManagement', e.target.value)}
              />
            </div>
            {error && <p className="error-msg">{error}</p>}
            <div className="nav-row">
              <button className="btn secondary" onClick={handleBack}>← Back</button>
              <button onClick={handleNext}>Review →</button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="step-card">
            <div className="step-label">Step 5 of 5</div>
            <h2 className="step-question">Review your intake summary</h2>
            <p className="step-hint">Confirm the details below, then generate your RFP. AI generation typically takes 30–60 seconds.</p>

            <div style={{ marginBottom: '1.5rem' }}>
              <div className="review-row">
                <span className="review-label">Community Name</span>
                <span className="review-value">{data.communityName}</span>
              </div>
              <div className="review-row">
                <span className="review-label">Units</span>
                <span className="review-value">{data.unitCount}</span>
              </div>
              <div className="review-row">
                <span className="review-label">State</span>
                <span className="review-value">{data.state}</span>
              </div>
              <div className="review-row">
                <span className="review-label">Amenities</span>
                <span className="review-value">
                  {data.amenityMix.length > 0
                    ? AMENITY_OPTIONS.filter((o) => data.amenityMix.includes(o.value)).map((o) => o.label).join(', ')
                    : 'Standard common areas only'}
                </span>
              </div>
              <div className="review-row">
                <span className="review-label">Annual Budget Range</span>
                <span className="review-value">
                  ${parseInt(data.budgetMin, 10).toLocaleString()} – ${parseInt(data.budgetMax, 10).toLocaleString()}
                </span>
              </div>
              <div className="review-row">
                <span className="review-label">Pain Points</span>
                <span className="review-value">{data.painPoints}</span>
              </div>
              {data.currentManagement && (
                <div className="review-row">
                  <span className="review-label">Current Management</span>
                  <span className="review-value">{data.currentManagement}</span>
                </div>
              )}
            </div>

            {isLoading && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p className="muted" style={{ marginBottom: '0.75rem' }}>Creating your RFP…</p>
                <SkeletonBlock height={24} />
                <SkeletonBlock height={24} />
                <SkeletonBlock height={16} />
              </div>
            )}

            {error && <p className="error-msg">{error}</p>}

            <div className="nav-row">
              <button className="btn secondary" onClick={handleBack} disabled={isLoading}>← Edit</button>
              <button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? 'Generating…' : 'Generate RFP →'}
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
