// background.js
// aervice worker — isolated from any webpage context.
// stores API key securely and calls OpenAI on behalf of content.js.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "IMPROVE_PROMPT") {
    handleImprove(message.text, sendResponse);
    return true;
  }
  // if (message.type === "SAVE_API_KEY") {
  //   chrome.storage.local.set({ openai_api_key: message.key }, () =>
  //     sendResponse({ success: true }),
  //   );
  //   return true;
  // }
  // if (message.type === "GET_API_KEY") {
  //   chrome.storage.local.get("openai_api_key", (r) =>
  //     sendResponse({ key: r.openai_api_key || null }),
  //   );
  //   return true;
  // }
});

// async function handleImprove(promptText, sendResponse) {
//   const stored = await chrome.storage.local.get("openai_api_key");
//   const apiKey = stored.openai_api_key;
//   if (!apiKey) {
//     sendResponse({ error: "NO_API_KEY" });
//     return;
//   }

//   try {
//     const resp = await fetch("https://api.openai.com/v1/chat/completions", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: "Bearer " + apiKey,
//       },
//       body: JSON.stringify({
//         model: "gpt-4o-mini",
//         messages: [
//           { role: "system", content: IVEE_SYSTEM_PROMPT },
//           {
//             role: "user",
//             content: "Analyze and rewrite this prompt: " + promptText,
//           },
//         ],
//         response_format: { type: "json_object" },
//         temperature: 0.7,
//       }),
//     });

//     if (!resp.ok) {
//       const e = await resp.json();
//       sendResponse({
//         error: e.error?.message || "OpenAI error " + resp.status,
//       });
//       return;
//     }

//     const data = await resp.json();
//     sendResponse({
//       success: true,
//       data: JSON.parse(data.choices[0].message.content),
//     });
//   } catch (err) {
//     sendResponse({ error: err.message });
//   }
// }

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
