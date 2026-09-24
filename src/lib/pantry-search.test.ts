import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { searchPantry } from "../../workers/api/src/pantry-data";

const FIXTURE: { region: string; q: string; id: string }[] = [
  { region: "India", q: "paneer", id: "paneer" },
  { region: "India", q: "dal", id: "dal" },
  { region: "India", q: "poha", id: "poha" },
  { region: "India", q: "idli", id: "idli" },
  { region: "India", q: "biryani", id: "biryani" },
  { region: "India", q: "naan", id: "naan" },
  { region: "India", q: "ghee", id: "ghee" },
  { region: "India", q: "chicken tikka", id: "chicken-tikka" },
  { region: "India", q: "dosa", id: "dosa" },
  { region: "India", q: "roti", id: "roti" },
  { region: "West Africa", q: "egusi", id: "egusi" },
  { region: "West Africa", q: "jollof", id: "jollof" },
  { region: "West Africa", q: "plantain", id: "plantain" },
  { region: "West Africa", q: "fufu", id: "fufu" },
  { region: "West Africa", q: "suya", id: "suya" },
  { region: "West Africa", q: "waakye", id: "waakye" },
  { region: "West Africa", q: "moin moin", id: "moin-moin" },
  { region: "West Africa", q: "banku", id: "banku" },
  { region: "Germany", q: "quark", id: "quark" },
  { region: "Germany", q: "bratwurst", id: "bratwurst" },
  { region: "Germany", q: "sauerkraut", id: "sauerkraut" },
  { region: "Germany", q: "pretzel", id: "pretzel" },
  { region: "Germany", q: "spaetzle", id: "spaetzle" },
  { region: "Germany", q: "schnitzel", id: "schnitzel" },
  { region: "Germany", q: "muesli", id: "muesli" },
  { region: "Germany", q: "kartoffelsalat", id: "kartoffelsalat" },
  { region: "Korea", q: "tteokbokki", id: "tteokbokki" },
  { region: "Korea", q: "kimchi", id: "kimchi" },
  { region: "Korea", q: "bibimbap", id: "bibimbap" },
  { region: "Korea", q: "bulgogi", id: "bulgogi" },
  { region: "Korea", q: "kimbap", id: "kimbap" },
  { region: "Korea", q: "japchae", id: "japchae" },
  { region: "Korea", q: "doenjang", id: "doenjang-jjigae" },
  { region: "Korea", q: "samgyeopsal", id: "samgyeopsal" },
  { region: "Latin America", q: "arepa", id: "arepa" },
  { region: "Latin America", q: "taco", id: "taco" },
  { region: "Latin America", q: "pupusa", id: "pupusa" },
  { region: "Latin America", q: "empanada", id: "empanada" },
  { region: "Latin America", q: "feijoada", id: "feijoada" },
  { region: "Latin America", q: "ceviche", id: "ceviche" },
  { region: "Latin America", q: "elote", id: "elote" },
  { region: "Latin America", q: "gallo pinto", id: "gallo-pinto" },
  { region: "Latin America", q: "horchata", id: "horchata" },
  { region: "Southeast Asia", q: "pho", id: "pho" },
  { region: "Southeast Asia", q: "miso", id: "miso" },
  { region: "Southeast Asia", q: "dumpling", id: "dumpling" },
  { region: "Southeast Asia", q: "pad thai", id: "pad-thai" },
  { region: "Southeast Asia", q: "ramen", id: "ramen" },
  { region: "Southeast Asia", q: "sushi", id: "sushi" },
  { region: "Southeast Asia", q: "congee", id: "congee" },
  { region: "Southeast Asia", q: "laksa", id: "laksa" },
  { region: "Southeast Asia", q: "spring roll", id: "spring-roll" },
  { region: "Mediterranean", q: "tzatziki", id: "tzatziki" },
  { region: "Mediterranean", q: "hummus", id: "hummus" },
  { region: "Mediterranean", q: "falafel", id: "falafel" },
  { region: "Mediterranean", q: "couscous", id: "couscous" },
  { region: "Mediterranean", q: "pita", id: "pita" },
  { region: "Mediterranean", q: "shawarma", id: "shawarma" },
  { region: "Mediterranean", q: "shakshuka", id: "shakshuka" },
  { region: "Mediterranean", q: "tabbouleh", id: "tabbouleh" },
];

describe("regional foods", () => {
  it("finds at least 95% of 60 foods across 7 regions in the top 5", () => {
    assert.equal(FIXTURE.length, 60);
    assert.equal(new Set(FIXTURE.map((row) => row.region)).size, 7);
    const misses: string[] = [];
    for (const row of FIXTURE) {
      const hits = searchPantry(row.q).slice(0, 5);
      if (!hits.some((item) => item.id === row.id)) misses.push(`${row.region}:${row.q}`);
    }
    const found = FIXTURE.length - misses.length;
    assert.ok(found / FIXTURE.length >= 0.95, `${found}/60 misses ${misses.join(", ")}`);
  });
});