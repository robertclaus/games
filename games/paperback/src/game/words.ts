export async function isValidWord(word: string): Promise<boolean> {
  if (word.length < 2) return false;
  const w = word.toLowerCase().trim();
  if (!/^[a-z]+$/.test(w)) return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${w}`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    // Network error or timeout - fail open
    return true;
  }
}
