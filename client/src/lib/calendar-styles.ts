// Calendar-specific monthly-themed style prompts
// Each month has a seasonal theme + wild card options for variety

export interface CalendarStyle {
  month: number; // 1-12, or 0 for wild card
  name: string;
  promptTemplateDog: string;
  promptTemplateCat: string;
  category: "seasonal" | "wildcard";
  isWildCard: boolean;
}

// Monthly themed styles — one per month
const MONTHLY_THEMES: CalendarStyle[] = [
  {
    month: 1, name: "Cozy Cabin", category: "seasonal", isWildCard: false,
    promptTemplateDog: "A cozy portrait of a {breed} dog curled up by a warm fireplace in a rustic cabin, snow visible through the window, knitted blanket, warm flickering firelight on fur, peaceful winter evening, hot cocoa on the side table, professional pet photography",
    promptTemplateCat: "A cozy portrait of a {breed} cat curled up by a warm fireplace in a rustic cabin, snow visible through the window, knitted blanket, warm flickering firelight on fur, peaceful winter evening, purring contentedly, professional pet photography",
  },
  {
    month: 2, name: "Valentine's Sweetheart", category: "seasonal", isWildCard: false,
    promptTemplateDog: "A charming Valentine's Day portrait of a {breed} dog surrounded by red roses and pink hearts, wearing a tiny bow tie with hearts, soft romantic lighting, rose petals scattered around, love letter nearby, sweet and adorable expression, professional pet photography",
    promptTemplateCat: "A charming Valentine's Day portrait of a {breed} cat surrounded by red roses and pink hearts, wearing a tiny heart-shaped collar charm, soft romantic lighting, rose petals scattered around, sitting elegantly among valentines, sweet and adorable expression, professional pet photography",
  },
  {
    month: 3, name: "Lucky Charm", category: "seasonal", isWildCard: false,
    promptTemplateDog: "A festive St. Patrick's Day portrait of a {breed} dog wearing a tiny green bow tie, surrounded by shamrocks and gold coins, sitting in a lush green meadow, rainbow in the background, lucky and playful expression, bright green spring colors, professional pet photography",
    promptTemplateCat: "A festive St. Patrick's Day portrait of a {breed} cat wearing a tiny green bow tie, surrounded by shamrocks and gold coins, sitting in a lush green meadow, rainbow in the background, mischievous and lucky expression, bright green spring colors, professional pet photography",
  },
  {
    month: 4, name: "Spring Blossoms", category: "seasonal", isWildCard: false,
    promptTemplateDog: "A whimsical portrait of a {breed} dog wearing a delicate flower crown, sitting in a meadow of wildflowers and cherry blossoms, soft bokeh background with butterflies, dreamy golden hour lighting, gentle spring breeze, natural beauty, professional pet photography",
    promptTemplateCat: "A whimsical portrait of a {breed} cat sitting among cherry blossoms and spring flowers, soft pink petals falling around, gentle spring breeze ruffling fur, dreamy golden hour lighting, elegant and serene, natural beauty, professional pet photography",
  },
  {
    month: 5, name: "Garden Beauty", category: "seasonal", isWildCard: false,
    promptTemplateDog: "A beautiful portrait of a {breed} dog in a stunning English garden full of blooming roses, peonies, and lavender, sitting on a garden bench, morning dew on flowers, warm sunlight, elegant and peaceful, Mother's Day inspired, professional pet photography",
    promptTemplateCat: "A beautiful portrait of a {breed} cat in a stunning English garden full of blooming roses, peonies, and lavender, sitting gracefully among the flowers, morning dew on petals, warm sunlight, elegant and peaceful, Mother's Day inspired, professional pet photography",
  },
  {
    month: 6, name: "Beach Day", category: "seasonal", isWildCard: false,
    promptTemplateDog: "A real {breed} dog wearing sunglasses and a tiny Hawaiian lei, sitting on a sandy beach with ocean waves and blue sky, beach umbrella and surfboard nearby, warm golden sunset lighting, happy summer vibes, real dog in real setting, professional pet photography",
    promptTemplateCat: "A real {breed} cat wearing tiny sunglasses, lounging on a beach towel on a sandy beach with ocean waves and blue sky, beach umbrella nearby, warm golden sunset lighting, relaxed summer vibes, real cat in real setting, professional pet photography",
  },
  {
    month: 7, name: "Pool Party", category: "seasonal", isWildCard: false,
    promptTemplateDog: "A fun portrait of a {breed} dog at a backyard pool party, wearing a tiny patriotic bandana with stars and stripes, inflatable pool toys around, sparkling blue water, bright summer sunshine, festive and playful, 4th of July vibes, professional pet photography",
    promptTemplateCat: "A fun portrait of a {breed} cat lounging on a pool float in a backyard pool, wearing a tiny patriotic bow, inflatable toys around, sparkling blue water, bright summer sunshine, cool and relaxed, 4th of July vibes, professional pet photography",
  },
  {
    month: 8, name: "Picnic Buddy", category: "seasonal", isWildCard: false,
    promptTemplateDog: "A real {breed} dog sitting on a cozy picnic blanket in a sunny park, wearing a cute bandana, picnic basket with fruits and treats nearby, warm afternoon sunlight, dappled shade from trees, happy relaxed expression, lazy summer day, professional pet photography",
    promptTemplateCat: "A real {breed} cat sitting on a cozy picnic blanket in a sunny park, picnic basket with treats nearby, warm afternoon sunlight, dappled shade from trees, curious and content expression, lazy summer day, professional pet photography",
  },
  {
    month: 9, name: "Autumn Leaves", category: "seasonal", isWildCard: false,
    promptTemplateDog: "A real {breed} dog sitting in a pile of vibrant autumn leaves — red, orange, golden yellow — in a park with fall foliage, crisp autumn sunlight, cozy plaid scarf, pumpkins and apples nearby, warm fall colors, professional pet photography",
    promptTemplateCat: "A real {breed} cat playing in a pile of vibrant autumn leaves — red, orange, golden yellow — in a park with fall foliage, crisp autumn sunlight, pumpkins nearby, warm fall colors, curious and playful, professional pet photography",
  },
  {
    month: 10, name: "Halloween Pumpkin", category: "seasonal", isWildCard: false,
    promptTemplateDog: "A real {breed} dog wearing a cute Halloween costume, sitting among carved pumpkins and jack-o-lanterns, spooky but adorable, cobwebs and autumn decorations, moody orange and purple lighting, trick-or-treat basket, professional pet photography",
    promptTemplateCat: "A real {breed} cat sitting among carved pumpkins and jack-o-lanterns, glowing eyes, spooky but adorable, cobwebs and autumn decorations, moody orange and purple lighting, mysterious Halloween atmosphere, professional pet photography",
  },
  {
    month: 11, name: "Harvest Feast", category: "seasonal", isWildCard: false,
    promptTemplateDog: "A warm Thanksgiving portrait of a {breed} dog sitting at a beautifully set harvest table, autumn cornucopia with gourds and corn, golden candles, warm amber lighting, grateful and content expression, cozy fall atmosphere, professional pet photography",
    promptTemplateCat: "A warm Thanksgiving portrait of a {breed} cat sitting elegantly at a beautifully set harvest table, autumn cornucopia with gourds and corn, golden candles, warm amber lighting, regal and content expression, cozy fall atmosphere, professional pet photography",
  },
  {
    month: 12, name: "Holiday Spirit", category: "seasonal", isWildCard: false,
    promptTemplateDog: "A festive Christmas portrait of a {breed} dog wearing a Santa hat, sitting by a decorated Christmas tree with twinkling lights and ornaments, wrapped presents, warm fireplace glow, red and green holiday colors, joyful and merry, professional pet photography",
    promptTemplateCat: "A festive Christmas portrait of a {breed} cat sitting in a cozy Christmas scene with decorated tree, twinkling lights, ornaments and tinsel, wrapped presents, warm fireplace glow, playing with a ribbon, red and green holiday colors, professional pet photography",
  },
];

// Birthday style — replaces the month's seasonal theme
const BIRTHDAY_STYLE: CalendarStyle = {
  month: 0, name: "Birthday Party", category: "seasonal", isWildCard: false,
  promptTemplateDog: "A joyful birthday party portrait of a {breed} dog wearing a birthday party hat, colorful balloons and streamers, birthday cake with candles, confetti, happy celebration, bright and festive, professional pet photography",
  promptTemplateCat: "A joyful birthday party portrait of a {breed} cat wearing a tiny birthday crown, colorful balloons and streamers, birthday cake with candles, confetti, happy celebration, bright and festive, professional pet photography",
};

// Wild card styles — fun non-seasonal picks for variety
const DOG_WILD_CARDS: CalendarStyle[] = [
  { month: 0, name: "Renaissance Noble", category: "wildcard", isWildCard: true, promptTemplateDog: "A majestic Renaissance oil painting portrait of a {breed} dog wearing ornate noble attire with a velvet collar and golden medallion, dramatic chiaroscuro lighting, rich earth tones, museum quality", promptTemplateCat: "" },
  { month: 0, name: "Steampunk Explorer", category: "wildcard", isWildCard: true, promptTemplateDog: "A real {breed} dog wearing steampunk costume accessories — brass goggles, leather aviator cap, gear-decorated collar, Victorian industrial setting with copper pipes, warm sepia lighting", promptTemplateCat: "" },
  { month: 0, name: "Impressionist Garden", category: "wildcard", isWildCard: true, promptTemplateDog: "A beautiful Impressionist painting of a {breed} dog in a sunlit garden with blooming flowers, visible brushstrokes, dappled light through trees, soft dreamy atmosphere, in the style of Monet", promptTemplateCat: "" },
  { month: 0, name: "Garden Party", category: "wildcard", isWildCard: true, promptTemplateDog: "A real {breed} dog at an elegant outdoor garden party, wearing a floral wreath collar, surrounded by blooming hydrangeas and roses, afternoon tea setting, warm golden lighting", promptTemplateCat: "" },
  { month: 0, name: "Pirate Captain", category: "wildcard", isWildCard: true, promptTemplateDog: "A real {breed} dog wearing a pirate costume with tricorn hat and eyepatch, on a ship deck, ocean sunset background, swashbuckling adventure, warm golden lighting", promptTemplateCat: "" },
  { month: 0, name: "Superhero", category: "wildcard", isWildCard: true, promptTemplateDog: "A real {breed} dog wearing a superhero cape and mask, heroic pose on a city rooftop at sunset, dramatic sky, powerful and brave, vibrant colors", promptTemplateCat: "" },
  { month: 0, name: "Country Cowboy", category: "wildcard", isWildCard: true, promptTemplateDog: "A charming portrait of a {breed} dog wearing a classic brown cowboy hat and red bandana, sitting on a rustic wooden fence, golden prairie sunset, warm country vibes", promptTemplateCat: "" },
  { month: 0, name: "Taco Tuesday Chef", category: "wildcard", isWildCard: true, promptTemplateDog: "A real {breed} dog wearing a tiny chef hat and apron in a colorful Mexican cantina, surrounded by tacos and fresh ingredients, festive papel picado decorations, warm fiesta lighting", promptTemplateCat: "" },
];

const CAT_WILD_CARDS: CalendarStyle[] = [
  { month: 0, name: "Egyptian Royalty", category: "wildcard", isWildCard: true, promptTemplateDog: "", promptTemplateCat: "A regal portrait of a {breed} cat as an Egyptian pharaoh with golden headdress, hieroglyphic backdrop, desert temple, dramatic lighting, majestic and commanding" },
  { month: 0, name: "Purrista Barista", category: "wildcard", isWildCard: true, promptTemplateDog: "", promptTemplateCat: "A charming portrait of a {breed} cat as a barista in a cozy coffee shop, wearing a tiny apron, surrounded by latte art and pastries, warm cafe lighting" },
  { month: 0, name: "Bookshelf Scholar", category: "wildcard", isWildCard: true, promptTemplateDog: "", promptTemplateCat: "A distinguished portrait of a {breed} cat sitting among tall bookshelves in an old library, wearing tiny reading glasses, warm lamplight, intellectual atmosphere" },
  { month: 0, name: "Tea Party Guest", category: "wildcard", isWildCard: true, promptTemplateDog: "", promptTemplateCat: "A whimsical portrait of a {breed} cat at an elegant tea party, tiny teacup and saucer, floral china, garden setting, soft afternoon light" },
  { month: 0, name: "Box Inspector", category: "wildcard", isWildCard: true, promptTemplateDog: "", promptTemplateCat: "A hilarious portrait of a {breed} cat sitting proudly inside a cardboard box, wearing a tiny hard hat, clipboard nearby, official inspector pose, studio lighting" },
  { month: 0, name: "Victorian Lady", category: "wildcard", isWildCard: true, promptTemplateDog: "", promptTemplateCat: "A distinguished Victorian portrait of a {breed} cat as a proper lady wearing lace collar and cameo brooch, vintage setting with ornate furniture, warm sepia tones" },
  { month: 0, name: "Midnight Prowler", category: "wildcard", isWildCard: true, promptTemplateDog: "", promptTemplateCat: "A mysterious portrait of a {breed} cat prowling under moonlight, city rooftops at night, glowing eyes, dramatic shadows, film noir atmosphere, sleek and stealthy" },
  { month: 0, name: "Blanket Fort", category: "wildcard", isWildCard: true, promptTemplateDog: "", promptTemplateCat: "A cozy portrait of a {breed} cat peeking out from inside a blanket fort made of pillows and fairy lights, warm and snuggly, playful eyes, adorable" },
];

/**
 * Get the full set of calendar styles for generation.
 * @param species - "dog" or "cat"
 * @param birthdayMonth - optional, 1-12. Birthday Party replaces that month's seasonal.
 * @param count - how many wild cards to include (default 8)
 */
export function getCalendarStyles(species: "dog" | "cat", birthdayMonth?: number, wildCardCount = 8): CalendarStyle[] {
  const styles: CalendarStyle[] = [];

  // Add monthly themes
  for (const theme of MONTHLY_THEMES) {
    if (birthdayMonth && theme.month === birthdayMonth) {
      // Birthday replaces this month's seasonal
      const bday = { ...BIRTHDAY_STYLE, month: birthdayMonth };
      styles.push(bday);
      // Add the displaced seasonal as a wild card
      styles.push({ ...theme, isWildCard: true, category: "wildcard" });
    } else {
      styles.push(theme);
    }
  }

  // Add species-appropriate wild cards
  const wildCards = species === "cat" ? CAT_WILD_CARDS : DOG_WILD_CARDS;
  const selectedWildCards = wildCards.slice(0, wildCardCount);
  styles.push(...selectedWildCards);

  return styles;
}

/**
 * Get the prompt for a specific style and species.
 */
export function getCalendarPrompt(style: CalendarStyle, species: "dog" | "cat", breed: string): string {
  const template = species === "cat" ? style.promptTemplateCat : style.promptTemplateDog;
  return template.replace(/\{breed\}/g, breed || species);
}

export { MONTHLY_THEMES, BIRTHDAY_STYLE, DOG_WILD_CARDS, CAT_WILD_CARDS };
