export type NavLink = {
  label: string;
  href: string;
  external?: boolean;
  badge?: string;
  adminOnly?: boolean;
};

export type NavGroup = {
  label: string;
  links: NavLink[];
};

export type NavConfig = {
  primary: NavLink[];
  groups: NavGroup[];
};

export const NAV_CONFIG: NavConfig = {
  primary: [
    {
      label: "Home",
      href: "/",
    },
    {
      label: "Start an RFP",
      href: "/intake",
    },
    {
      label: "My RFPs",
      href: "/rfps",
    },
    {
      label: "Templates",
      href: "/templates",
    },
  ],
  groups: [
    {
      label: "Admin",
      links: [
        {
          label: "Verification Queue",
          href: "/admin/verification",
        },
      ],
    },
  ],
};
