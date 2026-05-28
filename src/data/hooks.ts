import { useEffect, useMemo, useState } from "react";
import {
  getCouple,
  getCurrentCoupleId,
  getCurrentUser,
  getPhotoUrl,
  getRestaurant,
  listCouples,
  listDishes,
  listRestaurants,
  listVisits,
  onChange,
  setCurrentCoupleId,
  setCurrentUser as dbSetCurrentUser,
} from "./db";
import type {
  Couple,
  Dish,
  Restaurant,
  RestaurantAggregate,
  UserId,
  Visit,
} from "./types";
import { verdictFromRatings } from "./types";

export function useTables(tables: string[]): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    return onChange((table) => {
      if (tables.includes(table)) setTick((t) => t + 1);
    });
  }, [tables.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  return tick;
}

// ------- Couple -------

export function useCouples(): Couple[] {
  const [list, setList] = useState<Couple[]>([]);
  const tick = useTables(["couples"]);
  useEffect(() => {
    listCouples().then(setList);
  }, [tick]);
  return list;
}

export function useCurrentCouple(): Couple | null {
  const [couple, setCouple] = useState<Couple | null>(null);
  const tick = useTables(["couples", "meta"]);
  useEffect(() => {
    (async () => {
      const id = await getCurrentCoupleId();
      if (!id) {
        setCouple(null);
        return;
      }
      const c = await getCouple(id);
      setCouple(c ?? null);
    })();
  }, [tick]);
  return couple;
}

export function useSwitchCouple(): (id: string | null) => Promise<void> {
  return (id) => setCurrentCoupleId(id);
}

// ------- Members within current couple -------

export function useCurrentUser(): [UserId, (id: UserId) => void] {
  const [user, setUser] = useState<UserId>("a");
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

// ------- Restaurants / Visits / Dishes (scoped to current couple) -------

export function useRestaurants(): Restaurant[] {
  const couple = useCurrentCouple();
  const [items, setItems] = useState<Restaurant[]>([]);
  const tick = useTables(["restaurants"]);
  useEffect(() => {
    if (!couple) {
      setItems([]);
      return;
    }
    listRestaurants(couple.id).then(setItems);
  }, [couple?.id, tick]);
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
  const couple = useCurrentCouple();
  const [items, setItems] = useState<Visit[]>([]);
  const tick = useTables(["visits"]);
  useEffect(() => {
    if (!couple) {
      setItems([]);
      return;
    }
    listVisits({ coupleId: couple.id, restaurantId }).then(setItems);
  }, [couple?.id, restaurantId, tick]);
  return items;
}

export function useDishes(filter?: {
  restaurantId?: string;
  visitId?: string;
}): Dish[] {
  const couple = useCurrentCouple();
  const [items, setItems] = useState<Dish[]>([]);
  const tick = useTables(["dishes", "photos"]);
  const key = `${filter?.restaurantId ?? ""}|${filter?.visitId ?? ""}`;
  useEffect(() => {
    if (!couple) {
      setItems([]);
      return;
    }
    listDishes({ coupleId: couple.id, ...filter }).then(setItems);
  }, [couple?.id, key, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  return items;
}

export function useAllVisits(): Visit[] {
  return useVisits();
}

export function useAllDishes(): Dish[] {
  return useDishes();
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
        a: [],
        b: [],
      };
      const visitsByUser: Record<UserId, number> = { a: 0, b: 0 };
      let lastVisit = 0;
      for (const v of vs) {
        visitsByUser[v.userId] = (visitsByUser[v.userId] ?? 0) + 1;
        if (v.rating !== undefined) ratingsByUser[v.userId].push(v.rating);
        if (v.date > lastVisit) lastVisit = v.date;
      }
      for (const d of ds) {
        ratingsByUser[d.userId].push(d.rating);
      }

      const aAvg = avg(ratingsByUser.a);
      const bAvg = avg(ratingsByUser.b);
      const both = aAvg !== undefined && bAvg !== undefined;
      const combined = both ? (aAvg! + bAvg!) / 2 : (aAvg ?? bAvg);

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
          ...(aAvg !== undefined ? { a: aAvg } : {}),
          ...(bAvg !== undefined ? { b: bAvg } : {}),
        },
        combinedRating: combined,
        bothRated: both,
        topDishes,
        verdict: verdictFromRatings(aAvg, bAvg),
      };
      return agg;
    });

    const byId: Record<string, RestaurantAggregate> = {};
    for (const a of list) byId[a.restaurant.id] = a;

    const ratedCount = list.filter(
      (a) => a.combinedRating !== undefined,
    ).length;
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

export function useAggregate(
  id: string | undefined,
): RestaurantAggregate | undefined {
  const { byId } = useAggregates();
  return id ? byId[id] : undefined;
}
