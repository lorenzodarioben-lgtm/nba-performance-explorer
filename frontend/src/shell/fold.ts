/** Case- and accent-insensitive text for matching (“Doncic” finds “Dončić”). */
export function fold(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}
