/**
 * Board document template library (product-flywheel-001 / Phase B canary).
 *
 * The template BODIES are repo-backed content (like the blog): they render
 * server-side for anonymous visitors with no DB dependency, which is what the
 * evidence pack demands — boards self-onboard from search and Reddit without
 * a sales rep, and the free-template library is the capture asset for boards
 * still under contract ("hold the management company accountable to the terms
 * of your contract" is their own language).
 *
 * Design sources:
 *  - customer_evidence_packs (boardwell): verbatim r/HOA language, the DIY
 *    committee→criteria→RFQ workflow, weighted criteria (experience ~50%,
 *    price ~30%, qualifications ~20%), $1M+ "additional insured" COI checks,
 *    reference checks against comparable HOAs, anonymized financials.
 *  - unified_plans.plan->product: state template library for FL/CA/TX/AZ/NV
 *    with statutory references and a click-through not-legal-advice
 *    acknowledgment before copy/download.
 *
 * Honesty note (CR-2): these documents are NOT badged "attorney approved" —
 * no attorney has reviewed them. They cite each state's community-association
 * statute at chapter level and tell the board to have their own attorney
 * review anything they intend to sign, which mirrors step 6 of the documented
 * buying process (attorney contract review).
 *
 * Placeholders are marked [LIKE THIS] and highlighted by the renderer.
 */

export type TemplateCategory = "hire" | "govern" | "operate";

export type LaunchState = "FL" | "CA" | "TX" | "AZ" | "NV" | "OR" | "WA";

export interface StateNote {
  state: LaunchState;
  note: string;
}

export interface TemplateSection {
  heading: string;
  /**
   * Plain-text body. Blocks are separated by blank lines; a block whose lines
   * all start with "- " renders as a bulleted list; single newlines inside a
   * block are preserved (signature blocks, address blocks).
   */
  body: string;
}

export interface TemplateDoc {
  slug: string;
  title: string;
  docType:
    | "Request for proposal"
    | "Contract"
    | "Letter"
    | "Notice"
    | "Call script"
    | "Minutes"
    | "Resolution";
  category: TemplateCategory;
  /** Card copy on the list page — front-loaded, concrete. */
  description: string;
  /** Detail-page context: the situation this document is written for. */
  whenToUse: string;
  /** Rough time to fill in the placeholders. */
  fillMinutes: number;
  stateNotes: StateNote[];
  sections: TemplateSection[];
}

export const CATEGORY_META: Record<
  TemplateCategory,
  { label: string; blurb: string }
> = {
  hire: {
    label: "Hire or replace your management company",
    blurb:
      "The five documents that take a board from “we need bids” to a signed agreement — and keep the manager accountable to it afterward.",
  },
  govern: {
    label: "Run the board",
    blurb:
      "Minutes, meeting notices, and resolutions in the form your governing documents and state statute expect.",
  },
  operate: {
    label: "Vendors and enforcement",
    blurb:
      "Contract vendors on the board's terms and enforce covenants with notices that hold up.",
  },
};

const STATUTE_BY_STATE: Record<LaunchState, string> = {
  FL: "Chapter 720, Florida Statutes (Homeowners' Associations)",
  CA: "Davis-Stirling Common Interest Development Act, California Civil Code §4000 et seq.",
  TX: "Texas Property Code Chapter 209 (Texas Residential Property Owners Protection Act)",
  AZ: "Arizona Revised Statutes Title 33, Chapter 16 (Planned Communities, §33-1801 et seq.)",
  NV: "Nevada Revised Statutes Chapter 116 (Common-Interest Ownership)",
  OR: "Oregon Planned Community Act, ORS 94.550–94.783",
  WA: "Washington Homeowners' Association Act, RCW Chapter 64.38",
};

export const STATE_LABELS: Record<LaunchState, string> = {
  FL: "Florida",
  CA: "California",
  TX: "Texas",
  AZ: "Arizona",
  NV: "Nevada",
  OR: "Oregon",
  WA: "Washington",
};

function allStatesNote(perState?: Partial<Record<LaunchState, string>>): StateNote[] {
  return (Object.keys(STATUTE_BY_STATE) as LaunchState[]).map((state) => ({
    state,
    note:
      (perState && perState[state]) ||
      `Governed by ${STATUTE_BY_STATE[state]}. Verify the current statutory text before relying on any deadline or notice requirement in this document.`,
  }));
}

export const TEMPLATE_LIBRARY: TemplateDoc[] = [
  // ------------------------------------------------------------------
  // CATEGORY: hire
  // ------------------------------------------------------------------
  {
    slug: "management-company-rfp",
    title: "Management Company Request for Proposal (RFP)",
    docType: "Request for proposal",
    category: "hire",
    description:
      "A complete RFP to send 3–5 management companies: community profile, scope of services, a 14-question vendor questionnaire, submission requirements (license, insurance, references, fees), and a weighted scoring rubric.",
    whenToUse:
      "Your board voted to solicit bids — at contract expiration, after repeated non-performance, or as a first move away from self-management. The r/HOA playbook is “form a committee to construct some criteria and questions, then send those out.” This document is that playbook, written out: send it to a shortlist of 3–5 companies and score the responses against the rubric in Section 6.",
    fillMinutes: 45,
    stateNotes: allStatesNote({
      FL: "Ask each bidder to confirm its community association managers hold active Florida CAM licenses (required under Part VIII of Chapter 468, Florida Statutes) and how many licensed CAMs would serve your account.",
      CA: "California does not license community association managers statewide; ask instead whether the assigned manager holds a CCAM, CMCA, or equivalent designation, and confirm familiarity with Davis-Stirling (Civil Code §4000 et seq.).",
      NV: "Nevada requires community managers to hold a certificate under NRS 116A. Ask each bidder for the certificate numbers of the managers who would serve your association.",
      OR: "Oregon does not license community association managers statewide. Ask whether the assigned manager holds a CMCA, PCAM, or equivalent professional designation, and confirm their familiarity with the Oregon Planned Community Act (ORS 94.550–94.783).",
      WA: "Washington does not license community association managers statewide. Ask whether the assigned manager holds a CMCA, PCAM, or equivalent designation, and confirm familiarity with the Washington Homeowners' Association Act (RCW Chapter 64.38).",
    }),
    sections: [
      {
        heading: "1. Introduction and community profile",
        body:
          "[ASSOCIATION NAME] (the “Association”), a [STATE] nonprofit corporation governing a community of [NUMBER] [homes/units] in [CITY, STATE], invites your proposal to provide community association management services.\n\nCommunity profile:\n\n- Community type: [single-family / townhome / condominium / mixed]\n- Number of units: [NUMBER]\n- Annual operating budget: $[AMOUNT]\n- Current reserve balance: $[AMOUNT]\n- Common areas and amenities: [POOL, CLUBHOUSE, GATES, PRIVATE ROADS, ETC.]\n- Current management arrangement: [self-managed / managed by COMPANY NAME since YEAR]\n- Reason for this solicitation: [contract expiration / service concerns / first-time engagement]\n\nProposals are due by [DATE] at [TIME] and should be sent to [BOARD CONTACT NAME] at [EMAIL]. The board expects to interview finalists during the week of [DATE] and to select a management company by [DATE].",
      },
      {
        heading: "2. Scope of services requested",
        body:
          "The Association seeks proposals covering the following services. Mark any item your company does not provide or provides only at additional cost.\n\n- Financial management: monthly financial statements, assessment collection, delinquency processing, annual budget preparation support, coordination of the annual audit or review, reserve study coordination\n- Administrative: board and annual meeting attendance ([NUMBER] meetings per year), minutes support, records custody, owner communications, escrow and resale documents\n- Maintenance coordination: routine common-area inspections ([FREQUENCY]), work-order intake and dispatch, competitive bidding for board approval on projects over $[THRESHOLD], vendor supervision\n- Compliance: covenant-violation inspections and notices as directed by the board, architectural-application intake and tracking\n- After-hours emergency response: 24/7 line with a documented escalation procedure",
      },
      {
        heading: "3. Required submission contents",
        body:
          "Each proposal must include all of the following. Incomplete proposals will be scored accordingly.\n\n- Company overview: years in business, number of associations under management, number of associations comparable to ours in size and type, staff-to-community ratio for the assigned portfolio manager\n- Manager licensing and credentials for every person who would be assigned to our account (see the state-specific note attached to this template)\n- Certificate of insurance showing general liability of at least $1,000,000 per occurrence, professional liability (errors and omissions), fidelity/crime coverage, and workers' compensation, with the Association named as additional insured on liability policies upon engagement\n- Three references from homeowner associations of comparable size that you currently manage, with board-member contact information — the board will call them\n- A complete fee schedule per Section 5\n- A sample management agreement, sample monthly financial packet, and, if available, anonymized financial records from a comparable association\n- Disclosure of any affiliated vendors, referral fees, commissions, or markups your company receives from third parties in connection with managed communities",
      },
      {
        heading: "4. Vendor questionnaire",
        body:
          "Answer each question in order, in writing.\n\n1. How are you different from other management companies?\n2. What do you charge for your services, and what is NOT included in the base fee?\n3. Who specifically would manage our account, how many other communities do they manage, and what happens when they are on leave or leave the company?\n4. What is your standard response time to a homeowner call or email, and how is it measured?\n5. Describe your after-hours emergency procedure, from the owner's call to resolution.\n6. What obligations do your representatives have if they observe the board violating the covenants or state laws?\n7. How do you handle competitive bidding for association projects? Do you accept any fee, commission, discount, or other benefit from vendors?\n8. Walk us through your monthly financial packet. When is it delivered each month?\n9. How do you pursue delinquent assessments, and at what point do you involve counsel?\n10. Describe your transition process for taking over from [self-management / an incumbent manager]: records, funds, vendor contracts, owner data, and timeline.\n11. What technology portal do owners and board members get, and is there a per-user or setup charge?\n12. Have you or any affiliate been party to litigation or a regulatory complaint brought by a managed association in the past five years? Describe the outcome.\n13. What are your insurance limits, and will you name the Association as additional insured?\n14. Why are you the right size for our community — not too big to care, not too small to cover?",
      },
      {
        heading: "5. Fee schedule requirements",
        body:
          "Present all fees in a single table so the board can compare bidders line by line:\n\n- Base monthly management fee, and what it includes\n- Per-unit or flat basis, and the escalation formula for renewal years\n- Startup or transition fee\n- Fees charged to the Association: extra meetings, mailings, inspections, project management percentage on capital work, termination fee\n- Fees charged directly to owners: resale/estoppel documents, late fees retained, payment-processing charges\n- Pass-through costs and the markup applied, if any\n\nThe board's evaluation compares the ALL-IN annual cost, not the base fee alone. A bid that hides cost in owner-paid fees will be scored as such.",
      },
      {
        heading: "6. Evaluation criteria and weighting",
        body:
          "The board will score each complete proposal 1–5 on each criterion, weighted as follows (adjust the weights to your board's priorities before sending):\n\n- Experience and demonstrated performance with comparable communities, including reference-call results — 50%\n- Price: all-in annual cost to the Association and its owners — 30%\n- Qualifications: licensing, credentials, insurance, staffing depth, transition plan — 20%\n\nThe two or three highest-scoring companies will be invited to interview with the board. The board selects the option the group agrees is the best overall — not necessarily the lowest bid.",
      },
      {
        heading: "7. Conditions",
        body:
          "This RFP is not an offer to contract. The Association may reject any or all proposals, waive irregularities, and negotiate final terms with any bidder. Proposals and reference contacts become part of the board's records. The selected company must execute a written management agreement approved by the Association's legal counsel before providing services.\n\nIssued by the Board of Directors of [ASSOCIATION NAME] on [DATE].\n[BOARD PRESIDENT NAME], President\n[CONTACT EMAIL] · [CONTACT PHONE]",
      },
    ],
  },
  {
    slug: "management-agreement",
    title: "HOA Management Agreement",
    docType: "Contract",
    category: "hire",
    description:
      "A full management agreement: manager duties, board authority reserved, an all-fees-disclosed compensation clause, $1M insurance with additional-insured status, records ownership, and termination with a 30-day cure right.",
    whenToUse:
      "You selected a management company and want to negotiate from a board-drafted baseline instead of signing the manager's own paper. Bring this draft and the winning proposal to your association's attorney — the attorney review is the step that makes it binding, and it is where boards catch the auto-renewal and fee-escalation terms that manager-drafted agreements bury.",
    fillMinutes: 60,
    stateNotes: allStatesNote({
      FL: "Florida CAM licensing (Chapter 468, Part VIII) applies to the Manager's personnel. Records obligations in Section 6 should track §720.303's official-records requirements.",
      CA: "Conform the records and financial-review obligations to Davis-Stirling (Civil Code §4000 et seq.), including owner inspection rights and the annual budget report.",
      TX: "Records production and owner requests should track Texas Property Code §209.005 (association records).",
      AZ: "Records inspection obligations should track A.R.S. §33-1805 (examination of association financial and other records).",
      NV: "The Manager must hold and maintain a community-manager certificate under NRS 116A; records obligations should track NRS 116.31175.",
      OR: "Records obligations should track ORS 94.650 (homeowners' right to inspect association records). The Manager must comply with the financial and governance requirements of the Oregon Planned Community Act (ORS 94.550–94.783).",
      WA: "Records obligations should track RCW 64.38.045 (owner right to inspect association records) and the financial-management requirements of the Washington Homeowners' Association Act (RCW Chapter 64.38).",
    }),
    sections: [
      {
        heading: "1. Parties and recitals",
        body:
          "This Management Agreement (the “Agreement”) is made as of [DATE] between [ASSOCIATION NAME], a [STATE] nonprofit corporation (the “Association”), and [MANAGEMENT COMPANY NAME], a [STATE] [ENTITY TYPE] (the “Manager”).\n\nThe Association is governed by a volunteer board of directors (the “Board”) and desires professional management services for the community known as [COMMUNITY NAME], consisting of [NUMBER] [homes/units] in [CITY, STATE]. The Manager represents that it is qualified, licensed where required, and insured to provide those services.",
      },
      {
        heading: "2. Term and renewal",
        body:
          "The initial term is [ONE (1) YEAR] beginning [START DATE]. This Agreement renews only by written amendment signed by both parties — it does not renew automatically. No renewal term may increase the management fee by more than [PERCENT]% without Board approval recorded in the minutes.\n\nDrafting note for the board: automatic multi-year renewal with unlimited fee escalation is the single most common trap in manager-drafted agreements. Strike it wherever it appears.",
      },
      {
        heading: "3. Manager's duties",
        body:
          "The Manager shall, at the direction of the Board:\n\n- Collect assessments, maintain the Association's operating and reserve accounts in the Association's name at a federally insured institution, and never commingle Association funds with the Manager's or any other client's funds\n- Deliver a monthly financial packet by the [15th] of the following month: balance sheet, income statement vs. budget, delinquency report, bank statements and reconciliations, and paid-invoice register\n- Prepare a draft annual budget for Board review at least [90] days before the fiscal year end, and support the annual audit or review\n- Inspect the common areas at least [FREQUENCY] and process work orders through completion\n- Solicit at least three competitive bids for any project expected to exceed $[THRESHOLD] and present them to the Board with a written comparison; the Board selects the vendor\n- Attend up to [NUMBER] Board meetings and the annual meeting each year, and support notice, agenda, and minutes preparation\n- Maintain the Association's official records and deliver them per Section 6\n- Issue covenant-violation notices in the form and sequence the Board adopts; the Manager does not set enforcement policy\n- Operate a 24/7 emergency line with the escalation procedure attached as Exhibit B",
      },
      {
        heading: "4. Authority reserved to the Board",
        body:
          "The Board makes the decisions, chooses the contractors, and negotiates the vendor contracts; the Manager executes the Board's directives. Without a written Board resolution, the Manager shall not:\n\n- Enter any contract binding the Association, other than routine services under $[THRESHOLD]\n- Initiate or settle litigation, or engage counsel\n- Spend outside the adopted budget except for a genuine emergency, capped at $[EMERGENCY CAP], with notice to the Board within 24 hours\n- Set, waive, or compromise any assessment, fine, or fee\n- Retain any subcontractor affiliated with the Manager",
      },
      {
        heading: "5. Compensation — all fees disclosed",
        body:
          "The Association shall pay the Manager $[AMOUNT] per month. Exhibit A lists every other fee the Manager may charge the Association or any owner (resale documents, mailings, extra meetings, project-management percentage). Any fee not listed in Exhibit A is waived.\n\nThe Manager shall not accept any commission, referral fee, discount, rebate, or other thing of value from any vendor, contractor, or insurer in connection with the Association. Any such benefit received shall be disclosed in writing and credited to the Association. Undisclosed vendor compensation is a material breach.",
      },
      {
        heading: "6. Records and data ownership",
        body:
          "All books, records, funds, owner data, correspondence, and electronic files relating to the Association are the Association's property. The Manager shall maintain them per [STATE] statute (see the state notes attached to this template), make them available to the Board within [5] business days of request, and deliver complete records — including accounting software exports in a usable format — within [14] days after termination, without charge and regardless of any dispute.",
      },
      {
        heading: "7. Insurance and indemnification",
        body:
          "Throughout the term the Manager shall carry, with insurers rated A- or better:\n\n- Commercial general liability: at least $1,000,000 per occurrence / $2,000,000 aggregate, naming the Association as additional insured\n- Professional liability (errors and omissions): at least $1,000,000 per claim\n- Fidelity/crime coverage covering the Manager's personnel handling Association funds: at least the greater of $[AMOUNT] or three months' assessments plus reserves\n- Workers' compensation as required by law\n\nThe Manager shall deliver certificates of insurance before the start date and at each renewal, and shall give the Association [30] days' written notice of cancellation or material reduction. Each party indemnifies the other against losses arising from its own negligence or willful misconduct; the Manager's indemnity is not limited by its fee.",
      },
      {
        heading: "8. Standard of care and compliance",
        body:
          "The Manager shall perform with the care, skill, and diligence of a professional community association manager, in compliance with the Association's governing documents and with [STATE STATUTE — SEE STATE NOTES]. The Manager shall promptly notify the Board in writing of any observed condition it reasonably believes violates law, the governing documents, or this Agreement.",
      },
      {
        heading: "9. Termination",
        body:
          "For cause: if the Manager materially breaches and fails to cure within [30] days of written notice describing the breach, the Association may terminate immediately upon a second written notice. Misappropriation of funds, loss of required license, or undisclosed vendor compensation permit immediate termination without a cure period.\n\nWithout cause: either party may terminate on [60] days' written notice. No termination fee applies beyond fees earned through the effective date.\n\nOn any termination, the Manager shall cooperate in an orderly transition: records delivery per Section 6, transfer of funds within [7] days, surrender of keys, credentials, and access codes, and a final accounting within [30] days.",
      },
      {
        heading: "10. General provisions and signatures",
        body:
          "This Agreement is the entire agreement and may be amended only in a writing signed by both parties. It is governed by the laws of [STATE]; venue lies in [COUNTY], [STATE]. The Manager is an independent contractor. Neither party may assign without the other's written consent. If any provision is unenforceable, the remainder stands.\n\nASSOCIATION: [ASSOCIATION NAME]\nBy: ____________________ Date: ________\n[NAME], President, Board of Directors\n\nMANAGER: [MANAGEMENT COMPANY NAME]\nBy: ____________________ Date: ________\n[NAME], [TITLE]",
      },
    ],
  },
  {
    slug: "management-termination-notice",
    title: "Management Agreement Termination Notice",
    docType: "Letter",
    category: "hire",
    description:
      "Formal notice ending a management contract — for cause or at term — with a transition checklist: records within 14 days, funds within 7, keys and credentials, and a final accounting deadline.",
    whenToUse:
      "The board has voted to end the management relationship, either at the contract's natural end or after a failed cure period. Send it exactly as your agreement's notice clause requires (method and address matter), and start the transition checklist the same day — the records handover is where departing managers stall.",
    fillMinutes: 20,
    stateNotes: allStatesNote(),
    sections: [
      {
        heading: "Notice of termination",
        body:
          "[DATE]\n\nVia [CERTIFIED MAIL / EMAIL PER CONTRACT NOTICE CLAUSE]\n[MANAGEMENT COMPANY NAME]\nAttn: [PRINCIPAL / ACCOUNT EXECUTIVE NAME]\n[ADDRESS]\n\nRe: Termination of Management Agreement dated [AGREEMENT DATE] — [ASSOCIATION NAME]\n\nDear [NAME]:\n\nBy resolution adopted on [BOARD VOTE DATE], the Board of Directors of [ASSOCIATION NAME] terminates the Management Agreement dated [AGREEMENT DATE] [pursuant to Section [X] (termination without cause), effective [EFFECTIVE DATE], being not less than the [60] days' notice the Agreement requires / pursuant to Section [X] (termination for cause), effective [EFFECTIVE DATE], the cure period having expired without cure as described in our notice of [CURE NOTICE DATE]].",
      },
      {
        heading: "Transition requirements",
        body:
          "Per Section [X] of the Agreement, complete the following by the dates shown:\n\n- Within [7] days: transfer all Association funds, including operating and reserve balances, to [RECEIVING INSTITUTION AND ACCOUNT], and stop all further disbursements except those the Board approves in writing\n- Within [14] days: deliver all Association records — governing documents, owner ledgers and contact data, contracts, insurance policies, bank statements, invoices, correspondence, meeting records, and accounting software exports in a usable electronic format\n- On or before the effective date: surrender all keys, fobs, gate and alarm codes, portal administrator credentials, and any Association property\n- Within [30] days: deliver a final accounting through the effective date, including uncashed checks, pending invoices, and open work orders with status\n\nDirect all transition communications to [TRANSITION CONTACT NAME], [TITLE], at [EMAIL] / [PHONE]. Please confirm receipt of this notice and your transition point of contact within [5] business days.",
      },
      {
        heading: "Closing",
        body:
          "Assessments and owner payments received after the effective date must be forwarded to the Association within [5] business days of receipt. The Association reserves all rights and remedies under the Agreement and applicable law, including with respect to obligations that survive termination.\n\nSincerely,\n\n____________________\n[NAME], President, Board of Directors\n[ASSOCIATION NAME]\ncc: Association counsel; Board of Directors",
      },
    ],
  },
  {
    slug: "management-performance-letter",
    title: "Contract Accountability Letter (Notice to Cure)",
    docType: "Letter",
    category: "hire",
    description:
      "Hold your management company accountable to the terms of your contract: cites the exact contract sections breached, documents each failure with dates, and starts the formal 30-day cure clock.",
    whenToUse:
      "Service has slipped — late financials, ignored work orders, missed inspections — but the board isn't ready to terminate. This letter converts complaints into a documented breach record: specific contract sections, specific dates, a specific cure deadline. If performance recovers, you have a paper trail for renewal negotiations. If it doesn't, you have the for-cause termination predicate. Don't end up on autopilot: date-stamp every failure as it happens.",
    fillMinutes: 30,
    stateNotes: allStatesNote(),
    sections: [
      {
        heading: "Notice of non-performance and demand to cure",
        body:
          "[DATE]\n\nVia [CERTIFIED MAIL / EMAIL PER CONTRACT NOTICE CLAUSE]\n[MANAGEMENT COMPANY NAME]\nAttn: [PRINCIPAL NAME]\n[ADDRESS]\n\nRe: Management Agreement dated [AGREEMENT DATE] — Notice of material non-performance and demand to cure\n\nDear [NAME]:\n\nThe Board of Directors of [ASSOCIATION NAME] provides formal notice that [MANAGEMENT COMPANY NAME] is in material breach of the Management Agreement dated [AGREEMENT DATE]. This letter is the written notice contemplated by Section [X] (termination for cause) and starts the [30]-day cure period.",
      },
      {
        heading: "Documented failures",
        body:
          "1. Late or missing financial reporting — Section [X] requires the monthly financial packet by the [15th]. The packets for [MONTH], [MONTH], and [MONTH] were delivered [N], [N], and [N] days late [/ have not been delivered]. Board requests for the [MONTH] bank reconciliation on [DATE] and [DATE] went unanswered.\n\n2. Work-order failures — Section [X] requires [work-order processing / response within N days]. Work order [NUMBER] ([DESCRIPTION]), opened [DATE], remains unresolved after [N] days. Work order [NUMBER] ([DESCRIPTION]) was closed on [DATE] without the work being performed.\n\n3. Missed inspections — Section [X] requires common-area inspections [FREQUENCY]. No inspection report has been received since [DATE].\n\n4. [ADDITIONAL BREACH — cite the section, describe the failure, and give dates. Delete if not needed.]\n\nRecords of each item — emails, work-order logs, and delivery timestamps — are retained in the Association's files and are available on request.",
      },
      {
        heading: "Cure demanded",
        body:
          "Within [30] days of this notice, the Association requires:\n\n- Delivery of all outstanding financial packets and reconciliations through [MONTH]\n- Completion or a Board-approved written plan and date for each open work order listed above\n- Resumption of [FREQUENCY] inspections, with the first report due by [DATE]\n- A written statement of the specific operational changes — staffing, escalation, oversight — your company is making so these failures do not recur\n\nIf these items are not cured within the period, the Board will exercise its remedies under Section [X], including termination for cause, without further notice period. The Association reserves all rights and remedies. We would prefer the relationship succeed — that outcome is in your hands.\n\nSincerely,\n\n____________________\n[NAME], President, Board of Directors\n[ASSOCIATION NAME]\ncc: Board of Directors; Association counsel",
      },
    ],
  },
  {
    slug: "reference-check-script",
    title: "Management Company Reference Check Script",
    docType: "Call script",
    category: "hire",
    description:
      "A 12-question phone script for calling the HOAs a bidder already manages — with what-to-listen-for notes and a 1–5 scoring line that feeds straight into your RFP rubric.",
    whenToUse:
      "You have proposals in hand and each finalist gave you three references. Ask for references from HOAs they manage and actually follow up — most boards skip the calls, and the calls are where the marketing falls away. Fifteen minutes per call, two callers per reference so notes can be compared. Ask every reference the same questions so the scores are comparable.",
    fillMinutes: 15,
    stateNotes: allStatesNote(),
    sections: [
      {
        heading: "Before you dial",
        body:
          "- Confirm the reference is a current or recent BOARD MEMBER, not an employee of the management company\n- Note the reference community's size and type; a 40-unit townhome community's experience may not transfer to a 400-home master association\n- Have the bidder's proposal open so you can test claims against lived experience\n- Log for each call: reference name, community, units, caller, date",
      },
      {
        heading: "The 12 questions",
        body:
          "1. How long has [COMPANY] managed your community, and how does your community compare to ours in size and type?\n(Listen for: tenure under two years tells you little; a mismatch in community type weakens the reference.)\n\n2. Who is your assigned manager, and how many managers have you had in that time?\n(Listen for: turnover — more than one change per two years means you will be retraining your manager, not the reverse.)\n\n3. When a homeowner emails a routine question, how long until they get a real answer?\n(Listen for: a number. “Pretty responsive” is not a number.)\n\n4. Tell me about the last after-hours emergency. What happened, and how did the company perform?\n\n5. Are your monthly financials on time and accurate? Have you ever found an error — and if so, how was it handled?\n\n6. Has the company ever surprised you with a fee you didn't expect? What was it?\n\n7. When you need bids for a project, do you feel you get genuinely competitive options, or the same familiar vendors every time?\n(Listen for: hesitation — affiliated-vendor steering is the quiet cost center of bad management.)\n\n8. How does the company handle covenant enforcement — consistent and documented, or reactive?\n\n9. What is one thing you wish the company did better?\n(Everyone has one. A reference who claims none was coached.)\n\n10. Has your board ever considered leaving? What kept you — or what brought you back?\n\n11. If you moved to a new community tomorrow, would you hire this company again — yes or no?\n\n12. Is there anything I should have asked that I didn't?",
      },
      {
        heading: "Scoring",
        body:
          "Immediately after the call, before comparing notes, each caller scores the reference 1–5:\n\n- 5 — unprompted enthusiasm, specific examples, an unhesitating “yes” on question 11\n- 3 — satisfied but generic; no specifics either way\n- 1 — hedged answers, surprise fees, manager turnover, or a “no” on question 11\n\nAverage the reference scores into the Experience component of your RFP evaluation rubric (see the Management Company RFP template, Section 6). One weak reference is a data point; two is a pattern.",
      },
    ],
  },

  // ------------------------------------------------------------------
  // CATEGORY: govern
  // ------------------------------------------------------------------
  {
    slug: "board-meeting-minutes",
    title: "Board Meeting Minutes",
    docType: "Minutes",
    category: "govern",
    description:
      "A complete minutes form: quorum, motions with exact vote counts, financial-report figures, executive-session handling, and the certification line — the record that protects the board when decisions are questioned.",
    whenToUse:
      "Every board meeting. Minutes are the association's legal memory: when an owner disputes a decision two years later, the minutes are what the board — and a court — look at. Record actions and vote counts, not debate transcripts. Keep discussion summaries to one or two sentences; motions verbatim.",
    fillMinutes: 25,
    stateNotes: allStatesNote({
      FL: "§720.303, Florida Statutes: minutes are official records and must be maintained; owners are entitled to inspect them. Record votes of each director present on each matter.",
      CA: "Civil Code §4950 (Davis-Stirling): minutes, or a draft, must be available to members within 30 days of the meeting; executive-session matters are noted only generally in the open minutes.",
      TX: "Texas Property Code Chapter 209 addresses open board meetings for certain associations; record the statutory basis for any closed/executive session.",
      AZ: "A.R.S. §33-1804: board meetings are generally open to members; minutes should note that the open-meeting requirements were met and the basis for any closed session.",
      NV: "NRS 116.31083: minutes must be made available to unit owners; note the statutory basis for any executive session.",
      OR: "ORS 94.640: board meetings of planned communities are generally open to homeowners. Minutes should note compliance with open-meeting requirements and record the statutory basis for any executive session.",
      WA: "RCW 64.38.035: board meetings are generally open to homeowners. Minutes must be retained and made available; note the statutory basis for any executive or closed session.",
    }),
    sections: [
      {
        heading: "Header, call to order, and quorum",
        body:
          "MINUTES OF THE BOARD OF DIRECTORS MEETING\n[ASSOCIATION NAME]\n[MEETING TYPE: Regular / Special / Emergency] Meeting\nDate: [DATE]  ·  Time: [TIME]  ·  Location: [ADDRESS / VIRTUAL PLATFORM]\nNotice: posted/delivered on [DATE] in accordance with the governing documents and applicable statute\n\nDirectors present: [NAMES AND OFFICES]\nDirectors absent: [NAMES]\nAlso present: [MANAGER NAME, COMPANY / COUNSEL / GUESTS]\nOwners present: [NUMBER]\n\nThe meeting was called to order at [TIME] by [NAME], [OFFICE]. With [NUMBER] of [TOTAL] directors present, a quorum was established.",
      },
      {
        heading: "Approval of prior minutes and financial report",
        body:
          "Prior minutes: Motion by [NAME], seconded by [NAME], to approve the minutes of the [DATE] meeting [as presented / as amended: DESCRIBE AMENDMENT]. Motion carried [X–X] [/ unanimously].\n\nFinancial report as of [MONTH-END DATE], presented by [TREASURER / MANAGER]:\n\n- Operating account balance: $[AMOUNT]\n- Reserve account balance: $[AMOUNT]\n- Year-to-date operating result vs. budget: [$ AMOUNT over/under]\n- Delinquencies: [NUMBER] accounts totaling $[AMOUNT]\n\nMotion by [NAME], seconded by [NAME], to accept the financial report subject to audit. Motion carried [X–X].",
      },
      {
        heading: "Reports, old business, new business",
        body:
          "Manager's report: [ONE- TO THREE-SENTENCE SUMMARY: work orders opened/closed, inspections completed, violations issued, projects in progress].\n\nCommittee reports: [COMMITTEE NAME] — [ONE-SENTENCE SUMMARY].\n\nOld business:\n[ITEM 1 — brief status. If action taken, record the motion:] Motion by [NAME], seconded by [NAME], to [EXACT ACTION, including amount and vendor if spending]. Motion carried [X–X].\n\nNew business:\n[ITEM 1 — one-sentence background.] Motion by [NAME], seconded by [NAME], to [EXACT ACTION — e.g., “accept the proposal of [VENDOR] dated [DATE] for [SCOPE] in the amount of $[AMOUNT], funded from [operating/reserves]”]. Discussion: [ONE SENTENCE IF MATERIAL]. Motion carried [X–X, with NAMES voting against/abstaining].\n\nOwner forum: [NUMBER] owners addressed the board regarding [TOPICS]. No board action taken during the forum.",
      },
      {
        heading: "Executive session, adjournment, certification",
        body:
          "Executive session: The board [did not meet in executive session / met in executive session from [TIME] to [TIME] to discuss [PERMITTED TOPIC — e.g., delinquencies, litigation, personnel], as permitted by [GOVERNING DOCUMENTS / STATE STATUTE]. Any formal action arising from executive session was taken in open session and is recorded above.]\n\nNext meeting: [DATE, TIME, LOCATION].\n\nThere being no further business, the meeting was adjourned at [TIME].\n\nRespectfully submitted,\n____________________\n[NAME], Secretary\nApproved by the Board on [DATE].",
      },
    ],
  },
  {
    slug: "annual-meeting-notice",
    title: "Annual Meeting Notice",
    docType: "Notice",
    category: "govern",
    description:
      "The member-wide annual meeting notice: agenda, director-election details, proxy instructions, quorum statement, and a state-notes block for each launch state's notice-window statute.",
    whenToUse:
      "Send to every member ahead of the annual meeting, within the notice window your bylaws and state statute require — the notice window is the detail that invalidates elections when boards get it wrong, so check the state note below and your bylaws before setting the date. Pair it with the proxy form your governing documents prescribe.",
    fillMinutes: 20,
    stateNotes: allStatesNote({
      FL: "§720.306, Florida Statutes governs member meetings and notice (including a 14-day mailed/delivered notice rule for annual meetings) and election procedures. Verify current text and your bylaws before mailing.",
      CA: "Davis-Stirling: general notice of member meetings is governed by Civil Code §5000-series provisions, and director elections require the secret-ballot procedures of Civil Code §5100 et seq., with ballots mailed at least 30 days before the deadline. Election timing drives the whole calendar — work backward from it.",
      TX: "Texas Property Code §209.014 requires an annual meeting of members; §209.0056 sets election-notice timing for certain associations. Verify both against your bylaws.",
      AZ: "A.R.S. §33-1804 addresses member meeting notice for planned communities. Verify the current minimum notice days against your bylaws and use the longer period.",
      NV: "NRS 116.3108 governs unit-owner meetings and notice content, including agenda requirements. Nevada's agenda rules limit action on items not listed — make the agenda complete.",
      OR: "ORS 94.624 governs annual member meetings and notice for planned communities. Verify the current minimum notice period against your bylaws and use the longer period.",
      WA: "RCW 64.38.025 governs homeowner association member meetings and notice requirements. Verify the current minimum notice days and any election procedures specified in your governing documents.",
    }),
    sections: [
      {
        heading: "Notice of annual meeting",
        body:
          "NOTICE OF ANNUAL MEETING OF THE MEMBERS\n[ASSOCIATION NAME]\n\nTo all members of [ASSOCIATION NAME]:\n\nThe annual meeting of the members will be held:\n\nDate: [DAY OF WEEK], [DATE]\nTime: [TIME] — registration and proxy check-in open at [TIME]\nLocation: [ADDRESS / ROOM] [and by video at [LINK], if your governing documents permit remote attendance]\nRecord date: members of record as of [DATE] are entitled to notice and to vote.\n\nThis notice is given on [MAILING/POSTING DATE] in accordance with the Association's bylaws and applicable state statute.",
      },
      {
        heading: "Agenda",
        body:
          "1. Call to order and certification of quorum\n2. Proof of notice of meeting\n3. Approval of the minutes of the [DATE] annual meeting\n4. President's report on the year: [ONE-LINE HIGHLIGHTS — e.g., completed projects, reserve funding]\n5. Treasurer's report and presentation of the [YEAR] budget\n6. Election of [NUMBER] directors, each for a [LENGTH]-year term (candidates and procedure below)\n7. Announcement of election results\n8. Member open forum\n9. Adjournment\n\n[NEVADA AND OTHER AGENDA-RULE STATES: the members may not take action on any item not listed on this agenda. Add all action items before mailing.]",
      },
      {
        heading: "Director election",
        body:
          "[NUMBER] seats are open. Candidates who submitted timely notice of candidacy:\n\n- [CANDIDATE NAME] — [ONE-LINE STATEMENT, OPTIONAL]\n- [CANDIDATE NAME] — [ONE-LINE STATEMENT, OPTIONAL]\n- [ADD OR DELETE LINES AS NEEDED]\n\n[Nominations from the floor will / will not] be accepted, per the bylaws. Voting is by [written ballot / secret ballot administered per state statute]. Each [lot/unit] carries [NUMBER] vote(s). Members with unpaid assessments [may / may not] vote, per the governing documents and applicable law.",
      },
      {
        heading: "Quorum and proxies",
        body:
          "Quorum requires [PERCENT]% of the total voting interests ([NUMBER] of [TOTAL] [lots/units]) present in person or by proxy. If quorum is not reached, the meeting will be [adjourned and reconvened on [DATE] per the bylaws].\n\nIf you cannot attend, PLEASE RETURN THE ENCLOSED PROXY — quorum failures cost the Association a second mailing and delay the election. Return it to [NAME/ADDRESS/EMAIL] by [DATE, TIME]. You may revoke your proxy by attending in person.\n\nQuestions: contact [NAME] at [EMAIL] / [PHONE].\n\nBy order of the Board of Directors,\n____________________\n[NAME], Secretary · [DATE]",
      },
    ],
  },
  {
    slug: "budget-resolution",
    title: "Board Resolution Adopting the Annual Budget",
    docType: "Resolution",
    category: "govern",
    description:
      "The formal resolution that makes the budget official: whereas clauses, adopted totals, the new assessment amount and due dates, reserve funding, and the member-notice directive with a vote record.",
    whenToUse:
      "Adopt at the board meeting where the annual budget is approved, and attach the budget as Exhibit A. The resolution — not the spreadsheet — is what fixes the assessment amount, so owners' obligations trace to a recorded vote. Several states regulate assessment increases and member notice; check the state note before setting the new rate.",
    fillMinutes: 20,
    stateNotes: allStatesNote({
      FL: "§720.303(6), Florida Statutes addresses annual budgets and reserve accounting for HOAs. If the budget changes reserve funding, follow the statutory member-approval rules.",
      CA: "Davis-Stirling caps board-imposed regular-assessment increases (Civil Code §5605: generally up to 20% over the prior year without a member vote) and requires distribution of the annual budget report (§5300). Verify current limits before adopting an increase.",
      TX: "Chapter 209 does not set a general statutory cap on assessment increases for most HOAs — your declaration controls. Confirm the declaration's cap and any member-vote trigger.",
      AZ: "A.R.S. §33-1803 caps regular-assessment increases for planned communities (generally 20% per year absent member approval). Verify the current cap before adopting.",
      NV: "NRS 116.3115 governs assessments; NRS 116.31151 requires distributing the budget or a summary to owners, and reserve funding is regulated. Calendar the member-distribution deadline.",
      OR: "ORS 94.595 governs assessments in Oregon planned communities. Verify your declaration's cap on regular-assessment increases and any member-vote triggers before adopting a budget with a rate change.",
      WA: "RCW 64.38.020 addresses HOA financial powers in Washington. Verify your declaration's assessment-increase caps and member-vote requirements before adopting the budget.",
    }),
    sections: [
      {
        heading: "Resolution",
        body:
          "RESOLUTION OF THE BOARD OF DIRECTORS\n[ASSOCIATION NAME]\nResolution No. [YEAR]-[NUMBER] — Adoption of the [FISCAL YEAR] Annual Budget\n\nWHEREAS, the Board of Directors is authorized by Article [X] of the [Declaration/Bylaws] and applicable state law to adopt an annual budget and to levy assessments; and\n\nWHEREAS, the Board has reviewed the proposed operating and reserve budget for the fiscal year beginning [DATE] and ending [DATE], attached as Exhibit A, [prepared with the assistance of [MANAGER/COMMITTEE]]; and\n\nWHEREAS, the proposed budget reflects total operating expenses of $[AMOUNT] and reserve contributions of $[AMOUNT], informed by [the reserve study dated [DATE] / the Board's reserve funding plan];\n\nNOW, THEREFORE, BE IT RESOLVED THAT:\n\n1. The [FISCAL YEAR] budget attached as Exhibit A, totaling $[TOTAL AMOUNT], is adopted.\n2. The regular assessment is set at $[AMOUNT] per [lot/unit] per [month/quarter/year], effective [DATE], payable [DUE SCHEDULE]. [This is a change of [+/-][PERCENT]% from the prior year.]\n3. $[AMOUNT] per [period] of each assessment shall be allocated to the reserve fund.\n4. Late payments are subject to the charges and interest stated in the governing documents and the Association's adopted collection policy.\n5. The [Manager/Treasurer] is directed to distribute the budget [or its statutory summary] and the new assessment schedule to all members by [DATE], in the manner required by the governing documents and state statute.\n6. The officers are authorized to take all actions necessary to implement this resolution.",
      },
      {
        heading: "Vote record and certification",
        body:
          "Adopted at a duly noticed meeting of the Board of Directors held on [DATE], at which a quorum was present.\n\nVotes in favor: [NUMBER] ([NAMES])\nVotes against: [NUMBER] ([NAMES])\nAbstentions: [NUMBER] ([NAMES])\n\nCERTIFICATION\nI certify that the foregoing resolution was adopted as stated above and appears in the minutes of the [DATE] meeting.\n\n____________________\n[NAME], Secretary · Date: [DATE]\n\nExhibit A: [FISCAL YEAR] Operating and Reserve Budget (attach)",
      },
    ],
  },

  // ------------------------------------------------------------------
  // CATEGORY: operate
  // ------------------------------------------------------------------
  {
    slug: "violation-notice",
    title: "Covenant Violation Notice",
    docType: "Notice",
    category: "operate",
    description:
      "A first violation notice that survives challenge: the exact CC&R section cited, observation dates, a clear cure deadline, the owner's hearing rights, and what happens next — with per-state notice-and-cure requirements.",
    whenToUse:
      "An owner is out of compliance and informal contact hasn't resolved it. Enforcement fails in two predictable ways: notices that don't cite the specific covenant, and notices that skip statutory hearing rights — Texas and California in particular impose strict notice-and-hearing procedures before fines. Fill in the state note's requirements before sending, apply the same process to every owner, and keep a copy with photos in the enforcement file.",
    fillMinutes: 15,
    stateNotes: allStatesNote({
      FL: "§720.305, Florida Statutes: fines and suspensions generally require 14 days' notice and an opportunity for hearing before an independent committee, and the committee must approve the fine. Do not levy a fine in the first notice.",
      CA: "Davis-Stirling: before disciplinary action, the board must give notice and hearing per Civil Code §5855 (including at least 10 days' notice of the hearing), and the association must have adopted a fine schedule distributed to members.",
      TX: "Texas Property Code §209.006: before enforcement action, most associations must send notice by certified mail describing the violation, informing the owner of curable-violation rights (generally a reasonable period of at least 30 days for curable violations) and the right to request a hearing under §209.007.",
      AZ: "A.R.S. §33-1803: an owner who receives a violation notice may respond and is entitled to specified information about the violation (including who observed it); fines require notice and an opportunity to be heard. Include the statutory response-rights language.",
      NV: "NRS 116.31031: fines require notice and an opportunity for a hearing, cure periods apply to continuing violations, and fine amounts are capped by statute for non-health/safety violations. Verify current caps before your fine schedule is referenced.",
      OR: "ORS 94.630 et seq. governs enforcement of planned community rules in Oregon. Associations must provide notice and an opportunity to cure before levying fines. Verify current hearing-rights requirements before referencing a fine schedule.",
      WA: "RCW 64.38.020 and your governing documents govern enforcement in Washington. Provide adequate written notice of the violation and an opportunity to cure; confirm any hearing rights applicable under your declaration before assessing fines.",
    }),
    sections: [
      {
        heading: "Notice of covenant violation",
        body:
          "[DATE]\n\nVia [FIRST-CLASS AND CERTIFIED MAIL / DELIVERY METHOD REQUIRED BY YOUR STATE — SEE STATE NOTES]\n[OWNER NAME(S)]\n[PROPERTY ADDRESS]\n[MAILING ADDRESS IF DIFFERENT]\n\nRe: Notice of violation — [PROPERTY ADDRESS], [ASSOCIATION NAME]\n\nDear [OWNER NAME]:\n\nDuring an inspection on [DATE], the following condition was observed at your property:\n\nViolation: [SPECIFIC, FACTUAL DESCRIPTION — e.g., “a boat trailer parked in the driveway continuously since [DATE]”].\nGoverning provision: [Declaration of Covenants, Article [X], Section [X] / Rules and Regulations, Section [X]], which provides: “[QUOTE THE OPERATIVE TEXT].”\nObserved by: [NAME/TITLE]. Photographs taken [DATE] are enclosed [/ available on request].\n\n[If a prior courtesy contact occurred: This follows our [letter/email/conversation] of [DATE].]",
      },
      {
        heading: "What we ask, and by when",
        body:
          "Please cure the violation by [DATE — at least the minimum cure period your state statute requires; see state notes]: [SPECIFIC CURE — e.g., “remove the trailer from the driveway,” “restore the lawn area,” “submit an architectural application for the change”].\n\nIf the condition is already resolved, or you believe this notice was sent in error, contact [NAME] at [EMAIL] / [PHONE] and we will re-inspect and close the file. If circumstances make the deadline impractical, tell us — the board can approve a reasonable compliance plan.",
      },
      {
        heading: "Your rights, and what happens next",
        body:
          "You have the right to request a hearing before [the board / the covenants committee] regarding this notice. To request one, write to [ADDRESS/EMAIL] by [DATE]. [INSERT THE SPECIFIC HEARING AND RESPONSE RIGHTS YOUR STATE STATUTE REQUIRES — SEE STATE NOTES FOR FL/CA/TX/AZ/NV.]\n\nIf the violation is not cured and no hearing is requested, the board may take further action authorized by the governing documents and state law, which may include: fines per the Association's adopted fine schedule ($[AMOUNT] per [occurrence/day], where lawful), suspension of common-area privileges, performance of the work at the owner's expense where authorized, or referral to counsel, with costs assessed as the governing documents allow.\n\nThe Association enforces its covenants uniformly. This notice is part of the Association's enforcement record.\n\nSincerely,\n____________________\n[NAME], [TITLE — e.g., Board President / Community Manager, at the direction of the Board]\n[ASSOCIATION NAME]\nEnclosures: [photographs; fine schedule; copy of cited provision]",
      },
    ],
  },
  {
    slug: "vendor-services-contract",
    title: "Vendor Services Contract",
    docType: "Contract",
    category: "operate",
    description:
      "A board-drafted contract for landscaping, maintenance, or repair vendors: scope exhibit, licensed-bonded-insured requirements with additional-insured status, response times, a no-kickback clause, and 30-day termination.",
    whenToUse:
      "You picked a vendor — after getting multiple bids and confirming they are licensed, bonded, and insured — and want the work on the association's paper instead of the vendor's one-page proposal. Attach the winning bid as the scope exhibit. Don't be cheap: fix things once and fix them right — this contract exists so quality, not just price, is enforceable. For projects over roughly $[25,000] or anything structural, have your attorney review before signature.",
    fillMinutes: 40,
    stateNotes: allStatesNote({
      FL: "Verify the contractor's license class at the Florida DBPR license portal and confirm workers' compensation coverage; Florida construction lien law (Chapter 713) applies to improvement work — collect lien releases with payments.",
      CA: "Verify the license at the Contractors State License Board (CSLB) and confirm classification matches the work. California mechanics-lien law applies; collect conditional/unconditional releases with each progress payment.",
      TX: "Texas has no general statewide contractor license for most trades (specialty trades like electrical/HVAC/plumbing are licensed) — verify the specific trade license and insurance directly. Texas Property Code Chapter 53 lien rules apply to improvements.",
      AZ: "Verify the license and its classification with the Arizona Registrar of Contractors; unlicensed contracting is a common enforcement issue. Arizona lien statutes apply to improvement work.",
      NV: "Verify the license, classification, and monetary limit with the Nevada State Contractors Board — Nevada licenses carry per-contract monetary limits that must cover this contract amount.",
      OR: "Verify the contractor's license with the Oregon Construction Contractors Board (CCB) and confirm classification matches the scope of work. Oregon's construction lien law (ORS Chapter 87) applies to improvement work — collect lien releases with each payment.",
      WA: "Verify the contractor's license with the Washington Department of Labor & Industries (L&I) and confirm the registration is current. Washington's construction lien law (RCW Chapter 60.04) applies to improvement work — collect conditional and unconditional lien releases with each progress payment.",
    }),
    sections: [
      {
        heading: "1. Parties, scope, and term",
        body:
          "This Services Contract (the “Contract”) is made as of [DATE] between [ASSOCIATION NAME] (the “Association”) and [VENDOR LEGAL NAME], [STATE] license no. [LICENSE NUMBER] (the “Contractor”).\n\nScope of work: The Contractor shall perform the services described in Exhibit A (the Contractor's proposal dated [DATE], as modified by this Contract) at [COMMUNITY NAME / SPECIFIC LOCATIONS]. Where Exhibit A conflicts with this Contract, this Contract controls.\n\nTerm: [One-time project to be completed by [DATE] / Recurring services from [START DATE] to [END DATE], with service frequency of [SCHEDULE]]. Time is of the essence.",
      },
      {
        heading: "2. Price and payment",
        body:
          "Contract price: $[AMOUNT] [fixed / per month / per the unit-price schedule in Exhibit A]. No change orders, extras, or price adjustments are payable unless approved in advance in a writing signed by a board officer.\n\nPayment terms: [Net 30 after invoice and board or manager verification of completed work]. For projects: [10]% retainage held until final completion, punch-list closure, and delivery of final lien releases. No deposit exceeding [10]% [or the lower amount your state's contracting law allows] will be paid before work begins.",
      },
      {
        heading: "3. Licensed, bonded, and insured — conditions of payment",
        body:
          "Before starting work and throughout the term, the Contractor shall provide and maintain:\n\n- An active [STATE] contractor's license in the classification required for the work (verify per the state note attached to this template)\n- Commercial general liability insurance of at least $1,000,000 per occurrence / $2,000,000 aggregate, naming the Association as ADDITIONAL INSURED, with a certificate of insurance delivered before mobilization and at each policy renewal\n- Workers' compensation covering all personnel on site, as required by law\n- Auto liability of at least $[1,000,000] combined single limit for vehicles used on site\n- [License/payment/performance bond of $[AMOUNT], for projects where the board requires bonding]\n\nLapse of any required license or coverage suspends the Contractor's right to be on site and to be paid until restored. The Contractor shall not subcontract without written Association approval; approved subcontractors must meet the same insurance requirements.",
      },
      {
        heading: "4. Performance standards",
        body:
          "- Response times: routine service requests within [48 hours]; urgent issues affecting safety or property within [4 hours], 24/7 line: [PHONE]\n- Work quality: materials new and of the specified grade; workmanship per industry standard and applicable code; permits obtained by the Contractor where required\n- Site conduct: work hours [HOURS/DAYS], daily cleanup, no blocking of resident access without notice, identifiable uniforms or badges on all personnel\n- Warranty: all work warranted against defects in materials and workmanship for [ONE (1) YEAR] from completion; the Contractor shall correct warranty defects within [14] days of notice at no charge\n- Supervision: the Association's contact is [NAME/ROLE]; the Contractor's supervisor is [NAME/PHONE]",
      },
      {
        heading: "5. Integrity, indemnity, and termination",
        body:
          "No gifts or kickbacks: the Contractor shall not give, and the Association's board members and manager shall not accept, any gift, discount, commission, or other thing of value in connection with this Contract. A violation is grounds for immediate termination.\n\nIndemnification: the Contractor shall indemnify, defend, and hold harmless the Association, its board, members, and manager from claims, damages, liens, and costs (including reasonable attorneys' fees) arising from the Contractor's work, except to the extent caused by the Association's own negligence. The Contractor shall keep the property lien-free and deliver lien releases with each payment where applicable.\n\nTermination: the Association may terminate (a) for convenience on [30] days' written notice, paying only for work satisfactorily completed; or (b) for cause immediately if the Contractor fails to cure a documented performance failure within [10] days of written notice, or immediately without cure for loss of license or insurance, abandonment, or an integrity violation.\n\nGoverning law: [STATE]; venue [COUNTY]. This Contract and its exhibits are the entire agreement.\n\nASSOCIATION: [ASSOCIATION NAME]\nBy: ____________________ [NAME], [OFFICE] · Date: ________\n\nCONTRACTOR: [VENDOR LEGAL NAME]\nBy: ____________________ [NAME], [TITLE] · Date: ________\nLicense no.: [NUMBER] · [STATE]",
      },
    ],
  },
];

export function getTemplateBySlug(slug: string): TemplateDoc | undefined {
  return TEMPLATE_LIBRARY.find((t) => t.slug === slug);
}

export function templatesByCategory(): Array<{
  category: TemplateCategory;
  templates: TemplateDoc[];
}> {
  return (Object.keys(CATEGORY_META) as TemplateCategory[]).map((category) => ({
    category,
    templates: TEMPLATE_LIBRARY.filter((t) => t.category === category),
  }));
}

/** Word count across a document's sections (for honest length labels). */
export function templateWordCount(doc: TemplateDoc): number {
  return doc.sections.reduce(
    (sum, s) => sum + s.body.split(/\s+/).filter(Boolean).length,
    0,
  );
}

/** Plain-text export of the full document, used by copy + download. */
export function templatePlainText(doc: TemplateDoc): string {
  const lines: string[] = [
    doc.title.toUpperCase(),
    "",
    `Provided by Boardwell (tryboardwell.com) — for board reference only; not legal advice.`,
    `Have your association's attorney review any document before it is signed or sent.`,
    `Placeholders appear in [BRACKETS] — replace every one before use.`,
    "",
  ];
  for (const section of doc.sections) {
    lines.push(section.heading.toUpperCase());
    lines.push("");
    lines.push(section.body);
    lines.push("");
  }
  const notes = doc.stateNotes;
  if (notes.length > 0) {
    lines.push(`STATE NOTES (${(Object.keys(STATE_LABELS) as LaunchState[]).join(' / ')})`);
    lines.push("");
    for (const n of notes) {
      lines.push(`${STATE_LABELS[n.state]}: ${n.note}`);
      lines.push("");
    }
  }
  return lines.join("\n");
}
