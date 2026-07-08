export interface NavLink {
  label: string;
  href: string;
  icon?: string;
}

export interface NavGroup {
  label: string;
  items: NavLink[];
}

export interface NavConfig {
  primary: NavLink[];
  groups: NavGroup[];
}

export const NAV_CONFIG: NavConfig = {
  primary: [
    { label: "Home", href: "/" },
    { label: "Start an RFP", href: "/intake" },
    { label: "My RFPs", href: "/rfps" },
    { label: "Templates", href: "/templates" },
  ],
  groups: [
    {
      label: "Admin",
      items: [{ label: "Verification Queue", href: "/admin/verification" }],
    },
  ],
};
