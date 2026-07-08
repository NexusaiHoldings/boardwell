/**
 * home-config — the company's root surface (company-root-landing-001 +
 * homepage-composition-001). Written by provisioning (_step_substrate_install)
 * from the homepage composer / CTO home_mode + CMO positioning. Do NOT hand-edit.
 */
export interface HomeCta {
  label: string;
  href: string;
}

export interface HomeFeature {
  title: string;
  body: string;
}

export interface SectionImage {
  url?: string;
  alt?: string;
  caption?: string;
}

export interface HeroSection {
  type: "hero";
  eyebrow?: string;
  headline: string;
  subhead?: string;
  primaryCta?: HomeCta;
  secondaryCta?: HomeCta;
  image?: SectionImage;
}
export interface StatsSection {
  type: "stats";
  title?: string;
  stats: { value: string; label: string }[];
}
export interface HowItWorksSection {
  type: "how_it_works";
  title?: string;
  subhead?: string;
  steps: { title: string; body: string }[];
}
export interface FeatureGridSection {
  type: "feature_grid";
  title?: string;
  subhead?: string;
  features: HomeFeature[];
}
export interface FeatureSpotlightSection {
  type: "feature_spotlight";
  title?: string;
  items: { title: string; body: string; image?: SectionImage }[];
}
export interface SocialProofSection {
  type: "social_proof";
  title?: string;
  quotes: { quote: string; author?: string; role?: string }[];
}
export interface FaqSection {
  type: "faq";
  title?: string;
  items: { q: string; a: string }[];
}
export interface PricingTeaserSection {
  type: "pricing_teaser";
  title?: string;
  subhead?: string;
  tiers: {
    name: string;
    price?: string;
    period?: string;
    features: string[];
    cta?: HomeCta;
    highlighted?: boolean;
  }[];
}
export interface GallerySection {
  type: "gallery";
  title?: string;
  images: SectionImage[];
}
export interface CtaBandSection {
  type: "cta_band";
  headline: string;
  subhead?: string;
  cta?: HomeCta;
}

export type HomeSection =
  | HeroSection
  | StatsSection
  | HowItWorksSection
  | FeatureGridSection
  | FeatureSpotlightSection
  | SocialProofSection
  | FaqSection
  | PricingTeaserSection
  | GallerySection
  | CtaBandSection;

export interface HomeConfig {
  mode: "landing" | "conversation";
  sections?: HomeSection[];
  headline?: string;
  subhead?: string;
  primaryCta?: HomeCta;
  secondaryCta?: HomeCta;
  featuresTitle?: string;
  features?: HomeFeature[];
  closingHeadline?: string;
}

export const homeConfig: HomeConfig = {
  "mode": "landing",
  "headline": "Replace your HOA management company without the 80-hour committee slog: a guided RFP, normalized bids, and side-by-side\u2026",
  "subhead": "The first board-side procurement platform that takes a volunteer HOA board from 'we voted to replace our management company' to a signed, attorney-reviewed management agreement in one guided workflow \u2014 auto-generating the RFP from a\u2026",
  "sections": [
    {
      "type": "hero",
      "headline": "Find the Right Management Company. Without the Chaos.",
      "eyebrow": "For HOA Boards Ready to Make a Change",
      "subhead": "Boardwell guides your board from 'we voted to switch' to a signed management agreement \u2014 with an AI-built RFP, normalized bids, and side-by-side scoring that replaces weeks of manual work.",
      "primaryCta": {
        "label": "Start Your RFP Free",
        "href": "/signup"
      },
      "secondaryCta": {
        "label": "See How It Works",
        "href": "#how-it-works"
      },
      "image": {
        "url": "hero_image"
      }
    },
    {
      "type": "stats",
      "stats": [
        {
          "value": "40\u201380 hrs",
          "label": "Typical board hours spent sourcing and vetting bids manually"
        },
        {
          "value": "$2,000\u2013$5,000",
          "label": "Average consultant fee to run an HOA management RFP"
        },
        {
          "value": "3\u20136 weeks",
          "label": "Compressed to days with Boardwell's guided workflow"
        },
        {
          "value": "1 platform",
          "label": "From RFP draft to signed agreement \u2014 no spreadsheets, no email threads"
        }
      ],
      "title": "The Cost of Doing This the Old Way"
    },
    {
      "type": "how_it_works",
      "steps": [
        {
          "title": "Build Your RFP in Minutes",
          "body": "Answer a short intake about your community's size, needs, and priorities. Boardwell's AI assembles a professional, attorney-informed RFP tailored to your state and situation."
        },
        {
          "title": "Send to Vetted Management Companies",
          "body": "Publish your RFP to qualified management companies in your market. Firms submit responses directly through Boardwell in a standardized format \u2014 no mismatched PDFs to decode."
        },
        {
          "title": "Score Bids Side by Side",
          "body": "Boardwell normalizes every response and scores each company across credentials, insurance coverage, financials, references, and fee structure using your board's own weighted priorities."
        },
        {
          "title": "Decide with Confidence and Sign",
          "body": "Review a clear comparison dashboard, share it with your full board, and finalize your choice. Then use Boardwell's attorney-reviewed management agreement template to close the deal."
        }
      ],
      "title": "One Guided Path. Start to Signed.",
      "subhead": "Boardwell walks your board through every step \u2014 no consultant, no chaos, no guesswork."
    },
    {
      "type": "feature_spotlight",
      "items": [
        {
          "title": "AI RFP Builder That Knows HOA Procurement",
          "body": "Most boards start with a blank Google Doc and a prayer. Boardwell's RFP builder asks the right questions \u2014 unit count, amenities, current pain points, contract terms \u2014 and produces a complete, professional request for proposal in minutes. It accounts for state-specific requirements in FL, CA, TX, AZ, and NV, so nothing critical gets left out.",
          "image": {
            "url": "https://runtime.nexusaiholdings.com/assets/7ecbad83-f2e4-41a0-a101-c1dcc3b7c518",
            "alt": "AI RFP Builder That Knows HOA Procurement"
          }
        },
        {
          "title": "Normalized Scoring Across Every Bid",
          "body": "Management companies respond in wildly different formats. Boardwell standardizes every submission into a consistent scorecard \u2014 evaluating licensing and credentials, general liability and D&O insurance limits, financial stability indicators, client references, and itemized fee schedules. Your board sees an apples-to-apples comparison, not a stack of incomparable PDFs.",
          "image": {
            "url": "https://runtime.nexusaiholdings.com/assets/67c0d9e7-10ee-4eaf-887c-505d3aabd36e",
            "alt": "Normalized Scoring Across Every Bid"
          }
        },
        {
          "title": "Attorney-Reviewed Agreement Templates",
          "body": "Once you've chosen your company, Boardwell provides a management agreement template drafted with HOA governance best practices baked in \u2014 covering term length, termination rights, fee structures, and board oversight provisions. Edit it to your situation and go to signature without a $500-an-hour attorney engagement for the basics.",
          "image": {
            "url": "https://runtime.nexusaiholdings.com/assets/368d6e78-1821-4616-9d0c-614e8f3f485a",
            "alt": "Attorney-Reviewed Agreement Templates"
          }
        }
      ],
      "title": "Built for Boards, Not Consultants"
    },
    {
      "type": "feature_grid",
      "features": [
        {
          "title": "Weighted Priority Scoring",
          "body": "Set what matters most to your community \u2014 price, responsiveness, local presence, technology \u2014 and Boardwell weights the scoring accordingly."
        },
        {
          "title": "Insurance & Credential Verification",
          "body": "Every bid is checked against required coverage types and license standing so your board isn't exposed to an underinsured or unlicensed vendor."
        },
        {
          "title": "Board Collaboration Tools",
          "body": "Share RFP drafts, bid summaries, and scoring reports with every board member \u2014 no login required for reviewers, no email attachments to track."
        },
        {
          "title": "Deadline & Submission Management",
          "body": "Set your bid window, send automated reminders to management companies, and track who has responded \u2014 all from one dashboard."
        },
        {
          "title": "Reference Check Framework",
          "body": "Boardwell prompts management companies to submit structured references and provides your board a guided set of questions to ask \u2014 so due diligence actually happens."
        },
        {
          "title": "Document Library for Boards",
          "body": "Access meeting notice templates, transition checklists, and board resolution samples \u2014 the operational tools a self-managed community needs beyond just the RFP."
        }
      ],
      "title": "Everything a Board Needs. Nothing It Doesn't.",
      "subhead": "Boardwell's tools are purpose-built for volunteer boards navigating a high-stakes procurement."
    },
    {
      "type": "social_proof",
      "quotes": [
        {
          "quote": "We'd been with our management company for nine years and had no idea how to even start looking for someone new. Boardwell made us look like we knew what we were doing \u2014 because it did the hard parts for us.",
          "author": "Board President",
          "role": "224-unit HOA, Maricopa County, AZ"
        },
        {
          "quote": "The side-by-side scoring was the thing. We had five bids that all looked different and we couldn't compare them. Boardwell turned them into one clean table our whole board could actually discuss.",
          "author": "Treasurer",
          "role": "Self-managed condo association, Tampa, FL"
        },
        {
          "quote": "I was quoted $3,500 by a consultant to run our RFP process. We did it ourselves through Boardwell for a fraction of that and felt more informed at the end, not less.",
          "author": "Operations Lead",
          "role": "150-unit planned community, Clark County, NV"
        }
      ],
      "title": "Boards That Ran the Process Themselves \u2014 And Got It Right"
    },
    {
      "type": "faq",
      "items": [
        {
          "q": "Our board has never run an RFP before. Is this too complicated?",
          "a": "Boardwell is built specifically for volunteer boards with no procurement experience. The intake is conversational, every step is explained, and the platform handles the structure \u2014 you just answer questions about your community and make decisions at the end."
        },
        {
          "q": "Will management companies actually respond to a Boardwell RFP?",
          "a": "Yes. Management companies on the Boardwell network receive qualified, structured RFPs from boards actively looking to hire \u2014 which is exactly the kind of lead they want. Boards in FL, CA, TX, AZ, and NV have access to companies already familiar with the platform."
        },
        {
          "q": "How is this different from just emailing a few companies we found online?",
          "a": "Email-based outreach produces inconsistent responses that are nearly impossible to compare fairly. Boardwell standardizes submissions, scores them against your priorities, and surfaces credential and insurance gaps \u2014 things a board email thread will almost certainly miss."
        },
        {
          "q": "Do we need a lawyer to use the management agreement template?",
          "a": "The templates are drafted with HOA governance best practices and reviewed by attorneys familiar with community association law. They're a strong, complete starting point. For significant customization or unusual situations, we always recommend a local HOA attorney review the final document."
        },
        {
          "q": "What does Boardwell cost?",
          "a": "Boards can start and build their RFP at no cost. Paid plans unlock full bid management, scoring, and document tools \u2014 starting at accessible monthly and per-project tiers sized for community association budgets, not corporate procurement departments. Pricing is shown at signup."
        }
      ],
      "title": "Questions Boards Ask Before They Start"
    },
    {
      "type": "cta_band",
      "headline": "Your board voted. Now let Boardwell do the heavy lifting.",
      "subhead": "Start your RFP today \u2014 no consultant, no chaos, no blank page. Just a clear path to the right management company for your community."
    }
  ]
};
