// background.js
// aervice worker — isolated from any webpage context.
// stores API key securely and calls OpenAI on behalf of content.js.

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
