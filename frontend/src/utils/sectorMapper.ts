/**
 * Sector code mapping utility for PSX Portfolio Agent
 */
const SECTOR_MAPPING: Record<string, string> = {
  '0801': 'Automobile Assembler',
  '0802': 'Automobile Parts & Accessories',
  '0803': 'Cable & Electrical Goods',
  '0804': 'Cement',
  '0805': 'Chemical',
  '0806': 'Close-End Mutual Fund',
  '0807': 'Commercial Banks',
  '0808': 'Engineering',
  '0809': 'Fertilizer',
  '0810': 'Food & Personal Care Products',
  '0811': 'Glass & Ceramics',
  '0812': 'Insurance',
  '0813': 'Investment Banks / Investment Companies / Securities Companies',
  '0814': 'Jute',
  '0815': 'Leasing Companies',
  '0816': 'Leather & Tanneries',
  '0818': 'Miscellaneous',
  '0819': 'Modarabas',
  '0820': 'Oil & Gas Exploration Companies',
  '0821': 'Oil & Gas Marketing Companies',
  '0822': 'Paper, Board & Packaging',
  '0823': 'Pharmaceuticals',
  '0824': 'Power Generation & Distribution',
  '0825': 'Refinery',
  '0826': 'Sugar & Allied Industries',
  '0827': 'Synthetic & Rayon',
  '0828': 'Technology & Communication',
  '0829': 'Textile Composite',
  '0830': 'Textile Spinning',
  '0831': 'Textile Weaving',
  '0832': 'Tobacco',
  '0833': 'Transport',
  '0834': 'Vanaspati & Allied Industries',
  '0835': 'Woollen',
  '0836': 'Real Estate Investment Trust',
  '0837': 'Exchange Traded Funds',
  '0838': 'Property',
  '0839': 'Apparel',
};

/**
 * Maps a sector code (e.g. '0807') or raw text (e.g. '0807: Commercial Banks') to a human-readable name.
 */
export function mapSector(sectorCode: string | number | null | undefined): string {
  if (sectorCode === null || sectorCode === undefined) return 'Unknown Sector';
  
  const rawStr = String(sectorCode).trim();
  
  // 1. Check if the string is in format "CODE: NAME"
  const colonMatch = rawStr.match(/^(\d+)\s*:\s*(.*)$/);
  if (colonMatch) {
    const code = colonMatch[1].padStart(4, '0');
    if (SECTOR_MAPPING[code]) {
      return SECTOR_MAPPING[code];
    }
    return colonMatch[2].trim();
  }

  // 2. Check if the string is just a code number (e.g. "807" or "0807")
  if (/^\d+$/.test(rawStr)) {
    const padded = rawStr.padStart(4, '0');
    if (SECTOR_MAPPING[padded]) {
      return SECTOR_MAPPING[padded];
    }
  }

  // 3. See if a code is embedded in the string (e.g. "SECTOR 0807")
  const embeddedCode = rawStr.match(/\b(\d{3,4})\b/);
  if (embeddedCode) {
    const padded = embeddedCode[1].padStart(4, '0');
    if (SECTOR_MAPPING[padded]) {
      return SECTOR_MAPPING[padded];
    }
  }

  // 4. Try matching raw string against any of the names in our mapping
  const lowerRaw = rawStr.toLowerCase();
  for (const [_, name] of Object.entries(SECTOR_MAPPING)) {
    if (lowerRaw.includes(name.toLowerCase()) || name.toLowerCase().includes(lowerRaw)) {
      return name;
    }
  }

  return rawStr;
}
