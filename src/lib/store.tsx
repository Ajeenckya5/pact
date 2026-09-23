"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  FOODS,
  FRIENDS,
  INGREDIENTS,
  RECIPES,
  SEED_POSTS,
  goalById,
} from "./data";
import { combinePactScore } from "./algos";
import { rankPlate } from "./plate-vision";
import { mealSlice, matchIngredient, type DietId, type MealTargets } from "./kitchen";
import { tap } from "./experience";
import { askPersistentStorage, clearAccount, readAccount, writeAccount } from "./persist";
import { entriesToday, latestUndo, removedLabel, undoLabel as labelForUndo } from "./undo-log";
import { pushSip, totalWater, type WaterSip } from "./water-log";
import { emptyScore, friendFromContact, mergeContacts, seedScore } from "./training";
import { migrateConnectedWearables } from "./wearable-live";
import type {
  CartItem,
  ChatMessage,
  CoachMessage,
  CommunityPost,
  CustomWorkout,
  DayPoint,
  DeviceContact,
  Friend,
  GoalId,
  GroupMetric,
  GroupMode,
  GroupWorkout,
  CustomFood,
  MealLog,
  Order,
  PrivacyLevel,
  PrivacySettings,
  Prefs,
  WorkoutLog,
  WorkoutSource,
} from "./types";

const KEY = "pact.v1";

export type PactState = {
  goal: GoalId;
  connectedWearables: string[];
  stravaConnected: boolean;
  waterMl: number;
  meals: MealLog[];
  customFoods: CustomFood[];
  cart: CartItem[];
  storeId: string;
  selectedIngredients: string[];
  diets: DietId[];
  mealTargets: MealTargets;
  orders: Order[];
  friends: string[];
  extraFriends: Friend[];
  pendingFriends: string[];
  workoutLogs: WorkoutLog[];
  customWorkouts: CustomWorkout[];
  contacts: DeviceContact[];
  contactsSyncedAt: string | null;
  groups: GroupWorkout[];
  messages: Record<string, ChatMessage[]>;
  coachMessages: CoachMessage[];
  posts: CommunityPost[];
  privacy: PrivacySettings;
  checkins: { sleep: boolean; fuel: boolean; water: boolean; move: boolean };
  readingMin: number;
  blocked: string[];
  recovery: number;
  strain: number;
  sleepScore: number;
  sleepMin: number;
  hrv: number;
  rhr: number;
  steps: number;
  history: DayPoint[];
  prefs: Prefs;
  favoriteFoods: string[];
  favoriteWorkouts: string[];
  schema: number;
  demo: boolean;
  profile: { name: string; handle: string };
  streak: number;
  waterLog: WaterSip[];
};

const defaultPrivacy: PrivacySettings = {
  profile: "friends",
  recovery: "friends",
  strain: "friends",
  sleep: "private",
  calories: "private",
  workouts: "circle",
  location: "approximate",
  photoDefault: "friends",
  wearableSharing: true,
  activityStatus: true,
  readReceipts: false,
  searchable: true,
};

function seedHistory(): DayPoint[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 8, 6 + i));
    const wave = Math.sin(i / 2);
    return {
      date: d.toISOString().slice(0, 10),
      recovery: Math.round(72 + wave * 12 + i),
      strain: Number((8 + i * 0.7 + (i % 2) * 2).toFixed(1)),
      sleepMin: 390 + i * 8 - (i === 4 ? 70 : 0),
      sleepScore: 70 + i * 3 - (i === 4 ? 18 : 0),
      hrv: 48 + i * 2,
      rhr: 54 - Math.round(i / 2),
      kcal: 1800 + i * 40,
      water: 2400 + i * 80,
      steps: 8200 + i * 400,
    };
  });
}

function seedMessages(): Record<string, ChatMessage[]> {
  const now = Date.parse("2026-09-12T18:00:00.000Z");
  const t = (m: number) => new Date(now - m * 60_000).toISOString();
  return {
    maya: [
      { id: "m1", threadId: "maya", from: "maya", kind: "text", text: "Hills Saturday. Recovery 92. Don't flake.", at: t(180) },
      { id: "m2", threadId: "maya", from: "me", kind: "text", text: "If sleep holds. I still owe you 2.4k ml.", at: t(120) },
      { id: "m3", threadId: "maya", from: "maya", kind: "nudge", text: "Nudged you on water.", at: t(40) },
    ],
    jordan: [
      { id: "j1", threadId: "jordan", from: "jordan", kind: "text", text: "AI calorie scan was close on the salmon. Wild.", at: t(90) },
    ],
    riley: [
      { id: "r1", threadId: "riley", from: "riley", kind: "workout", text: "Finished Easy Golden Gate · 8.1 km", at: t(500) },
      { id: "r2", threadId: "riley", from: "me", kind: "text", text: "Legs or ego?", at: t(480) },
    ],
    sam: [],
    chris: [],
  };
}

const initial: PactState = {
  goal: "cut",
  connectedWearables: [],
  stravaConnected: true,
  waterMl: 1850,
  meals: [
    {
      id: "seed-1",
      foodId: "yogurt",
      name: "Berry yogurt bowl",
      kcal: 410,
      protein: 42,
      carbs: 38,
      fat: 9,
      at: "2026-09-12T16:12:00.000Z",
      source: "demo",
      photo: FOODS[1].photo,
    },
    {
      id: "seed-2",
      foodId: "salad",
      name: "Chicken avocado salad",
      kcal: 430,
      protein: 38,
      carbs: 14,
      fat: 24,
      at: "2026-09-12T19:40:00.000Z",
      source: "demo",
    },
  ],
  customFoods: [],
  cart: [
    { ingredientId: "chicken", qty: 2 },
    { ingredientId: "spinach", qty: 1 },
    { ingredientId: "yogurt", qty: 1 },
  ],
  storeId: "store-whole-4th",
  selectedIngredients: ["chicken", "yogurt", "spinach", "berries", "eggs", "oats"],
  diets: [],
  mealTargets: mealSlice({ kcal: 1900, protein: 165, carbs: 160, fat: 55 }),
  orders: [],
  friends: ["maya", "jordan", "sam", "riley", "chris"],
  extraFriends: [],
  pendingFriends: [],
  workoutLogs: [
    {
      id: "wl-strength",
      title: "20 min full-body strength",
      category: "Strength",
      minutes: 20,
      kcal: 240,
      at: "2026-09-11T18:12:00.000Z",
      source: "library",
      workoutId: "full-body",
    },
    {
      id: "wl-5k",
      title: "5K run",
      category: "Running",
      minutes: 31,
      kcal: 310,
      at: "2026-09-10T13:40:00.000Z",
      source: "common",
      workoutId: "c-5k",
    },
  ],
  customWorkouts: [],
  contacts: [],
  contactsSyncedAt: null,
  groups: [
    {
      id: "g-hills",
      title: "Saturday hill repeats",
      category: "Running",
      minutes: 45,
      kcal: 420,
      mode: "race",
      metric: "minutes",
      startsAt: "2026-09-12T15:00:00.000Z",
      endsAt: "2026-09-14T23:59:00.000Z",
      hostId: "maya",
      memberIds: ["maya", "riley"],
      pendingIds: ["me"],
      scores: {
        maya: { sessions: 2, minutes: 94, kcal: 860 },
        riley: { sessions: 1, minutes: 46, kcal: 410 },
      },
      templateId: "c-5k",
      createdAt: "2026-09-12T12:10:00.000Z",
    },
  ],
  messages: seedMessages(),
  coachMessages: [],
  posts: SEED_POSTS,
  privacy: defaultPrivacy,
  checkins: { sleep: true, fuel: false, water: false, move: false },
  readingMin: 22,
  blocked: [],
  recovery: 86,
  strain: 11.2,
  sleepScore: 84,
  sleepMin: 442,
  hrv: 62,
  rhr: 51,
  steps: 9640,
  history: seedHistory(),
  prefs: { units: "metric", onboarded: false, reducedMotion: false, theme: "dark" },
  favoriteFoods: ["chicken", "yogurt", "rice"],
  favoriteWorkouts: ["lift-squat", "full-body"],
  schema: 2,
  demo: true,
  profile: { name: "Alex Rivera", handle: "alex.pact" },
  streak: 47,
  waterLog: [
    { id: "w1", ml: 1000, at: "2026-09-12T14:00:00.000Z", source: "demo" },
    { id: "w2", ml: 500, at: "2026-09-12T16:00:00.000Z", source: "demo" },
    { id: "w3", ml: 350, at: "2026-09-12T18:00:00.000Z", source: "demo" },
  ],
};

const sampleAccount: PactState = initial;

function blankAccount(): PactState {
  return {
    ...sampleAccount,
    demo: false,
    profile: { name: "", handle: "" },
    streak: 0,
    stravaConnected: false,
    waterMl: 0,
    waterLog: [],
    meals: [],
    cart: [],
    selectedIngredients: [],
    orders: [],
    friends: [],
    workoutLogs: [],
    groups: [],
    messages: {},
    posts: [],
    checkins: { sleep: false, fuel: false, water: false, move: false },
    readingMin: 0,
    recovery: 0,
    strain: 0,
    sleepScore: 0,
    sleepMin: 0,
    hrv: 0,
    rhr: 0,
    steps: 0,
    history: [],
    favoriteFoods: [],
    favoriteWorkouts: [],
    prefs: { units: "metric", onboarded: false, reducedMotion: false, theme: "dark" },
  };
}

type Store = PactState & {
  ready: boolean;
  setGoal: (g: GoalId) => void;
  toggleWearable: (id: string) => void;
  setWearables: (ids: string[]) => void;
  setStrava: (v: boolean) => void;
  addWater: (ml: number) => void;
  addMeal: (meal: Omit<MealLog, "id" | "at">) => void;
  scanMeal: (fileName: string, photo?: string) => MealLog | null;
  removeMeal: (id: string) => void;
  saveCustomFood: (food: Omit<CustomFood, "id" | "createdAt">) => void;
  removeCustomFood: (id: string) => void;
  addToCart: (ingredientId: string, qty?: number) => void;
  setQty: (ingredientId: string, qty: number) => void;
  clearCart: () => void;
  setStore: (id: string) => void;
  toggleIngredient: (id: string) => void;
  stockGoalList: () => void;
  addRecipeToCart: (recipeId: string) => void;
  addKitchenToCart: (lines: Array<{ name: string; grams: number }>) => void;
  toggleDiet: (id: DietId) => void;
  setMealTargets: (t: MealTargets) => void;
  resetMealTargets: () => void;
  placeOrder: (address: string, opts?: { storeId?: string; storeName?: string }) => Order;
  sendMessage: (threadId: string, text: string, kind?: ChatMessage["kind"], photo?: string) => void;
  nudge: (friendId: string) => void;
  appendCoach: (messages: CoachMessage[]) => void;
  clearCoach: () => void;
  toggleLike: (postId: string) => void;
  addPost: (text: string, photo?: string) => void;
  addComment: (postId: string, text: string) => void;
  setPrivacy: (patch: Partial<PrivacySettings>) => void;
  setPrefs: (patch: Partial<Prefs>) => void;
  setProfile: (patch: Partial<PactState["profile"]>) => void;
  importAccount: (next: Partial<PactState>) => void;
  eraseAll: () => void;
  toggleFavoriteFood: (id: string) => void;
  toggleFavoriteWorkout: (id: string) => void;
  repeatLastMeal: () => void;
  undoLastMeal: () => void;
  undoWater: () => void;
  undoLatest: () => void;
  undoLabel: string | null;
  redo: () => void;
  canRedo: boolean;
  loadSample: () => void;
  leaveSample: () => void;
  setCheckin: (key: keyof PactState["checkins"], v: boolean) => void;
  addReading: (min: number) => void;
  logWorkout: (entry: Omit<WorkoutLog, "id" | "at">) => void;
  completeWorkout: (
    kcal: number,
    minutes: number,
    meta?: { title?: string; category?: string; source?: WorkoutSource; workoutId?: string; groupId?: string },
  ) => void;
  removeWorkoutLog: (id: string) => void;
  addCustomWorkout: (w: Omit<CustomWorkout, "id" | "createdAt">) => CustomWorkout;
  syncContacts: (incoming: DeviceContact[]) => void;
  addFriendFromContact: (contactId: string) => void;
  createGroupWorkout: (input: {
    title: string;
    category: string;
    minutes: number;
    kcal: number;
    mode: GroupMode;
    metric: GroupMetric;
    hours: number;
    memberIds: string[];
    templateId?: string;
  }) => GroupWorkout;
  inviteToGroup: (groupId: string, memberIds: string[]) => void;
  acceptGroup: (groupId: string) => void;
  declineGroup: (groupId: string) => void;
  toast: string | null;
  flash: (msg: string) => void;
};

const Ctx = createContext<Store | null>(null);

export function PactProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PactState>(() => blankAccount());
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const parsed = (await readAccount()) as Partial<PactState> | null;
        if (alive && parsed?.schema === 2) {
          setState((s) => {
            const parsedGoal = parsed.goal ?? s.goal;
            return {
              ...s,
              ...parsed,
              history: parsed.history?.length ? parsed.history : s.history,
              diets: Array.isArray(parsed.diets) ? parsed.diets : s.diets,
              mealTargets: parsed.mealTargets ?? mealSlice(goalById(parsedGoal)),
              workoutLogs: parsed.workoutLogs ?? s.workoutLogs,
              customWorkouts: parsed.customWorkouts ?? s.customWorkouts,
              contacts: parsed.contacts ?? s.contacts,
              contactsSyncedAt: parsed.contactsSyncedAt ?? s.contactsSyncedAt,
              groups: parsed.groups ?? s.groups,
              extraFriends: parsed.extraFriends ?? s.extraFriends,
              customFoods: parsed.customFoods ?? s.customFoods,
              coachMessages: parsed.coachMessages ?? s.coachMessages,
              prefs: { ...s.prefs, ...(parsed.prefs ?? {}) },
              favoriteFoods: parsed.favoriteFoods ?? s.favoriteFoods,
              favoriteWorkouts: parsed.favoriteWorkouts ?? s.favoriteWorkouts,
              connectedWearables: migrateConnectedWearables(parsed.connectedWearables),
            };
          });
        }
      } catch {
        /* empty account */
      }
      if (!alive) return;
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(KEY, JSON.stringify(state));
    void writeAccount(state);
  }, [state, ready]);

  const toastTimer = useRef<number | null>(null);
  const redoRef = useRef<((s: PactState) => PactState) | null>(null);
  const redoTimer = useRef<number | null>(null);
  const [canRedo, setCanRedo] = useState(false);

  const flash = useCallback((msg: string, ms = 2400) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), ms);
  }, []);

  const update = useCallback((fn: (s: PactState) => PactState) => {
    setState(fn);
  }, []);

  const offerRedo = useCallback((restore: (s: PactState) => PactState) => {
    redoRef.current = restore;
    setCanRedo(true);
    if (redoTimer.current) window.clearTimeout(redoTimer.current);
    redoTimer.current = window.setTimeout(() => {
      redoRef.current = null;
      setCanRedo(false);
    }, 6000);
  }, []);

  const redo = useCallback(() => {
    const restore = redoRef.current;
    if (!restore) return;
    redoRef.current = null;
    setCanRedo(false);
    if (redoTimer.current) window.clearTimeout(redoTimer.current);
    update(restore);
    flash("Restored");
  }, [flash, update]);

  const api = useMemo<Store>(() => {
    const undoLatest = () => {
      const last = latestUndo(entriesToday(state));
      if (!last) {
        flash("Nothing to undo");
        return;
      }
      const removed = removedLabel(last);
      if (last.kind === "water") {
        const sip = (state.waterLog ?? []).find((row) => row.id === last.id);
        if (!sip) {
          flash("Nothing to undo");
          return;
        }
        update((s) => {
          const waterLog = (s.waterLog ?? []).filter((row) => row.id !== sip.id);
          const waterMl = totalWater(waterLog);
          return {
            ...s,
            waterLog,
            waterMl,
            checkins: { ...s.checkins, water: waterMl >= goalById(s.goal).waterMl },
          };
        });
        offerRedo((current) => {
          const nextLog = [...(current.waterLog ?? []).filter((row) => row.id !== sip.id), sip];
          const ml = totalWater(nextLog);
          return {
            ...current,
            waterLog: nextLog,
            waterMl: ml,
            checkins: { ...current.checkins, water: ml >= goalById(current.goal).waterMl },
          };
        });
      } else {
        const meal = state.meals.find((row) => row.id === last.id);
        if (!meal) {
          flash("Nothing to undo");
          return;
        }
        update((s) => {
          const meals = s.meals.filter((row) => row.id !== meal.id);
          return {
            ...s,
            meals,
            checkins: { ...s.checkins, fuel: mealTotals(meals).protein >= goalById(s.goal).protein },
          };
        });
        offerRedo((current) => {
          const nextMeals = [meal, ...current.meals.filter((row) => row.id !== meal.id)];
          return {
            ...current,
            meals: nextMeals,
            checkins: { ...current.checkins, fuel: mealTotals(nextMeals).protein >= goalById(current.goal).protein },
          };
        });
      }
      flash(`Removed ${removed}`, 6000);
    };
    return {
      ...state,
      ready,
      toast,
      flash,
      setGoal: (g) => {
        update((s) => ({ ...s, goal: g, mealTargets: mealSlice(goalById(g)) }));
        flash(`Goal set to ${goalById(g).name}`);
      },
      toggleWearable: (id) =>
        update((s) => ({
          ...s,
          connectedWearables: s.connectedWearables.includes(id)
            ? s.connectedWearables.filter((x) => x !== id)
            : [...s.connectedWearables, id],
        })),
      setWearables: (ids) => {
        update((s) => ({ ...s, connectedWearables: ids }));
        flash(ids.length ? `Marked ${ids.length} wearable${ids.length === 1 ? "" : "s"}` : "No wearable connected");
      },
      setStrava: (v) => {
        update((s) => ({ ...s, stravaConnected: v }));
        flash(v ? "Strava connected" : "Strava disconnected");
      },
      addWater: (ml) => {
        if (!ml) return;
        update((s) => {
          const waterLog = pushSip(s.waterLog ?? [], {
            id: uid(),
            ml,
            at: new Date().toISOString(),
          });
          const waterMl = totalWater(waterLog);
          const goal = goalById(s.goal).waterMl;
          return {
            ...s,
            waterLog,
            waterMl,
            checkins: { ...s.checkins, water: waterMl >= goal },
          };
        });
        askPersistentStorage();
        flash(ml > 0 ? `Added ${ml} ml` : `Removed ${Math.abs(ml)} ml`);
      },
      undoLatest,
      undoLabel: labelForUndo(latestUndo(entriesToday(state))),
      redo,
      canRedo,
      undoWater: undoLatest,
      loadSample: () => {
        update((s) => ({ ...sampleAccount, prefs: { ...sampleAccount.prefs, onboarded: s.prefs.onboarded } }));
        flash("Sample data on");
      },
      leaveSample: () => {
        update((s) => ({ ...blankAccount(), prefs: { ...blankAccount().prefs, onboarded: true, units: s.prefs.units } }));
        flash("Sample data off");
      },
      addMeal: (meal) => {
        update((s) => {
          const meals = [{ ...meal, id: uid(), at: new Date().toISOString() }, ...s.meals];
          const tot = mealTotals(meals);
          const g = goalById(s.goal);
          return { ...s, meals, checkins: { ...s.checkins, fuel: tot.protein >= g.protein } };
        });
        flash(`Logged ${meal.name} · ${meal.kcal} kcal`);
      },
      saveCustomFood: (food) =>
        update((s) => {
          const name = food.name.trim();
          if (!name) return s;
          const existing = s.customFoods.find((f) => f.name.toLowerCase() === name.toLowerCase());
          const next: CustomFood = existing
            ? { ...existing, ...food, name }
            : { ...food, name, id: uid(), createdAt: new Date().toISOString() };
          return {
            ...s,
            customFoods: existing
              ? s.customFoods.map((f) => (f.id === existing.id ? next : f))
              : [next, ...s.customFoods],
          };
        }),
      removeCustomFood: (id) => update((s) => ({ ...s, customFoods: s.customFoods.filter((f) => f.id !== id) })),
      scanMeal: (fileName, photo) => {
        const scan = rankPlate({ filename: fileName, hour: new Date().getHours() });
        if (scan.unsure || !scan.top) {
          flash("Scan was unsure — pick the food on Calories");
          return null;
        }
        const food = scan.top;
        const meal: MealLog = {
          id: uid(),
          foodId: food.foodId ?? food.pantryId ?? food.id,
          name: `${food.name} (${food.grams}g)`,
          kcal: food.kcal,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          at: new Date().toISOString(),
          source: "ai",
          photo,
        };
        update((s) => {
          const meals = [meal, ...s.meals];
          const tot = mealTotals(meals);
          const g = goalById(s.goal);
          return { ...s, meals, checkins: { ...s.checkins, fuel: tot.protein >= g.protein } };
        });
        flash(`Logged ${food.name} · ${food.kcal} kcal`);
        return meal;
      },
      removeMeal: (id) =>
        update((s) => {
          const meals = s.meals.filter((m) => m.id !== id);
          const tot = mealTotals(meals);
          const g = goalById(s.goal);
          return { ...s, meals, checkins: { ...s.checkins, fuel: tot.protein >= g.protein } };
        }),
      addToCart: (ingredientId, qty = 1) =>
        update((s) => {
          const existing = s.cart.find((c) => c.ingredientId === ingredientId);
          const cart = existing
            ? s.cart.map((c) => (c.ingredientId === ingredientId ? { ...c, qty: c.qty + qty } : c))
            : [...s.cart, { ingredientId, qty }];
          return { ...s, cart };
        }),
      setQty: (ingredientId, qty) =>
        update((s) => ({
          ...s,
          cart: qty <= 0 ? s.cart.filter((c) => c.ingredientId !== ingredientId) : s.cart.map((c) => (c.ingredientId === ingredientId ? { ...c, qty } : c)),
        })),
      clearCart: () => update((s) => ({ ...s, cart: [] })),
      setStore: (id) => update((s) => ({ ...s, storeId: id })),
      toggleIngredient: (id) =>
        update((s) => ({
          ...s,
          selectedIngredients: s.selectedIngredients.includes(id)
            ? s.selectedIngredients.filter((x) => x !== id)
            : [...s.selectedIngredients, id],
        })),
      stockGoalList: () =>
        update((s) => {
          const ids = INGREDIENTS.filter((i) => i.goals.includes(s.goal)).map((i) => i.id);
          const cart = ids.map((ingredientId) => {
            const prev = s.cart.find((c) => c.ingredientId === ingredientId);
            return { ingredientId, qty: prev?.qty ?? 1 };
          });
          return { ...s, selectedIngredients: ids, cart };
        }),
      addRecipeToCart: (recipeId) => {
        update((s) => {
          const recipe = RECIPES.find((r) => r.id === recipeId);
          if (!recipe) return s;
          let cart = [...s.cart];
          for (const ingredientId of recipe.ingredients) {
            const existing = cart.find((c) => c.ingredientId === ingredientId);
            cart = existing
              ? cart.map((c) => (c.ingredientId === ingredientId ? { ...c, qty: c.qty + 1 } : c))
              : [...cart, { ingredientId, qty: 1 }];
          }
          return { ...s, cart };
        });
        flash("Recipe ingredients added to cart");
      },
      addKitchenToCart: (lines) => {
        update((s) => {
          let cart = [...s.cart];
          for (const line of lines) {
            if (line.grams < 4) continue;
            const match = matchIngredient(line.name);
            const ingredientId = match?.id ?? `custom:${line.name.toLowerCase()}`;
            const qty = Math.max(1, Math.round(line.grams / 150));
            const existing = cart.find((c) => c.ingredientId === ingredientId);
            const customName = match?.name ?? line.name;
            cart = existing
              ? cart.map((c) =>
                  c.ingredientId === ingredientId
                    ? { ...c, qty: c.qty + qty, grams: (c.grams ?? 0) + line.grams, customName }
                    : c,
                )
              : [...cart, { ingredientId, qty, customName, grams: line.grams }];
          }
          return { ...s, cart };
        });
        flash("Scaled ingredients added to cart");
      },
      toggleDiet: (id) =>
        update((s) => ({
          ...s,
          diets: s.diets.includes(id) ? s.diets.filter((d) => d !== id) : [...s.diets, id],
        })),
      setMealTargets: (t) => update((s) => ({ ...s, mealTargets: t })),
      resetMealTargets: () => update((s) => ({ ...s, mealTargets: mealSlice(goalById(s.goal)) })),
      placeOrder: (address, opts) => {
        const order: Order = {
          id: `ord-${uid()}`,
          storeId: opts?.storeId ?? state.storeId,
          storeName: opts?.storeName,
          items: state.cart,
          total: cartTotal(state.cart),
          eta: "35–50 min",
          placedAt: new Date().toISOString(),
          address,
        };
        update((s) => ({ ...s, orders: [order, ...s.orders], cart: [] }));
        flash("Order placed · driver assigned");
        return order;
      },
      sendMessage: (threadId, text, kind = "text", photo) =>
        update((s) => {
          const msg: ChatMessage = {
            id: uid(),
            threadId,
            from: "me",
            kind,
            text,
            photo,
            at: new Date().toISOString(),
          };
          return {
            ...s,
            messages: {
              ...s.messages,
              [threadId]: [...(s.messages[threadId] ?? []), msg],
            },
          };
        }),
      appendCoach: (messages) =>
        update((s) => ({
          ...s,
          coachMessages: [...s.coachMessages, ...messages].slice(-100),
        })),
      clearCoach: () => {
        update((s) => ({ ...s, coachMessages: [] }));
        flash("Coach thread cleared");
      },
      nudge: (friendId) => {
        const friend = FRIENDS.find((f) => f.id === friendId);
        update((s) => {
          const msg: ChatMessage = {
            id: uid(),
            threadId: friendId,
            from: "me",
            kind: "nudge",
            text: `Nudged ${friend?.name ?? "them"} — keep the pact.`,
            at: new Date().toISOString(),
          };
          return {
            ...s,
            messages: {
              ...s.messages,
              [friendId]: [...(s.messages[friendId] ?? []), msg],
            },
          };
        });
        flash(`Nudge sent to ${friend?.name ?? "friend"}`);
      },
      toggleLike: (postId) =>
        update((s) => ({
          ...s,
          posts: s.posts.map((p) =>
            p.id === postId ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p,
          ),
        })),
      addPost: (text, photo) =>
        update((s) => ({
          ...s,
          posts: [
            {
              id: uid(),
              authorId: "me",
              author: s.profile.name.trim() || "You",
              handle: s.profile.handle || "you",
              text,
              photo,
              at: new Date().toISOString(),
              likes: 0,
              liked: false,
              comments: [],
              stats:
                s.privacy.workouts === "private"
                  ? undefined
                  : { recovery: s.privacy.recovery === "private" ? undefined : s.recovery, strain: s.privacy.strain === "private" ? undefined : s.strain },
            },
            ...s.posts,
          ],
        })),
      addComment: (postId, text) =>
        update((s) => ({
          ...s,
          posts: s.posts.map((p) =>
            p.id === postId
              ? { ...p, comments: [...p.comments, { id: uid(), author: s.profile.name.trim() || "You", text }] }
              : p,
          ),
        })),
      setPrivacy: (patch) => update((s) => ({ ...s, privacy: { ...s.privacy, ...patch } })),
      setPrefs: (patch) => update((s) => ({ ...s, prefs: { ...s.prefs, ...patch } })),
      setProfile: (patch) =>
        update((s) => ({ ...s, demo: false, profile: { ...s.profile, ...patch } })),
      importAccount: (next) => {
        update(() => ({
          ...blankAccount(),
          ...next,
          schema: 2,
          prefs: { ...blankAccount().prefs, ...(next.prefs ?? {}), onboarded: true },
          profile: { ...blankAccount().profile, ...(next.profile ?? {}) },
        }));
        flash("Import restored this device");
      },
      eraseAll: () => {
        update(() => ({ ...blankAccount(), prefs: { ...blankAccount().prefs, onboarded: true } }));
        void clearAccount();
        flash("Everything on this device is erased");
      },
      toggleFavoriteFood: (id) =>
        update((s) => ({
          ...s,
          favoriteFoods: s.favoriteFoods.includes(id)
            ? s.favoriteFoods.filter((x) => x !== id)
            : [id, ...s.favoriteFoods].slice(0, 40),
        })),
      toggleFavoriteWorkout: (id) =>
        update((s) => ({
          ...s,
          favoriteWorkouts: s.favoriteWorkouts.includes(id)
            ? s.favoriteWorkouts.filter((x) => x !== id)
            : [id, ...s.favoriteWorkouts].slice(0, 40),
        })),
      repeatLastMeal: () => {
        update((s) => {
          const last = s.meals[0];
          if (!last) return s;
          const meals = [{ ...last, id: uid(), at: new Date().toISOString() }, ...s.meals];
          const tot = mealTotals(meals);
          const g = goalById(s.goal);
          return { ...s, meals, checkins: { ...s.checkins, fuel: tot.protein >= g.protein } };
        });
        flash("Repeated last meal");
        tap();
      },
      undoLastMeal: undoLatest,
      setCheckin: (key, v) => {
        update((s) => ({ ...s, checkins: { ...s.checkins, [key]: v } }));
        if (v) tap();
      },
      addReading: (min) => update((s) => ({ ...s, readingMin: s.readingMin + min })),
      logWorkout: (entry) => {
        update((s) => applyWorkoutLog(s, entry));
        flash(`Logged ${entry.title} · ${entry.minutes} min`);
      },
      completeWorkout: (kcal, minutes, meta) => {
        update((s) =>
          applyWorkoutLog(s, {
            title: meta?.title ?? "Session",
            category: meta?.category ?? "Training",
            minutes,
            kcal,
            source: meta?.source ?? "library",
            workoutId: meta?.workoutId,
            groupId: meta?.groupId,
          }),
        );
        flash(`Workout logged · +${kcal} kcal strain load`);
        tap(24);
      },
      removeWorkoutLog: (id) => update((s) => ({ ...s, workoutLogs: s.workoutLogs.filter((l) => l.id !== id) })),
      addCustomWorkout: (w) => {
        const row: CustomWorkout = { ...w, id: `cw-${uid()}`, createdAt: new Date().toISOString() };
        update((s) => ({ ...s, customWorkouts: [row, ...s.customWorkouts] }));
        flash(`Saved ${row.title}`);
        return row;
      },
      syncContacts: (incoming) => {
        update((s) => ({
          ...s,
          contacts: mergeContacts(s.contacts, incoming),
          contactsSyncedAt: new Date().toISOString(),
        }));
        flash(`Synced ${incoming.length} contacts`);
      },
      addFriendFromContact: (contactId) => {
        update((s) => {
          const contact = s.contacts.find((c) => c.id === contactId);
          if (!contact) return s;
          if (contact.friendId && s.friends.includes(contact.friendId)) {
            return s;
          }
          const friend = friendFromContact({ ...contact, friendId: undefined });
          return {
            ...s,
            extraFriends: s.extraFriends.some((f) => f.id === friend.id) ? s.extraFriends : [...s.extraFriends, friend],
            friends: s.friends.includes(friend.id) ? s.friends : [...s.friends, friend.id],
            contacts: s.contacts.map((c) => (c.id === contactId ? { ...c, friendId: friend.id } : c)),
            messages: s.messages[friend.id] ? s.messages : { ...s.messages, [friend.id]: [] },
          };
        });
        flash("Added to your circle");
      },
      createGroupWorkout: (input) => {
        const id = `g-${uid()}`;
        const now = new Date();
        const ends = new Date(now.getTime() + input.hours * 3600_000);
        const memberIds = Array.from(new Set(["me", ...input.memberIds]));
        const scores: GroupWorkout["scores"] = {};
        for (const mid of memberIds) scores[mid] = seedScore(mid, id);
        const group: GroupWorkout = {
          id,
          title: input.title,
          category: input.category,
          minutes: input.minutes,
          kcal: input.kcal,
          mode: input.mode,
          metric: input.metric,
          startsAt: now.toISOString(),
          endsAt: ends.toISOString(),
          hostId: "me",
          memberIds,
          pendingIds: [],
          scores,
          templateId: input.templateId,
          createdAt: now.toISOString(),
        };
        update((s) => {
          const messages = { ...s.messages };
          for (const mid of input.memberIds) {
            const msg: ChatMessage = {
              id: uid(),
              threadId: mid,
              from: "me",
              kind: "workout",
              text:
                input.mode === "race"
                  ? `Race invite: ${input.title} — first to the ${input.metric} wins. Open Workouts → Groups.`
                  : `Group session: ${input.title}. Log it on the same board.`,
              at: now.toISOString(),
            };
            messages[mid] = [...(messages[mid] ?? []), msg];
          }
          return { ...s, groups: [group, ...s.groups], messages };
        });
        flash(input.mode === "race" ? `Race live · ${memberIds.length} on the board` : `Group session · ${memberIds.length} invited`);
        return group;
      },
      inviteToGroup: (groupId, memberIds) => {
        update((s) => {
          const messages = { ...s.messages };
          const now = new Date().toISOString();
          for (const mid of memberIds) {
            messages[mid] = [
              ...(messages[mid] ?? []),
              {
                id: uid(),
                threadId: mid,
                from: "me" as const,
                kind: "workout" as const,
                text: "You're on the workout board. Open Workouts → Groups.",
                at: now,
              },
            ];
          }
          return {
            ...s,
            messages,
            groups: s.groups.map((g) => {
              if (g.id !== groupId) return g;
              const next = Array.from(new Set([...g.memberIds, ...memberIds]));
              const scores = { ...g.scores };
              for (const mid of memberIds) if (!scores[mid]) scores[mid] = seedScore(mid, g.id);
              return { ...g, memberIds: next, pendingIds: g.pendingIds.filter((id) => !memberIds.includes(id)), scores };
            }),
          };
        });
        flash("Invites sent");
      },
      acceptGroup: (groupId) => {
        update((s) => ({
          ...s,
          groups: s.groups.map((g) => {
            if (g.id !== groupId) return g;
            if (g.memberIds.includes("me")) return { ...g, pendingIds: g.pendingIds.filter((id) => id !== "me") };
            return {
              ...g,
              memberIds: [...g.memberIds, "me"],
              pendingIds: g.pendingIds.filter((id) => id !== "me"),
              scores: { ...g.scores, me: g.scores.me ?? emptyScore() },
            };
          }),
        }));
        flash("You're on the board");
      },
      declineGroup: (groupId) => {
        update((s) => ({
          ...s,
          groups: s.groups.map((g) =>
            g.id === groupId ? { ...g, pendingIds: g.pendingIds.filter((id) => id !== "me") } : g,
          ),
        }));
        flash("Invite dismissed");
      },
    };
  }, [state, ready, toast, flash, update, offerRedo, redo, canRedo]);

  if (!ready) {
    return (
      <Ctx.Provider value={api}>
        <div className="flex min-h-dvh items-center justify-center bg-ink font-display text-3xl tracking-tight text-acid">
          PACT
        </div>
      </Ctx.Provider>
    );
  }

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function usePact() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePact must be used inside PactProvider");
  return ctx;
}

export function useGoal() {
  const { goal } = usePact();
  return goalById(goal);
}

export function mealTotals(meals: MealLog[]) {
  return meals.reduce(
    (a, m) => ({
      kcal: a.kcal + m.kcal,
      protein: a.protein + m.protein,
      carbs: a.carbs + m.carbs,
      fat: a.fat + m.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function cartTotal(cart: CartItem[]) {
  return cart.reduce((sum, c) => {
    const ing = INGREDIENTS.find((i) => i.id === c.ingredientId);
    if (ing) return sum + ing.price * c.qty;
    const grams = c.grams ?? c.qty * 150;
    return sum + (grams / 100) * 0.85;
  }, 0);
}

export function pactScore(s: {
  recovery: number;
  sleepScore: number;
  meals: MealLog[];
  waterMl: number;
  checkins: PactState["checkins"];
  goal: GoalId;
}) {
  const g = goalById(s.goal);
  const totals = mealTotals(s.meals);
  const fuel =
    g.kcal === 0
      ? 0
      : Math.max(0, 100 - (Math.abs(totals.kcal - g.kcal) / g.kcal) * 100);
  const protein = Math.min(100, (totals.protein / g.protein) * 100);
  const hydro = Math.min(100, (s.waterMl / g.waterMl) * 100);
  const move = s.checkins.move ? 100 : 35;
  const pactDone = Object.values(s.checkins).filter(Boolean).length * 25;
  return combinePactScore({
    recovery: s.recovery,
    sleepScore: s.sleepScore,
    fuel,
    protein,
    hydro,
    move,
    pactDone,
  });
}

export function canSee(level: PrivacyLevel, relation: "self" | "friend" | "circle" | "public") {
  if (relation === "self") return true;
  const rank = { private: 0, friends: 1, circle: 2, public: 3 };
  const rel = { friend: 1, circle: 2, public: 3 };
  if (level === "private") return false;
  return rel[relation] >= rank[level];
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function applyWorkoutLog(s: PactState, entry: Omit<WorkoutLog, "id" | "at">): PactState {
  const log: WorkoutLog = { ...entry, id: uid(), at: new Date().toISOString() };
  let groups = s.groups;
  if (entry.groupId) {
    groups = s.groups.map((g) => {
      if (g.id !== entry.groupId || !g.memberIds.includes("me")) return g;
      const mine = g.scores.me ?? emptyScore();
      return {
        ...g,
        scores: {
          ...g.scores,
          me: {
            sessions: mine.sessions + 1,
            minutes: mine.minutes + entry.minutes,
            kcal: mine.kcal + entry.kcal,
          },
        },
      };
    });
  }
  return {
    ...s,
    strain: Number(Math.min(21, s.strain + entry.minutes / 20).toFixed(1)),
    checkins: { ...s.checkins, move: true },
    workoutLogs: [log, ...s.workoutLogs],
    groups,
  };
}
