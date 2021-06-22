import { getSongName } from './util/url';
import ContextMenu from './types/contextMenu';
import { ChordChart } from './types/chordChart';

chrome.runtime.onInstalled.addListener((): void => {
  chrome.contextMenus.create({
    id: ContextMenu.SAVE,
    title: 'コード譜を保存する',
    contexts: ['all'],
    documentUrlPatterns: ['https://ja.chordwiki.org/wiki*']
  });
  chrome.contextMenus.create({
    id: ContextMenu.LOAD,
    title: '保存したコード譜を読み込む',
    contexts: ['all'],
    documentUrlPatterns: ['https://ja.chordwiki.org/wiki*']
  });
});

chrome.contextMenus.onClicked.addListener(function (
  info: chrome.contextMenus.OnClickData,
  tab: chrome.tabs.Tab | undefined
) {
  switch (info.menuItemId) {
    case ContextMenu.SAVE:
      chrome.tabs.sendMessage(tab!.id!, { action: info.menuItemId }, (res: ChordChart) =>
        chrome.storage.sync.set({ [res.songName]: res })
      );
      break;
    case ContextMenu.LOAD:
      const songName = getSongName(tab?.url);
      if (!songName) {
        alert('曲名を取得できませんでした。');
        return;
      }
      chrome.storage.sync.get(songName, (items) => {
        if (!items[songName]) {
          alert('この曲のコード譜は保存されていません。');
          return;
        }
        chrome.tabs.sendMessage(tab!.id!, {
          action: info.menuItemId,
          payload: items[songName]
        });
      });
      break;
    default:
      throw new Error('存在しないメニューです');
  }
});
