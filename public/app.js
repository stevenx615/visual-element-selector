let isSelecting = false;
let currentField = null;
let listenersAdded = false;
let currentHighlightedElement = null;

const highlighters = new Map();

// Field template
const fieldTemplate = document.createElement("div");
fieldTemplate.className = "field-group";
fieldTemplate.innerHTML = `
  <input type="text" placeholder="Field name" class="field-name">
  <div class="field-controls">
    <input type="text" readonly class="selector-input">
    <button class="select-btn" onclick="startSelection(this)">Select</button>
    <button class="clear-btn">×</button>
  </div>
`;

function addField() {
  const clone = fieldTemplate.cloneNode(true);
  document.getElementById("fields-container").appendChild(clone);
}

function loadUrl() {
  const url = document.getElementById("url-input").value;
  const proxyUrl = `/proxy?url=${encodeURIComponent(url)}`;
  const iframe = document.getElementById("target-frame");

  // Clear previous iframe
  iframe.src = "about:blank";

  // Set up load handler before setting src
  iframe.addEventListener(
    "load",
    () => {
      console.log("Iframe content loaded");
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      injectHighlighter(iframeDoc);
    },
    { once: true }
  );

  iframe.src = proxyUrl;
}

function startSelection(selectBtn) {
  const selectorInput =
    selectBtn.parentElement.querySelector(".selector-input");
  const fieldName = selectBtn
    .closest(".field-group")
    .querySelector(".field-name").value;

  // Clear existing highlighter for this field
  if (highlighters.has(fieldName)) {
    highlighters.get(fieldName).remove();
    highlighters.delete(fieldName);
  }

  cleanupSelection();
  isSelecting = true;
  currentField = selectorInput;
  enableElementSelection();
}

function enableElementSelection() {
  const iframe = document.getElementById("target-frame");
  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

  // Keep interactions but prevent default behaviors
  iframeDoc.documentElement.style.cursor = "crosshair";

  const highlighter = iframeDoc.getElementById("ves-highlighter");
  if (highlighter) {
    highlighter.style.visibility = "visible";
  }
  if (!listenersAdded) {
    addElementListeners(iframeDoc);
  }

  document.addEventListener("click", cancelSelection, true);
}

function addElementListeners(doc) {
  doc.body.querySelectorAll("*").forEach((element) => {
    element.addEventListener("mouseover", handleElementHover);
    element.addEventListener("mouseout", handleElementHoverEnd);
    element.addEventListener("click", handleElementClick);
  });
  listenersAdded = true;
}

function handleElementHover(e) {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  const element = e.target;

  // Remove previous highlighter
  if (currentHighlightedElement) {
    handleElementHoverEnd();
  }

  // Create highlighter wrapper
  const highlighter = document.createElement("div");
  highlighter.className = "ves-highlighter";
  highlighter.style.position = "fixed";
  highlighter.style.pointerEvents = "none";
  highlighter.style.zIndex = "9999";

  const frame = document.getElementById("target-frame");
  const frameRect = frame.getBoundingClientRect();
  const rect = element.getBoundingClientRect();

  // Get accurate dimensions accounting for transforms
  const style = window.getComputedStyle(element);
  const transform = style.transform;
  const isTransformed = transform && transform !== "none";

  // Use offset dimensions for actual rendered size
  highlighter.style.width = `${element.offsetWidth}px`;
  highlighter.style.height = `${element.offsetHeight}px`;

  // Adjust for borders
  const borderLeft = parseFloat(style.borderLeftWidth) || 0;
  const borderTop = parseFloat(style.borderTopWidth) || 0;
  highlighter.style.left = `${
    frameRect.left + rect.left + window.scrollX + borderLeft
  }px`;
  highlighter.style.top = `${
    frameRect.top + rect.top + window.scrollY + borderTop
  }px`;

  // Mirror element transforms
  if (isTransformed) {
    highlighter.style.transform = transform;
    highlighter.style.transformOrigin = style.transformOrigin;
  }

  // Insert at body level to avoid positioning context issues
  document.body.appendChild(highlighter);

  // Store reference
  currentHighlightedElement = {
    element: element,
    highlighter: highlighter,
  };
}

function handleElementHoverEnd(e) {
  if (currentHighlightedElement) {
    // Remove the highlighter
    currentHighlightedElement.highlighter.remove();
    currentHighlightedElement = null;
  }
}

function handleElementClick(e) {
  e.preventDefault();
  e.stopPropagation();

  if (currentField) {
    const selector = generateCssSelector(e.target);
    currentField.value = selector;

    const fieldName = currentField
      .closest(".field-group")
      .querySelector(".field-name").value;

    createHighlighter(e.target, fieldName, selector);
    cleanupSelection();
  }
}

function cleanupSelection() {
  const iframe = document.getElementById("target-frame");
  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

  // Remove all highlighters
  iframeDoc.querySelectorAll(".ves-highlighter").forEach((hl) => hl.remove());

  // Restore cursor
  iframeDoc.documentElement.style.cursor = "";

  // Cleanup event listeners
  iframeDoc.body.querySelectorAll("*").forEach((element) => {
    element.removeEventListener("mouseover", handleElementHover);
    element.removeEventListener("mouseout", handleElementHoverEnd);
    element.removeEventListener("click", handleElementClick);
  });

  listenersAdded = false;
  isSelecting = false;
  currentField = null;
  document.removeEventListener("click", cancelSelection, true);
}

// CSS Selector Generator
function generateCssSelector(element) {
  const path = [];
  while (element && element.nodeType === Node.ELEMENT_NODE) {
    let selector = element.nodeName.toLowerCase();

    if (element.id) {
      selector += `#${element.id}`;
      path.unshift(selector);
      break;
    } else {
      let sibling = element;
      let nth = 1;
      while (sibling.previousElementSibling) {
        sibling = sibling.previousElementSibling;
        nth++;
      }
      if (nth !== 1) selector += `:nth-of-type(${nth})`;
    }

    path.unshift(selector);
    element = element.parentNode;
  }
  return path.join(" > ");
}

function cancelSelection(e) {
  if (!e.target.closest("#iframe-container")) {
    cleanupSelection();
    console.log("Selection canceled");
  }
}

function createHighlighter(element, fieldName, selector) {
  // Remove existing highlighter for this field
  if (highlighters.has(fieldName)) {
    highlighters.get(fieldName).remove();
  }

  const highlighter = document.createElement("div");
  highlighter.className = `ves-highlighter ves-${fieldName}`;
  highlighter.dataset.field = fieldName;
  highlighter.dataset.selector = selector;

  // Position calculation
  const rect = element.getBoundingClientRect();
  const iframeRect = document
    .getElementById("target-frame")
    .getBoundingClientRect();

  highlighter.style.cssText = `
    position: fixed;
    left: ${rect.left + iframeRect.left}px;
    top: ${rect.top + iframeRect.top}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    border: 2px solid;
    pointer-events: none;
    z-index: 9999;
    box-shadow: 0 0 5px currentColor;
  `;

  document.body.appendChild(highlighter);
  highlighters.set(fieldName, highlighter);

  // Add resize observer
  new ResizeObserver(() => updateHighlighterPosition(fieldName)).observe(
    element
  );

  return highlighter;
}

function updateHighlighterPosition(fieldName) {
  const highlighter = highlighters.get(fieldName);
  if (!highlighter) return;

  const element = document.querySelector(highlighter.dataset.selector);
  if (element) {
    const rect = element.getBoundingClientRect();
    const iframeRect = document
      .getElementById("target-frame")
      .getBoundingClientRect();

    highlighter.style.left = `${rect.left + iframeRect.left}px`;
    highlighter.style.top = `${rect.top + iframeRect.top}px`;
    highlighter.style.width = `${rect.width}px`;
    highlighter.style.height = `${rect.height}px`;
  }
}

// Add resize/scroll observer
window.addEventListener("resize", updateHighlighters);
window.addEventListener("scroll", updateHighlighters, { passive: true });

// Add clear button handler
document.body.addEventListener("click", (e) => {
  if (e.target.classList.contains("clear-btn")) {
    const fieldGroup = e.target.closest(".field-group");
    const fieldName = fieldGroup.querySelector(".field-name").value;

    if (highlighters.has(fieldName)) {
      highlighters.get(fieldName).remove();
      highlighters.delete(fieldName);
    }
    fieldGroup.querySelector(".selector-input").value = "";
  }
});
