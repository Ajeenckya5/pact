export const FAQ_CATEGORIES = [
  "Pact",
  "Calories",
  "Workouts",
  "Market",
  "Circle",
  "Privacy",
  "Coach",
] as const;

export type FaqCategory = (typeof FAQ_CATEGORIES)[number];

export type FaqItem = {
  id: string;
  category: FaqCategory;
  q: string;
  a: string;
};

export const FAQS: FaqItem[] = [
  {
    id: "pact-what",
    category: "Pact",
    q: "What is Pact?",
    a: "Pact is a Whoop-style accountability desk: recovery, strain, sleep, calories, workouts, groceries, friends, and privacy on one dark canvas. The pact is the four boxes you keep today — sleep, protein, water, train — not a subscription strain score.",
  },
  {
    id: "pact-whoop",
    category: "Pact",
    q: "How is Pact different from Whoop?",
    a: "Whoop sells a strap and a recovery number. Pact is wearable-agnostic, logs the plate, programs the library, builds a grocery cart from your goal, and lets you share less than a strain app usually does.",
  },
  {
    id: "pact-score",
    category: "Pact",
    q: "What is Pact score?",
    a: "A weighted 0–100: recovery 24%, sleep 20%, fuel+protein 20%, water 12%, training 14%, today's pact boxes 10%. Fuel is closeness to the calorie target. It lives on Overview. It is not VO2 or a medical score.",
  },
  {
    id: "pact-goal",
    category: "Pact",
    q: "How do I change my goal?",
    a: "Overview has Cut, Recomp, Lean bulk, Endurance, and Longevity chips. Picking one rewrites calorie and protein targets and the grocery 'build cart' list. The coach reads the same goal.",
  },
  {
    id: "pact-demo",
    category: "Pact",
    q: "Is this a live account?",
    a: "A fresh install is empty. Your name, logs, and pacts stay on this device. Sample data is optional and labeled. There is no login.",
  },
  {
    id: "pact-data",
    category: "Pact",
    q: "Where is my data stored?",
    a: "In localStorage on this device. Clearing site data resets meals, the cart, coach chat, and privacy toggles. Nothing is billed to a cloud model.",
  },
  {
    id: "pact-nav",
    category: "Pact",
    q: "Where is Places vs Market?",
    a: "Places is the map (gyms and grocers from OpenStreetMap around you). Market is /fuel — ingredients, recipes, and checkout. Calories is the meal log.",
  },
  {
    id: "pact-mobile",
    category: "Pact",
    q: "What are the five tabs on a phone?",
    a: "Home, Fuel (calories), Train (workouts), Circle (community), and Chat with friends. Coach and FAQ live in the sidebar menu.",
  },
  {
    id: "pact-toast",
    category: "Pact",
    q: "What are the green toasts?",
    a: "Confirmations: logged a meal, connected Strava, placed an order, set a goal. They vanish on their own. They are not errors.",
  },
  {
    id: "pact-city",
    category: "Pact",
    q: "Why does weather mention my city?",
    a: "Overview and Sleep pull Open-Meteo for the location you allow. If location is off, it falls back to the profile city.",
  },
  {
    id: "pact-checkin",
    category: "Pact",
    q: "How do today's pact boxes work?",
    a: "Sleep 7h+, Hit protein, Drink the tank, Train today. Tap to toggle. Protein also flips when the meal log clears the goal. Water flips when you hit the millilitre target.",
  },
  {
    id: "pact-reset",
    category: "Pact",
    q: "How do I reset the demo?",
    a: "Delete pact.v1 from the browser's local storage for this origin, then refresh. You get Alex, the seed meals, and the hill-repeat group again.",
  },
  {
    id: "cal-scan",
    category: "Calories",
    q: "Where can I scan a photo?",
    a: "A photo stays on this device and is matched by color. Food search uses the catalog, and this device keeps at most 200 recent and favorite foods. On Calories you still confirm before a meal is logged.",
  },
  {
    id: "cal-atwater",
    category: "Calories",
    q: "How are calories calculated?",
    a: "Pantry rows store USDA-style kcal per 100g, scaled as grams/100. The Proof line also shows Atwater 4×protein + 4×carbs + 9×fat from those macros. Typed custom food with a blank kcal box uses Atwater.",
  },
  {
    id: "cal-pantry",
    category: "Calories",
    q: "How do I log an ingredient?",
    a: "Search the pantry (460 foods) or pick a group. Set portion grams or leave blank for the listed serving, then tap the row. Macros scale per 100g.",
  },
  {
    id: "cal-custom",
    category: "Calories",
    q: "What if the food isn't listed?",
    a: "Use Manual macros: name, kcal, protein, carbs, fat. Leave kcal blank and Pact estimates 4P + 4C + 9F. Check 'Save to my foods' to keep it for next search.",
  },
  {
    id: "cal-off",
    category: "Calories",
    q: "What is Open Food Facts?",
    a: "A live packaged-food search after two characters. If the network misses, the pantry and manual form still count. Packaged hits are tagged OFF.",
  },
  {
    id: "cal-remove",
    category: "Calories",
    q: "How do I delete a logged meal?",
    a: "The trash icon on the log row. Totals on Calories and Overview update immediately.",
  },
  {
    id: "cal-source",
    category: "Calories",
    q: "What do AI / manual / recipe mean on a log row?",
    a: "AI is a photo scan. Manual is pantry, Open Food Facts, or typed macros. Recipe is a plate sent over from the kitchen.",
  },
  {
    id: "cal-protein",
    category: "Calories",
    q: "When does Hit protein check off?",
    a: "When today's logged protein reaches the goal (Cut is 165g). Logging a meal that crosses the line sets the fuel check-in.",
  },
  {
    id: "cal-photo",
    category: "Calories",
    q: "Are meal photos uploaded?",
    a: "They stay as local object URLs in this browser. Privacy → Calories controls whether friends would ever see calories at all; the demo does not ship photos to a server.",
  },
  {
    id: "cal-grams",
    category: "Calories",
    q: "Does portion grams apply to plated meals?",
    a: "Grams scale pantry ingredients. Common plates and Open Food Facts log as listed servings. Manual macros are the serving you typed, not per 100g unless you said so.",
  },
  {
    id: "cal-groups",
    category: "Calories",
    q: "What are the food group chips?",
    a: "Meat, Seafood, Dairy, Egg, Plant protein, Grain, Produce, Fruit, Nut/seed, Fat, Condiment, Beverage, Snack, Prepared, Supplement. All shows the 460 count; pick a group to browse without typing.",
  },
  {
    id: "cal-saved",
    category: "Calories",
    q: "Where do saved custom foods live?",
    a: "Under Your foods on Calories, persisted in pact.v1. Trash removes them from the library, not from meals you already logged.",
  },
  {
    id: "wo-library",
    category: "Workouts",
    q: "How big is the workout library?",
    a: "Programs, split days, single-lift films, and follow-alongs — 159 Pact films plus a searchable wger directory. Open Workouts → Library.",
  },
  {
    id: "wo-log",
    category: "Workouts",
    q: "How do I log a workout?",
    a: "Play a film and log from the detail page, or add a manual session from the desk. Completing a session can tick Train today.",
  },
  {
    id: "wo-group",
    category: "Workouts",
    q: "What are group workouts?",
    a: "Together or race boards with friends, a metric (minutes, kcal, sessions), and a window. Saturday hill repeats is the seed. Chat is separate from the board.",
  },
  {
    id: "wo-strava",
    category: "Workouts",
    q: "Does Strava import rides automatically?",
    a: "Strava is a connection toggle and a feed of public activity when you ask. It is not a paid webhook. Connect it on Wearables or the Strava page.",
  },
  {
    id: "wo-alternatives",
    category: "Workouts",
    q: "What are lift alternatives?",
    a: "On a film page, Pact lists other library IDs that train a similar pattern — goblet instead of back squat, and so on — so you can swap without leaving the desk.",
  },
  {
    id: "wo-muscles",
    category: "Workouts",
    q: "What is the muscle map?",
    a: "Front and back overlays from wger, tinted for primary vs secondary. It is anatomy for the film, not a body-fat scan.",
  },
  {
    id: "wo-custom",
    category: "Workouts",
    q: "Can I save my own workout?",
    a: "Yes — custom workouts live in the same local store as logs. They are yours on this device, not a cloud program.",
  },
  {
    id: "wo-common",
    category: "Workouts",
    q: "What is a common workout vs a library film?",
    a: "Common is a quick log (5K, easy spin). Library is a programmed film with a trainer, prescription, and YouTube id. Groups can use either as a template.",
  },
  {
    id: "wo-today",
    category: "Workouts",
    q: "How does today's session pick work?",
    a: "Today's session uses the strap you paired (heart rate, cadence, power, and HRV when the strap sends it), your log, this week's sessions, protein left, favorites, your goal, and the weather. Coach uses the same pick as Today.",
  },
  {
    id: "wo-search",
    category: "Workouts",
    q: "How do I find a lift in the library?",
    a: "Library search matches title, trainer, cue, muscles, equipment, and pattern. Filter by kind, muscle group, duration, and level so 110 lifts don't dump at once.",
  },
  {
    id: "mkt-fuel",
    category: "Market",
    q: "What does Market do?",
    a: "Pick a goal, tick ingredients you keep, match recipes, and build a cart at a grocer OpenStreetMap found near you. Checkout is a demo order with an ETA.",
  },
  {
    id: "mkt-kitchen",
    category: "Market",
    q: "What is the recipe kitchen?",
    a: "A solver that scales a plate to your meal targets, swaps for diets (vegan, gluten-free, keto-leaning, and the rest), and can log the plate or send lines to the cart.",
  },
  {
    id: "mkt-diets",
    category: "Market",
    q: "Which diets can the kitchen honor?",
    a: "Vegan, vegetarian, pescatarian, gluten-free, dairy-free, nut-free, halal, kosher-leaning, keto-leaning, and paleo-leaning. Stack chips; illegal lines get swapped.",
  },
  {
    id: "mkt-store",
    category: "Market",
    q: "Why does a chip say other store?",
    a: "That grocer's inventory (when OSM tags exist) doesn't list the ingredient. You can still add it; the cart marks it as not at this store.",
  },
  {
    id: "mkt-custom-cart",
    category: "Market",
    q: "Can I add something that isn't a grocery chip?",
    a: "The kitchen sends unmatched lines as custom cart rows with a name and grams. Price is estimated. Market chips stay the staple SKU list so 'build goal cart' doesn't dump 460 items.",
  },
  {
    id: "mkt-order",
    category: "Market",
    q: "Is checkout a real grocery order?",
    a: "No. Place order writes a local Order with store, items, total, and ETA. No card is charged.",
  },
  {
    id: "mkt-location",
    category: "Market",
    q: "Grocers didn't load.",
    a: "Set a location (Places or the location bar). If OpenStreetMap is quiet, retry. Pact does not fall back to a fake city list.",
  },
  {
    id: "cir-friends",
    category: "Circle",
    q: "Who is in my circle?",
    a: "Friends are people you add from your own contacts. Friends and Chat share that list. Blocked people drop out.",
  },
  {
    id: "cir-chat",
    category: "Circle",
    q: "Is Chat the same as Pact Coach?",
    a: "No. Chat is people — photos, nudges, session shares. Coach is a workout and diet desk with a built-in Q&A corpus. FAQ is product how-to. Three different rooms.",
  },
  {
    id: "cir-nudge",
    category: "Circle",
    q: "What does Nudge do?",
    a: "Drops a nudge message in that friend's thread. It is accountability, not a push vendor.",
  },
  {
    id: "cir-community",
    category: "Circle",
    q: "What can I post in Community?",
    a: "Text and an optional photo, with optional recovery/strain/workout stats. A photo stays on this device. Likes and comments stay local. Photo default follows Privacy.",
  },
  {
    id: "cir-contacts",
    category: "Circle",
    q: "Can I import phone contacts?",
    a: "Friends can merge a device contact dump into the circle and promote one to a pact friend. It never leaves this browser in the demo.",
  },
  {
    id: "cir-receipts",
    category: "Circle",
    q: "Are there read receipts?",
    a: "Off unless you enable them in Privacy. The chat copy reminds you of that.",
  },
  {
    id: "prv-levels",
    category: "Privacy",
    q: "What do private / friends / circle / public mean?",
    a: "Private never leaves the phone. Friends is your pact list. Circle is community. Public is the internet — off by default. Every metric has its own level.",
  },
  {
    id: "prv-calories",
    category: "Privacy",
    q: "Who sees my calories?",
    a: "Calories defaults to private. Raising the level would share the log with friends or the circle in a fuller build; the demo still keeps photos local.",
  },
  {
    id: "prv-location",
    category: "Privacy",
    q: "How precise is location?",
    a: "Off, approximate (neighborhood), or precise. Approximate is the default for gyms and grocers. Precise is the doorway — you have to ask for it.",
  },
  {
    id: "prv-wearable",
    category: "Privacy",
    q: "Does wearable sharing send HRV to friends?",
    a: "The toggle is the intent. The demo does not upload HRV. Turning it off is the honest default if you don't want recovery on a circle card.",
  },
  {
    id: "prv-searchable",
    category: "Privacy",
    q: "What does searchable by handle do?",
    a: "Whether @alex.pact would show up if someone looked. Default on for the demo so the circle can find you.",
  },
  {
    id: "prv-coach",
    category: "Privacy",
    q: "Does Pact Coach send my questions to OpenAI or similar?",
    a: "No. Coach answers from a built-in training and diet corpus on this device. No model vendor, no paid key. Product how-tos belong in FAQ, not in that chat.",
  },
  {
    id: "wo-film",
    category: "Workouts",
    q: "Why is a YouTube film missing?",
    a: "Library IDs were checked with oEmbed when they were added. If a trainer took a video down, pick an alternative on the same film page.",
  },
  {
    id: "slp-reading",
    category: "Pact",
    q: "What is wind-down reading on Sleep?",
    a: "A minutes counter for the book that actually put you under. Add time on Sleep. It is a habit cue, not a Kindle sync.",
  },
  {
    id: "h2o-log",
    category: "Pact",
    q: "How do I log water?",
    a: "Water page or Overview +250 / +500 / +750. Goal millilitres come from the selected goal (Cut is 3200).",
  },
  {
    id: "wr-connect",
    category: "Pact",
    q: "Which wearables can I connect?",
    a: "On the Android app, tap Pair and allow Nearby devices. On the website, Chrome or Edge Web Bluetooth reads the strap you pick. Apple Watch, Oura, and WHOOP fill Today after they write into Apple Health or Health Connect on the phone app. Open Track to record GPS with the live sample.",
  },
  {
    id: "pact-apk-pages",
    category: "Pact",
    q: "What's the difference between GitHub Pages and the APK?",
    a: "The website at ajeenckya5.github.io/pact can pair a strap in Chrome. The Android app adds native Bluetooth and GPS. Watches show up when their health data is in Apple Health or Health Connect.",
  },
  {
    id: "map-osm",
    category: "Market",
    q: "Where do gyms and grocers come from?",
    a: "OpenStreetMap Overpass around your coordinates. No Google Places key. The map itself is OSM raster (dark-inverted) with OSM.de then Esri Canvas Dark Gray as fallbacks — no CARTO key.",
  },
  {
    id: "coach-what",
    category: "Coach",
    q: "What is Pact Coach?",
    a: "A workout and diet coach on this device. Today's session is scored from the Bluetooth device you paired (HR/cadence/power when present), your Pact log, protein, and weather — the same function Overview uses — then lifts and foods are gated on that pick. The big Q&A desk is for ingredients and exercise names, not a hardcoded squat card.",
  },
  {
    id: "coach-faq-diff",
    category: "Coach",
    q: "When should I use FAQ vs Coach?",
    a: "FAQ is how the app works (scan a plate, privacy levels, where Places lives). Coach is how you train and eat (sets for a squat on a cut, whether salmon fits the remaining protein). If you ask Coach an app how-to, it will point you here.",
  },
  {
    id: "coach-count",
    category: "Coach",
    q: "Are there really 10,000+ answers?",
    a: "Yes. The desk expands lifts × goals, pantry foods × goals, issues, sessions, and splits into a counted corpus. Browse it on the Coach page or just ask in the thread.",
  },
  {
    id: "coach-medical",
    category: "Coach",
    q: "Is Coach medical advice?",
    a: "No. It is programming and macro coaching from on-device copy. Pain, injury, eating disorders, and clinical questions need a human clinician — Coach will say so.",
  },
  {
    id: "coach-context",
    category: "Coach",
    q: "Does Coach see my recovery and meals?",
    a: "It reads the Bluetooth device you paired (if any) plus this browser's Pact log — recovery, strain, sleep, HR, goal, protein, calories, water, workout log, and weather — so 'what should I train today?' matches Overview. That context does not leave the device.",
  },
  {
    id: "coach-clear",
    category: "Coach",
    q: "How do I clear the coach thread?",
    a: "Use Clear thread on the Coach page. The corpus stays; only the conversation resets.",
  },
  {
    id: "cal-kitchen-log",
    category: "Calories",
    q: "Can a recipe land in the calorie log?",
    a: "Yes. From the kitchen, log the solved plate. Source shows as recipe. Removing it is the same trash control as any meal.",
  },
  {
    id: "pact-strain",
    category: "Pact",
    q: "What is strain?",
    a: "A 0–21 training-load style number. Pairing a BLE strap can raise it: min(21, max(baseline, baseline + max(0, HR − RHR − 28) / 10, baseline + watts / 45)). Unpaired, it stays on the Pact log. It is not a lab TRIMP.",
  },
  {
    id: "pact-recovery",
    category: "Pact",
    q: "What is recovery?",
    a: "A 0–100 readiness number. Green is go. The coach treats very low recovery as a protect day even if the ego wants a PR.",
  },
  {
    id: "pact-jump",
    category: "Pact",
    q: "How do I jump between desks?",
    a: "Press ⌘K (Ctrl-K on Windows) or tap Jump in the header. Type calories, coach, squat, privacy. Esc closes it. Skip to content is the first Tab on every page.",
  },
  {
    id: "pact-units",
    category: "Pact",
    q: "How do I switch ml and oz?",
    a: "Privacy → Experience, or the ml / oz chips on Water. Weather follows °C / °F. Calories stay grams and kcal.",
  },
  {
    id: "wo-rest",
    category: "Workouts",
    q: "Where is the rest timer?",
    a: "On a lift film, next to Mark complete. It reads the prescription rest (90s, 2 min, 2–3 min). Start / pause / reset. Phones vibrate when rest ends.",
  },
  {
    id: "cal-repeat",
    category: "Calories",
    q: "Can I log the same meal twice?",
    a: "Repeat last copies the newest log. Undo last peels it off. Star a pantry row to pin it under Favorites. Copy copies name + macros.",
  },
];

export function searchFaq(query: string, category: FaqCategory | "All" = "All"): FaqItem[] {
  const pool = category === "All" ? FAQS : FAQS.filter((f) => f.category === category);
  const n = query.trim().toLowerCase();
  if (!n) return pool;
  const tokens = n.split(/\s+/).filter((t) => t.length > 1);
  return pool
    .map((item) => {
      const hay = `${item.q} ${item.a} ${item.category}`.toLowerCase();
      let s = 0;
      if (item.q.toLowerCase().includes(n)) s += 50;
      if (hay.includes(n)) s += 20;
      for (const t of tokens) if (hay.includes(t)) s += 8;
      return { item, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.item.q.localeCompare(b.item.q))
    .map((x) => x.item);
}

export function faqLooksLikeAppHelp(query: string) {
  const n = query.toLowerCase();
  return (
    /how do i|where is|what is pact|privacy|localstorage|open food facts|scan a meal|checkout|read receipts|pact score|sidebar|jump|command-k|rest timer|units|millilitre|ounces/.test(
      n,
    ) && /app|pact|page|button|chip|log|scan|privacy|cart|faq|setting/.test(n)
  );
}
