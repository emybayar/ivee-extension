(function () {
  if (window.__iveeLoaded) return;
  window.__iveeLoaded = true;

  let tooltip = null;
  let panel = null;
  let lastText = "";

  document.addEventListener("selectionchange", () => {
    setTimeout(() => {
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      if (!text || text.length < 1 || panel) {
        hideTooltip();
        return;
      }

      const anchor = sel.anchorNode?.parentElement;
      if (!isInsidePromptInput(anchor)) {
        hideTooltip();
        return;
      }

      lastText = text;
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      showTooltip(rect);
    }, 100);
  });

  function isInsidePromptInput(el) {
    if (!el) return false;
    const host = location.hostname;

    if (host === "chatgpt.com" || host === "chat.openai.com") {
      return !!el.closest("#prompt-textarea");
    }
    if (host === "claude.ai") {
      return !!el.closest(".ProseMirror[contenteditable='true']");
    }
    if (host === "gemini.google.com") {
      return !!el.closest(".ql-editor[contenteditable='true']");
    }
    if (host.includes("perplexity.ai")) {
      return (
        !!el.closest('[contenteditable="true"]') || !!el.closest("textarea")
      );
    }
    return false;
  }

  document.addEventListener("mousedown", (e) => {
    if (tooltip && !tooltip.contains(e.target)) hideTooltip();
    if (panel && !panel.contains(e.target)) closePanel();
  });

  function showTooltip(rect) {
    hideTooltip();
    tooltip = document.createElement("div");
    tooltip.id = "ivee-tooltip";
    tooltip.innerHTML =
      '<img src="' +
      chrome.runtime.getURL("icons/ivee-icon-20.png") +
      '" class="ivee-spark" />&nbsp;Improve with ivee';
    tooltip.style.top = rect.bottom + window.scrollY + 8 + "px";
    tooltip.style.left = rect.left + window.scrollX + rect.width / 2 + "px";
    tooltip.addEventListener("click", (e) => {
      e.stopPropagation();
      hideTooltip();
      openPanel(lastText);
    });
    document.body.appendChild(tooltip);
  }

  function hideTooltip() {
    tooltip?.remove();
    tooltip = null;
  }

  function openPanel(text) {
    closePanel();
    panel = document.createElement("div");
    panel.id = "ivee-panel";
    panel.innerHTML = buildHTML("loading", {});
    document.body.appendChild(panel);
    requestAnimationFrame(() => panel.classList.add("ivee-open"));
    bindClose();

    chrome.runtime.sendMessage({ type: "IMPROVE_PROMPT", text }, (res) => {
      if (chrome.runtime.lastError || !res)
        return renderErr("Connection error - reload the page.");
      if (res.error) return renderErr(res.error);
      renderResult(text, res.data);
    });
  }

  function closePanel() {
    panel?.remove();
    panel = null;
  }
  function bindClose() {
    panel?.querySelector("#ivee-close")?.addEventListener("click", closePanel);
  }

  function renderErr(msg) {
    if (!panel) return;
    panel.innerHTML = buildHTML("error", { msg });
    bindClose();
  }

  function renderResult(orig, data) {
    if (!panel) return;
    panel.innerHTML = buildHTML("result", { orig, data });
    bindClose();
    panel.querySelector("#ivee-copy")?.addEventListener("click", () => {
      navigator.clipboard
        .writeText(data.expert_prompt)
        .then(() => {
          const btn = panel.querySelector("#ivee-copy");
          if (!btn) return;
          btn.textContent = "Copied!";
          setTimeout(() => {
            btn.textContent = "Copy";
          }, 2000);
        })
        .catch(() => {
          const btn = panel.querySelector("#ivee-copy");
          if (!btn) return;
          btn.textContent = "Failed";
          setTimeout(() => {
            btn.textContent = "Copy";
          }, 2000);
        });
    });
    panel.querySelector("#ivee-replace")?.addEventListener("click", () => {
      injectText(data.expert_prompt);
      closePanel();
    });
  }

  function injectText(text) {
    const host = location.hostname;
    let el = null;

    if (host === "chatgpt.com" || host === "chat.openai.com") {
      el = document.querySelector("#prompt-textarea");
    } else if (host === "claude.ai") {
      el = document.querySelector(".ProseMirror[contenteditable='true']");
    } else if (host === "gemini.google.com") {
      el = document.querySelector(".ql-editor[contenteditable='true']");
    } else if (host.includes("perplexity.ai")) {
      el =
        document.querySelector("textarea") ||
        document.querySelector('[contenteditable="true"]');
    }

    if (!el) {
      el =
        document.querySelector("textarea") ||
        document.querySelector('[contenteditable="true"]');
    }

    if (!el) return;
    el.focus();

    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      setter?.call(el, text);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, text);
    }
  }

  const HDR =
    '<div class="ivee-hdr"><img src="' +
    chrome.runtime.getURL("icons/ivee-logo.svg") +
    '" class="ivee-logo" alt="ivee" /><button id="ivee-close" class="ivee-x" aria-label="Close">&#10005;</button></div>';

  function sc(n) {
    return n >= 7 ? "#4ade80" : n >= 4 ? "#facc15" : "#f87171";
  }
  function rc(r) {
    return r === "Low" ? "#4ade80" : r === "Medium" ? "#facc15" : "#f87171";
  }
  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function buildHTML(state, ctx) {
    if (state === "loading") {
      return (
        '<div class="ivee-in">' +
        HDR +
        '<div class="ivee-load"><div class="ivee-spin"></div><p>Improving your prompt\u2026</p></div></div>'
      );
    }
    if (state === "error") {
      return (
        '<div class="ivee-in">' +
        HDR +
        '<div class="ivee-err"><p>' +
        esc(ctx.msg) +
        "</p>" +
        "</div></div>"
      );
    }
    const d = ctx.data;
    const scores =
      '<div class="ivee-scores">' +
      row("Specificity", d.specificity_score + "/10", sc(d.specificity_score)) +
      row("Context", d.context_score + "/10", sc(d.context_score)) +
      row("Format", d.format_score + "/10", sc(d.format_score)) +
      row(
        "Hallucination Risk",
        d.hallucination_risk,
        rc(d.hallucination_risk),
      ) +
      row("Overall", d.overall_score + "/10", sc(d.overall_score), true) +
      "</div>";
    return (
      '<div class="ivee-in">' +
      HDR +
      '<div class="ivee-body">' +
      '<div class="ivee-lbl">Original</div>' +
      '<div class="ivee-box ivee-orig">' +
      esc(ctx.orig) +
      "</div>" +
      '<div class="ivee-lbl ivee-lbl-imp">Improved</div>' +
      '<div class="ivee-box ivee-imp">' +
      esc(d.expert_prompt) +
      "</div>" +
      '<div class="ivee-acts">' +
      '<button id="ivee-copy"    class="ivee-btn ivee-ghost">Copy</button>' +
      '<button id="ivee-replace" class="ivee-btn ivee-primary">\u2191 Use this prompt</button>' +
      "</div>" +
      (d.whats_wrong
        ? '<div class="ivee-insight">' + esc(d.whats_wrong) + "</div>"
        : "") +
      scores +
      '<div class="ivee-cta"><p>Prompting is the tip of the iceberg. Learn more about AI with ivee for free.</p><a href="https://ivee.jobs" target="_blank">Check out ivee →</a></div>' +
      '<div class="ivee-foot">© 2026 ivee</div>' +
      "</div></div>"
    );
  }

  function row(label, val, color, bold) {
    return (
      '<div class="ivee-row' +
      (bold ? " ivee-row-bold" : "") +
      '">' +
      "<span>" +
      label +
      '</span><span style="color:' +
      color +
      '">' +
      val +
      "</span></div>"
    );
  }
})();
