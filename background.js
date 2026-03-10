// background.js
// aervice worker — isolated from any webpage context.
// stores API key securely and calls OpenAI on behalf of content.js.

const IVEE_SYSTEM_PROMPT = `You are the ivee Prompt Rewrite Engine.
Rewrite the user's prompt into an expert-level version using:
1) Clarity over cleverness
2) Context before constraints
3) Concrete specifics
4) Explicit output structure

Return VALID JSON ONLY. No markdown. No backticks. Schema:
{
  "overall_score": <1-10>,
  "specificity_score": <1-10>,
  "context_score": <1-10>,
  "format_score": <1-10>,
  "hallucination_risk": "Low|Medium|High",
  "expert_prompt": "<rewritten prompt with [PLACEHOLDERS] for missing info>",
  "whats_wrong": "<1-2 sentence plain English weakness summary>"
}`;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "IMPROVE_PROMPT") {
    handleImprove(message.text, sendResponse);
    return true;
  }
  if (message.type === "SAVE_API_KEY") {
    chrome.storage.local.set({ openai_api_key: message.key }, () =>
      sendResponse({ success: true }),
    );
    return true;
  }
  if (message.type === "GET_API_KEY") {
    chrome.storage.local.get("openai_api_key", (r) =>
      sendResponse({ key: r.openai_api_key || null }),
    );
    return true;
  }
});

async function handleImprove(promptText, sendResponse) {
  const stored = await chrome.storage.local.get("openai_api_key");
  const apiKey = stored.openai_api_key;
  if (!apiKey) {
    sendResponse({ error: "NO_API_KEY" });
    return;
  }

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: IVEE_SYSTEM_PROMPT },
          {
            role: "user",
            content: "Analyze and rewrite this prompt: " + promptText,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!resp.ok) {
      const e = await resp.json();
      sendResponse({
        error: e.error?.message || "OpenAI error " + resp.status,
      });
      return;
    }

    const data = await resp.json();
    sendResponse({
      success: true,
      data: JSON.parse(data.choices[0].message.content),
    });
  } catch (err) {
    sendResponse({ error: err.message });
  }
}
