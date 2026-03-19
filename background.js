chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "IMPROVE_PROMPT") {
    handleImprove(message.text, sendResponse);
    return true;
  }
});

async function handleImprove(promptText, sendResponse) {
  try {
    const resp = await fetch(
      "https://ivee-ext-backend.vercel.app/api/improve",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: promptText }),
      },
    );
    const data = await resp.json();
    if (!resp.ok) return sendResponse({ error: data.error || "Server error" });
    sendResponse({ success: true, data: data.data });
  } catch (err) {
    sendResponse({ error: err.message });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.query({}, (tabs) => {
    const matchingUrls = [
      "https://chatgpt.com/",
      "https://claude.ai/",
      "https://gemini.google.com/",
      "https://www.perplexity.ai/",
    ];

    for (const tab of tabs) {
      const matches = matchingUrls.some((url) => tab.url?.startsWith(url));
      if (!matches || !tab.id) continue;

      chrome.tabs.sendMessage(tab.id, { type: "IVEE_UNLOAD" }, () => {
        void chrome.runtime.lastError;
        chrome.scripting
          .executeScript({
            target: { tabId: tab.id },
            files: ["content.js"],
          })
          .catch(() => {});

        chrome.scripting
          .insertCSS({
            target: { tabId: tab.id },
            files: ["content.css"],
          })
          .catch(() => {});
      });
    }
  });
});
