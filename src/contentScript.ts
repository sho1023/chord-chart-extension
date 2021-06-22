import { getSongName, getKeyTransposition } from './util/url';
import { transpose, guessKey } from './util/transpose';
import ContextMenu from './types/contextMenu';

const chords = document.getElementsByClassName('chord');
const words = document.getElementsByClassName('word');
const wordtops = document.getElementsByClassName('wordtop');

const chordElBase = document.createElement('span');
chordElBase.classList.add('chord');
const chordNameElBase = document.createElement('span');
chordNameElBase.classList.add('chord-name');
const wordElBase = document.createElement('span');
wordElBase.classList.add('word');
const wordtopElBase = document.createElement('span');
wordtopElBase.classList.add('wordtop');
const charElBase = document.createElement('span');
const delElBase = document.createElement('sup');

const commentElBase = document.createElement('p');
commentElBase.classList.add('line');
commentElBase.classList.add('comment');
const strongEl = document.createElement('strong');
commentElBase.appendChild(strongEl);
const keyElBase = document.createElement('p');
keyElBase.classList.add('key');
const lineElBase = document.createElement('p');
lineElBase.classList.add('line');

const separateWord = (e: HTMLElement) => {
  const phrase = e.innerHTML
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  e.innerHTML = '';
  [...phrase].map((c) => {
    const charEl = charElBase.cloneNode() as HTMLElement;
    charEl.innerHTML = c;
    charEl.addEventListener('click', add); // EventListenerはcloneされないのでここで定義
    e.appendChild(charEl);
  });
};

// 歌詞を1文字ずつspanに分割する
Array.prototype.forEach.call(words, separateWord);
Array.prototype.forEach.call(wordtops, separateWord);

// コード要素を変換
Array.prototype.forEach.call(chords, (e: HTMLElement) => {
  initChordElement(e, e.innerHTML);
});

/**
 * コード名を編集します
 * @param this コード名要素
 */
function edit(this: HTMLElement) {
  this.innerHTML = prompt('コードを編集', this.innerHTML) || this.innerHTML;
}

/**
 * コードを追加します
 * @param this 文字要素
 */
function add(this: HTMLElement) {
  const chordName = prompt('コードを追加');
  if (!chordName) return;

  const word = this.parentElement!;

  // コード要素
  const chordEl = chordElBase.cloneNode() as HTMLElement;
  initChordElement(chordEl, chordName);

  // 指定された文字以降を切り出す
  const range = document.createRange();
  range.setStart(this, 0);
  range.setEndAfter(word);

  // [文字列] - [コード] - [文字列] の形式に組み替える
  word.parentElement?.insertBefore(range.extractContents(), word.nextSibling);
  word.parentElement?.insertBefore(chordEl, word.nextSibling);

  // 空のspanができてしまうので削除
  word.lastChild?.remove();
}

/**
 * コードを削除します
 * @param this コード名要素
 * @param e マウスイベント
 */
function deleteChord(this: HTMLElement, e: MouseEvent) {
  e.stopPropagation();
  this.parentElement?.remove();
}

/**
 * コード要素を初期化します
 * @param el コード要素
 * @param chordName コード名
 */
function initChordElement(el: HTMLElement, chordName: string) {
  const chordNameEl = chordNameElBase.cloneNode() as HTMLElement;
  chordNameEl.innerHTML = chordName;
  chordNameEl.addEventListener('click', edit);

  const delEl = delElBase.cloneNode() as HTMLElement;
  delEl.innerHTML = '✖';
  delEl.addEventListener('click', deleteChord);

  el.innerHTML = '';
  el.appendChild(chordNameEl);
  el.appendChild(delEl);
  return el;
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  switch (request.action) {
    case ContextMenu.SAVE:
      const songName = getSongName();
      if (!songName) return;
      const chordChart = {
        songName,
        chordChart: convertChartToChordPro(),
        key: getKeyTransposition()
      };
      console.log(chordChart);
      sendResponse(chordChart);
      break;
    case ContextMenu.LOAD:
      console.log(request.payload);
      convertChordProToChart(request.payload.chordChart, request.payload.key);
      break;
    default:
  }
});

/**
 * 表示ページのコード譜をChordPro形式に変換します
 * @returns ChordPro形式テキスト
 */
function convertChartToChordPro(): string {
  const { titleEl, subtitleEl, chartEl } = getCurrentChartHTML();

  const title = titleEl ? `{title:${titleEl.textContent}}` : '';
  const subtitle = subtitleEl ? `\n{subtitle:${subtitleEl.textContent}}` : '';
  let originalKey: string;

  return Array.prototype.reduce.call(
    chartEl.children,
    (accumulator, currentValue: HTMLElement) => {
      // 改行
      if (currentValue.tagName == 'BR') {
        return accumulator + '\n';
      }
      // コメント
      if (currentValue.classList.contains('comment')) {
        return `${accumulator}\n{c:${currentValue.textContent}}`;
      }
      // キー指定
      if (currentValue.classList.contains('key')) {
        const keyMatch = currentValue.textContent?.match(/Key: (.*?)( \/|$)/);
        originalKey = keyMatch ? keyMatch[1] : originalKey;
        return keyMatch ? `${accumulator}\n{key:${originalKey}}` : accumulator;
      }
      // 本文
      if (currentValue.classList.contains('line')) {
        return (
          accumulator +
          '\n' +
          Array.prototype.reduce.call(
            currentValue.children,
            (_accumlator, _currentValue: HTMLElement) => {
              // コード
              if (_currentValue.classList.contains('chord')) {
                // TODO: キーとコード名(#/b)をあわせる
                const originalKeyChord = transpose(
                  _currentValue.firstChild?.textContent || '',
                  getKeyTransposition() * -1,
                  originalKey
                );
                return `${_accumlator}[${originalKeyChord}]`;
              }
              // コード以外 (歌詞)
              return _accumlator + (_currentValue.textContent || '');
            },
            ''
          )
        );
      }
      return accumulator;
    },
    title + subtitle
  ) as string;
}

/**
 * ChordPro形式のテキストからHTMLを生成します
 * @param chartTxt
 * @param key
 */
function convertChordProToChart(chartTxt: string, key: number): void {
  // divの中身を空にする
  const { chartEl } = getCurrentChartHTML();
  chartEl.innerHTML = '';

  const titleRegex = /\{title:(.*)\}/;
  const subtitleRegex = /\{subtitle:(.*)\}/;
  const commentRegex = /\{c:(.*)\}/;
  const keyRegx = /\{key:(.*)\}/;
  const chordRegex = /(\[.*?\])/;

  const keyTransposition = getKeyTransposition();
  let originalKey: string;
  // キー指定がないときのために、予めキーを推定する
  const guessedOriginalKey = guessKey(chartTxt);

  // 一行ずつ読み取ってタグにしていく
  chartTxt.split('\n').forEach((line) => {
    // title, subtitle は変わらないので元のページのままにする
    if (line.match(titleRegex) || line.match(subtitleRegex)) return;
    // 改行
    if (line == '') {
      chartEl.appendChild(document.createElement('br'));
      return;
    }
    // コメント
    const commentMatch = line.match(commentRegex);
    if (commentMatch) {
      const commentEl = commentElBase.cloneNode(true) as HTMLElement;
      commentEl.firstElementChild!.innerHTML = commentMatch[1];
      chartEl.appendChild(commentEl);
      return;
    }
    // キー指定
    const keyMatch = line.match(keyRegx);
    if (keyMatch) {
      const keyEl = keyElBase.cloneNode() as HTMLElement;
      originalKey = keyMatch[1].toString();
      keyEl.innerText =
        keyTransposition == 0
          ? `Key: ${originalKey}`
          : `Original Key: ${originalKey} / Play ${transpose(originalKey, keyTransposition)}`;
      chartEl.appendChild(keyEl);
      return;
    }
    // 本文
    const lineEl = lineElBase.cloneNode() as HTMLElement;
    line.split(chordRegex).forEach((phrase, i) => {
      // コードの場合
      if (phrase.match(chordRegex)) {
        // ページの移調指定に合わせる
        const chordName = transpose(phrase.replace(/\[|\]/g, ''), keyTransposition, originalKey || guessedOriginalKey);
        lineEl.appendChild(initChordElement(chordElBase.cloneNode() as HTMLElement, chordName));
        return;
      }
      // 歌詞部分の場合
      const wordEl = i != 0 ? (wordElBase.cloneNode() as HTMLElement) : (wordtopElBase.cloneNode() as HTMLElement);
      [...phrase].map((c) => {
        const charEl = charElBase.cloneNode() as HTMLElement;
        charEl.innerHTML = c;
        charEl.addEventListener('click', add); // EventListenerはcloneされないのでここで定義
        wordEl.appendChild(charEl);
      });
      lineEl.appendChild(wordEl);
    });
    chartEl.appendChild(lineEl);
  });
}

function getCurrentChartHTML() {
  const mainEl = document.getElementsByClassName('main')[0];
  const titleEl: HTMLElement | undefined = Array.prototype.find.call(mainEl.children, (el: HTMLElement) =>
    el.classList.contains('title')
  );
  const subtitleEl: HTMLElement | undefined = Array.prototype.find.call(mainEl.children, (el: HTMLElement) =>
    el.classList.contains('subtitle')
  );
  const chartEl: HTMLElement = Array.prototype.find.call(mainEl.children, (el: HTMLElement) => el.tagName == 'DIV');

  return { mainEl, titleEl, subtitleEl, chartEl };
}
