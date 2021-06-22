/**
 * URLから曲名を取得します.
 * @param url URL
 * @returns 曲名
 */
function getSongName(url?: string): string | null {
  const songNameMatch =
    decodeURI(url || location.href).match(/ja.chordwiki.org\/wiki\/(.*?)(&|$)/) ||
    decodeURI(url || location.href).match(/ja.chordwiki.org\/wiki\.cgi\?.*t=(.*?)(&|$)/);
  return songNameMatch ? songNameMatch[1] : null;
}

/**
 * URLから移調数を取得します.
 * @param url URL
 * @returns キー
 */
function getKeyTransposition(url?: string): number {
  const keyMatch = decodeURI(location.href).match(/ja.chordwiki.org\/wiki\.cgi\?.*key=(-?\d)(&|$)/);
  return keyMatch ? Number(keyMatch[1]) : 0;
}

export { getSongName, getKeyTransposition };
