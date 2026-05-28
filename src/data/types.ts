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
    accent: "oklch(0.79 0.16 58)", // ember
  },
  angie: {
    id: "angie",
    name: "Angie",
    initial: "A",
    accent: "oklch(0.78 0.14 12)", // rose
  },
};

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
}
