export interface StyleOption {
  id: number;
  name: string;
  description: string;
  category: string;
  species: "dog" | "cat";
  promptTemplate: string;
}

export const portraitStyles: StyleOption[] = [
  {
    id: 1,
    name: "Renaissance Noble",
    description: "A dignified portrait in the style of Italian Renaissance masters",
    category: "Classical",
    species: "dog",
    promptTemplate: "A majestic Renaissance oil painting portrait of a white fluffy {breed} dog wearing ornate noble attire with a velvet collar and golden medallion, dramatic chiaroscuro lighting, rich earth tones, in the style of Leonardo da Vinci and Raphael, museum quality, highly detailed white fur texture"
  },
  {
    id: 25,
    name: "Baroque Aristocrat",
    description: "Opulent and dramatic in the Baroque tradition",
    category: "Classical",
    species: "dog",
    promptTemplate: "An opulent Baroque oil painting portrait of a {breed} dog as an aristocrat wearing an elaborate ruff collar and jeweled chain, dramatic lighting with deep shadows, rich burgundy and gold colors, in the style of Rembrandt and Caravaggio, ornate gilded frame style"
  },
  {
    id: 2,
    name: "Victorian Gentleman",
    description: "Distinguished elegance of the Victorian era",
    category: "Classical",
    species: "dog",
    promptTemplate: "A distinguished Victorian portrait of a {breed} dog as a proper gentleman wearing a top hat and monocle with a fine tweed jacket and pocket watch chain, photographed in a Victorian study with leather books and brass fixtures, warm sepia tones, dignified and refined, professional pet photography"
  },
  {
    id: 3,
    name: "Royal Monarch",
    description: "Regal portraiture fit for royalty",
    category: "Classical",
    species: "dog",
    promptTemplate: "A regal royal portrait of a {breed} dog as a king or queen wearing an ermine-trimmed cape and crown, holding a scepter, throne room background with rich tapestries, oil painting in the style of royal court painters, majestic and commanding presence"
  },
  {
    id: 5,
    name: "Art Nouveau Beauty",
    description: "Elegant flowing lines and natural motifs",
    category: "Artistic",
    species: "dog",
    promptTemplate: "A real {breed} dog photographed wearing a delicate floral wreath collar, posed against a painted Art Nouveau backdrop with flowing organic patterns and gilded decorative border, soft natural lighting, real dog with artistic styled setting inspired by Alphonse Mucha, pastel colors with gold accents"
  },
  {
    id: 26,
    name: "Impressionist Garden",
    description: "Soft, light-filled garden scene",
    category: "Artistic",
    species: "dog",
    promptTemplate: "A beautiful Impressionist painting of a {breed} dog in a sunlit garden with blooming flowers, visible brushstrokes, dappled light through trees, soft and dreamy atmosphere, in the style of Monet and Renoir, vibrant yet gentle colors"
  },
  {
    id: 24,
    name: "Vintage Classic",
    description: "Timeless old-fashioned charm",
    category: "Artistic",
    species: "dog",
    promptTemplate: "A charming vintage-style portrait of a {breed} dog in an antique setting, wearing a simple bow tie or pearl collar, sepia-toned photograph aesthetic, classic furniture and lace curtains, timeless elegance, nostalgic and refined"
  },
  {
    id: 22,
    name: "Spring Flower Crown",
    description: "Whimsical garden beauty",
    category: "Seasonal",
    species: "dog",
    promptTemplate: "A whimsical portrait of a {breed} dog wearing a delicate flower crown, sitting in a meadow of wildflowers, soft bokeh background with butterflies, dreamy golden hour lighting, gentle and sweet, natural beauty"
  },
  {
    id: 6,
    name: "Steampunk Explorer",
    description: "Victorian era meets mechanical innovation",
    category: "Artistic",
    species: "dog",
    promptTemplate: "A real {breed} dog wearing actual steampunk costume accessories - brass goggles on head, leather aviator cap, gear-decorated collar, photographed in Victorian industrial setting with copper pipes and gears backdrop, warm sepia lighting, real dog in real costume, not cartoon or illustration"
  },
  {
    id: 9,
    name: "Space Explorer",
    description: "Futuristic astronaut among the stars",
    category: "Sci-Fi",
    species: "dog",
    promptTemplate: "A full-body portrait of a {breed} dog as an astronaut, the dog's head completely fills the open helmet with no empty space between the head and helmet rim, the dog's body naturally fills out a detailed NASA-style space suit with mission patches and life-support hoses, standing heroically on the lunar surface with Earth rising in the background, cosmic starfield, the dog's face is large and clearly visible looking straight at camera through the open visor, photorealistic cinematic lighting, highly detailed, anatomically correct dog proportions inside the suit"
  },
  {
    id: 12,
    name: "Pirate Captain",
    description: "Swashbuckling adventure on the high seas",
    category: "Adventure",
    species: "dog",
    promptTemplate: "A real {breed} dog wearing an actual pirate costume with tricorn hat and eyepatch accessory, photographed on a ship deck setting, ocean background, warm golden sunset lighting, real dog in real costume, not cartoon or illustration, professional pet photography"
  },
  {
    id: 13,
    name: "Cowboy Sheriff",
    description: "Wild West lawkeeper with frontier charm",
    category: "Adventure",
    species: "dog",
    promptTemplate: "A real {breed} dog wearing an actual cowboy hat and sheriff badge bandana, photographed against desert sunset background with cacti, warm golden lighting, real dog in real costume, not cartoon or illustration, professional pet photography"
  },
  {
    id: 15,
    name: "Country Cowboy",
    description: "Rugged Western ranch companion",
    category: "Adventure",
    species: "dog",
    promptTemplate: "A charming portrait of a {breed} dog wearing a classic brown cowboy hat and red bandana, sitting on a rustic wooden fence, golden prairie sunset background, warm country vibes, loyal ranch companion, natural and approachable"
  },
  {
    id: 18,
    name: "Mountain Explorer",
    description: "Adventurous hiking companion",
    category: "Adventure",
    species: "dog",
    promptTemplate: "A real {breed} dog wearing a cute mini hiking backpack and adventure bandana, close-up portrait with blurred mountain background, focus on the dog not the scenery, ready for adventure, loyal hiking companion, warm natural lighting"
  },
  {
    id: 10,
    name: "Halloween Pumpkin",
    description: "Whimsical spooky season costume",
    category: "Seasonal",
    species: "dog",
    promptTemplate: "A whimsical Halloween portrait of a {breed} dog wearing a cute pumpkin costume or witch hat, surrounded by jack-o-lanterns and autumn decorations, playful spooky atmosphere, orange and purple lighting, fun quirky expression, memorable and shareable"
  },
  {
    id: 23,
    name: "Holiday Spirit",
    description: "Festive seasonal celebration",
    category: "Seasonal",
    species: "dog",
    promptTemplate: "A real {breed} dog wearing a fluffy red and white Santa hat, close-up portrait with cozy holiday background of twinkling lights and wrapped presents, warm fireplace glow, joyful expression, heartwarming holiday spirit"
  },
  {
    id: 20,
    name: "Autumn Leaves",
    description: "Fall season beauty",
    category: "Seasonal",
    species: "dog",
    promptTemplate: "A beautiful portrait of a {breed} dog sitting among colorful autumn leaves in a park, warm golden and orange foliage, soft afternoon sunlight filtering through trees, cozy fall sweater weather vibes, natural seasonal beauty"
  },
  {
    id: 4,
    name: "Bandana Portrait",
    description: "Charming portrait with a colorful bandana",
    category: "Showcase",
    species: "dog",
    promptTemplate: "A charming portrait of a {breed} dog wearing a bright colorful bandana, sitting attentively with happy eyes, soft studio lighting, clean simple background, friendly and approachable expression, professional pet photo style, captures the dog's sweet personality"
  },
  {
    id: 7,
    name: "Tutu Princess",
    description: "Adorable ballerina with soft pink tutu",
    category: "Humanizing",
    species: "dog",
    promptTemplate: "An adorable portrait of a {breed} dog wearing a soft fluffy pink tutu and a delicate tiara, sitting gracefully like a little princess, soft pastel background with sparkles, gentle lighting, sweet innocent expression, humanizing and approachable, perfect for softening tough breed reputations"
  },
  {
    id: 8,
    name: "Cozy Pajamas",
    description: "Snuggly sleepyhead in cute pajamas",
    category: "Humanizing",
    species: "dog",
    promptTemplate: "An adorable portrait of a {breed} dog wearing cozy striped pajamas, curled up on a fluffy pillow with a soft blanket, sleepy content expression, warm bedroom lighting, stuffed toy nearby, like a toddler ready for bedtime, heartwarming and cuddly"
  },
  {
    id: 11,
    name: "Birthday Party",
    description: "Celebratory party pup with festive hat",
    category: "Celebration",
    species: "dog",
    promptTemplate: "A joyful birthday portrait of a {breed} dog wearing a colorful party hat, surrounded by balloons and streamers, birthday cake with candles nearby, confetti falling, bright cheerful colors, happy excited expression, celebrating being part of a forever family"
  },
  {
    id: 14,
    name: "Superhero",
    description: "Caped crusader ready to save the day",
    category: "Modern",
    species: "dog",
    promptTemplate: "A real {breed} dog wearing an actual superhero costume - red satin cape and simple eye mask, photographed in heroic pose against city skyline backdrop, dramatic studio lighting, real dog in real costume, professional pet photography, not cartoon or illustration"
  },
  {
    id: 16,
    name: "Garden Party",
    description: "Elegant outdoor celebration guest",
    category: "Fun",
    species: "dog",
    promptTemplate: "A delightful portrait of a {breed} dog wearing a simple floral collar or bow tie, sitting among blooming flowers in a beautiful English garden, soft afternoon light, charming and refined, tea party atmosphere"
  },
  {
    id: 17,
    name: "Beach Day",
    description: "Sun-kissed seaside companion",
    category: "Fun",
    species: "dog",
    promptTemplate: "A sunny portrait of a {breed} dog relaxing on a beautiful sandy beach, wearing stylish sunglasses, golden sand and turquoise ocean waves, tropical sunset colors, happy carefree summer vibes, natural beach setting"
  },
  {
    id: 19,
    name: "Cozy Cabin",
    description: "Warm fireside friend",
    category: "Fun",
    species: "dog",
    promptTemplate: "A cozy portrait of a {breed} dog curled up by a warm fireplace in a rustic cabin, wearing a plaid flannel bow tie, soft blankets and warm lighting, comfortable winter evening atmosphere, loving and content"
  },
  {
    id: 21,
    name: "Picnic Buddy",
    description: "Perfect park day companion",
    category: "Fun",
    species: "dog",
    promptTemplate: "A real {breed} dog sitting on a cozy picnic blanket in a sunny park, wearing a cute bandana, picnic basket nearby, warm afternoon sunlight, happy relaxed expression, ready for family fun, approachable and friendly"
  },
  {
    id: 28,
    name: "Yoga Instructor",
    description: "Flexible fitness guru striking a pose",
    category: "Fun",
    species: "dog",
    promptTemplate: "A balanced portrait of a {breed} dog as a yoga instructor doing downward dog pose on a purple yoga mat, peaceful studio with plants and natural light, wearing athletic gear, zen atmosphere, namaste energy"
  },
  {
    id: 27,
    name: "Taco Tuesday Chef",
    description: "Festive fiesta friend with tasty treats",
    category: "Fun",
    species: "dog",
    promptTemplate: "A real {breed} dog wearing a small sombrero hat and colorful serape bandana, photographed in a festive Mexican cantina setting with papel picado decorations, surrounded by tacos and fresh ingredients on the table, warm fiesta lighting, real dog in real costume, professional pet photography, not cartoon or illustration"
  },
  {
    id: 29,
    name: "Pool Party",
    description: "Splashy summer fun on a pool float",
    category: "Fun",
    species: "dog",
    promptTemplate: "A fun portrait of a {breed} dog lounging on a colorful inflatable pool float in a sparkling blue swimming pool, wearing tiny sunglasses, bright summer day with pool toys and tropical drinks nearby, splashing water droplets catching the sunlight, happy carefree expression, vibrant summer pool party atmosphere"
  },
  {
    id: 30,
    name: "Campfire",
    description: "Cozy campfire under the stars with roasted treats",
    category: "Fun",
    species: "dog",
    promptTemplate: "A cozy portrait of a {breed} dog sitting by a warm campfire under a starry night sky, wearing a tiny camping bandana, roasting pet treats on a stick over the flames, marshmallows and camping supplies nearby, warm flickering firelight on fur, pine trees silhouetted against the stars, happy content expression, outdoor adventure camping atmosphere"
  },
  {
    id: 31,
    name: "Sleepover Party",
    description: "Epic blanket fort sleepover with all the fixings",
    category: "Fun",
    species: "dog",
    promptTemplate: "A fun portrait of a {breed} dog in the middle of an epic sleepover party inside a blanket fort made of colorful sheets and pillows, wearing cozy pajamas, surrounded by sleeping bags, a flashlight casting warm glow, popcorn bowl and stuffed animals scattered around, excited happy expression, playful nighttime sleepover atmosphere"
  },
  {
    id: 101,
    name: "Egyptian Royalty",
    description: "Ancient Egyptian deity with golden adornments",
    category: "Classical",
    species: "cat",
    promptTemplate: "A majestic ancient Egyptian portrait of a {breed} cat as a divine feline deity, wearing golden collar with lapis lazuli and turquoise jewels, Egyptian temple background with hieroglyphics, warm golden lighting, regal and mysterious, in the style of ancient Egyptian art but photorealistic, museum quality"
  },
  {
    id: 102,
    name: "Renaissance Feline",
    description: "Elegant portrait in the Italian Renaissance tradition",
    category: "Classical",
    species: "cat",
    promptTemplate: "A refined Renaissance oil painting portrait of a {breed} cat lounging on a velvet cushion wearing an ornate jeweled collar, dramatic chiaroscuro lighting, rich warm tones, in the style of Leonardo da Vinci, elegant and aristocratic, museum quality, detailed fur texture"
  },
  {
    id: 103,
    name: "Victorian Lady",
    description: "Prim and proper Victorian elegance",
    category: "Classical",
    species: "cat",
    promptTemplate: "A distinguished Victorian portrait of a {breed} cat wearing a delicate lace collar and cameo brooch, perched gracefully on an ornate chair in a parlor with velvet curtains and antique furniture, warm sepia tones, dignified and refined, professional pet photography"
  },
  {
    id: 104,
    name: "Sunbeam Napper",
    description: "Cozy cat basking in a warm sunbeam",
    category: "Cozy",
    species: "cat",
    promptTemplate: "A heartwarming portrait of a {breed} cat curled up and napping in a warm golden sunbeam on a cozy window seat, soft knit blanket underneath, dust motes floating in the light, peaceful sleeping expression, warm amber and honey tones, gentle bokeh background of a cozy living room, photorealistic, tender and serene atmosphere"
  },
  {
    id: 105,
    name: "Space Cadet",
    description: "Cosmic kitty exploring the final frontier",
    category: "Sci-Fi",
    species: "cat",
    promptTemplate: "A full-body portrait of a {breed} cat as an astronaut, the cat's head completely fills the open helmet with no empty space between the head and helmet rim, the cat's furry body naturally fills out a detailed NASA-style space suit with mission patches and life-support hoses, standing heroically on the lunar surface with Earth rising in the background, cosmic starfield and nebula, the cat's face is large and clearly visible looking straight at camera through the open visor, photorealistic cinematic lighting, highly detailed, anatomically correct cat proportions inside the suit"
  },
  {
    id: 106,
    name: "Purrista Barista",
    description: "Your favorite feline coffee artist",
    category: "Fun",
    species: "cat",
    promptTemplate: "An adorable portrait of a {breed} cat as a tiny barista behind a miniature coffee shop counter, wearing a small apron and barista cap, surrounded by espresso machines and latte cups with cat-face latte art, warm cafe lighting with chalkboard menu in background, charming and whimsical, cozy coffeehouse atmosphere, irresistibly cute"
  },
  {
    id: 107,
    name: "Midnight Prowler",
    description: "Mysterious feline under moonlight",
    category: "Adventure",
    species: "cat",
    promptTemplate: "A dramatic portrait of a {breed} cat perched on a moonlit rooftop or garden wall, silvery moonlight casting elegant shadows, starry night sky background, mysterious and enchanting atmosphere, the cat's eyes glowing softly, beautiful nighttime photography"
  },
  {
    id: 108,
    name: "Bookshelf Scholar",
    description: "Intellectual companion among the books",
    category: "Humanizing",
    species: "cat",
    promptTemplate: "An adorable portrait of a {breed} cat sitting among stacked books on a cozy bookshelf, wearing tiny reading glasses perched on nose, warm library lighting, leather-bound books and a warm cup of tea nearby, intellectual and charming, cozy literary atmosphere"
  },
  {
    id: 109,
    name: "Garden Explorer",
    description: "Curious kitty among the flowers",
    category: "Fun",
    species: "cat",
    promptTemplate: "A delightful portrait of a {breed} cat exploring a beautiful garden among blooming flowers and butterflies, wearing a small floral collar, soft afternoon sunlight, curious playful expression, surrounded by colorful roses and lavender, natural and enchanting"
  },
  {
    id: 110,
    name: "Bow Tie Portrait",
    description: "Dapper portrait with a charming bow tie",
    category: "Showcase",
    species: "cat",
    promptTemplate: "A charming portrait of a {breed} cat wearing a cute bow tie, sitting with wide bright eyes, soft studio lighting, clean simple background, friendly and approachable expression, professional pet photo style, captures the cat's sweet personality"
  },
  {
    id: 111,
    name: "Cozy Blanket",
    description: "Snuggly kitty wrapped in warmth",
    category: "Humanizing",
    species: "cat",
    promptTemplate: "An adorable portrait of a {breed} cat wrapped in a soft knitted blanket, peeking out with sleepy content eyes, warm bedroom lighting, fluffy pillows nearby, cozy and heartwarming, like a child tucked in for bedtime, irresistibly cuddly"
  },
  {
    id: 112,
    name: "Halloween Black Cat",
    description: "Enchanting spooky season mystique",
    category: "Seasonal",
    species: "cat",
    promptTemplate: "A whimsical Halloween portrait of a {breed} cat wearing a tiny witch hat, surrounded by glowing jack-o-lanterns and autumn decorations, mysterious and playful atmosphere, orange and purple lighting, enchanting expression, magical and shareable"
  },
  {
    id: 113,
    name: "Holiday Stocking",
    description: "Festive kitty in holiday cheer",
    category: "Seasonal",
    species: "cat",
    promptTemplate: "A real {breed} cat peeking out of a cozy holiday stocking or wearing a fluffy red and white Santa hat, twinkling lights and wrapped presents in background, warm fireplace glow, playful curious expression, heartwarming holiday spirit"
  },
  {
    id: 114,
    name: "Spring Blossoms",
    description: "Gentle beauty among cherry blossoms",
    category: "Seasonal",
    species: "cat",
    promptTemplate: "A beautiful portrait of a {breed} cat sitting among delicate cherry blossom branches, wearing a small flower crown, soft pink petals falling gently, dreamy spring atmosphere, golden hour lighting, gentle and sweet, natural beauty"
  },
  {
    id: 115,
    name: "Box Inspector",
    description: "Classic cat-in-a-box charm",
    category: "Fun",
    species: "cat",
    promptTemplate: "An adorable portrait of a {breed} cat sitting inside a cardboard box, peeking over the edge with curious wide eyes, playful and mischievous expression, warm home lighting, the box decorated with doodles, charming and relatable, captures the universal cat love of boxes"
  },
  {
    id: 116,
    name: "Tea Party Guest",
    description: "Refined afternoon tea companion",
    category: "Fun",
    species: "cat",
    promptTemplate: "A charming portrait of a {breed} cat sitting at a tiny tea party setting with miniature cups and saucers, wearing a small pearl collar, delicate floral tablecloth, soft afternoon light through a window, elegant and whimsical, very British and refined"
  },
  {
    id: 117,
    name: "Pool Lounge",
    description: "Regal poolside lounging on a flamingo float",
    category: "Fun",
    species: "cat",
    promptTemplate: "A delightful portrait of a {breed} cat lounging like royalty on a pink inflatable flamingo float in a sparkling pool, wearing tiny sunglasses, bright summer day, crystal blue water with playful reflections, tropical poolside setting with palm leaves, relaxed and regal expression, fun summer vibes"
  },
  {
    id: 118,
    name: "Starlight Camp",
    description: "Magical campfire night toasting fish treats",
    category: "Fun",
    species: "cat",
    promptTemplate: "A cozy portrait of a {breed} cat sitting by a warm campfire under a starry night sky, wearing a tiny plaid scarf, toasting fish-shaped treats on a stick over the flames, camping lantern and small tent nearby, warm flickering firelight reflecting in wide curious eyes, pine trees and stars in background, magical outdoor camping atmosphere"
  },
  {
    id: 119,
    name: "Blanket Fort",
    description: "Cozy blanket fort party with fairy lights",
    category: "Fun",
    species: "cat",
    promptTemplate: "A fun portrait of a {breed} cat peeking out from inside a cozy blanket fort made of soft sheets and fairy lights, wearing tiny pajamas, surrounded by fluffy pillows and sleeping bags, flashlight beam and popcorn bowl nearby, wide playful eyes, warm glow from string lights, magical sleepover party atmosphere"
  },
];

export const dogStyles = portraitStyles.filter(s => s.species === "dog");
export const catStyles = portraitStyles.filter(s => s.species === "cat");

export function getStylesBySpecies(species: "dog" | "cat"): StyleOption[] {
  return portraitStyles.filter(s => s.species === species);
}

export const styleCategories = Array.from(new Set(portraitStyles.map(s => s.category)));

export function getStyleCategoriesBySpecies(species: "dog" | "cat"): string[] {
  return Array.from(new Set(getStylesBySpecies(species).map(s => s.category)));
}

export const stylePreviewImages: Record<string, string> = {
  "Renaissance Noble": "/images/styles/renaissance-noble.jpg",
  "Baroque Aristocrat": "/images/styles/baroque-aristocrat.jpg",
  "Victorian Gentleman": "/images/styles/victorian-gentleman.jpg",
  "Royal Monarch": "/images/styles/royal-monarch.jpg",
  "Bandana Portrait": "/images/styles/adopt-me-bandana.jpg",
  "Art Nouveau Beauty": "/images/styles/art-nouveau.jpg",
  "Impressionist Garden": "/images/styles/impressionist-garden.jpg",
  "Steampunk Explorer": "/images/styles/steampunk-explorer.jpg",
  "Tutu Princess": "/images/styles/tutu-princess.jpg",
  "Cozy Pajamas": "/images/styles/cozy-pajamas.jpg",
  "Space Explorer": "/images/styles/space-explorer.jpg",
  "Halloween Pumpkin": "/images/styles/halloween-pumpkin.jpg",
  "Birthday Party": "/images/styles/birthday-party.jpg",
  "Pirate Captain": "/images/styles/pirate-captain.jpg",
  "Cowboy Sheriff": "/images/styles/cowboy-sheriff.jpg",
  "Superhero": "/images/styles/superhero.jpg",
  "Country Cowboy": "/images/styles/country-cowboy.jpg",
  "Garden Party": "/images/styles/garden-party.jpg",
  "Beach Day": "/images/styles/beach-day.jpg",
  "Mountain Explorer": "/images/styles/mountain-explorer.jpg",
  "Cozy Cabin": "/images/styles/cozy-cabin.jpg",
  "Autumn Leaves": "/images/styles/autumn-leaves.jpg",
  "Picnic Buddy": "/images/styles/picnic-buddy.jpg",
  "Spring Flower Crown": "/images/styles/flower-crown.jpg",
  "Holiday Spirit": "/images/styles/holiday-spirit.jpg",
  "Vintage Classic": "/images/styles/vintage-classic.jpg",
  "Egyptian Royalty": "/images/styles/egyptian-royalty.jpg",
  "Renaissance Feline": "/images/styles/renaissance-feline.jpg",
  "Victorian Lady": "/images/styles/victorian-lady.jpg",
  "Sunbeam Napper": "/images/styles/sunbeam-napper.jpg",
  "Space Cadet": "/images/styles/space-cadet.jpg",
  "Purrista Barista": "/images/styles/purrista-barista.jpg",
  "Midnight Prowler": "/images/styles/midnight-prowler.jpg",
  "Bookshelf Scholar": "/images/styles/bookshelf-scholar.jpg",
  "Garden Explorer": "/images/styles/garden-explorer.jpg",
  "Bow Tie Portrait": "/images/styles/adopt-me-bow-tie.jpg",
  "Cozy Blanket": "/images/styles/cozy-blanket.jpg",
  "Halloween Black Cat": "/images/styles/halloween-black-cat.jpg",
  "Holiday Stocking": "/images/styles/holiday-stocking.jpg",
  "Spring Blossoms": "/images/styles/spring-blossoms.jpg",
  "Box Inspector": "/images/styles/box-inspector.jpg",
  "Tea Party Guest": "/images/styles/tea-party-guest.jpg",
  "Yoga Instructor": "/images/styles/yoga-instructor.jpg",
  "Taco Tuesday Chef": "/images/styles/taco-tuesday-chef.jpg",
  "Pool Party": "/images/styles/pool-party.jpg?v=2",
  "Campfire": "/images/styles/campfire.jpg?v=2",
  "Sleepover Party": "/images/styles/sleepover-party.jpg?v=2",
  "Pool Lounge": "/images/styles/pool-lounge.jpg?v=2",
  "Starlight Camp": "/images/styles/starlight-camp.jpg?v=2",
  "Blanket Fort": "/images/styles/blanket-fort.jpg?v=2",
};
