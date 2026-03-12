const CONSENT_KEY = "ivee_consent_given";

chrome.storage.local.get(CONSENT_KEY, (result) => {
  if (result[CONSENT_KEY]) {
    showScreen("main");
  } else {
    showScreen("onboarding");
  }
});

document.getElementById("btn-accept").addEventListener("click", () => {
  chrome.storage.local.set({ [CONSENT_KEY]: true }, () => {
    showScreen("main");
  });
});

function showScreen(name) {
  document.getElementById("screen-onboarding").style.display =
    name === "onboarding" ? "block" : "none";
  document.getElementById("screen-main").style.display =
    name === "main" ? "block" : "none";
}
