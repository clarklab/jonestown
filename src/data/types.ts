export type UserId = "clark" | "angie";

export interface UserProfile {
  id: UserId;
  name: string;
  initial: string;
  accent: string;
}

export const USERS: Record<UserId, UserProfile> = {
  clark: {
    id: "clark",
    name: "Clark",
    initial: "C",
    accent: "oklch(0.58 0.21 254)", // electric cobalt
  },
  angie: {
    id: "angie",
    name: "Angie",
    initial: "A",
    accent: "oklch(0.62 0.25 12)", // hot magenta
  },
};

export type VerdictStatus = "locked" | "solo" | "unanimous" | "split" | "divided";

export interface VerdictMeta {
  status: VerdictStatus;
  combined?: number;
  clark?: number;
  angie?: number;
  gap?: number; // |clark - angie|
}

export function verdictFromRatings(
  clark: number | undefined,
  angie: number | undefined,
): VerdictMeta {
  if (clark === undefined && angie === undefined) {
    return { status: "locked" };
  }
  if (clark === undefined || angie === undefined) {
    return {
      status: "solo",
      combined: clark ?? angie,
      clark,
      angie,
    };
  }
  const gap = Math.abs(clark - angie);
  const combined = (clark + angie) / 2;
  let status: VerdictStatus = "unanimous";
  if (gap > 1.5) status = "divided";
  else if (gap > 0.5) status = "split";
  return { status, combined, clark, angie, gap };
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine?: string;
  address?: string;
  area?: string;
  notes?: string;
  hidden?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Visit {
  id: string;
  restaurantId: string;
  userId: UserId;
  date: number;
  rating?: number; // 0..5 in 0.5 increments
  notes?: string;
  vibe?: string;
  occasion?: string;
  createdAt: number;
}

export interface Dish {
  id: string;
  visitId: string;
  restaurantId: string;
  userId: UserId;
  name: string;
  rating: number; // 0..5 in 0.5 increments
  notes?: string;
  photoId?: string;
  createdAt: number;
}

export interface Photo {
  id: string;
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
