export type PublicPlan = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  popular: boolean;
  tier: "BASIC" | "INTERMEDIATE" | "PRO";
  features: string[];
  freeGifts: string[];
};

export type PublicExtra = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  price: number;
};

export type PublicProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  discountPct: number;
  featured: boolean;
  stock: number;
  badges: string[];
  imageUrl?: string | null;
  publicDescription?: string | null;
  published?: boolean | null;
  onOffer?: boolean | null;
  isCombo?: boolean | null;
  comboLabel?: string | null;
  comboItems?: string[] | null;
  costPrice?: number | null;
  discountStartsAt?: string | null;
  discountEndsAt?: string | null;
  discountActive?: boolean;
  finalPrice?: number;
};

export type PublicReview = {
  id: string;
  name: string;
  company?: string | null;
  rating: number;
  comment: string;
  service?: string | null;
  createdAt?: string | null;
};

export type PublicDiscount = {
  id: string;
  name: string;
  description?: string | null;
  targetType: "PLAN" | "EXTRA" | "PRODUCT" | "ORDER";
  targetId?: string | null;
  mode: "PERCENT" | "FIXED";
  value: number;
  minSubtotal?: number | null;
  active?: boolean | null;
  startsAt?: string | null;
  endsAt?: string | null;
};
