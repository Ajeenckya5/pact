export const PANTRY_GROUPS = [
  "Meat",
  "Seafood",
  "Dairy",
  "Egg",
  "Plant protein",
  "Grain",
  "Produce",
  "Fruit",
  "Nut/seed",
  "Fat",
  "Condiment",
  "Beverage",
  "Snack",
  "Prepared",
  "Supplement",
] as const;

export type PantryGroup = (typeof PANTRY_GROUPS)[number];

export type PantryItem = {
  id: string;
  name: string;
  group: PantryGroup;
  aisle: string;
  aliases: string[];
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  servingG: number;
  servingLabel: string;
};

export type ScaledMacros = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

/**
 * Grocery-complete calorie pantry. Values are typical USDA-style per 100g
 * (cooked for meats/grains people actually log, raw for produce).
 * Fields: id|name|group|aisle|kcal|P|C|F|servingG|servingLabel|alias;alias
 */
const RAW = `
chicken|Chicken breast|Meat|Meat|165|31|0|3.6|170|170g cooked|chicken breast;poultry;grilled chicken;chicken
chicken-thigh|Chicken thigh|Meat|Meat|209|26|0|10.9|150|150g cooked|thigh;dark meat
chicken-wing|Chicken wing|Meat|Meat|203|30|0|8.1|90|3 wings|wings
rotisserie-chicken|Rotisserie chicken|Meat|Meat|190|27|0|8|140|140g|rotisserie
ground-chicken|Ground chicken|Meat|Meat|143|17|0|8|113|4 oz|chicken mince
turkey-breast|Turkey breast|Meat|Meat|135|30|0|1|170|170g|turkey;sliced turkey
ground-turkey|Ground turkey|Meat|Meat|170|27|0|8|113|4 oz|turkey mince
turkey-bacon|Turkey bacon|Meat|Meat|220|16|0|16|16|2 slices|
ground-beef-90|Ground beef 90/10|Meat|Meat|176|20|0|10|113|4 oz|lean ground beef;mince
ground-beef-80|Ground beef 80/20|Meat|Meat|254|17|0|20|113|4 oz|ground beef;hamburger meat
steak|Sirloin steak|Meat|Meat|183|27|0|8|170|6 oz|steak;beef steak
ribeye|Ribeye steak|Meat|Meat|291|24|0|22|170|6 oz|rib eye
filet-mignon|Filet mignon|Meat|Meat|217|26|0|12|170|6 oz|filet;tenderloin steak
roast-beef|Roast beef|Meat|Meat|175|26|0|7|85|3 oz deli|
beef-brisket|Beef brisket|Meat|Meat|250|25|0|16|170|6 oz|brisket
pork-chop|Pork chop|Meat|Meat|231|24|0|14|170|6 oz|
pork-tenderloin|Pork tenderloin|Meat|Meat|143|26|0|3.5|170|6 oz|
pork-belly|Pork belly|Meat|Meat|518|9|0|53|100|100g|
bacon|Bacon|Meat|Meat|541|37|1.4|42|16|2 slices|
ham|Ham|Meat|Meat|145|21|1.5|6|85|3 oz|
sausage|Pork sausage|Meat|Meat|301|12|2|27|66|1 link|
italian-sausage|Italian sausage|Meat|Meat|346|14|3|31|84|1 link|
chicken-sausage|Chicken sausage|Meat|Meat|196|14|4|13|85|1 link|
bratwurst|Bratwurst|Meat|Meat|297|12|2|26|85|1 link|
chorizo|Chorizo|Meat|Meat|455|24|2|38|50|50g|
kielbasa|Kielbasa|Meat|Meat|309|12|3|27|56|2 oz|
lamb-chop|Lamb chop|Meat|Meat|294|25|0|21|170|6 oz|lamb
ground-lamb|Ground lamb|Meat|Meat|283|17|0|23|113|4 oz|
duck-breast|Duck breast|Meat|Meat|337|19|0|28|170|6 oz|duck
venison|Venison|Meat|Meat|158|30|0|3.2|170|6 oz|deer
bison|Bison|Meat|Meat|143|28|0|2.4|170|6 oz|buffalo
veal|Veal|Meat|Meat|172|24|0|8|170|6 oz|
goat|Goat meat|Meat|Meat|143|27|0|3|170|6 oz|
pepperoni|Pepperoni|Meat|Meat|504|19|4|46|30|10 slices|
salami|Salami|Meat|Meat|336|22|2|26|28|1 oz|
prosciutto|Prosciutto|Meat|Meat|195|28|0|8|28|1 oz|
deli-turkey|Deli turkey|Meat|Meat|104|17|2|2|56|2 oz|
deli-ham|Deli ham|Meat|Meat|107|17|2|4|56|2 oz|
hot-dog|Hot dog|Meat|Meat|290|10|4|26|56|1 dog|frankfurter
meatball|Meatball|Meat|Meat|286|18|8|19|28|1 meatball|
chicken-liver|Chicken liver|Meat|Meat|167|25|1|6.5|100|100g|
beef-liver|Beef liver|Meat|Meat|135|20|4|4|100|100g|liver
pulled-pork|Pulled pork|Meat|Meat|168|23|0|8|140|5 oz|
corned-beef|Corned beef|Meat|Meat|251|18|0|19|85|3 oz|
pastrami|Pastrami|Meat|Meat|133|22|0|4|56|2 oz|
jerky|Beef jerky|Meat|Meat|410|33|11|26|28|1 oz|
salmon|Atlantic salmon|Seafood|Seafood|208|20|0|13|170|6 oz|salmon fillet
smoked-salmon|Smoked salmon|Seafood|Seafood|117|18|0|4.3|85|3 oz|lox
tuna-steak|Tuna steak|Seafood|Seafood|132|28|0|1|170|6 oz|ahi;tuna
canned-tuna|Canned tuna in water|Seafood|Seafood|86|19|0|1|85|1 can drained|tuna can
canned-tuna-oil|Canned tuna in oil|Seafood|Seafood|198|29|0|8|85|1 can drained|
canned-salmon|Canned salmon|Seafood|Seafood|136|20|0|5|85|1 can|
cod|Cod|Seafood|Seafood|82|18|0|0.7|170|6 oz|
haddock|Haddock|Seafood|Seafood|90|20|0|0.6|170|6 oz|
tilapia|Tilapia|Seafood|Seafood|96|20|0|1.7|170|6 oz|
halibut|Halibut|Seafood|Seafood|111|21|0|2.3|170|6 oz|
trout|Trout|Seafood|Seafood|148|21|0|7|170|6 oz|
mackerel|Mackerel|Seafood|Seafood|205|19|0|14|170|6 oz|
sardines|Sardines|Seafood|Seafood|208|25|0|11|85|1 can|sardine
anchovy|Anchovy|Seafood|Seafood|131|20|0|5|20|4 fillets|
shrimp|Shrimp|Seafood|Seafood|99|24|0.2|0.3|100|100g|prawn;prawns
crab|Crab|Seafood|Seafood|87|18|0|1|85|3 oz|
lobster|Lobster|Seafood|Seafood|89|19|0|0.9|170|6 oz|
scallops|Scallops|Seafood|Seafood|69|12|2|0.5|85|3 oz|
mussels|Mussels|Seafood|Seafood|86|12|4|2.2|85|3 oz|
oysters|Oysters|Seafood|Seafood|68|7|4|2|85|3 oz|
clams|Clams|Seafood|Seafood|86|15|3|1|85|3 oz|
calamari|Calamari|Seafood|Seafood|92|16|3|1.4|85|3 oz|squid
octopus|Octopus|Seafood|Seafood|82|15|2|1|85|3 oz|
swordfish|Swordfish|Seafood|Seafood|144|20|0|7|170|6 oz|
sea-bass|Sea bass|Seafood|Seafood|97|18|0|2|170|6 oz|
snapper|Snapper|Seafood|Seafood|100|20|0|1.3|170|6 oz|
mahi-mahi|Mahi-mahi|Seafood|Seafood|85|18|0|0.7|170|6 oz|
catfish|Catfish|Seafood|Seafood|105|18|0|3|170|6 oz|
pollock|Pollock|Seafood|Seafood|92|20|0|1|170|6 oz|
eel|Eel|Seafood|Seafood|184|18|0|12|100|100g|
fish-sticks|Fish sticks|Seafood|Seafood|244|11|22|12|56|2 sticks|
imitation-crab|Imitation crab|Seafood|Seafood|95|8|15|0.5|85|3 oz|surimi
caviar|Caviar|Seafood|Seafood|264|25|4|18|16|1 tbsp|
yogurt|Greek yogurt 0%|Dairy|Dairy|59|10|3.6|0.4|170|170g|nonfat greek yogurt;0% yogurt;yoghurt;yogurt
greek-yogurt-2|Greek yogurt 2%|Dairy|Dairy|73|10|4|2|170|170g|
greek-yogurt-5|Greek yogurt 5%|Dairy|Dairy|97|9|4|5|170|170g|whole milk greek yogurt
yogurt-regular|Regular yogurt|Dairy|Dairy|61|3.5|4.7|3.3|170|170g|
skyr|Skyr|Dairy|Dairy|63|11|4|0.2|170|170g|
kefir|Plain kefir|Dairy|Dairy|41|4|4.5|1|240|1 cup|
cottage-cheese|Cottage cheese|Dairy|Dairy|98|11|3.4|4.3|113|1/2 cup|
ricotta|Ricotta|Dairy|Dairy|174|11|3|13|124|1/2 cup|
cream-cheese|Cream cheese|Dairy|Dairy|342|6|4|34|28|2 tbsp|
sour-cream|Sour cream|Dairy|Dairy|193|2|5|19|30|2 tbsp|
heavy-cream|Heavy cream|Dairy|Dairy|340|2|3|36|15|1 tbsp|whipping cream;cream
half-half|Half and half|Dairy|Dairy|131|3|4|12|30|2 tbsp|
whole-milk|Whole milk|Dairy|Dairy|61|3.2|4.8|3.3|244|1 cup|milk;whole milk
milk-2|2% milk|Dairy|Dairy|50|3.3|4.8|2|244|1 cup|reduced fat milk
skim-milk|Skim milk|Dairy|Dairy|34|3.4|5|0.1|245|1 cup|nonfat milk
lactose-free-milk|Lactose-free milk|Dairy|Dairy|50|3.3|5|2|244|1 cup|
chocolate-milk|Chocolate milk|Dairy|Dairy|83|3.3|10|3.4|250|1 cup|
cheddar|Cheddar|Dairy|Dairy|403|25|1.3|33|28|1 oz|
mozzarella|Mozzarella|Dairy|Dairy|280|28|3|17|28|1 oz|
parmesan|Parmesan|Dairy|Dairy|431|38|4|29|10|2 tbsp|
swiss|Swiss cheese|Dairy|Dairy|380|27|5|28|28|1 oz|
feta|Feta|Dairy|Dairy|264|14|4|21|28|1 oz|
goat-cheese|Goat cheese|Dairy|Dairy|364|22|0|30|28|1 oz|
brie|Brie|Dairy|Dairy|334|21|0|28|28|1 oz|
blue-cheese|Blue cheese|Dairy|Dairy|353|21|2|29|28|1 oz|
provolone|Provolone|Dairy|Dairy|351|26|2|27|28|1 oz|
string-cheese|String cheese|Dairy|Dairy|280|25|2|20|28|1 stick|
american-cheese|American cheese|Dairy|Dairy|371|18|5|32|21|1 slice|
paneer|Paneer|Dairy|Dairy|265|18|3|20|50|50g|
queso-fresco|Queso fresco|Dairy|Dairy|299|18|3|24|28|1 oz|
halloumi|Halloumi|Dairy|Dairy|321|22|2|25|28|1 oz|
burrata|Burrata|Dairy|Dairy|285|17|3|23|50|50g|
labneh|Labneh|Dairy|Dairy|160|8|4|12|30|2 tbsp|
gouda|Gouda|Dairy|Dairy|356|25|2|27|28|1 oz|
colby-jack|Colby Jack|Dairy|Dairy|384|23|2|32|28|1 oz|
butter|Butter|Dairy|Dairy|717|0.9|0.1|81|14|1 tbsp|
ghee|Ghee|Dairy|Dairy|876|0|0|99|14|1 tbsp|
ice-cream|Ice cream|Dairy|Dairy|207|4|24|11|66|1/2 cup|
frozen-yogurt|Frozen yogurt|Dairy|Dairy|127|3|22|4|87|1/2 cup|
whipped-cream|Whipped cream|Dairy|Dairy|257|3|13|22|15|2 tbsp|
eggs|Whole egg|Egg|Dairy|143|13|1|10|50|1 large|egg;eggs;pasture eggs
egg-white|Egg white|Egg|Dairy|52|11|0.7|0.2|33|1 white|egg whites
egg-yolk|Egg yolk|Egg|Dairy|322|16|4|27|17|1 yolk|
liquid-egg-white|Liquid egg whites|Egg|Dairy|52|11|0.7|0.2|46|3 tbsp|
tofu|Firm tofu|Plant protein|Plant|76|8|2|5|126|1/2 block|tofu
extra-firm-tofu|Extra-firm tofu|Plant protein|Plant|144|17|3|9|126|1/2 block|
silken-tofu|Silken tofu|Plant protein|Plant|55|5|3|3|100|100g|
tempeh|Tempeh|Plant protein|Plant|193|19|9|11|84|3 oz|
seitan|Seitan|Plant protein|Plant|370|75|14|2|85|3 oz|
edamame|Edamame|Plant protein|Plant|121|12|9|5|80|1/2 cup|
veggie-burger|Veggie burger|Plant protein|Plant|177|16|14|6|70|1 patty|
beyond-burger|Beyond Burger|Plant protein|Plant|230|20|7|14|113|1 patty|
impossible-burger|Impossible Burger|Plant protein|Plant|240|19|9|14|113|1 patty|
tvp|TVP|Plant protein|Plant|327|52|34|1|24|1/4 cup dry|textured vegetable protein
soy-curls|Soy curls|Plant protein|Plant|333|50|28|1|30|1 oz dry|
chickpeas|Chickpeas|Plant protein|Dry|164|9|27|2.6|82|1/2 cup|garbanzo;chickpea
lentils|Lentils|Plant protein|Dry|116|9|20|0.4|99|1/2 cup|lentil
black-beans|Black beans|Plant protein|Dry|132|9|24|0.5|86|1/2 cup|
kidney-beans|Kidney beans|Plant protein|Dry|127|9|23|0.5|88|1/2 cup|
pinto-beans|Pinto beans|Plant protein|Dry|143|9|26|0.7|86|1/2 cup|
white-beans|White beans|Plant protein|Dry|139|10|25|0.4|90|1/2 cup|cannellini
hummus|Hummus|Plant protein|Aisle|166|8|14|10|30|2 tbsp|
falafel|Falafel|Plant protein|Plant|333|13|32|18|17|1 piece|
rice|White rice, cooked|Grain|Dry|130|2.7|28|0.3|158|1 cup|rice;jasmine rice;cooked rice
brown-rice|Brown rice, cooked|Grain|Dry|123|2.7|26|1|195|1 cup|
basmati-rice|Basmati rice, cooked|Grain|Dry|121|3|25|0.4|158|1 cup|
wild-rice|Wild rice, cooked|Grain|Dry|101|4|21|0.3|164|1 cup|
sushi-rice|Sushi rice, cooked|Grain|Dry|130|2.4|29|0.2|140|1 cup|
quinoa|Quinoa, cooked|Grain|Dry|120|4.4|21|1.9|185|1 cup|quinoa
oats|Rolled oats|Grain|Dry|389|17|66|7|40|1/2 cup dry|oat;oatmeal;rolled oats
steel-cut-oats|Steel-cut oats|Grain|Dry|379|13|67|7|40|1/4 cup dry|
instant-oats|Instant oats|Grain|Dry|370|13|67|7|35|1 packet dry|
pasta|Pasta, cooked|Grain|Dry|131|5|25|1.1|140|1 cup|spaghetti;penne;noodles
whole-wheat-pasta|Whole-wheat pasta|Grain|Dry|124|5|26|0.5|140|1 cup|
rice-noodles|Rice noodles|Grain|Dry|109|1|25|0.2|176|1 cup|
soba|Soba noodles|Grain|Dry|99|5|21|0.1|114|1 cup|
udon|Udon noodles|Grain|Dry|99|3|22|0.2|200|1 cup|
couscous|Couscous, cooked|Grain|Dry|112|4|23|0.2|157|1 cup|
bulgur|Bulgur, cooked|Grain|Dry|83|3|19|0.2|182|1 cup|
farro|Farro, cooked|Grain|Dry|170|7|35|1|85|1/2 cup|
barley|Barley, cooked|Grain|Dry|123|2.3|28|0.4|157|1 cup|
millet|Millet, cooked|Grain|Dry|119|3.5|23|1|174|1 cup|
buckwheat|Buckwheat, cooked|Grain|Dry|92|3.4|20|0.6|168|1 cup|
polenta|Polenta, cooked|Grain|Dry|85|2|18|0.4|234|1 cup|
bread|White bread|Grain|Dry|265|9|49|3.2|30|1 slice|bread
sourdough|Sourdough|Grain|Dry|289|8|56|2|50|1 slice|
whole-wheat-bread|Whole-wheat bread|Grain|Dry|247|13|41|3.4|32|1 slice|
bagel|Bagel|Grain|Dry|257|10|50|1.7|98|1 bagel|
english-muffin|English muffin|Grain|Dry|223|8|44|1.7|57|1 muffin|
flour-tortilla|Flour tortilla|Grain|Dry|312|8|51|8|49|1 tortilla|wrap
corn-tortilla|Corn tortilla|Grain|Dry|218|6|45|3|24|1 tortilla|
pita|Pita|Grain|Dry|275|9|56|1.2|60|1 pita|
naan|Naan|Grain|Dry|291|9|50|6|90|1 piece|
croissant|Croissant|Grain|Dry|406|8|46|21|57|1 croissant|
pancake|Pancake|Grain|Dry|227|6|28|10|40|1 pancake|
waffle|Waffle|Grain|Dry|291|8|33|14|75|1 waffle|
granola|Granola|Grain|Dry|471|10|64|20|30|1/4 cup|
cereal|Breakfast cereal|Grain|Dry|378|8|84|2|30|1 cup|
crackers|Crackers|Grain|Aisle|502|7|61|26|15|5 crackers|
pretzels|Pretzels|Grain|Aisle|380|10|80|3|30|1 oz|
rice-cake|Rice cake|Grain|Aisle|387|8|81|3|9|1 cake|
popcorn|Popcorn|Grain|Aisle|387|13|78|5|8|1 cup popped|
flour|All-purpose flour|Grain|Dry|364|10|76|1|30|1/4 cup|
almond-flour|Almond flour|Grain|Dry|571|21|21|50|28|1/4 cup|
coconut-flour|Coconut flour|Grain|Dry|400|19|60|13|30|1/4 cup|
breadcrumbs|Breadcrumbs|Grain|Dry|395|13|72|5|15|2 tbsp|
ramen-noodles|Ramen noodles, dry|Grain|Dry|439|10|63|16|85|1 block|
gnocchi|Gnocchi|Grain|Dry|133|4|27|0.5|140|1 cup|
stuffing|Stuffing|Grain|Dry|117|3|13|6|100|100g|
spinach|Baby spinach|Produce|Produce|23|2.9|3.6|0.4|30|1 cup|spinach
kale|Kale|Produce|Produce|35|2.9|4.4|1.5|20|1 cup|
arugula|Arugula|Produce|Produce|25|2.6|3.7|0.7|20|1 cup|
lettuce|Iceberg lettuce|Produce|Produce|14|0.9|3|0.1|50|2 cups|
romaine|Romaine|Produce|Produce|17|1.2|3.3|0.3|47|2 cups|
mixed-greens|Mixed greens|Produce|Produce|17|1.5|3|0.2|40|2 cups|
cabbage|Cabbage|Produce|Produce|25|1.3|6|0.1|89|1 cup|
red-cabbage|Red cabbage|Produce|Produce|31|1.4|7|0.2|89|1 cup|
broccoli|Broccoli|Produce|Produce|34|2.8|7|0.4|91|1 cup|broccoli crowns
broccolini|Broccolini|Produce|Produce|32|3|6|0.4|80|1 cup|
cauliflower|Cauliflower|Produce|Produce|25|1.9|5|0.3|100|1 cup|
brussels-sprouts|Brussels sprouts|Produce|Produce|43|3.4|9|0.3|88|1 cup|
asparagus|Asparagus|Produce|Produce|20|2.2|3.9|0.1|90|6 spears|
green-beans|Green beans|Produce|Produce|31|1.8|7|0.1|100|1 cup|
peas|Green peas|Produce|Produce|81|5|14|0.4|80|1/2 cup|
corn|Corn|Produce|Produce|86|3.3|19|1.4|82|1/2 cup|
zucchini|Zucchini|Produce|Produce|17|1.2|3.1|0.3|124|1 cup|
cucumber|Cucumber|Produce|Produce|15|0.7|3.6|0.1|104|1 cup|
celery|Celery|Produce|Produce|16|0.7|3|0.2|101|1 cup|
carrot|Carrot|Produce|Produce|41|0.9|10|0.2|61|1 medium|
beet|Beet|Produce|Produce|43|1.6|10|0.2|68|1/2 cup|
radish|Radish|Produce|Produce|16|0.7|3.4|0.1|58|1/2 cup|
onion|Onion|Produce|Produce|40|1.1|9|0.1|110|1 medium|
red-onion|Red onion|Produce|Produce|40|1.1|9|0.1|110|1 medium|
green-onion|Green onion|Produce|Produce|32|1.8|7|0.2|15|2 stalks|scallion
shallot|Shallot|Produce|Produce|72|2.5|17|0.1|20|1 shallot|
garlic|Garlic|Produce|Produce|149|6.4|33|0.5|9|3 cloves|
ginger|Ginger|Produce|Produce|80|1.8|18|0.8|5|1 tsp grated|
tomato|Tomato|Produce|Produce|18|0.9|3.9|0.2|123|1 medium|
cherry-tomato|Cherry tomato|Produce|Produce|18|0.9|3.9|0.2|150|1 cup|
bell-pepper|Bell pepper|Produce|Produce|31|1|6|0.3|119|1 medium|bell pepper;capsicum
jalapeno|Jalapeño|Produce|Produce|29|0.9|6.5|0.4|14|1 pepper|
chili-pepper|Chili pepper|Produce|Produce|40|1.9|9|0.4|14|1 pepper|
mushroom|Mushroom|Produce|Produce|22|3.1|3.3|0.3|70|1 cup|
portobello|Portobello|Produce|Produce|22|2.1|4|0.3|84|1 cap|
potato|Potato|Produce|Produce|77|2|17|0.1|173|1 medium|russet
red-potato|Red potato|Produce|Produce|70|1.9|16|0.1|150|1 medium|
sweet-potato|Sweet potato|Produce|Produce|86|1.6|20|0.1|130|1 medium|
butternut|Butternut squash|Produce|Produce|45|1|12|0.1|100|1 cup|
pumpkin|Pumpkin|Produce|Produce|26|1|7|0.1|123|1/2 cup|
eggplant|Eggplant|Produce|Produce|25|1|6|0.2|82|1 cup|
okra|Okra|Produce|Produce|33|1.9|7|0.2|80|1 cup|
artichoke|Artichoke|Produce|Produce|47|3.3|11|0.2|120|1 medium|
leek|Leek|Produce|Produce|61|1.5|14|0.3|89|1 cup|
fennel|Fennel|Produce|Produce|31|1.2|7|0.2|87|1 cup|
bok-choy|Bok choy|Produce|Produce|13|1.5|2.2|0.2|70|1 cup|
napa-cabbage|Napa cabbage|Produce|Produce|16|1.2|3|0.2|80|1 cup|
nori|Nori|Produce|Produce|35|6|5|0.3|3|1 sheet|seaweed
kimchi|Kimchi|Produce|Produce|15|1.1|2.4|0.5|75|1/2 cup|
sauerkraut|Sauerkraut|Produce|Produce|19|0.9|4|0.1|71|1/2 cup|
pickle|Pickle|Produce|Produce|11|0.3|2.3|0.2|35|1 spear|
olive|Olives|Produce|Produce|115|0.8|6|11|15|5 olives|
avocado|Hass avocado|Produce|Produce|160|2|9|15|68|1/2 fruit|avocado
cilantro|Cilantro|Produce|Produce|23|2|4|0.5|4|2 tbsp|
parsley|Parsley|Produce|Produce|36|3|6|0.8|4|2 tbsp|
basil|Basil|Produce|Produce|23|3|2.7|0.6|3|2 tbsp|
mint|Mint|Produce|Produce|44|3.3|8|0.7|3|2 tbsp|
dill|Dill|Produce|Produce|43|3.5|7|1.1|1|1 tbsp|
sprouts|Bean sprouts|Produce|Produce|31|3|6|0.2|50|1 cup|
microgreens|Microgreens|Produce|Produce|31|2.5|4|0.5|20|1 cup|
jicama|Jicama|Produce|Produce|38|0.7|9|0.1|65|1/2 cup|
turnip|Turnip|Produce|Produce|28|0.9|6|0.1|65|1/2 cup|
parsnip|Parsnip|Produce|Produce|75|1.2|18|0.3|67|1/2 cup|
collard|Collard greens|Produce|Produce|32|3|6|0.6|36|1 cup|
swiss-chard|Swiss chard|Produce|Produce|19|1.8|3.7|0.2|36|1 cup|
watercress|Watercress|Produce|Produce|11|2.3|1.3|0.1|17|1 cup|
sun-dried-tomato|Sun-dried tomato|Produce|Produce|258|14|56|3|10|2 pieces|
snap-peas|Snap peas|Produce|Produce|42|2.8|8|0.2|63|1 cup|
apple|Apple|Fruit|Produce|52|0.3|14|0.2|182|1 medium|
banana|Banana|Fruit|Produce|89|1.1|23|0.3|118|1 medium|
orange|Orange|Fruit|Produce|47|0.9|12|0.1|131|1 medium|
mandarin|Mandarin|Fruit|Produce|53|0.8|13|0.3|76|1 fruit|clementine;tangerine
grapefruit|Grapefruit|Fruit|Produce|42|0.8|11|0.1|123|1/2 fruit|
lemon|Lemon|Fruit|Produce|29|1.1|9|0.3|58|1 lemon|
lime|Lime|Fruit|Produce|30|0.7|11|0.2|67|1 lime|
grape|Grapes|Fruit|Produce|69|0.7|18|0.2|92|1 cup|
strawberry|Strawberry|Fruit|Produce|32|0.7|8|0.3|152|1 cup|
blueberry|Blueberry|Fruit|Produce|57|0.7|14|0.3|148|1 cup|blueberries
raspberry|Raspberry|Fruit|Produce|52|1.2|12|0.7|123|1 cup|
blackberry|Blackberry|Fruit|Produce|43|1.4|10|0.5|144|1 cup|
berries|Mixed berries|Fruit|Produce|50|0.8|12|0.4|140|1 cup|berry
cherry|Cherries|Fruit|Produce|63|1.1|16|0.2|138|1 cup|
peach|Peach|Fruit|Produce|39|0.9|10|0.3|150|1 medium|
nectarine|Nectarine|Fruit|Produce|44|1.1|11|0.3|142|1 medium|
pear|Pear|Fruit|Produce|57|0.4|15|0.1|178|1 medium|
plum|Plum|Fruit|Produce|46|0.7|11|0.3|66|1 medium|
mango|Mango|Fruit|Produce|60|0.8|15|0.4|165|1 cup|
pineapple|Pineapple|Fruit|Produce|50|0.5|13|0.1|165|1 cup|
watermelon|Watermelon|Fruit|Produce|30|0.6|8|0.2|152|1 cup|
cantaloupe|Cantaloupe|Fruit|Produce|34|0.8|8|0.2|160|1 cup|
honeydew|Honeydew|Fruit|Produce|36|0.5|9|0.1|170|1 cup|
kiwi|Kiwi|Fruit|Produce|61|1.1|15|0.5|69|1 fruit|
papaya|Papaya|Fruit|Produce|43|0.5|11|0.3|145|1 cup|
pomegranate|Pomegranate|Fruit|Produce|83|1.7|19|1.2|87|1/2 cup arils|
fig|Fig|Fruit|Produce|74|0.8|19|0.3|50|1 large|
date|Date|Fruit|Produce|282|2.5|75|0.4|24|2 dates|dates;medjool
raisin|Raisins|Fruit|Produce|299|3.1|79|0.5|40|1/4 cup|
cranberry|Cranberries|Fruit|Produce|46|0.4|12|0.1|100|1 cup|
dried-cranberry|Dried cranberries|Fruit|Produce|308|0.1|83|1.4|40|1/4 cup|
coconut|Coconut meat|Fruit|Produce|354|3.3|15|33|30|1/4 cup|
apricot|Apricot|Fruit|Produce|48|1.4|11|0.4|35|1 fruit|
persimmon|Persimmon|Fruit|Produce|70|0.6|19|0.2|168|1 fruit|
guava|Guava|Fruit|Produce|68|2.6|14|1|165|1 cup|
dragon-fruit|Dragon fruit|Fruit|Produce|60|1.2|13|0.4|206|1 cup|
passion-fruit|Passion fruit|Fruit|Produce|97|2.2|23|0.7|18|1 fruit|
lychee|Lychee|Fruit|Produce|66|0.8|17|0.4|190|1 cup|
acai|Açaí puree|Fruit|Produce|70|1|4|5|100|100g|
goji|Goji berries|Fruit|Produce|349|14|77|0.4|28|1 oz|
almonds|Almonds|Nut/seed|Aisle|579|21|22|50|28|1 oz|almond
almond-butter|Almond butter|Nut/seed|Aisle|614|21|19|56|32|2 tbsp|
peanut|Peanuts|Nut/seed|Aisle|567|26|16|49|28|1 oz|
peanut-butter|Peanut butter|Nut/seed|Aisle|588|25|20|50|32|2 tbsp|
cashew|Cashews|Nut/seed|Aisle|553|18|30|44|28|1 oz|
cashew-butter|Cashew butter|Nut/seed|Aisle|587|18|30|50|32|2 tbsp|
walnut|Walnuts|Nut/seed|Aisle|654|15|14|65|28|1 oz|
pecan|Pecans|Nut/seed|Aisle|691|9|14|72|28|1 oz|
pistachio|Pistachios|Nut/seed|Aisle|560|20|27|45|28|1 oz|
hazelnut|Hazelnuts|Nut/seed|Aisle|628|15|17|61|28|1 oz|
macadamia|Macadamia|Nut/seed|Aisle|718|8|14|76|28|1 oz|
brazil-nut|Brazil nuts|Nut/seed|Aisle|659|14|12|67|28|1 oz|
sunflower-seed|Sunflower seeds|Nut/seed|Aisle|584|21|20|51|28|1 oz|
pumpkin-seed|Pumpkin seeds|Nut/seed|Aisle|559|30|10|49|28|1 oz|pepita
chia|Chia seeds|Nut/seed|Aisle|486|17|42|31|28|2 tbsp|
flax|Flaxseed|Nut/seed|Aisle|534|18|29|42|13|2 tbsp|
hemp-heart|Hemp hearts|Nut/seed|Aisle|553|32|9|49|30|3 tbsp|
sesame|Sesame seeds|Nut/seed|Aisle|573|17|23|50|9|1 tbsp|
tahini|Tahini|Nut/seed|Aisle|595|17|21|54|15|1 tbsp|
pine-nut|Pine nuts|Nut/seed|Aisle|673|14|13|68|28|1 oz|
mixed-nuts|Mixed nuts|Nut/seed|Aisle|607|20|21|54|28|1 oz|
trail-mix|Trail mix|Nut/seed|Aisle|462|14|45|29|30|1/4 cup|
olive-oil|Extra-virgin olive oil|Fat|Aisle|884|0|0|100|14|1 tbsp|olive oil;evoo
avocado-oil|Avocado oil|Fat|Aisle|884|0|0|100|14|1 tbsp|
coconut-oil|Coconut oil|Fat|Aisle|892|0|0|99|14|1 tbsp|
canola-oil|Canola oil|Fat|Aisle|884|0|0|100|14|1 tbsp|
vegetable-oil|Vegetable oil|Fat|Aisle|884|0|0|100|14|1 tbsp|oil
sesame-oil|Sesame oil|Fat|Aisle|884|0|0|100|14|1 tbsp|
mct-oil|MCT oil|Fat|Aisle|862|0|0|100|14|1 tbsp|
mayo|Mayonnaise|Fat|Aisle|680|1|1|75|14|1 tbsp|mayonnaise
light-mayo|Light mayonnaise|Fat|Aisle|238|0|8|22|15|1 tbsp|
ranch|Ranch dressing|Fat|Aisle|430|1|6|45|15|1 tbsp|
vinaigrette|Vinaigrette|Fat|Aisle|448|0|3|50|15|1 tbsp|
pesto|Pesto|Fat|Aisle|418|5|6|42|16|1 tbsp|
guacamole|Guacamole|Fat|Aisle|157|2|8|14|30|2 tbsp|
lard|Lard|Fat|Aisle|902|0|0|100|13|1 tbsp|
ketchup|Ketchup|Condiment|Aisle|112|1|27|0.1|17|1 tbsp|
mustard|Mustard|Condiment|Aisle|60|4|6|3|5|1 tsp|
soy-sauce|Soy sauce|Condiment|Aisle|53|8|5|0|16|1 tbsp|
tamari|Tamari|Condiment|Aisle|60|11|6|0|16|1 tbsp|
hot-sauce|Hot sauce|Condiment|Aisle|11|0.5|2|0.4|5|1 tsp|
sriracha|Sriracha|Condiment|Aisle|93|2|19|1|6|1 tsp|
salsa|Salsa|Condiment|Aisle|36|1.5|7|0.2|30|2 tbsp|
bbq-sauce|BBQ sauce|Condiment|Aisle|172|0.8|41|0.6|17|1 tbsp|
honey|Honey|Condiment|Aisle|304|0.3|82|0|21|1 tbsp|
maple-syrup|Maple syrup|Condiment|Aisle|260|0|67|0|20|1 tbsp|maple
sugar|Sugar|Condiment|Aisle|387|0|100|0|12|1 tbsp|
brown-sugar|Brown sugar|Condiment|Aisle|380|0|98|0|14|1 tbsp|
jam|Jam|Condiment|Aisle|278|0.4|69|0.1|20|1 tbsp|jelly
balsamic|Balsamic vinegar|Condiment|Aisle|88|0.5|17|0|16|1 tbsp|
vinegar|Vinegar|Condiment|Aisle|18|0|0.04|0|15|1 tbsp|
apple-cider-vinegar|Apple cider vinegar|Condiment|Aisle|21|0|0.9|0|15|1 tbsp|
fish-sauce|Fish sauce|Condiment|Aisle|35|5|4|0|18|1 tbsp|
oyster-sauce|Oyster sauce|Condiment|Aisle|51|1.4|11|0.3|16|1 tbsp|
hoisin|Hoisin sauce|Condiment|Aisle|220|3|44|3|16|1 tbsp|
miso|Miso|Condiment|Aisle|199|12|26|6|17|1 tbsp|
gochujang|Gochujang|Condiment|Aisle|243|5|46|3|18|1 tbsp|
curry-paste|Curry paste|Condiment|Aisle|90|2|10|5|15|1 tbsp|
tomato-paste|Tomato paste|Condiment|Aisle|82|4|19|0.5|16|1 tbsp|
marinara|Marinara|Condiment|Aisle|51|1.5|8|1.5|60|1/4 cup|
salt|Salt|Condiment|Aisle|0|0|0|0|1|pinch|
black-pepper|Black pepper|Condiment|Aisle|251|10|64|3|1|pinch|peppercorn
cinnamon|Cinnamon|Condiment|Aisle|247|4|81|1|3|1 tsp|
paprika|Paprika|Condiment|Aisle|282|14|54|13|2|1 tsp|
cumin|Cumin|Condiment|Aisle|375|18|44|22|2|1 tsp|
turmeric|Turmeric|Condiment|Aisle|312|10|67|3|2|1 tsp|
teriyaki|Teriyaki sauce|Condiment|Aisle|89|6|16|0|18|1 tbsp|
worcestershire|Worcestershire|Condiment|Aisle|78|0|19|0|17|1 tbsp|
nutritional-yeast|Nutritional yeast|Condiment|Aisle|325|45|36|5|8|2 tbsp|
capers|Capers|Condiment|Aisle|23|2.4|5|0.9|8|1 tbsp|
relish|Relish|Condiment|Aisle|130|0.4|35|0.1|15|1 tbsp|
chili-crisp|Chili crisp|Condiment|Aisle|500|2|8|50|8|1 tsp|
water|Water|Beverage|Aisle|0|0|0|0|240|1 cup|
black-coffee|Black coffee|Beverage|Aisle|2|0.3|0|0|240|1 cup|coffee
espresso|Espresso|Beverage|Aisle|9|0.1|1.7|0.2|30|1 shot|
latte|Latte|Beverage|Aisle|54|3|5|3|240|12 oz|
tea|Black tea|Beverage|Aisle|1|0|0.3|0|240|1 cup|
green-tea|Green tea|Beverage|Aisle|1|0|0|0|240|1 cup|
soda|Soda|Beverage|Aisle|41|0|11|0|355|12 oz|cola
diet-soda|Diet soda|Beverage|Aisle|0|0|0|0|355|12 oz|
orange-juice|Orange juice|Beverage|Aisle|45|0.7|10|0.2|248|1 cup|
apple-juice|Apple juice|Beverage|Aisle|46|0.1|11|0.1|248|1 cup|
beer|Beer|Beverage|Aisle|43|0.5|3.6|0|356|12 oz|
red-wine|Red wine|Beverage|Aisle|85|0.1|2.6|0|147|5 oz|wine
white-wine|White wine|Beverage|Aisle|82|0.1|2.6|0|147|5 oz|
kombucha|Kombucha|Beverage|Aisle|13|0.3|3|0|240|8 oz|
coconut-water|Coconut water|Beverage|Aisle|19|0.7|3.7|0.2|240|1 cup|
sports-drink|Sports drink|Beverage|Aisle|26|0|6|0|240|8 oz|
energy-drink|Energy drink|Beverage|Aisle|45|0|11|0|250|8 oz|
oat-milk|Oat milk|Beverage|Dairy|43|1|7|1.5|240|1 cup|
almond-milk|Almond milk|Beverage|Dairy|15|0.6|0.6|1.1|240|1 cup|
soy-milk|Soy milk|Beverage|Dairy|54|3.3|6|1.8|243|1 cup|
coconut-milk|Coconut milk, carton|Beverage|Dairy|46|0.2|6|2.3|240|1 cup|
coconut-milk-can|Coconut milk, canned|Beverage|Aisle|180|2|3|18|60|1/4 cup|
bone-broth|Bone broth|Beverage|Aisle|8|1|0.8|0.2|240|1 cup|stock;broth
protein-shake|Protein shake|Beverage|Aisle|80|20|4|1.5|325|1 bottle|
protein-bar|Protein bar|Snack|Aisle|200|20|22|7|60|1 bar|
granola-bar|Granola bar|Snack|Aisle|471|8|64|20|28|1 bar|
potato-chips|Potato chips|Snack|Aisle|536|7|53|35|28|1 oz|chips
tortilla-chips|Tortilla chips|Snack|Aisle|489|7|63|23|28|1 oz|
dark-chocolate|Dark chocolate|Snack|Aisle|598|8|46|43|28|1 oz|
milk-chocolate|Milk chocolate|Snack|Aisle|535|8|59|30|28|1 oz|
cookie|Cookie|Snack|Aisle|488|5|66|24|30|1 cookie|
doughnut|Doughnut|Snack|Aisle|421|5|51|23|60|1 doughnut|
muffin|Muffin|Snack|Aisle|377|5|53|16|113|1 muffin|
brownie|Brownie|Snack|Aisle|466|6|50|29|40|1 square|
cake|Cake|Snack|Aisle|390|5|56|17|80|1 slice|
pizza-slice|Pizza slice|Prepared|Aisle|266|11|33|10|107|1 slice|pizza
burger|Hamburger|Prepared|Aisle|254|13|24|12|150|1 burger|
cheeseburger|Cheeseburger|Prepared|Aisle|263|15|25|13|165|1 burger|
fries|French fries|Prepared|Aisle|312|3|41|15|117|medium|
fried-chicken|Fried chicken|Prepared|Aisle|246|22|8|14|85|1 piece|
burrito|Burrito|Prepared|Aisle|206|8|26|8|200|1 burrito|
taco|Taco|Prepared|Aisle|226|9|20|13|80|1 taco|
sushi-roll|Sushi roll|Prepared|Aisle|143|5|28|2|140|6 pieces|
cup-ramen|Cup ramen|Prepared|Aisle|436|10|63|16|85|1 cup dry|
sandwich|Sandwich|Prepared|Aisle|250|12|28|10|150|1 sandwich|
pbj|PB&J|Prepared|Aisle|360|12|47|15|110|1 sandwich|
mac-cheese|Mac and cheese|Prepared|Aisle|164|7|21|6|200|1 cup|
chicken-nugget|Chicken nuggets|Prepared|Aisle|296|16|15|18|80|4 nuggets|
pad-thai|Pad Thai|Prepared|Aisle|153|7|20|5|250|1 plate|
fried-rice|Fried rice|Prepared|Aisle|168|6|24|6|200|1 cup|
poke-bowl|Poke bowl|Prepared|Aisle|140|10|16|4|350|1 bowl|
caesar-salad|Caesar salad|Prepared|Aisle|160|8|8|11|200|1 bowl|
tomato-soup|Tomato soup|Prepared|Aisle|32|1|7|0.3|244|1 cup|
chili|Chili|Prepared|Aisle|116|8|10|5|240|1 cup|
oatmeal-packet|Oatmeal packet|Prepared|Aisle|370|10|70|6|35|1 packet|
yogurt-drink|Yogurt drink|Prepared|Dairy|70|3|12|1.5|200|1 bottle|
whey|Whey isolate|Supplement|Aisle|370|80|8|2|30|1 scoop|whey protein;protein powder
casein|Casein protein|Supplement|Aisle|370|80|8|2|30|1 scoop|
plant-protein|Plant protein powder|Supplement|Aisle|375|80|4|3|30|1 scoop|pea protein
collagen|Collagen peptides|Supplement|Aisle|360|90|0|0|11|1 scoop|
creatine|Creatine|Supplement|Aisle|0|0|0|0|5|5g|
mass-gainer|Mass gainer|Supplement|Aisle|390|25|50|8|150|1 scoop|
electrolyte|Electrolyte powder|Supplement|Aisle|40|0|10|0|5|1 stick|
meal-replacement|Meal replacement|Supplement|Aisle|380|30|40|10|70|1 scoop|
bcaa|BCAA|Supplement|Aisle|0|0|0|0|5|1 scoop|
chicken-tender|Chicken tender|Meat|Meat|175|26|5|5|85|1 tender|
ground-beef-93|Ground beef 93/7|Meat|Meat|152|21|0|7|113|4 oz|
pork-loin|Pork loin|Meat|Meat|143|26|0|4|170|6 oz|
canadian-bacon|Canadian bacon|Meat|Meat|185|20|1|9|56|2 oz|
tuna-pouch|Tuna pouch|Seafood|Seafood|90|20|0|1|74|1 pouch|
quark|Quark|Dairy|Dairy|71|12|4|0.2|170|170g|
oat-bran|Oat bran|Grain|Dry|246|17|66|7|40|1/2 cup|
cream-of-rice|Cream of rice|Grain|Dry|370|6|82|0.5|40|1/4 cup dry|
ezekiel-bread|Ezekiel bread|Grain|Dry|223|8|40|1.5|34|1 slice|
spaghetti-squash|Spaghetti squash|Produce|Produce|31|0.6|7|0.6|155|1 cup|
acorn-squash|Acorn squash|Produce|Produce|40|0.8|10|0.1|100|1 cup|
plantain|Plantain|Fruit|Produce|122|1.3|32|0.4|148|1 cup|
frozen-veg|Frozen mixed vegetables|Produce|Produce|65|3|12|0.5|90|1 cup|
stevia|Stevia|Condiment|Aisle|0|0|0|0|1|1 packet|
monk-fruit|Monk fruit sweetener|Condiment|Aisle|0|0|0|0|1|1 packet|
tzatziki|Tzatziki|Condiment|Aisle|117|4|4|10|30|2 tbsp|
pho|Pho|Prepared|Aisle|89|6|10|3|400|1 bowl|
dumpling|Dumpling|Prepared|Aisle|200|8|24|8|35|2 pieces|
biryani|Biryani|Prepared|Aisle|168|7|22|6|250|1 plate|
chicken-tikka|Chicken tikka masala|Prepared|Aisle|144|10|8|8|250|1 plate|
tuna-salad|Tuna salad|Prepared|Aisle|187|16|7|10|100|100g|
egg-salad|Egg salad|Prepared|Aisle|229|10|4|20|100|100g|
greek-salad|Greek salad|Prepared|Aisle|107|4|6|8|200|1 bowl|
overnight-oats|Overnight oats|Prepared|Aisle|120|5|18|3|200|1 cup|
chia-pudding|Chia pudding|Prepared|Aisle|140|5|16|7|150|1 cup|
cheerios|Cheerios|Grain|Dry|367|12|73|7|28|1 cup|
rice-krispies|Rice Krispies|Grain|Dry|382|7|85|4|33|1 cup|
`.trim();

function parsePantry(raw: string): PantryItem[] {
  const seen = new Set<string>();
  const items: PantryItem[] = [];
  for (const line of raw.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const [id, name, group, aisle, k, p, c, f, sg, sl, aliasStr = ""] = line.split("|");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    items.push({
      id,
      name,
      group: group as PantryGroup,
      aisle,
      kcal100: Number(k),
      protein100: Number(p),
      carbs100: Number(c),
      fat100: Number(f),
      servingG: Number(sg) || 100,
      servingLabel: sl || "100g",
      aliases: aliasStr
        ? aliasStr
            .split(";")
            .map((a) => a.trim())
            .filter(Boolean)
        : [],
    });
  }
  return items;
}

export const PANTRY: PantryItem[] = parsePantry(RAW);

export const PANTRY_BY_ID: Record<string, PantryItem> = Object.fromEntries(PANTRY.map((p) => [p.id, p]));

function haystack(item: PantryItem) {
  return [item.name, item.id.replace(/-/g, " "), ...item.aliases].map((s) => s.toLowerCase());
}

function scoreItem(item: PantryItem, q: string) {
  const needles = haystack(item);
  if (needles.some((n) => n === q)) return 1000;
  if (needles.some((n) => n.startsWith(q))) return 500 + q.length;
  if (needles.some((n) => n.includes(q))) return 100 + q.length;
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1 && tokens.every((t) => needles.some((n) => n.includes(t)))) return 40 + tokens.length;
  return 0;
}

export function searchPantry(q: string, group: PantryGroup | "All" = "All"): PantryItem[] {
  const pool = group === "All" ? PANTRY : PANTRY.filter((p) => p.group === group);
  const n = q.trim().toLowerCase();
  if (!n) return pool;
  return pool
    .map((p) => ({ p, s: scoreItem(p, n) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.p.name.localeCompare(b.p.name))
    .map((x) => x.p);
}

export function findPantry(name: string): PantryItem | undefined {
  const n = name.trim().toLowerCase();
  if (!n) return undefined;
  const ranked = PANTRY.map((p) => ({ p, s: scoreItem(p, n) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  return ranked[0]?.p;
}

export function scalePantry(item: PantryItem, grams: number): ScaledMacros {
  const k = grams / 100;
  return {
    kcal: Math.round(item.kcal100 * k),
    protein: Math.round(item.protein100 * k),
    carbs: Math.round(item.carbs100 * k),
    fat: Math.round(item.fat100 * k),
  };
}

export function derivedKcal(protein: number, carbs: number, fat: number) {
  return Math.round(4 * protein + 4 * carbs + 9 * fat);
}
