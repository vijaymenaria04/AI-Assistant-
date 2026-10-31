// Names supplied by the owner; no prices, quantities, or units are inferred.
export const JAIN_SWEETS_INVENTORY: ReadonlyArray<{ name: string; category: 'Sweets' | 'Farsan' | 'Mukhwas' | 'Pickles (Achar)' }> = [
  ...[
    'Peda', 'Saata', 'Mohanthal', 'Mysore Pak', 'Churma Ladoo', 'Besan Ladoo',
    'Boondi Ladoo', 'Motichoor Ladoo', 'Mawa Cake', 'Gundar Pak', 'Methi Ladoo',
    'Philia Ladoo', 'Chocolate Barfi', 'White Chocolate Barfi', 'Dry Fruit Barfi',
    'Anjeer Barfi', 'Bombay Halwa', 'Mahim Halwa', 'Kalakand', 'Malai Penda',
    'Kesar Penda', 'Gulab Jamun', 'Badam Katri', 'Kala Jamun', 'Kaju Katri',
    'Badam Pak', 'Kesar Kaju Katri', 'Dry Fruit Date Roll', 'Special Badam Ghughra',
    'Mixed Sweets', 'Special Mixed Sweets', 'Dry Fruit Mixed Sweets'
  ].map(name => ({ name, category: 'Sweets' as const })),
  ...[
    'Fafda', 'Chorafali', 'Dhosa Khakhra', 'Chivda', 'Papdi', 'Bhavnagari Gathiya',
    'Makhaniya Gathiya', 'Kachori', 'Bhakharwadi', 'Chakri', 'Ghee Khakhra',
    'Sweet Khakhra', 'Math Khakhra'
  ].map(name => ({ name, category: 'Farsan' as const })),
  ...['Paan Mukhwas', 'Sweet Neem Mukhwas', 'Gila Paan Mukhwas']
    .map(name => ({ name, category: 'Mukhwas' as const })),
  { name: 'Pickles (Achar)', category: 'Pickles (Achar)' }
];
