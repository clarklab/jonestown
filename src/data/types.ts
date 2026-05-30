export type MemberSlot = "a" | "b";

export interface Member {
  slot: MemberSlot;
  name: string;
  initial: string;
  accent: string; // oklch color
}

export interface CoupleBadge {
  emoji: string;
  color: string; // background color for the badge
}

export interface Couple {
  id: string;
  slug: string; // URL-safe, unique
  name: string; // e.g. "Clark + Angie"
  town: string; // e.g. "Jonestown, TX 78645"
  members: [Member, Member];
  badge: CoupleBadge;
  createdAt: number;
  updatedAt: number;
}

/**
 * Legacy compat: UserId used to be a hard-coded "clark" | "angie". Now it
 * maps to a member slot within the current couple. Slots are stable for
 * the lifetime of the couple.
 */
export type UserId = MemberSlot;

/**
 * Built-in defaults for the original Jonestown couple. Used as a starter
 * preset on the claim flow, and as a fallback for any code that still
 * references the legacy "clark" / "angie" ids.
 */
export const DEFAULT_COUPLE: Couple = {
  id: "default",
  slug: "jonestown",
  name: "Clark + Angie",
  town: "Jonestown, TX 78645",
  badge: { emoji: "🎾", color: "oklch(0.91 0.24 117)" },
  members: [
    { slot: "a", name: "Clark", initial: "C", accent: "oklch(0.58 0.21 254)" },
    { slot: "b", name: "Angie", initial: "A", accent: "oklch(0.62 0.25 12)" },
  ],
  createdAt: 0,
  updatedAt: 0,
};

/**
 * Curated member colors. Couples pick from this palette during onboarding.
 */
export const MEMBER_COLORS: Array<{ id: string; name: string; accent: string }> =
  [
    { id: "cobalt", name: "Cobalt", accent: "oklch(0.58 0.21 254)" },
    { id: "magenta", name: "Magenta", accent: "oklch(0.62 0.25 12)" },
    { id: "emerald", name: "Emerald", accent: "oklch(0.66 0.18 155)" },
    { id: "tangerine", name: "Tangerine", accent: "oklch(0.72 0.2 48)" },
    { id: "violet", name: "Violet", accent: "oklch(0.6 0.22 295)" },
    { id: "teal", name: "Teal", accent: "oklch(0.66 0.13 195)" },
    { id: "rose", name: "Rose", accent: "oklch(0.7 0.18 0)" },
    { id: "midnight", name: "Midnight", accent: "oklch(0.42 0.13 260)" },
  ];

/**
 * Curated couple badge presets — emoji + accent background.
 */
export const COUPLE_BADGES: CoupleBadge[] = [
  { emoji: "🎾", color: "oklch(0.91 0.24 117)" },
  { emoji: "🍴", color: "oklch(0.86 0.18 60)" },
  { emoji: "🌶️", color: "oklch(0.7 0.22 25)" },
  { emoji: "🥨", color: "oklch(0.78 0.14 80)" },
  { emoji: "🍕", color: "oklch(0.84 0.18 50)" },
  { emoji: "🍷", color: "oklch(0.6 0.18 12)" },
  { emoji: "🍣", color: "oklch(0.78 0.16 30)" },
  { emoji: "🌮", color: "oklch(0.78 0.18 70)" },
  { emoji: "🥐", color: "oklch(0.86 0.12 80)" },
  { emoji: "🦪", color: "oklch(0.7 0.08 180)" },
  { emoji: "🍜", color: "oklch(0.78 0.16 40)" },
  { emoji: "🧀", color: "oklch(0.88 0.18 90)" },
];

/**
 * Resolves a slot to a member within a given couple, with a graceful fall
 * back to the default couple's member for legacy callers.
 */
export function memberOf(couple: Couple | null, slot: MemberSlot): Member {
  const c = couple ?? DEFAULT_COUPLE;
  return c.members.find((m) => m.slot === slot) ?? c.members[0];
}

/**
 * Legacy lookup helper. Code that hard-coded `USERS.clark` / `USERS.angie`
 * should migrate to `memberOf(currentCouple, slot)`, but until that's
 * done this provides the default couple's members.
 */
export const USERS: Record<MemberSlot, Member> = {
  a: DEFAULT_COUPLE.members[0],
  b: DEFAULT_COUPLE.members[1],
};

export interface PublicRating {
  source: "google" | "yelp" | "tripadvisor";
  value: number; // 0..5
  count?: number; // number of reviews, if known
}

export interface RestaurantLinks {
  /** Google Maps profile URL (or Google place URL). */
  google?: string;
  /** Official website. */
  website?: string;
  /** Online ordering link — DoorDash, Toast, ChowNow, the restaurant's own. */
  order?: string;
  /** Optional Yelp page. */
  yelp?: string;
}

export interface Restaurant {
  id: string;
  coupleId?: string; // set on save; legacy records may lack it
  name: string;
  cuisine?: string;
  address?: string;
  area?: string;
  notes?: string;
  hidden?: boolean;
  /** Aggregated public score from Google / Yelp / TripAdvisor — for comparison only. */
  publicRating?: PublicRating;
  /** Outbound links — Google profile, website, online ordering. */
  links?: RestaurantLinks;
  /** Phone number, raw or formatted. Renders as a tap-to-call. */
  phone?: string;
  /** Optional hero image URL — overrides the placeholder when present. */
  imageUrl?: string;
  /**
   * Approximate geographic coordinates. Used to project the pin onto the
   * town map literally instead of inside a hand-tuned area cluster. User-
   * added restaurants without coords fall back to area-anchor placement.
   */
  coords?: { lat: number; lng: number };
  createdAt: number;
  updatedAt: number;
}

export interface Visit {
  id: string;
  coupleId?: string;
  restaurantId: string;
  userId: UserId;
  date: number;
  rating?: number;
  notes?: string;
  vibe?: string;
  occasion?: string;
  createdAt: number;
}

/**
 * Dish verdict — pass / fail / no opinion.
 * `undefined` is the default "meh, no strong feelings" state.
 */
export type DishVerdict = "yes" | "no";

export interface Dish {
  id: string;
  coupleId?: string;
  visitId: string;
  restaurantId: string;
  userId: UserId;
  name: string;
  /**
   * Would-order-again verdict. `undefined` = meh.
   */
  verdict?: DishVerdict;
  /**
   * Legacy 0..5 rating from older versions. New writes leave this
   * unset; aggregates fall back to it when no `verdict` is present.
   */
  rating?: number;
  notes?: string;
  photoId?: string;
  createdAt: number;
}

export interface Photo {
  id: string;
  coupleId?: string;
  blob: Blob;
  width?: number;
  height?: number;
  createdAt: number;
}

export interface RestaurantAggregate {
  restaurant: Restaurant;
  visitCount: number;
  visitCountByUser: Record<UserId, number>;
  lastVisit?: number;
  dishCount: number;
  ratingByUser: Partial<Record<UserId, number>>;
  combinedRating?: number;
  bothRated: boolean;
  topDishes: Dish[];
  verdict: VerdictMeta;
}

export type VerdictStatus =
  | "locked"
  | "solo"
  | "unanimous"
  | "split"
  | "divided";

export interface VerdictMeta {
  status: VerdictStatus;
  combined?: number;
  clark?: number; // alias: member-a rating
  angie?: number; // alias: member-b rating
  gap?: number;
}

export function verdictFromRatings(
  a: number | undefined,
  b: number | undefined,
): VerdictMeta {
  if (a === undefined && b === undefined) {
    return { status: "locked" };
  }
  if (a === undefined || b === undefined) {
    return {
      status: "solo",
      combined: a ?? b,
      clark: a,
      angie: b,
    };
  }
  const gap = Math.abs(a - b);
  const combined = (a + b) / 2;
  let status: VerdictStatus = "unanimous";
  if (gap > 1.5) status = "divided";
  else if (gap > 0.5) status = "split";
  return { status, combined, clark: a, angie: b, gap };
}
