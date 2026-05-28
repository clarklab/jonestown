import { useEffect, useMemo, useState } from "react";
import {
  getCurrentUser,
  getPhotoUrl,
  getRestaurant,
  listDishes,
  listRestaurants,
  listVisits,
  onChange,
  setCurrentUser as dbSetCurrentUser,
} from "./db";
import type {
  Dish,
  Restaurant,
  RestaurantAggregate,
  UserId,
  Visit,
} from "./types";
import { verdictFromRatings } from "./types";

export function useTables(
  tables: string[],
): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    return onChange((table) => {
      if (tables.includes(table)) setTick((t) => t + 1);
    });
  }, [tables.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  return tick;
}

export function useRestaurants(): Restaurant[] {
  const [items, setItems] = useState<Restaurant[]>([]);
  const tick = useTables(["restaurants"]);
  useEffect(() => {
    listRestaurants().then(setItems);
  }, [tick]);
  return items;
}

export function useRestaurant(id: string | undefined): Restaurant | null {
  const [item, setItem] = useState<Restaurant | null>(null);
  const tick = useTables(["restaurants"]);
  useEffect(() => {
    if (!id) return;
    getRestaurant(id).then((r) => setItem(r ?? null));
  }, [id, tick]);
  return item;
}

export function useVisits(restaurantId?: string): Visit[] {
  const [items, setItems] = useState<Visit[]>([]);
  const tick = useTables(["visits"]);
  useEffect(() => {
    listVisits(restaurantId).then(setItems);
  }, [restaurantId, tick]);
  return items;
}

export function useDishes(filter?: {
  restaurantId?: string;
  visitId?: string;
}): Dish[] {
  const [items, setItems] = useState<Dish[]>([]);
  const tick = useTables(["dishes", "photos"]);
  const key = `${filter?.restaurantId ?? ""}|${filter?.visitId ?? ""}`;
  useEffect(() => {
    listDishes(filter).then(setItems);
  }, [key, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  return items;
}

export function useAllVisits(): Visit[] {
  const [items, setItems] = useState<Visit[]>([]);
  const tick = useTables(["visits"]);
  useEffect(() => {
    listVisits().then(setItems);
  }, [tick]);
  return items;
}

export function useAllDishes(): Dish[] {
  const [items, setItems] = useState<Dish[]>([]);
  const tick = useTables(["dishes"]);
  useEffect(() => {
    listDishes().then(setItems);
  }, [tick]);
  return items;
}

export function useCurrentUser(): [UserId, (id: UserId) => void] {
  const [user, setUser] = useState<UserId>("clark");
  const tick = useTables(["meta"]);
  useEffect(() => {
    getCurrentUser().then(setUser);
  }, [tick]);
  return [
    user,
    (id) => {
      setUser(id);
      void dbSetCurrentUser(id);
    },
  ];
}

export function usePhotoUrl(photoId: string | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!photoId) {
      setUrl(undefined);
      return;
    }
    let active = true;
    getPhotoUrl(photoId).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [photoId]);
  return url;
}

// ------- Aggregations -------

export function avg(values: number[]): number | undefined {
  if (!values.length) return undefined;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function useAggregates(): {
  byId: Record<string, RestaurantAggregate>;
  list: RestaurantAggregate[];
  ratedCount: number;
  totalCount: number;
  bothRatedCount: number;
} {
  const restaurants = useRestaurants();
  const visits = useAllVisits();
  const dishes = useAllDishes();

  return useMemo(() => {
    const visitByRest: Record<string, Visit[]> = {};
    for (const v of visits) {
      (visitByRest[v.restaurantId] ||= []).push(v);
    }
    const dishByRest: Record<string, Dish[]> = {};
    for (const d of dishes) {
      (dishByRest[d.restaurantId] ||= []).push(d);
    }

    const list: RestaurantAggregate[] = restaurants.map((r) => {
      const vs = visitByRest[r.id] ?? [];
      const ds = dishByRest[r.id] ?? [];
      const ratingsByUser: Record<UserId, number[]> = {
        clark: [],
        angie: [],
      };
      const visitsByUser: Record<UserId, number> = { clark: 0, angie: 0 };
      let lastVisit = 0;
      for (const v of vs) {
        visitsByUser[v.userId] = (visitsByUser[v.userId] ?? 0) + 1;
        if (v.rating !== undefined) ratingsByUser[v.userId].push(v.rating);
        if (v.date > lastVisit) lastVisit = v.date;
      }
      for (const d of ds) {
        ratingsByUser[d.userId].push(d.rating);
      }

      const clarkAvg = avg(ratingsByUser.clark);
      const angieAvg = avg(ratingsByUser.angie);
      const both = clarkAvg !== undefined && angieAvg !== undefined;
      const combined =
        both
          ? (clarkAvg! + angieAvg!) / 2
          : (clarkAvg ?? angieAvg);

      // Top dishes by rating (max 3)
      const topDishes = [...ds]
        .sort((a, b) => b.rating - a.rating || b.createdAt - a.createdAt)
        .slice(0, 3);

      const agg: RestaurantAggregate = {
        restaurant: r,
        visitCount: vs.length,
        visitCountByUser: visitsByUser,
        lastVisit: lastVisit || undefined,
        dishCount: ds.length,
        ratingByUser: {
          ...(clarkAvg !== undefined ? { clark: clarkAvg } : {}),
          ...(angieAvg !== undefined ? { angie: angieAvg } : {}),
        },
        combinedRating: combined,
        bothRated: both,
        topDishes,
        verdict: verdictFromRatings(clarkAvg, angieAvg),
      };
      return agg;
    });

    const byId: Record<string, RestaurantAggregate> = {};
    for (const a of list) byId[a.restaurant.id] = a;

    const ratedCount = list.filter((a) => a.combinedRating !== undefined).length;
    const bothRatedCount = list.filter((a) => a.bothRated).length;

    return {
      byId,
      list,
      ratedCount,
      totalCount: restaurants.length,
      bothRatedCount,
    };
  }, [restaurants, visits, dishes]);
}

export function useAggregate(id: string | undefined): RestaurantAggregate | undefined {
  const { byId } = useAggregates();
  return id ? byId[id] : undefined;
}
