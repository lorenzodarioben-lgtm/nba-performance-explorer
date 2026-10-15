/** A season's postseason format (a league rule, not a source field). */
export interface PostseasonFormat {
  playoffCut: number;
  playInCut: number | null;
  label: string;
}
export const FORMAT_2023_24: PostseasonFormat = {
  playoffCut: 6,
  playInCut: 10,
  label: '2023–24 postseason format',
};
/** Play-in tournament (7–10) from 2020–21; eight playoff teams per conference before it. */
export function postseasonFormat(season: string): PostseasonFormat {
  return Number(season.slice(0, 4)) >= 2020
    ? { playoffCut: 6, playInCut: 10, label: 'play-in format since 2020–21' }
    : { playoffCut: 8, playInCut: null, label: 'eight playoff teams per conference' };
}
