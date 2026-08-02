export const ALPHABET_CODE = 'tokipona-12';

const vowels = new Set('aáäeéiíyýoóôuúAÁÄEÉIÍYÝOÓÔUÚ');

export function isVowel(grapheme: string): boolean {
  return vowels.has(grapheme);
}

export function isLetter(grapheme: string): boolean {
  return (
    /^[a-zA-ZááäeéiíyýoóôuúAÁÄEÉIÍYÝOÓÔUÚščžťďňľĺŕčďžťňľĺŕŠČŽŤĎŇĽĹŔ]$/.test(grapheme) ||
    /^(ch|dz|dž|CH|Ch|Dz|Dž|DŽ)$/i.test(grapheme)
  );
}

export function isConsonant(grapheme: string): boolean {
  return isLetter(grapheme) && !vowels.has(grapheme);
}

export function tokenizeSlovak(text: string): string[] {
  const result: string[] = [];
  let i = 0;
  while (i < text.length) {
    const remaining = text.slice(i);
    const lowerRemaining = remaining.toLowerCase();
    if (lowerRemaining.startsWith('dž')) {
      result.push(text.slice(i, i + 2));
      i += 2;
    } else if (lowerRemaining.startsWith('dz')) {
      result.push(text.slice(i, i + 2));
      i += 2;
    } else if (lowerRemaining.startsWith('ch')) {
      result.push(text.slice(i, i + 2));
      i += 2;
    } else {
      result.push(text[i]);
      i++;
    }
  }
  return result;
}

export function splitWordIntoGroups(word: string): string[] {
  if (!word) return [];
  const graphemes = tokenizeSlovak(word);
  const splitPoints: number[] = [];

  for (let i = 1; i < graphemes.length; i++) {
    if (isConsonant(graphemes[i]) && isVowel(graphemes[i - 1])) {
      splitPoints.push(i);
    }
  }

  const groups: string[] = [];
  let lastIndex = 0;
  for (const splitPoint of splitPoints) {
    groups.push(graphemes.slice(lastIndex, splitPoint).join(''));
    lastIndex = splitPoint;
  }
  groups.push(graphemes.slice(lastIndex).join(''));
  return groups;
}

export function getRepresentativeGrapheme(group: string): string {
  const graphemes = tokenizeSlovak(group);
  for (const g of graphemes) {
    if (isConsonant(g)) {
      return g;
    }
  }
  for (const g of graphemes) {
    if (isLetter(g)) {
      return g;
    }
  }
  return graphemes[0] || '';
}

export const tokipona_12_sk_map: Record<string, string> = {
  // Vowels
  'a': 'A', 'á': 'A', 'ä': 'A',
  'e': 'E', 'é': 'E',
  'i': 'I', 'í': 'I', 'y': 'I', 'ý': 'I',
  'o': 'O', 'ó': 'O', 'ô': 'O',
  'u': 'U', 'ú': 'U',

  // Consonants
  // K group: k, g, h, ch
  'k': 'K', 'g': 'K', 'h': 'K', 'ch': 'K',
  // L group: l, ľ, ĺ, r, ŕ
  'l': 'L', 'ľ': 'L', 'ĺ': 'L', 'r': 'L', 'ŕ': 'L',
  // M group: m
  'm': 'M',
  // N group: n, ň
  'n': 'N', 'ň': 'N',
  // P group: p, b, f, v, w
  'p': 'P', 'b': 'P', 'f': 'P', 'v': 'P', 'w': 'P',
  // S group: c, č, s, š, z, ž, dz, dž
  'c': 'S', 'č': 'S', 's': 'S', 'š': 'S', 'z': 'S', 'ž': 'S', 'dz': 'S', 'dž': 'S',
  // T group: t, ť, d, ď
  't': 'T', 'ť': 'T', 'd': 'T', 'ď': 'T',

  // j and w
  'j': 'I',
  'x': 'K',
  'q': 'K'
};

export function mapToTokiPona(grapheme: string): string {
  const g = grapheme.toLowerCase();
  return tokipona_12_sk_map[g] || '';
}
