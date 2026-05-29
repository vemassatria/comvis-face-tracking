let creating: Promise<void> | null = null;

async function setupOffscreenDocument(path: string) {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [chrome.runtime.getURL(path)]
  });

  if (existingContexts.length > 0) {
    return;
  }

  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: [chrome.offscreen.Reason.USER_MEDIA],
      justification: 'To monitor student attention via webcam'
    });
    await creating;
    creating = null;
  }
}

async function closeOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT]
  });
  if (existingContexts.length > 0) {
    await chrome.offscreen.closeDocument();
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'START_MONITORING') {
    chrome.storage.local.set({ isMonitoring: true }).then(() => {
      setupOffscreenDocument('src/offscreen/offscreen.html').then(() => {
        sendResponse({ status: 'started' });
      });
    });
    return true; // Keep channel open
  } else if (message.action === 'STOP_MONITORING') {
    chrome.storage.local.set({ isMonitoring: false }).then(() => {
      closeOffscreenDocument().then(() => {
        sendResponse({ status: 'stopped' });
      });
    });
    return true; // Keep channel open
  }
});
