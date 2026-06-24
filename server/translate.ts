const PHRASE_MAP: Record<string, string> = {
  "necesita limpieza": "needs cleaning",
  "necesita reemplazo": "needs replacement",
  "necesita reparación": "needs repair",
  "necesita pintura": "needs painting",
  "necesita atención": "needs attention",
  "en buen estado": "in good condition",
  "en mal estado": "in bad condition",
  "muy sucio": "very dirty",
  "muy dañado": "very damaged",
  "muy manchado": "very stained",
  "no funciona": "not working",
  "no cierra": "doesn't close",
  "no abre": "doesn't open",
  "no enciende": "doesn't turn on",
  "no apaga": "doesn't turn off",
  "no sirve": "doesn't work",
  "no tiene": "doesn't have",
  "está roto": "is broken",
  "está rota": "is broken",
  "está dañado": "is damaged",
  "está dañada": "is damaged",
  "está manchado": "is stained",
  "está manchada": "is stained",
  "está sucio": "is dirty",
  "está sucia": "is dirty",
  "está limpio": "is clean",
  "está limpia": "is clean",
  "está flojo": "is loose",
  "está floja": "is loose",
  "está suelto": "is loose",
  "está suelta": "is loose",
  "está oxidado": "is rusty",
  "está oxidada": "is rusty",
  "está rayado": "is scratched",
  "está rayada": "is scratched",
  "está agrietado": "is cracked",
  "está agrietada": "is cracked",
  "está desgastado": "is worn",
  "está desgastada": "is worn",
  "está pelado": "is peeling",
  "está pelada": "is peeling",
  "está abollado": "is dented",
  "está abollada": "is dented",
  "está quemado": "is burned",
  "está quemada": "is burned",
  "está mojado": "is wet",
  "está mojada": "is wet",
  "está húmedo": "is damp",
  "está húmeda": "is damp",
  "tiene manchas": "has stains",
  "tiene grietas": "has cracks",
  "tiene rayones": "has scratches",
  "tiene abolladuras": "has dents",
  "tiene moho": "has mold",
  "tiene óxido": "has rust",
  "tiene agujeros": "has holes",
  "tiene olor": "has odor",
  "tiene fuga": "has a leak",
  "tiene fugas": "has leaks",
  "hay fuga": "there is a leak",
  "hay fugas": "there are leaks",
  "falta la": "missing the",
  "falta el": "missing the",
  "faltan las": "missing the",
  "faltan los": "missing the",
  "hay que cambiar": "needs to be replaced",
  "hay que limpiar": "needs to be cleaned",
  "hay que reparar": "needs to be repaired",
  "hay que pintar": "needs to be painted",
  "hay que reemplazar": "needs to be replaced",
  "se necesita": "needed",
  "se recomienda": "recommended",
  "la puerta": "the door",
  "la ventana": "the window",
  "la pared": "the wall",
  "el piso": "the floor",
  "el techo": "the ceiling",
  "la cerradura": "the lock",
  "el interruptor": "the switch",
  "la luz": "the light",
  "el grifo": "the faucet",
  "el inodoro": "the toilet",
  "la ducha": "the shower",
  "la bañera": "the bathtub",
  "el lavabo": "the sink",
  "el espejo": "the mirror",
  "la cortina": "the curtain",
  "las persianas": "the blinds",
  "el sofá": "the couch",
  "la mesa": "the table",
  "la silla": "the chair",
  "la cama": "the bed",
  "el colchón": "the mattress",
  "la almohada": "the pillow",
  "las sábanas": "the sheets",
  "las toallas": "the towels",
  "el gabinete": "the cabinet",
  "el closet": "the closet",
  "el cajón": "the drawer",
  "la estantería": "the shelf",
  "el refrigerador": "the refrigerator",
  "la estufa": "the stove",
  "el horno": "the oven",
  "el microondas": "the microwave",
  "el lavavajillas": "the dishwasher",
  "la lavadora": "the washer",
  "la secadora": "the dryer",
  "el aire acondicionado": "the air conditioning",
  "el calentador": "the heater",
  "el ventilador": "the fan",
  "el detector de humo": "the smoke detector",
  "el extintor": "the fire extinguisher",
  "papel higiénico": "toilet paper",
  "bolsas de basura": "garbage bags",
  "toalla de papel": "paper towel",
  "agua caliente": "hot water",
  "agua fría": "cold water",
  "de buena calidad": "good quality",
  "de mala calidad": "poor quality",
};

const WORD_MAP: Record<string, string> = {
  "roto": "broken",
  "rota": "broken",
  "rotos": "broken",
  "rotas": "broken",
  "dañado": "damaged",
  "dañada": "damaged",
  "dañados": "damaged",
  "dañadas": "damaged",
  "sucio": "dirty",
  "sucia": "dirty",
  "sucios": "dirty",
  "sucias": "dirty",
  "limpio": "clean",
  "limpia": "clean",
  "limpios": "clean",
  "limpias": "clean",
  "manchado": "stained",
  "manchada": "stained",
  "manchados": "stained",
  "manchadas": "stained",
  "manchas": "stains",
  "mancha": "stain",
  "rayado": "scratched",
  "rayada": "scratched",
  "rayones": "scratches",
  "rayón": "scratch",
  "agrietado": "cracked",
  "agrietada": "cracked",
  "grietas": "cracks",
  "grieta": "crack",
  "desgastado": "worn",
  "desgastada": "worn",
  "pelado": "peeling",
  "pelada": "peeling",
  "oxidado": "rusty",
  "oxidada": "rusty",
  "óxido": "rust",
  "flojo": "loose",
  "floja": "loose",
  "suelto": "loose",
  "suelta": "loose",
  "faltante": "missing",
  "faltantes": "missing",
  "falta": "missing",
  "faltan": "missing",
  "abollado": "dented",
  "abollada": "dented",
  "abolladuras": "dents",
  "abolladura": "dent",
  "quemado": "burned",
  "quemada": "burned",
  "mojado": "wet",
  "mojada": "wet",
  "húmedo": "damp",
  "húmeda": "damp",
  "moho": "mold",
  "mohoso": "moldy",
  "mohosa": "moldy",
  "agujero": "hole",
  "agujeros": "holes",
  "olor": "odor",
  "olores": "odors",
  "fuga": "leak",
  "fugas": "leaks",
  "goteo": "drip",
  "gotea": "dripping",
  "funciona": "works",
  "funcionando": "working",
  "encendido": "on",
  "apagado": "off",
  "abierto": "open",
  "abierta": "open",
  "cerrado": "closed",
  "cerrada": "closed",
  "nuevo": "new",
  "nueva": "new",
  "viejo": "old",
  "vieja": "old",
  "bueno": "good",
  "buena": "good",
  "malo": "bad",
  "mala": "bad",
  "bien": "fine",
  "mal": "bad",
  "grande": "large",
  "pequeño": "small",
  "pequeña": "small",
  "puerta": "door",
  "puertas": "doors",
  "ventana": "window",
  "ventanas": "windows",
  "pared": "wall",
  "paredes": "walls",
  "piso": "floor",
  "pisos": "floors",
  "techo": "ceiling",
  "techos": "ceilings",
  "cerradura": "lock",
  "cerraduras": "locks",
  "llave": "key",
  "llaves": "keys",
  "interruptor": "switch",
  "interruptores": "switches",
  "enchufe": "outlet",
  "enchufes": "outlets",
  "luz": "light",
  "luces": "lights",
  "lámpara": "lamp",
  "lámparas": "lamps",
  "bombilla": "bulb",
  "bombillas": "bulbs",
  "grifo": "faucet",
  "grifos": "faucets",
  "inodoro": "toilet",
  "ducha": "shower",
  "bañera": "bathtub",
  "lavabo": "sink",
  "espejo": "mirror",
  "espejos": "mirrors",
  "cortina": "curtain",
  "cortinas": "curtains",
  "persianas": "blinds",
  "persiana": "blind",
  "sofá": "couch",
  "mesa": "table",
  "mesas": "tables",
  "silla": "chair",
  "sillas": "chairs",
  "cama": "bed",
  "camas": "beds",
  "colchón": "mattress",
  "almohada": "pillow",
  "almohadas": "pillows",
  "sábanas": "sheets",
  "sábana": "sheet",
  "toalla": "towel",
  "toallas": "towels",
  "gabinete": "cabinet",
  "gabinetes": "cabinets",
  "cajón": "drawer",
  "cajones": "drawers",
  "estante": "shelf",
  "estantes": "shelves",
  "refrigerador": "refrigerator",
  "estufa": "stove",
  "horno": "oven",
  "microondas": "microwave",
  "lavavajillas": "dishwasher",
  "lavadora": "washer",
  "secadora": "dryer",
  "televisor": "TV",
  "televisión": "TV",
  "ventilador": "fan",
  "alfombra": "carpet",
  "alfombras": "carpets",
  "azulejo": "tile",
  "azulejos": "tiles",
  "pintura": "paint",
  "barandal": "railing",
  "balcón": "balcony",
  "pasillo": "hallway",
  "pasillos": "hallways",
  "cocina": "kitchen",
  "baño": "bathroom",
  "dormitorio": "bedroom",
  "sala": "living room",
  "comedor": "dining room",
  "entrada": "entry",
  "necesita": "needs",
  "limpieza": "cleaning",
  "reemplazo": "replacement",
  "reparación": "repair",
  "atención": "attention",
  "cambio": "change",
  "revisión": "inspection",
  "verificar": "verify",
  "revisar": "check",
  "limpiar": "clean",
  "reparar": "repair",
  "reemplazar": "replace",
  "cambiar": "change",
  "pintar": "paint",
  "arreglar": "fix",
  "instalar": "install",
  "quitar": "remove",
  "agregar": "add",
  "mover": "move",
  "hay": "there is",
  "tiene": "has",
  "está": "is",
  "son": "are",
  "están": "are",
  "con": "with",
  "sin": "without",
  "para": "for",
  "por": "for",
  "muy": "very",
  "más": "more",
  "menos": "less",
  "todo": "all",
  "todos": "all",
  "algunas": "some",
  "algunos": "some",
  "también": "also",
  "pero": "but",
  "porque": "because",
  "donde": "where",
  "cuando": "when",
  "como": "like",
  "dentro": "inside",
  "fuera": "outside",
  "arriba": "above",
  "abajo": "below",
  "detrás": "behind",
  "debajo": "underneath",
  "encima": "on top",
  "alrededor": "around",
  "cerca": "near",
  "lejos": "far",
  "la": "the",
  "el": "the",
  "las": "the",
  "los": "the",
  "un": "a",
  "una": "a",
  "del": "of the",
  "al": "to the",
  "de": "of",
  "en": "in",
  "no": "not",
  "sí": "yes",
  "y": "and",
  "o": "or",
  "se": "",
};

const SPANISH_PATTERNS = [
  /[áéíóúñü]/i,
  /\b(está|están|tiene|tienen|necesita|necesitan|hay|falta|faltan|puede|pueden|debe|deben)\b/i,
  /\b(roto|rota|rotos|rotas|sucio|sucia|dañado|dañada|manchado|manchada|limpio|limpia)\b/i,
  /\b(puerta|ventana|pared|piso|techo|cocina|baño|sala|dormitorio|pasillo)\b/i,
  /\b(limpiar|reparar|cambiar|reemplazar|verificar|revisar|arreglar|instalar|pintar)\b/i,
  /\b(bueno|buena|malo|mala|grande|pequeño|nuevo|viejo|vieja)\b/i,
  /\b(con|sin|para|por|muy|más|menos|también|pero|porque|donde|cuando)\b/i,
  /\b(sofá|colchón|sábanas|almohada|toalla|gabinete|cajón|grifo|lavabo|ducha)\b/i,
  /\b(goteo|gotea|fuga|fugas|mohoso|mohosa|húmedo|húmeda|mojado|mojada)\b/i,
  /\b(funciona|funcionando|encendido|apagado|abierto|cerrado|flojo|suelto)\b/i,
  /\b(refrigerador|estufa|horno|microondas|lavavajillas|lavadora|secadora)\b/i,
  /\b(ventilador|televisor|alfombra|azulejo|barandal|balcón|cerradura)\b/i,
];

function containsSpanish(text: string): boolean {
  return SPANISH_PATTERNS.some((regex) => regex.test(text));
}

function extractFreeText(notes: string): { structured: string; freeText: string } {
  const pipeIdx = notes.indexOf(" | ");
  if (pipeIdx !== -1) {
    return { structured: notes.substring(0, pipeIdx), freeText: notes.substring(pipeIdx + 3) };
  }

  const notesMatch = notes.match(/^(.*?)(Notes:\s*)([\s\S]*)$/i);
  if (notesMatch) {
    return { structured: notesMatch[1], freeText: notesMatch[3] };
  }

  return { structured: "", freeText: notes };
}

function translateText(text: string): string {
  if (!text.trim()) return text;

  let result = text;
  const placeholders: string[] = [];

  result = result.replace(/\b[A-Z]{2,}\b/g, (match) => {
    placeholders.push(match);
    return `__PRESERVE_${placeholders.length - 1}__`;
  });

  const sortedPhrases = Object.entries(PHRASE_MAP).sort(
    (a, b) => b[0].length - a[0].length
  );

  for (const [es, en] of sortedPhrases) {
    const escaped = es.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "gi");
    result = result.replace(regex, en);
  }

  result = result.replace(/\b[\wáéíóúñü]+\b/gi, (word) => {
    const lower = word.toLowerCase();
    if (WORD_MAP[lower] !== undefined) {
      return WORD_MAP[lower];
    }
    return word;
  });

  result = result.replace(/__PRESERVE_(\d+)__/g, (_, idx) => placeholders[parseInt(idx)]);

  result = result.replace(/\s{2,}/g, " ").trim();

  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }

  return result;
}

export function translateNotesToEnglish(notes: string | undefined | null): string | undefined {
  if (!notes) return notes as undefined;

  const { structured, freeText } = extractFreeText(notes);

  if (!freeText || !containsSpanish(freeText)) {
    if (structured && containsSpanish(structured)) {
      return translateText(notes);
    }
    return notes;
  }

  const translatedFreeText = translateText(freeText);

  if (structured) {
    if (notes.includes(" | ")) {
      return `${structured} | ${translatedFreeText}`;
    }
    return `${structured}Notes: ${translatedFreeText}`;
  }

  return translatedFreeText;
}

export function translateChecklistNotes(
  checklistData: Array<{ notes?: string; [key: string]: any }>
): Array<{ notes?: string; [key: string]: any }> {
  return checklistData.map((item) => ({
    ...item,
    notes: item.notes ? translateNotesToEnglish(item.notes) : item.notes,
  }));
}
