let items = [];

function grams(value) {
  const out = new Set();
  const text = value.toLowerCase();
  for (let i = 0; i < text.length - 2; i++) out.add(text.slice(i, i + 3));
  return out;
}

self.onmessage = (event) => {
  const data = event.data;
  if (data.type === "index") {
    items = data.items;
    return;
  }
  const q = String(data.q || "").trim().toLowerCase();
  const qg = grams(q);
  const hits = items
    .map((item) => {
      const name = item.name.toLowerCase();
      if (name === q) return { item, score: 1000 };
      if (name.startsWith(q)) return { item, score: 500 };
      if (name.includes(q)) return { item, score: 100 };
      const ig = grams(name);
      let shared = 0;
      for (const gram of qg) if (ig.has(gram)) shared += 1;
      return { item, score: shared };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((row) => row.item);
  self.postMessage({ id: data.id, hits });
};
