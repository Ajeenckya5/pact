import type { MuscleId } from "./muscles";

export type GoalId = "cut" | "recomp" | "bulk" | "endurance" | "longevity";

export type PrivacyLevel = "private" | "friends" | "circle" | "public";

export type Units = "metric" | "imperial";

export type Prefs = {
  units: Units;
  onboarded: boolean;
  reducedMotion: boolean;
  theme: "dark" | "light";
  seenReceipts?: boolean;
};

export type PlaceKind = "gym" | "grocery";

export type MessageKind = "text" | "photo" | "nudge" | "workout";

export type Goal = {
  id: GoalId;
  name: string;
  blurb: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  waterMl: number;
};

export type Wearable = {
  id: string;
  name: string;
  maker: string;
  platforms: Array<"ios" | "android">;
  metrics: string[];
  kind: "watch" | "band" | "ring" | "scale" | "platform";
};

export type WorkoutKind = "session" | "lift" | "split" | "program";

export type WorkoutPattern =
  | "squat"
  | "hinge"
  | "lunge"
  | "horizontal-push"
  | "vertical-push"
  | "horizontal-pull"
  | "vertical-pull"
  | "isolation"
  | "carry"
  | "core"
  | "olympic"
  | "plyo"
  | "condition";

export type ProgramDay = {
  label: string;
  workoutId: string;
};

export type Workout = {
  id: string;
  title: string;
  trainer: string;
  youtubeId: string;
  minutes: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  kcal: number;
  category: string;
  equipment: string[];
  muscles: string[];
  cue: string;
  kind?: WorkoutKind;
  primary?: MuscleId[];
  secondary?: MuscleId[];
  moves?: string[];
  pattern?: WorkoutPattern;
  prescription?: string;
  rest?: string;
  progression?: string;
  alternatives?: string[];
  days?: ProgramDay[];
};

export type WorkoutSource = "library" | "manual" | "common" | "group" | "strava";

export type WorkoutLog = {
  id: string;
  title: string;
  category: string;
  minutes: number;
  kcal: number;
  at: string;
  createdAt?: string;
  deviceId?: string;
  source: WorkoutSource;
  workoutId?: string;
  groupId?: string;
  notes?: string;
};

export type CustomWorkout = {
  id: string;
  title: string;
  category: string;
  minutes: number;
  kcal: number;
  equipment: string[];
  muscles: string[];
  cue: string;
  createdAt: string;
};

export type DeviceContact = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  handle?: string;
  friendId?: string;
  source: "device" | "dump";
};

export type GroupMode = "together" | "race";

export type GroupMetric = "minutes" | "kcal" | "sessions";

export type GroupScore = { sessions: number; minutes: number; kcal: number };

export type GroupWorkout = {
  id: string;
  title: string;
  category: string;
  minutes: number;
  kcal: number;
  mode: GroupMode;
  metric: GroupMetric;
  startsAt: string;
  endsAt: string;
  hostId: string;
  memberIds: string[];
  pendingIds: string[];
  scores: Record<string, GroupScore>;
  templateId?: string;
  createdAt: string;
};

export type Place = {
  id: string;
  name: string;
  kind: PlaceKind;
  lat: number;
  lng: number;
  area: string;
  hours: string;
  rating: number;
  tags: string[];
  inventory?: string[];
};

export type Food = {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  keywords: string[];
  meal: Array<"breakfast" | "lunch" | "dinner" | "snack">;
  photo: string;
  ingredients: string[];
};

export type Ingredient = {
  id: string;
  name: string;
  aisle: string;
  kcal100: number;
  protein100: number;
  price: number;
  stores: string[];
  goals: GoalId[];
};

export type Recipe = {
  id: string;
  name: string;
  minutes: number;
  kcal: number;
  protein: number;
  ingredients: string[];
  steps: string[];
  goals: GoalId[];
  photo: string;
};

export type Friend = {
  id: string;
  name: string;
  handle: string;
  city: string;
  recovery: number;
  strain: number;
  streak: number;
  pace: string;
  online: boolean;
};

export type MealLog = {
  id: string;
  foodId: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  at: string;
  createdAt?: string;
  deviceId?: string;
  source: "ai" | "manual" | "recipe" | "demo";
  photo?: string;
};

export type CustomFood = {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  servingG?: number;
  createdAt: string;
};

export type PactReport = {
  id: string;
  threadId: string;
  messageId: string;
  text: string;
  reason: string;
  at: string;
};

export type ChatMessage = {
  id: string;
  threadId: string;
  from: "me" | string;
  kind: MessageKind;
  text: string;
  photo?: string;
  at: string;
  status?: "pending" | "delivered" | "seen" | "failed";
};

export type CoachMessage = {
  id: string;
  role: "me" | "coach";
  text: string;
  at: string;
  qaId?: string;
  topic?: string;
};

export type CommunityPost = {
  id: string;
  authorId: string;
  author: string;
  handle: string;
  text: string;
  photo?: string;
  at: string;
  likes: number;
  liked: boolean;
  comments: Array<{ id: string; author: string; text: string }>;
  stats?: { recovery?: number; strain?: number; workout?: string };
};

export type CartItem = {
  ingredientId: string;
  qty: number;
  customName?: string;
  grams?: number;
};

export type Order = {
  id: string;
  storeId: string;
  storeName?: string;
  items: CartItem[];
  total: number;
  eta: string;
  placedAt: string;
  address: string;
};

export type PrivacySettings = {
  profile: PrivacyLevel;
  recovery: PrivacyLevel;
  strain: PrivacyLevel;
  sleep: PrivacyLevel;
  calories: PrivacyLevel;
  workouts: PrivacyLevel;
  location: "off" | "approximate" | "precise";
  photoDefault: PrivacyLevel;
  wearableSharing: boolean;
  activityStatus: boolean;
  readReceipts: boolean;
  searchable: boolean;
};

export type DayPoint = {
  date: string;
  recovery: number;
  strain: number;
  sleepMin: number;
  sleepScore: number;
  hrv: number;
  rhr: number;
  kcal: number;
  water: number;
  steps: number;
};
