const Transposer = require('chord-transposer');
const keyList = ['A', 'A#', 'Bb', 'B', 'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab'];
const keyRegex = new RegExp(
  `(${keyList.sort((a, b) => (a.includes('#') || a.includes('b') ? -1 : 1)).join('|')})`,
  'g'
);

function transpose(chordName: string, semitones: number, originalKey?: string): string {
  function convert(str: string, p1: string, offset: number, s: string) {
    return originalKey
      ? (Transposer.transpose(p1).fromKey(originalKey).up(semitones).toString() as string)
      : (Transposer.transpose(p1).up(semitones).toString() as string);
  }
  return chordName != 'N.C.' ? chordName.replace(keyRegex, convert) : chordName;
}

function guessKey(chrodProTxt: string) {
  const chordOnlyTxt = chrodProTxt
    .match(/\[(.*?)\]/g)
    ?.map((c) => c.replace(/\[|\]/g, ''))
    .join(' ');
  if (!chordOnlyTxt) return undefined;

  return Transposer.transpose(chordOnlyTxt).getKey().majorKey;
}

export { transpose, guessKey };
