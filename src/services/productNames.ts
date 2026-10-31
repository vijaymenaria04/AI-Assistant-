import { i18n } from './i18n';

// Only the supplied fixed catalogue names are translated. Other user-entered
// product names are displayed exactly as entered and are never rewritten.
const productHindi: Record<string, string> = {
  'Peda': 'पेड़ा',
  'Saata': 'साटा',
  'Mohanthal': 'मोहनथाल',
  'Mysore Pak': 'मैसूर पाक',
  'Fafda': 'फाफड़ा',
  'Churma Ladoo': 'चूरमा लड्डू',
  'Besan Ladoo': 'बेसन लड्डू',
  'Boondi Ladoo': 'बूंदी लड्डू',
  'Motichoor Ladoo': 'मोतीचूर लड्डू',
  'Mawa Cake': 'मावा केक',
  'Gundar Pak': 'गुंदर पाक',
  'Chorafali': 'चोराफली',
  'Methi Ladoo': 'मेथी लड्डू',
  'Dhosa Khakhra': 'ढोसा खाखरा',
  'Philia Ladoo': 'फिलिया लड्डू',
  'Chocolate Barfi': 'चॉकलेट बर्फी',
  'White Chocolate Barfi': 'व्हाइट चॉकलेट बर्फी',
  'Dry Fruit Barfi': 'ड्राई फ्रूट बर्फी',
  'Anjeer Barfi': 'अंजीर बर्फी',
  'Bombay Halwa': 'बॉम्बे हलवा',
  'Mahim Halwa': 'माहिम हलवा',
  'Kalakand': 'कलाकंद',
  'Malai Penda': 'मलाई पेंडा',
  'Kesar Penda': 'केसर पेंडा',
  'Gulab Jamun': 'गुलाब जामुन',
  'Badam Katri': 'बादाम कतरी',
  'Kala Jamun': 'काला जामुन',
  'Kaju Katri': 'काजू कतरी',
  'Badam Pak': 'बादाम पाक',
  'Kesar Kaju Katri': 'केसर काजू कतरी',
  'Dry Fruit Date Roll': 'ड्राई फ्रूट खजूर रोल',
  'Special Badam Ghughra': 'स्पेशल बादाम घूघरा',
  'Mixed Sweets': 'मिक्स मिठाई',
  'Special Mixed Sweets': 'स्पेशल मिक्स मिठाई',
  'Dry Fruit Mixed Sweets': 'ड्राई फ्रूट मिक्स मिठाई',
  'Chivda': 'चिवड़ा',
  'Papdi': 'पापड़ी',
  'Bhavnagari Gathiya': 'भावनगरी गाठिया',
  'Makhaniya Gathiya': 'मखानिया गाठिया',
  'Kachori': 'कचौरी',
  'Bhakharwadi': 'भाकरवड़ी',
  'Chakri': 'चक्री',
  'Ghee Khakhra': 'घी खाखरा',
  'Sweet Khakhra': 'मीठा खाखरा',
  'Math Khakhra': 'मठ खाखरा',
  'Paan Mukhwas': 'पान मुखवास',
  'Sweet Neem Mukhwas': 'मीठी नीम मुखवास',
  'Gila Paan Mukhwas': 'गीला पान मुखवास',
  'Pickles (Achar)': 'अचार'
};

const normalize = (name: string) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
const hindiByName = new Map(Object.entries(productHindi).map(([name, hindi]) => [normalize(name), hindi]));
const englishByHindi = new Map(Object.entries(productHindi).map(([name, hindi]) => [normalize(hindi), normalize(name)]));

export function getHindiProductName(name: string): string {
  return hindiByName.get(normalize(name)) ?? name;
}

export function displayProductName(name: string): string {
  return i18n.getLanguage() === 'hi' ? getHindiProductName(name) : name;
}

export function matchesProductName(name: string, query: string): boolean {
  const q = normalize(query);
  return normalize(name).includes(q) || normalize(getHindiProductName(name)).includes(q);
}

/** Exact matching across the supplied bilingual catalogue, without fuzzy guessing. */
export function sameProductName(a: string, b: string): boolean {
  const canonical = (value: string) => englishByHindi.get(normalize(value)) ?? normalize(value);
  return canonical(a) === canonical(b);
}
