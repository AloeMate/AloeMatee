export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// ── Hardcoded expert responses ─────────────────────────────────────────────

const RESPONSES: Array<{ keywords: string[]; answer: string }> = [
  {
    keywords: ['water', 'irrigat', 'drink', 'wet', 'dry', 'moist'],
    answer:
      '💧 Watering Guide:\n\n1. Water every 2–3 weeks in summer (dry season)\n2. Water once a month in winter / rainy season\n3. Always let the soil dry out completely between waterings\n4. Push your finger 2 cm into the soil — if it feels damp, wait longer\n\n⚠️ Over-watering is the #1 cause of root rot in aloe vera. When in doubt, wait!',
  },
  {
    keywords: ['sun', 'light', 'shade', 'indoor', 'outdoor', 'bright'],
    answer:
      '☀️ Sunlight Requirements:\n\nAloe vera needs 6–8 hours of bright light daily. Indirect sunlight is ideal — avoid harsh direct afternoon sun which causes pale/brown sunburn patches.\n\n• Indoors: Place near a south or east-facing window\n• Outdoors: Partial shade in Sri Lanka\'s tropical heat works best\n• Rotate the pot every 2 weeks for even growth 🌿',
  },
  {
    keywords: ['root rot', 'rot', 'black root', 'brown root', 'mushy', 'soft base', 'wilting'],
    answer:
      '🚨 Root Rot Treatment:\n\n1. Stop watering immediately\n2. Remove the plant from its pot\n3. Cut off all black/brown/mushy roots with a clean sharp knife\n4. Dust cut ends with cinnamon powder (natural fungicide)\n5. Let the roots air-dry for 24–48 hours\n6. Repot in fresh, dry, well-draining soil\n7. Wait 1 full week before watering again\n\nPrevention: Never let the pot sit in standing water 🌱',
  },
  {
    keywords: ['rust', 'orange spot', 'yellow spot', 'brown spot', 'fungus', 'spot'],
    answer:
      '🍂 Aloe Rust (Orange/Brown Spots):\n\n1. Remove all visibly affected leaves immediately\n2. Improve air circulation around the plant\n3. Avoid wetting the leaves when watering — water at soil level only\n4. Apply a copper-based fungicide spray every 7 days for 3 weeks\n5. Avoid overcrowding plants\n\nRust spreads fast in humid conditions — act quickly! 🌿',
  },
  {
    keywords: ['bacterial', 'soft rot', 'slime', 'smell', 'odor', 'collapse', 'gel leak'],
    answer:
      '⚠️ Bacterial Soft Rot Treatment:\n\n1. Remove and destroy all infected leaves — do NOT compost them\n2. Sterilize your cutting tools with alcohol between cuts\n3. Apply a copper-based bactericide spray to remaining healthy leaves\n4. Increase air circulation and reduce humidity\n5. Avoid overhead watering completely\n6. Monitor daily for 2 weeks\n\nBacterial soft rot spreads very quickly — isolate infected plants immediately 🚫',
  },
  {
    keywords: ['harvest', 'cut', 'leaf', 'leaves', 'pick', 'collect', 'gel', 'extract'],
    answer:
      '✂️ Harvesting Aloe Vera Leaves:\n\n1. Only harvest outer (oldest) leaves that are at least 20–25 cm long\n2. Use a clean, sharp knife or scissors — sterilize with alcohol first\n3. Cut the leaf close to the base at a slight angle\n4. Never take more than 3–4 leaves at a time from one plant\n5. Stand the cut leaf upright for 10–15 minutes to let the yellow aloin sap drain out (it\'s a laxative)\n6. Rinse with water before extracting gel\n\nLeave the plant to recover for 4–6 weeks between harvests 🌿',
  },
  {
    keywords: ['fertiliz', 'feed', 'nutrient', 'npk', 'compost', 'manure'],
    answer:
      '🌱 Fertilizing Aloe Vera:\n\n• Fertilize only twice a year — once in spring (March–April) and once in summer (June–July)\n• Use a diluted balanced fertilizer (10-40-10) at half the recommended dose\n• Organic options: diluted compost tea or worm castings work well\n• NEVER fertilize in winter or during dormancy\n• Too much fertilizer causes weak, floppy leaves and root burn\n\nAloe vera actually prefers poor soil — less is more! 🌵',
  },
  {
    keywords: ['soil', 'dirt', 'potting', 'mix', 'sand', 'perlite', 'drainage', 'pot'],
    answer:
      '🪴 Best Soil for Aloe Vera:\n\n• Use a cactus/succulent potting mix as the base\n• Add 20–30% coarse perlite or coarse sand for drainage\n• Avoid regular garden soil — it retains too much moisture\n• The pot must have drainage holes at the bottom\n• Terra cotta (clay) pots are ideal as they absorb excess moisture\n\nRecipe: 2 parts cactus mix + 1 part perlite + 1 part coarse sand 🌿',
  },
  {
    keywords: ['pest', 'bug', 'insect', 'mealybug', 'aphid', 'scale', 'mite', 'spider'],
    answer:
      '🐛 Pest Control for Aloe Vera:\n\n• Mealybugs: Wipe with a cotton ball dipped in rubbing alcohol\n• Aphids: Spray with diluted neem oil solution (5ml per 1L water)\n• Scale insects: Scrape off manually, then apply neem oil\n• Spider mites: Increase humidity, spray with water, apply neem oil\n\nPrevention: Inspect plants weekly, keep leaves dry, ensure good air flow. Neem oil spray once a month prevents most pests 🌱',
  },
  {
    keywords: ['temperature', 'cold', 'frost', 'heat', 'climate', 'weather', 'sri lanka'],
    answer:
      '🌡️ Temperature & Climate:\n\nAloe vera thrives in Sri Lanka\'s tropical climate!\n\n• Ideal temperature: 18°C – 35°C\n• Can tolerate up to 40°C with shade and adequate water\n• Cannot survive frost — bring indoors if temperature drops below 10°C\n• In Sri Lanka\'s dry zone (Anuradhapura, Kurunegala, Polonnaruwa): excellent growing conditions\n• In wet zone: ensure very well-draining soil and raised beds to prevent waterlogging 🌴',
  },
  {
    keywords: ['propagat', 'pup', 'offshoot', 'baby', 'new plant', 'multiply', 'grow more'],
    answer:
      '🌱 Propagating Aloe Vera (from Pups):\n\n1. Wait until pups (baby plants) are at least 10 cm tall\n2. Gently remove the mother plant from its pot\n3. Carefully separate the pup — it should have its own small roots\n4. Let the pup dry for 1–2 days (callous the cut end)\n5. Plant in a small pot with dry cactus/succulent mix\n6. Wait 1 week before first watering\n\nPups transplanted with roots have a 90%+ survival rate 🌿',
  },
  {
    keywords: ['yellow', 'pale', 'color', 'colour', 'brown tip', 'brown edge', 'discolor'],
    answer:
      '🍋 Leaf Discolouration Causes:\n\n• Yellow leaves → Usually over-watering or too little light\n• Pale/washed-out leaves → Too much direct sunlight (sunburn)\n• Brown tips → Low humidity, fluoride in tap water, or under-watering\n• Brown base → Root rot (check roots immediately)\n• Red/purple tinge → Too much direct sun or temperature stress (usually harmless)\n\nTip: Use rainwater or filtered water to avoid fluoride damage 🌿',
  },
  {
    keywords: ['diagnos', 'disease', 'sick', 'problem', 'issue', 'unhealthy', 'dying', 'help'],
    answer:
      '🔍 Diagnosing Your Aloe Vera:\n\nUse the AloeMatee Diagnose feature for a precise AI-powered diagnosis!\n\nCommon diseases to watch for:\n• Root rot — mushy base, yellowing lower leaves\n• Bacterial soft rot — water-soaked, slimy patches\n• Aloe rust — orange/brown circular spots on leaves\n• Leaf blight — dry brown patches spreading from leaf tips\n\nFor best results, take a clear photo of the affected leaf in good lighting and run it through the Diagnose tab 📸',
  },
  {
    keywords: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'namaste', 'ayubowan'],
    answer:
      '👋 Hello! Welcome to the AloeMatee AI Care Assistant!\n\nI\'m here to help you with all your aloe vera care questions 🌿\n\nYou can ask me about:\n• 💧 Watering schedules\n• ☀️ Sunlight & temperature\n• 🚨 Disease treatment (root rot, rust, soft rot)\n• ✂️ Harvesting techniques\n• 🪴 Soil & fertilizer\n• 🐛 Pest control\n• 🌱 Propagation\n\nWhat would you like to know?',
  },
  {
    keywords: ['thank', 'thanks', 'great', 'awesome', 'helpful', 'good', 'perfect', 'nice'],
    answer:
      '😊 You\'re welcome! Happy growing! 🌿\n\nFeel free to ask anything else about your aloe vera plants. Remember — healthy plants start with good observation. Check your plants once a week and catch problems early!\n\nFor disease detection, use the Diagnose tab in AloeMatee 📱',
  },
  {
    keywords: ['flower', 'bloom', 'blossom', 'flowering'],
    answer:
      '🌸 Aloe Vera Flowering:\n\nAloe vera blooms once a year, typically in winter/spring. The flower stalk (called a raceme) grows up to 90 cm tall with tubular orange or yellow flowers.\n\n• Flowering means your plant is healthy and mature (usually 3–4+ years old)\n• You can leave the flower stalk or cut it once blooming is complete\n• Flowering uses a lot of the plant\'s energy — reduce watering slightly during this period\n• After flowering, the plant may produce more pups 🌱',
  },
  {
    keywords: ['repot', 'pot size', 'transplant', 'container', 'bigger pot'],
    answer:
      '🪴 When & How to Repot:\n\nRepot when roots start coming out of drainage holes or the plant tips over.\n\n1. Choose a pot 2–3 cm wider than the current one\n2. Use fresh cactus/succulent mix\n3. Repot in spring or early summer for best recovery\n4. Water lightly 3–4 days after repotting\n5. Keep in indirect light for 2 weeks after repotting to reduce stress\n\nAloe vera prefers being slightly root-bound — don\'t over-pot! 🌿',
  },
];

const DEFAULT_RESPONSE =
  '🌿 Great question! I can help you with:\n\n• 💧 Watering schedules\n• ☀️ Sunlight & temperature needs\n• 🚨 Root rot & disease treatment\n• ✂️ Harvesting tips\n• 🪴 Soil & fertilizer advice\n• 🐛 Pest control\n• 🌱 Propagation from pups\n• 🌸 Flowering & repotting\n\nTry asking something like "How do I treat root rot?" or "When should I water?" 🌱';

function getLocalReply(input: string): string {
  const text = input.toLowerCase();
  for (const item of RESPONSES) {
    if (item.keywords.some(kw => text.includes(kw))) {
      return item.answer;
    }
  }
  return DEFAULT_RESPONSE;
}

// ── Public API (same interface as before) ──────────────────────────────────

export async function sendGeminiMessage(
  userMessage: string,
  _history: ChatMessage[]
): Promise<string> {
  // Simulate a short thinking delay for natural feel
  await new Promise(r => setTimeout(r, 600));
  return getLocalReply(userMessage);
}
