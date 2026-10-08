import type { MenuItem, OptionGroup, Voucher } from '../src/shared/types';

// Menu items are taken from Lore Coffee Station's Instagram posts.
// Prices are placeholders — update them from Staff › Menu once you have the real price list.

const temp: OptionGroup = {
  id: 'temp',
  name: 'Temperature',
  type: 'single',
  required: true,
  choices: [
    { id: 'iced', label: 'Iced', price: 0 },
    { id: 'hot', label: 'Hot', price: 0 },
  ],
};
const size: OptionGroup = {
  id: 'size',
  name: 'Size',
  type: 'single',
  required: true,
  choices: [
    { id: '12oz', label: '12 oz', price: 0 },
    { id: '16oz', label: '16 oz', price: 25 },
  ],
};
const milk: OptionGroup = {
  id: 'milk',
  name: 'Milk',
  type: 'single',
  required: true,
  choices: [
    { id: 'fresh', label: 'Fresh milk', price: 0 },
    { id: 'oat', label: 'Oat milk', price: 35 },
  ],
};
const sugar: OptionGroup = {
  id: 'sugar',
  name: 'Sweetness',
  type: 'single',
  required: true,
  choices: [
    { id: 's100', label: '100% sweet', price: 0 },
    { id: 's75', label: '75% sweet', price: 0 },
    { id: 's50', label: '50% sweet', price: 0 },
    { id: 's25', label: '25% sweet', price: 0 },
    { id: 's0', label: 'No sugar', price: 0 },
  ],
};
const coffeeAddons: OptionGroup = {
  id: 'addons',
  name: 'Add-ons',
  type: 'multi',
  choices: [
    { id: 'shot', label: 'Extra espresso shot', price: 35 },
    { id: 'syrup', label: 'Vanilla / Caramel / Hazelnut syrup', price: 25 },
    { id: 'seasalt', label: 'Sea salt cream', price: 30 },
  ],
};
const frappeAddons: OptionGroup = {
  id: 'addons',
  name: 'Add-ons',
  type: 'multi',
  choices: [
    { id: 'whip', label: 'Extra whipped cream', price: 20 },
    { id: 'shot', label: 'Espresso shot', price: 35 },
  ],
};
const mealAddons: OptionGroup = {
  id: 'addons',
  name: 'Add-ons',
  type: 'multi',
  choices: [
    { id: 'rice', label: 'Extra rice', price: 25 },
    { id: 'egg', label: 'Extra egg', price: 25 },
  ],
};
const pizzaFlavor: OptionGroup = {
  id: 'flavor',
  name: 'Flavor',
  type: 'single',
  required: true,
  choices: [
    { id: 'allmeat', label: 'All Meat', price: 20 },
    { id: 'garlic', label: 'Cheesy Garlic', price: 0 },
    { id: 'half', label: 'Half & Half', price: 10 },
  ],
};
const wingFlavor: OptionGroup = {
  id: 'flavor',
  name: 'Flavor',
  type: 'single',
  required: true,
  choices: [
    { id: 'garlicparm', label: 'Garlic Parmesan', price: 0 },
    { id: 'buffalo', label: 'Buffalo', price: 0 },
    { id: 'soygarlic', label: 'Soy Garlic', price: 0 },
  ],
};

const espresso = [temp, size, milk, sugar, coffeeAddons];
let n = 0;
const item = (
  id: string,
  name: string,
  category: string,
  price: number,
  description: string,
  image: string | null,
  optionGroups: OptionGroup[] = [],
  extra: Partial<MenuItem> = {},
): MenuItem => ({
  id,
  name,
  category,
  price,
  description,
  image: image ? `/images/${image}.webp` : null,
  optionGroups,
  available: true,
  featured: false,
  tags: [],
  sort: n++,
  ...extra,
});

export const CATEGORIES = [
  'Coffee',
  'Non-Coffee',
  'Frappes',
  'Refreshers',
  'Rice Meals',
  'Pasta',
  'Sandwiches',
  'Pizza & Bites',
  'Pastries',
];

export const SEED_MENU: MenuItem[] = [
  item('spanish-latte', 'Spanish Latte', 'Coffee', 150, 'Our signature — espresso, fresh milk and a sweet, creamy condensed-milk finish.', 'iced-latte', espresso, { featured: true, tags: ['Signature', 'Bestseller'] }),
  item('americano', 'Americano', 'Coffee', 110, 'Double shot of espresso over water. Clean, bold and the court-side boost.', 'court-trio', [temp, size, sugar, coffeeAddons]),
  item('cafe-latte', 'Café Latte', 'Coffee', 135, 'Espresso and silky steamed milk. The daily standard.', 'croissant-bacon', espresso),
  item('cappuccino', 'Cappuccino', 'Coffee', 135, 'Equal parts espresso, milk and velvety foam.', 'drinks-lineup', espresso),
  item('caramel-macchiato', 'Caramel Macchiato', 'Coffee', 160, 'Vanilla milk marked with espresso and a caramel drizzle.', 'drinks-lineup', espresso),
  item('sea-salt-latte', 'Sea Salt Latte', 'Coffee', 165, 'Iced latte crowned with salted cream cheese foam.', 'drinks-lineup', espresso, { tags: ['New'] }),
  item('mocha', 'Café Mocha', 'Coffee', 155, 'Espresso, dark chocolate and milk.', 'drinks-lineup', espresso),
  item('matcha-latte', 'Matcha Latte', 'Non-Coffee', 150, 'Ceremonial-grade matcha whisked with fresh milk — for the calm.', 'court-trio', [temp, size, milk, sugar], { tags: ['Bestseller'] }),
  item('strawberry-matcha', 'Strawberry Matcha', 'Non-Coffee', 170, 'Layers of strawberry purée, milk and matcha.', 'drinks-lineup', [size, milk, sugar]),
  item('chocolate', 'Dark Chocolate', 'Non-Coffee', 130, 'Rich cocoa and milk, hot or iced.', null, [temp, size, milk, sugar]),
  item('mocha-frappe', 'Mocha Frappe', 'Frappes', 175, "Lore's go-to. Cold, sweet, blended mocha topped with whipped cream and chocolate drizzle.", 'mocha-frappe', [size, frappeAddons], { featured: true, tags: ['Bestseller'] }),
  item('strawberry-frappe', 'Strawberry Frappe', 'Frappes', 165, 'Ice-cold, creamy and fruity, with a strawberry swirl on whipped cream.', 'strawberry-frappe', [size, frappeAddons], { featured: true }),
  item('lemonade', 'Classic Lemonade', 'Refreshers', 95, 'Freshly squeezed and lightly sweet — the refresh.', 'court-trio', [size, sugar]),
  item('pink-lemonade', 'Rose Pink Lemonade', 'Refreshers', 115, 'Sparkling lemonade with rose and a citrus wheel.', 'squid-ink-pasta', [size, sugar]),
  item('wagyu-rice', 'Wagyu Cubes Rice Bowl', 'Rice Meals', 345, 'Tender medium-rare wagyu cubes over warm rice with roasted garlic and a runny sunny-side egg.', 'wagyu-rice', [mealAddons], { featured: true, tags: ['Bestseller'] }),
  item('sisig', 'Pork Sisig Rice', 'Rice Meals', 215, 'Sizzling pork sisig with garlic rice, egg, calamansi and chili.', 'sisig', [mealAddons]),
  item('schublig', 'Schublig & Eggs', 'Rice Meals', 199, 'Juicy schublig sausage, two sunny eggs and warm rice. All-day breakfast.', 'schublig', [mealAddons], { tags: ['All-day breakfast'] }),
  item('chicken-teriyaki', 'Chicken Teriyaki', 'Rice Meals', 210, 'Sweet-savory glazed chicken thigh, sesame, cabbage slaw and rice.', 'chicken-teriyaki', [mealAddons]),
  item('truffle-pasta', 'Truffle Cream Pasta', 'Pasta', 265, 'Creamy truffle linguine with mushrooms, parmesan and garlic bread. Best with a Spanish Latte.', 'truffle-pasta', [], { featured: true, tags: ['Bestseller'] }),
  item('squid-ink-pasta', 'Squid Ink Pasta', 'Pasta', 295, 'Black spaghetti with shrimp, squid rings, tomato and lemon.', 'squid-ink-pasta', [], { tags: ['Special'] }),
  item('croissant-burger', 'Croissant Cheeseburger', 'Sandwiches', 275, 'Buttery croissant, beef patty, melted cheese, caramelized onions and fries.', 'croissant-burger', [], { featured: true, tags: ['New'] }),
  item('chicken-sandwich', 'Crispy Chicken Sandwich', 'Sandwiches', 235, 'Crispy, juicy, cheesy chicken on toasted bread with chips.', 'chicken-sandwich'),
  item('bacon-croissant', 'Bacon & Cheese Croissant', 'Sandwiches', 185, 'Flaky croissant with savory bacon and melted cheese.', 'croissant-bacon'),
  item('tortilla-pizza', 'Tortilla Pizza', 'Pizza & Bites', 199, 'Thin, crisp tortilla pizza baked to order.', 'tortilla-pizza', [pizzaFlavor], { tags: ['Bestseller'] }),
  item('nachos', 'Loaded Nachos', 'Pizza & Bites', 189, 'Fresh-fried chips, seasoned beef, cheese sauce, garlic mayo, tomato and scallions.', 'nachos'),
  item('cheesy-fries', 'Cheesy Fries', 'Pizza & Bites', 135, 'Parmesan fries with a cheddar cheese dip.', 'fries-wings'),
  item('wings', 'Chicken Wings (6 pc)', 'Pizza & Bites', 245, 'Fried to order and tossed in your choice of sauce.', 'fries-wings', [wingFlavor]),
  item('butter-croissant', 'Butter Croissant', 'Pastries', 95, 'Baked fresh, flaky and buttery.', 'interior'),
  item('pain-au-chocolat', 'Pain au Chocolat', 'Pastries', 115, 'Croissant dough wrapped around dark chocolate.', 'interior'),
  item('choc-chip-cookie', 'Chocolate Chip Cookie', 'Pastries', 75, 'Chewy center, crisp edges.', null),
];

export const SEED_VOUCHERS: Voucher[] = [
  { code: 'WELCOME10', description: '10% off your first online order', kind: 'percent', value: 10, minSpend: 0, active: true },
  { code: 'LOREDAY', description: '₱50 off orders ₱400 and up', kind: 'fixed', value: 50, minSpend: 400, active: true },
];

// Staff log in with a 4-digit PIN. Change these before using the app for real.
export const SEED_STAFF = [
  { id: 'cashier', name: 'Cashier', role: 'cashier' as const, pin: '1234' },
  { id: 'manager', name: 'Manager', role: 'manager' as const, pin: '9999' },
];
