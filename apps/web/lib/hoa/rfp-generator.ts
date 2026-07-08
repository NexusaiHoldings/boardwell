'use server';

import { Pool } from 'pg';
import { headers } from 'next/headers';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export interface IntakeData {
  unitCount: number;
  amenityMix: string[];
  budgetRangeMin: number;
  budgetRangeMax: number;
  state: string;
  painPoints: string;
  currentManagement?: string;
  communityName?: string;
  orgId: string;
  createdBy: string;
}

export interface RfpSection {
  id: string;
  rfp_id: string;
  section_key: string;
  title: string;
  content: string;
  sort_order: number;
  edited_by?: string;
  edited_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RfpRow {
  id: string;
  org_id: string;
  intake_id: string;
  created_by: string;
  title: string;
  status: string;
  community_name?: string;
  finalized_at?: string;
  created_at: string;
  updated_at: string;
  unit_count?: number;
  state?: string;
  budget_range_min?: number;
  budget_range_max?: number;
}

export interface RfpListItem {
  id: string;
  title: string;
  status: string;
  community_name?: string;
  created_at: string;
  finalized_at?: string;
  unit_count?: number;
  state?: string;
}

const CAM_LICENSE_REQUIREMENTS: Record<string, string> = {
  FL: 'Florida requires CAM (Community Association Manager) licensure under Chapter 468, Part VIII, Florida Statutes. All management companies must employ licensed CAMs for communities with 10+ units or annual budgets over $100,000. License verification must be provided with proposal submission.',
  CA: 'California requires HOA management companies to comply with the Davis-Stirling Common Interest Development Act. Property managers handling trust funds must hold a California Real Estate License. Certification from the Community Associations Institute (CAI) is strongly preferred.',
  TX: 'Texas does not require a specific CAM license, but managers must comply with Texas Property Code Chapter 209 for residential subdivisions. Proposing firms should hold CAI-recognized designations (CMCA, AMS, or PCAM) and demonstrate familiarity with Texas HOA statutes.',
  AZ: 'Arizona requires HOA managers to hold a Certified Manager of Community Associations (CMCA) designation or equivalent under ARS § 33-1806. The Community Manager license issued by the Arizona Department of Real Estate may be required depending on services provided.',
  NV: 'Nevada requires community managers to be licensed under NRS Chapter 116A. The Nevada Real Estate Division issues Community Manager licenses. All proposed management staff must hold current Nevada licensure prior to contract commencement.',
  GA: 'Georgia does not mandate state CAM licensure but strongly recommends CMCA or CAI-certified designations. Proposing firms must demonstrate compliance with Georgia Property Owner Association Act (O.C.G.A. § 44-3-220 et seq.).',
  NY: 'New York requires property managers who negotiate leases or manage properties for compensation to hold a Real Estate Broker license issued by the NY Department of State. Cooperative and condominium managers should also hold relevant CAI designations.',
  IL: 'Illinois requires community association managers to hold a valid license from the Illinois Department of Financial and Professional Regulation (IDFPR). The Illinois Community Association Manager Licensing and Disciplinary Act governs all management activities.',
  CO: 'Colorado does not require CAM licensure but managers must comply with the Colorado Common Interest Ownership Act (CCIOA). Proposing companies should hold CAI certifications and demonstrate experience with Colorado-specific HOA governance statutes.',
  WA: 'Washington State requires property managers to hold a Real Estate License under RCW 18.85. Management companies must comply with the Washington Uniform Common Interest Ownership Act (RCW 64.90).',
  FL_DEFAULT: '',
};

function getCamRequirements(state: string): string {
  const key = state.toUpperCase();
  return (
    CAM_LICENSE_REQUIREMENTS[key] ||
    `${state} does not have specific state-level CAM licensing requirements. Bidding companies should comply with all applicable local regulations, hold relevant CAI certifications (CMCA, AMS, or PCAM preferred), and demonstrate familiarity with ${state} community association statutes.`
  );
}

async function callGateway(prompt: string): Promise<string> {
  const baseUrl = process.env.AI_GATEWAY_URL || process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
  const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY || '';

  if (!apiKey) {
    return buildFallbackContent(prompt);
  }

  try {
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'gpt-5.4-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert HOA management consultant writing professional RFP documents. Be concise, clear, and use formal business language.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1200,
        temperature: 0.3,
      }),
    });

    if (!resp.ok) {
      return buildFallbackContent(prompt);
    }

    const data = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content ?? buildFallbackContent(prompt);
  } catch {
    return buildFallbackContent(prompt);
  }
}

function buildFallbackContent(prompt: string): string {
  if (prompt.includes('executive summary')) {
    return 'This Request for Proposals (RFP) is issued by the Board of Directors to solicit qualified proposals from professional community management companies. The selected firm will provide comprehensive management services tailored to our community\'s specific needs, operational requirements, and budget constraints. The board is committed to selecting a management partner that demonstrates excellence in financial stewardship, proactive maintenance coordination, and transparent resident communications.';
  }
  if (prompt.includes('community overview')) {
    return 'Our community is a planned residential development seeking professional management services to support board governance, financial operations, and daily community operations. The board currently manages operations with volunteer effort and seeks a professional partner to reduce administrative burden, improve vendor accountability, and enhance resident satisfaction. Detailed community statistics and current operational challenges are outlined in this RFP to ensure proposing firms can deliver accurately scoped and priced proposals.';
  }
  if (prompt.includes('scope of services')) {
    return '**Financial Management**\n- Monthly financial reporting with variance analysis\n- Annual budget preparation and board presentation\n- Accounts payable and receivable processing\n- Reserve fund management and coordination\n- Annual audit/review coordination\n\n**Maintenance Coordination**\n- Vendor procurement, supervision, and performance monitoring\n- Preventive maintenance scheduling\n- Emergency response coordination (24/7)\n- Capital improvement project oversight\n\n**Administrative Services**\n- Board meeting preparation and minute recording\n- Resident communication management\n- Homeowner inquiry and complaint resolution\n- Document management and record retention\n\n**Compliance Oversight**\n- CC&R and Rules enforcement\n- State and local regulatory compliance\n- Insurance coordination and renewal support';
  }
  if (prompt.includes('licensing')) {
    return 'All proposing management companies and assigned managers must hold current, valid state-required licenses and certifications. Proof of licensure must be included with the proposal submission. The board reserves the right to disqualify proposals that cannot demonstrate compliance with applicable licensing requirements.\n\n**Insurance Requirements**\n- General Liability: Minimum $2,000,000 per occurrence\n- Errors & Omissions: Minimum $1,000,000 per claim\n- Workers Compensation: Per state statutory limits\n- Fidelity Bond: Coverage equal to three months of association assessments\n\n**Professional Certifications (Preferred)**\n- Certified Manager of Community Associations (CMCA)\n- Association Management Specialist (AMS)\n- Professional Community Association Manager (PCAM)';
  }
  if (prompt.includes('financial')) {
    return '**Monthly Reporting Requirements**\n1. Balance sheet and income statement with year-to-date comparisons\n2. Budget variance report with explanations for variances over 10%\n3. Accounts receivable aging report with delinquency status\n4. Bank reconciliation statements for all association accounts\n5. Check register and approved disbursements detail\n\n**Annual Financial Cycle**\n1. Draft operating and reserve budget by October 1st each year\n2. Reserve study coordination every three years\n3. Annual audit or review coordination per board direction\n4. Year-end financial package within 60 days of fiscal year close\n\n**Banking and Controls**\n- All association funds held in FDIC-insured accounts\n- Dual-signature requirements for disbursements over board-approved threshold\n- Electronic payment acceptance for assessments\n- Separate operating and reserve accounts required';
  }
  if (prompt.includes('proposal submission')) {
    return '**Required Submission Documents**\n1. Company profile and organizational chart\n2. Statement of qualifications and relevant experience (minimum 5 HOA references)\n3. Proposed management team with resumes and license copies\n4. Detailed scope of services and service delivery methodology\n5. Technology platform overview and resident portal demonstration\n6. Proposed management fee schedule (base fee + itemized additional services)\n7. Transition plan and timeline\n8. Sample monthly financial report\n9. Current certificate of insurance\n10. Signed acknowledgment of RFP terms\n\n**Submission Format**\n- Electronic PDF submission preferred\n- Maximum proposal length: 50 pages excluding appendices\n- Proposals must remain valid for 90 days from submission deadline';
  }
  if (prompt.includes('evaluation criteria')) {
    return '**Scoring Rubric (100 Points Total)**\n\n| Criterion | Points | Description |\n|---|---|---|\n| Experience & References | 25 | Years in business, comparable portfolio size, reference quality |\n| Proposed Fee Structure | 20 | All-inclusive fee transparency, value for scope |\n| Service Scope & Methodology | 20 | Comprehensiveness, innovation, service delivery approach |\n| Technology Platform | 15 | Resident portal, board reporting tools, mobile access |\n| Transition Plan | 10 | Detailed timeline, risk mitigation, data migration |\n| Local Presence & Response | 10 | Local office, after-hours support, emergency response |\n\nFinalist firms will be invited for a 30-minute board presentation followed by Q&A. The board reserves the right to negotiate terms with the top-ranked proposer prior to contract execution.';
  }
  if (prompt.includes('timeline')) {
    return '**RFP Process Timeline**\n\n| Milestone | Date |\n|---|---|\n| RFP Released to Bidders | TBD |\n| Site Walk / Property Tour | TBD + 7 days |\n| Questions Deadline | TBD + 14 days |\n| Written Answers Distributed | TBD + 21 days |\n| Proposal Submission Deadline | TBD + 35 days |\n| Board Review Period | TBD + 35-49 days |\n| Finalist Presentations | TBD + 56 days |\n| Management Agreement Awarded | TBD + 70 days |\n| Transition Period Begins | TBD + 84 days |\n\n**Questions & Contact**\nAll questions regarding this RFP must be submitted in writing to the Board of Directors via email. Verbal inquiries will not be addressed. Questions and answers will be distributed to all registered proposers simultaneously to ensure a fair and competitive process.';
  }
  return 'Please provide detailed information addressing the specific requirements outlined in this section. Responses should be comprehensive and demonstrate your firm\'s relevant experience, qualifications, and proposed approach to serving our community.';
}

interface SectionSpec {
  key: string;
  title: string;
  prompt: string;
  order: number;
}

function buildSectionSpecs(intake: IntakeData): SectionSpec[] {
  const cam = getCamRequirements(intake.state);
  const amenities = intake.amenityMix.length > 0 ? intake.amenityMix.join(', ') : 'standard common areas';
  const budget = `$${intake.budgetRangeMin.toLocaleString()} – $${intake.budgetRangeMax.toLocaleString()} per year`;
  const community = intake.communityName || 'Our Community';

  return [
    {
      key: 'executive_summary',
      title: 'Executive Summary',
      order: 1,
      prompt: `Write a professional executive summary for an HOA management services RFP for "${community}". Details: ${intake.unitCount} units, located in ${intake.state}, amenities include ${amenities}, annual management budget ${budget}. Current board pain points: ${intake.painPoints}. Write 3–4 paragraphs in formal RFP language. Do not use bullet points in this section.`,
    },
    {
      key: 'community_overview',
      title: 'Community Overview',
      order: 2,
      prompt: `Write a community overview section for an HOA management RFP for "${community}". Include the community size (${intake.unitCount} units), state (${intake.state}), amenities (${amenities}), current management situation (${intake.currentManagement || 'self-managed'}), and why the board is issuing this RFP: ${intake.painPoints}. Format as 2–3 structured paragraphs.`,
    },
    {
      key: 'scope_of_services',
      title: 'Scope of Services',
      order: 3,
      prompt: `Write a detailed scope of services section for an HOA management RFP for a ${intake.unitCount}-unit community in ${intake.state} with these amenities: ${amenities}. Include financial management, maintenance coordination, vendor oversight, resident communications, board meeting support, and compliance. Group requirements into clearly labeled categories using bold headers and bullet points.`,
    },
    {
      key: 'licensing_requirements',
      title: 'Licensing & Compliance Requirements',
      order: 4,
      prompt: `Write a licensing and compliance requirements section for an HOA management RFP in ${intake.state}. Start with this specific state requirement: "${cam}". Then add standard requirements for liability insurance ($2M minimum), E&O coverage ($1M minimum), fidelity bond, workers comp, and professional certifications (CMCA, AMS, PCAM). Format professionally with clear subsections.`,
    },
    {
      key: 'financial_requirements',
      title: 'Financial Management Requirements',
      order: 5,
      prompt: `Write financial management requirements for an HOA management RFP. The community has ${intake.unitCount} units in ${intake.state} and an annual management budget of ${budget}. Include requirements for: monthly financial reporting, reserve fund management, accounts payable/receivable, annual budget preparation, audit coordination, and banking controls. Use numbered requirements within logical subsections.`,
    },
    {
      key: 'proposal_requirements',
      title: 'Proposal Submission Requirements',
      order: 6,
      prompt: `Write the proposal submission requirements section for an HOA management RFP for a ${intake.unitCount}-unit community in ${intake.state} with budget ${budget}. List required documents (company profile, references, team resumes, scope, pricing, transition plan, insurance certificates), format requirements, and submission instructions. Use a numbered list format.`,
    },
    {
      key: 'evaluation_criteria',
      title: 'Evaluation Criteria & Scoring',
      order: 7,
      prompt: `Write an evaluation criteria and scoring rubric for an HOA management RFP. The ${intake.unitCount}-unit community in ${intake.state} prioritizes these improvements: ${intake.painPoints}. Create a 100-point weighted rubric covering experience/references (25pts), fee structure (20pts), service scope (20pts), technology platform (15pts), transition plan (10pts), and local presence (10pts). Present as a markdown table followed by finalist process description.`,
    },
    {
      key: 'timeline',
      title: 'RFP Timeline & Process',
      order: 8,
      prompt: `Write an RFP timeline and process section for a ${intake.unitCount}-unit HOA management services RFP in ${intake.state}. Create a milestone table with TBD dates (RFP release, questions deadline, written answers, proposal deadline, board review, finalist presentations, award, transition start). Include a section on submitting questions in writing for fairness. Format as a markdown table followed by contact procedure.`,
    },
  ];
}

export async function getCurrentUser(): Promise<{ userId: string; orgId: string }> {
  try {
    const hdrs = headers();
    const userId = hdrs.get('x-user-id') ?? 'anonymous';
    const orgId = hdrs.get('x-org-id') ?? 'default-org';
    return { userId, orgId };
  } catch {
    return { userId: 'anonymous', orgId: 'default-org' };
  }
}

export async function createIntakeAndRfp(intake: IntakeData): Promise<string> {
  const { rows: intakeRows } = await pool.query<{ id: string }>(
    `INSERT INTO hoa_intake_questionnaires
       (org_id, created_by, unit_count, amenity_mix, budget_range_min,
        budget_range_max, state, pain_points, current_management)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      intake.orgId,
      intake.createdBy,
      intake.unitCount,
      intake.amenityMix,
      intake.budgetRangeMin,
      intake.budgetRangeMax,
      intake.state,
      intake.painPoints,
      intake.currentManagement ?? null,
    ]
  );

  const intakeId = intakeRows[0].id;
  const title = `${intake.communityName || 'Community'} — Management Services RFP`;

  const { rows: rfpRows } = await pool.query<{ id: string }>(
    `INSERT INTO hoa_rfps (org_id, intake_id, created_by, title, community_name, status)
     VALUES ($1, $2, $3, $4, $5, 'generating')
     RETURNING id`,
    [intake.orgId, intakeId, intake.createdBy, title, intake.communityName ?? null]
  );

  return rfpRows[0].id;
}

export async function triggerRfpGeneration(rfpId: string): Promise<void> {
  const { rows } = await pool.query<{
    status: string;
    unit_count: number;
    amenity_mix: string[];
    budget_range_min: number;
    budget_range_max: number;
    state: string;
    pain_points: string;
    current_management?: string;
    community_name?: string;
    org_id: string;
    created_by: string;
  }>(
    `SELECT r.status, r.community_name, r.org_id, r.created_by,
            q.unit_count, q.amenity_mix, q.budget_range_min, q.budget_range_max,
            q.state, q.pain_points, q.current_management
     FROM hoa_rfps r
     JOIN hoa_intake_questionnaires q ON q.id = r.intake_id
     WHERE r.id = $1`,
    [rfpId]
  );

  if (!rows[0] || rows[0].status !== 'generating') return;

  const row = rows[0];
  const intake: IntakeData = {
    unitCount: row.unit_count,
    amenityMix: row.amenity_mix ?? [],
    budgetRangeMin: row.budget_range_min,
    budgetRangeMax: row.budget_range_max,
    state: row.state,
    painPoints: row.pain_points,
    currentManagement: row.current_management,
    communityName: row.community_name,
    orgId: row.org_id,
    createdBy: row.created_by,
  };

  const specs = buildSectionSpecs(intake);

  for (const spec of specs) {
    const content = await callGateway(spec.prompt);
    await pool.query(
      `INSERT INTO hoa_rfp_sections (rfp_id, section_key, title, content, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (rfp_id, section_key) DO UPDATE
         SET content = EXCLUDED.content, updated_at = NOW()`,
      [rfpId, spec.key, spec.title, content, spec.order]
    );
  }

  await pool.query(
    `UPDATE hoa_rfps SET status = 'draft', updated_at = NOW() WHERE id = $1`,
    [rfpId]
  );
}

export async function getRfpWithSections(
  rfpId: string
): Promise<{ rfp: RfpRow; sections: RfpSection[] } | null> {
  const { rows: rfpRows } = await pool.query<RfpRow>(
    `SELECT r.id, r.org_id, r.intake_id, r.created_by, r.title, r.status,
            r.community_name, r.finalized_at::text AS finalized_at,
            r.created_at::text AS created_at, r.updated_at::text AS updated_at,
            q.unit_count, q.state, q.budget_range_min, q.budget_range_max
     FROM hoa_rfps r
     LEFT JOIN hoa_intake_questionnaires q ON q.id = r.intake_id
     WHERE r.id = $1`,
    [rfpId]
  );

  if (!rfpRows[0]) return null;

  const { rows: sectionRows } = await pool.query<RfpSection>(
    `SELECT id, rfp_id, section_key, title, content, sort_order,
            edited_by, edited_at::text AS edited_at,
            created_at::text AS created_at, updated_at::text AS updated_at
     FROM hoa_rfp_sections
     WHERE rfp_id = $1
     ORDER BY sort_order ASC`,
    [rfpId]
  );

  return { rfp: rfpRows[0], sections: sectionRows };
}

export async function updateRfpSection(
  rfpId: string,
  sectionKey: string,
  content: string,
  editedBy: string
): Promise<void> {
  await pool.query(
    `UPDATE hoa_rfp_sections
     SET content = $1, edited_by = $2, edited_at = NOW(), updated_at = NOW()
     WHERE rfp_id = $3 AND section_key = $4`,
    [content, editedBy, rfpId, sectionKey]
  );
}

export async function finalizeRfp(rfpId: string): Promise<void> {
  await pool.query(
    `UPDATE hoa_rfps
     SET status = 'finalized', finalized_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [rfpId]
  );
}

export async function listRfps(orgId: string): Promise<RfpListItem[]> {
  const { rows } = await pool.query<RfpListItem>(
    `SELECT r.id, r.title, r.status, r.community_name,
            r.created_at::text AS created_at,
            r.finalized_at::text AS finalized_at,
            q.unit_count, q.state
     FROM hoa_rfps r
     LEFT JOIN hoa_intake_questionnaires q ON q.id = r.intake_id
     WHERE r.org_id = $1
     ORDER BY r.created_at DESC`,
    [orgId]
  );
  return rows;
}
