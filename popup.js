// popup.js
// Controls the extension popup — the small window that appears
// when the user clicks the ivee icon in the Chrome toolbar.
//
// Responsibilities:
//   - Load saved API key (masked) to show it's configured
//   - Save a new API key via background.js message
//   - Show active/inactive status dot

const apiKeyInput = document.getElementById("apiKey");
const saveBtn = document.getElementById("saveBtn");
const msg = document.getElementById("msg");
const statusDot = document.getElementById("statusDot");

// On open: check if a key is already saved
chrome.runtime.sendMessage({ type: "GET_API_KEY" }, (res) => {
  if (res?.key) {
    apiKeyInput.placeholder = "sk-...  (saved)";
    statusDot.classList.remove("inactive");
  } else {
    statusDot.classList.add("inactive");
  }
});

// Save button
saveBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (!key.startsWith("sk-") || key.length < 20) {
    showMsg("Enter a valid OpenAI API key (starts with sk-)", "error");
    return;
  }

  chrome.runtime.sendMessage({ type: "SAVE_API_KEY", key }, (res) => {
    if (res?.success) {
      showMsg("API key saved!", "success");
      apiKeyInput.value = "";
      apiKeyInput.placeholder = "sk-...  (saved)";
      statusDot.classList.remove("inactive");
    } else {
      showMsg("Save failed. Try again.", "error");
    }
  });
});

// Enter key support
apiKeyInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveBtn.click();
});

function showMsg(text, type) {
  msg.textContent = text;
  msg.className = "msg " + type;
  setTimeout(() => {
    msg.textContent = "";
    msg.className = "msg";
  }, 3000);
}
