const { ipcRenderer, remote } = require('electron');

window.addEventListener('load', () => {
  const valueHistory = {
    currentPosition: 0,
    historyValuePool: [''],
  };
  const sourceTextArea = document.querySelector('#source');

  let isComposition = false;

  ipcRenderer.on('translate-clipboard-text', (event, arg) => {
    sourceTextArea.value = arg;
    sourceTextArea.focus();
    addValueToHistory(arg);
  });

  sourceTextArea.addEventListener('input', throttle(addValueToHistory, 1000));

  sourceTextArea.addEventListener('compositionstart', handleComposition);
  sourceTextArea.addEventListener('compositionupdate', handleComposition);
  sourceTextArea.addEventListener('compositionend', handleComposition);

  sourceTextArea.addEventListener('keydown', (e) => {
    // command + y or command + shift + z
    if (
      (e.keyCode === 89 || (e.keyCode === 90 && e.shiftKey)) &&
      (e.metaKey || e.ctrlKey)
    ) {
      e.preventDefault();
      redo();
    }
    // command + z
    if (e.keyCode === 90 && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
  });

  function handleComposition(e) {
    isComposition = e.type !== 'compositionend';
  }

  function throttle(fn, delay = 500) {
    let timer = 0;
    return (...rest) => {
      clearTimeout(timer);
      timer = setTimeout(fn.bind(null, ...rest), delay);
    };
  }

  function addValueToHistory(e) {
    if (!isComposition) {
      const text = (typeof e === 'string' ? e : e.target.value).trim();
      if (
        text === valueHistory.historyValuePool[valueHistory.currentPosition]
      ) {
        return;
      }
      valueHistory.historyValuePool.length = valueHistory.currentPosition + 1;
      valueHistory.historyValuePool.push(text);
      valueHistory.currentPosition += 1;
    }
  }

  function undo() {
    if (valueHistory.currentPosition) {
      valueHistory.currentPosition -= 1;
      sourceTextArea.value =
        valueHistory.historyValuePool[valueHistory.currentPosition];
    }
  }

  function redo() {
    if (
      valueHistory.currentPosition + 1 <
      valueHistory.historyValuePool.length
    ) {
      valueHistory.currentPosition += 1;
      sourceTextArea.value =
        valueHistory.historyValuePool[valueHistory.currentPosition];
    }
  }

  const sourceTTS = document.querySelector('.src-tts');
  const responseTTS = document.querySelector('.res-tts');
  const window = remote.getCurrentWindow();

  addEventListener('keydown', (e) => {
    // command + shift + q
    if (e.keyCode === 81 && e.shiftKey && (e.metaKey || e.ctrlKey)) {
      remote.app.exit();
    }
    // esc
    if (e.keyCode === 27) {
      ipcRenderer.send('hideWindow');
    }
    // command + 1
    if (e.keyCode === 49 && (e.metaKey || e.ctrlKey)) {
      if (window.isVisible() && sourceTextArea.value) {
        e.preventDefault();
        sourceTTS.click();
      }
    }
    // command + 2
    if (e.keyCode === 50 && (e.metaKey || e.ctrlKey)) {
      if (window.isVisible() && sourceTextArea.value) {
        e.preventDefault();
        responseTTS.click();
      }
    }
  });

  const style = document.createElement('style');
  style.innerHTML = `
    #source {
      max-height: none !important;
    }
    *:not(.moremenu) {
      box-shadow: none !important;
    }
    ::-webkit-scrollbar,
    .ad-panel {
      display: none !important;
    }
    :focus {
      outline: none !important;
    }
  `;
  document.head.append(style);

  const sourceLabel = document.querySelector(
    '.tlid-open-small-source-language-list',
  );
  const targetLabel = document.querySelector(
    '.tlid-open-small-target-language-list',
  );
  const observer = new MutationObserver(() => {
    const sourceMatch = sourceLabel.textContent.match(/检测到(.*)/);
    const sourceStr = sourceMatch ? sourceMatch[1] : '';
    const targetStr = targetLabel.textContent;
    if (sourceStr && targetStr.includes(sourceStr)) {
      if (sourceStr === '中文') {
        _e(event, 'changeLanguage+0', 'tl_list_en_r');
      } else {
        _e(event, 'changeLanguage+0', 'tl_list_zh-CN');
      }
    }
  });
  observer.observe(sourceLabel, {
    attributes: false,
    childList: true,
    subtree: false,
  });
});