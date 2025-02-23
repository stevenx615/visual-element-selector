let isSelecting = false;
let currentField = null;
let listenersAdded = false;
let currentHighlightedElement = null;
let currentHoverHighlighter = null;
let fieldCounter = 1;

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
  const nameInput = clone.querySelector(".field-name");
  nameInput.value = `selector-${fieldCounter++}`;
  document.getElementById("fields-container").appendChild(clone);
}

function injectHighlighter(doc) {
  const style = doc.createElement("style");
  style.textContent = `
    .ves-highlighter {
      position: absolute;
      background: rgba(255, 0, 0, 0.4);
      z-index: 2147483647;
      transition: all 0.2s ease;
      pointer-events: none;
      box-sizing: border-box;
    }
    .ves-highlighter.temporary {
      border: 2px solid green;
      background: rgba(0, 255, 0, 0.3);
    }
    .highlighter-label {
      position: absolute;
      left: 0;
      right: 0;
      background: rgba(255, 0, 0, 0.75);
      color: white;
      padding: 2px 4px;
      font-size: 10px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      pointer-events: none;
    }
    .field-name-label {
      width: min-content;
      top: 0;
      transform: translateY(-100%);
    }
    .selector-label {
      bottom: 0;
      transform: translateY(100%);
    }
  `;
  doc.head.appendChild(style);
}

function loadUrl() {
  const url = document.getElementById("url-input").value;
  const proxyUrl = `/proxy?url=${encodeURIComponent(url)}`;
  const iframe = document.getElementById("target-frame");

  // Clear previous iframe
  iframe.src = "about:blank";

  iframe.addEventListener(
    "load",
    () => {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      injectHighlighter(iframeDoc); // Inject styles into iframe
      console.log("Iframe content loaded");
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
  document.addEventListener("click", cancelSelection, true);
}

function enableElementSelection() {
  const iframe = document.getElementById("target-frame");
  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

  // Add hover listeners
  iframeDoc.body.querySelectorAll("*").forEach((element) => {
    element.addEventListener("mouseover", handleElementHover);
    element.addEventListener("mouseout", handleElementHoverEnd);
    element.addEventListener("click", handleElementClick, { capture: true });
  });
}

function handleElementHover(e) {
  const element = e.target;
  const iframeDoc = element.ownerDocument;

  // Remove previous hover highlighter
  if (currentHoverHighlighter) {
    currentHoverHighlighter.remove();
  }

  // Create temporary hover highlighter
  currentHoverHighlighter = createHighlighter(
    element,
    iframeDoc,
    true,
    null,
    null
  );
}

function handleElementHoverEnd(e) {
  if (currentHighlightedElement) {
    // Remove the highlighter
    currentHighlightedElement.highlighter.remove();
    currentHighlightedElement = null;
  }
}

function handleElementClick(e) {
  // Prevent default behavior and stop propagation
  e.preventDefault();
  e.stopPropagation();

  const element = e.target;
  const iframeDoc = element.ownerDocument;
  const fieldName = currentField
    .closest(".field-group")
    .querySelector(".field-name").value;
  const selector = generateCssSelector(element);

  // Create persistent highlighter
  const highlighter = createHighlighter(
    element,
    iframeDoc,
    false,
    fieldName,
    selector
  );
  highlighters.set(fieldName, highlighter);

  // Set selector value
  currentField.value = selector;
  cleanupSelection();
}

function cleanupSelection() {
  // Remove temporary hover highlighter
  if (currentHoverHighlighter) {
    currentHoverHighlighter.remove();
    currentHoverHighlighter = null;
  }

  // Remove event listeners
  const iframe = document.getElementById("target-frame");
  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

  iframeDoc.body.querySelectorAll("*").forEach((element) => {
    element.removeEventListener("mouseover", handleElementHover);
    element.removeEventListener("mouseout", handleElementHoverEnd);
    element.removeEventListener("click", handleElementClick);
  });

  listenersAdded = false;
  isSelecting = false;
  currentField = null;
  document.removeEventListener("click", cancelSelection, true);

  // Cleanup all highlighters' scroll listeners
  highlighters.forEach((highlighter) => {
    if (highlighter.cleanup) highlighter.cleanup();
  });
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

function createHighlighter(element, doc, isTemporary, fieldName, selector) {
  const highlighter = doc.createElement("div");
  highlighter.className = "ves-highlighter" + (isTemporary ? " temporary" : "");

  const rect = element.getBoundingClientRect();
  highlighter.style.cssText = `
    left: ${rect.left}px;
    top: ${rect.top}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
  `;

  if (!isTemporary && fieldName && selector) {
    // Add field name label
    const fieldLabel = doc.createElement("div");
    fieldLabel.className = "highlighter-label field-name-label";
    fieldLabel.textContent = fieldName;
    highlighter.appendChild(fieldLabel);

    // Add selector label
    const selectorLabel = doc.createElement("div");
    selectorLabel.className = "highlighter-label selector-label";
    selectorLabel.textContent = selector;
    highlighter.appendChild(selectorLabel);
  }

  doc.body.appendChild(highlighter);
  return highlighter;
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
