chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-scryon') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_SCRYON_LENS' });
      }
    });
  }
});
