/** OG's VIP label: "Director" for staff, else "VIP" with an OG or EP tag and a year star. */
export type VipBadge =
  | { readonly kind: 'director' }
  | {
    readonly kind: 'vip';
    readonly tag: { readonly text: 'OG' | 'EP'; readonly title: string } | null;
    /** Only set past one year, like OG. */
    readonly years: number | null;
  };
