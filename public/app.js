let isSelecting = false;
let currentField = null;
let listenersAdded = false;
let currentHoverHighlighter = null;
let fieldCounter = 1;
const highlighters = new Map();

const fieldTemplate = document.createElement("div");
fieldTemplate.className = "field-group";
fieldTemplate.innerHTML = `
  <div class="field-controls">
    <input type="text" placeholder="Field name" class="field-name">
    <button class="select-btn" onclick="startSelection(this)">Select</button>
    <button class="clear-btn" onclick="handleClearButtonClick(this)">×</button>
  </div>
  <div class="field-info">
    <div class="info-item selector-container">
      <div class="info-label">Selector:</div>
      <div class="selector-value"></div>
    </div>
    <div class="info-item text-container">
      <div class="info-label">Text Content:</div>
      <div class="text-value"></div>
    </div>
  </div>
`;

function addField() {
  const clone = fieldTemplate.cloneNode(true);
  const nameInput = clone.querySelector(".field-name");
  nameInput.value = `selector-${fieldCounter++}`;
  document.getElementById("fields-container").appendChild(clone);
}

function loadUrl() {
  const url = document.getElementById("url-input").value;
  const proxyUrl = `/proxy?url=${encodeURIComponent(url)}`;
  const iframe = document.getElementById("target-frame");

  // Reset all state
  document.getElementById("fields-container").innerHTML = "";
  highlighters.forEach((h) => h.remove());
  highlighters.clear();
  fieldCounter = 1;

  // Clear previous iframe
  iframe.src = "about:blank";
  cleanupSelection();

  iframe.addEventListener(
    "load",
    () => {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      injectHighlighter(iframeDoc);
      console.log("Iframe content loaded");
    },
    { once: true }
  );

  iframe.src = proxyUrl;
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

function startSelection(selectBtn) {
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
  currentField = selectBtn.closest(".field-group");
  enableElementSelection();
  document.addEventListener("click", cancelSelection, true);
}

function enableElementSelection() {
  const iframe = document.getElementById("target-frame");
  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

  // Wait for DOM to be fully ready
  const tryInit = () => {
    if (iframeDoc.readyState === "complete") {
      // Add hover listeners to frame elements
      iframeDoc.body.querySelectorAll("*").forEach((element) => {
        element.addEventListener("mouseover", handleElementHover);
        element.addEventListener("mouseout", handleElementHoverEnd);
        element.addEventListener("click", handleElementClick, {
          capture: true,
        });
      });
    } else {
      setTimeout(tryInit, 10);
    }
  };

  tryInit();
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
}

function handleElementHover(e) {
  const element = e.target;
  const iframeDoc = element.ownerDocument;
  const iframe = document.getElementById("target-frame");

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
  if (currentHoverHighlighter) {
    currentHoverHighlighter.remove();
    currentHoverHighlighter = null;
  }
}

function handleElementClick(e) {
  e.preventDefault();
  e.stopPropagation();

  const element = e.target;
  const iframeDoc = element.ownerDocument;
  const fieldName = currentField.querySelector(".field-name").value;
  const selector = generateCssSelector(element);

  const elementText = element.textContent?.trim() || "N/A";

  // Create persistent highlighter
  const highlighter = createHighlighter(
    element,
    iframeDoc,
    false,
    fieldName,
    selector
  );
  highlighters.set(fieldName, highlighter);

  const fieldGroup = currentField;
  fieldGroup.querySelector(".selector-value").textContent = selector;
  fieldGroup.querySelector(".text-value").textContent = elementText;

  cleanupSelection();
}

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

function createHighlighter(element, doc, isTemporary, fieldName, selector) {
  const highlighter = doc.createElement("div");
  highlighter.className = "ves-highlighter" + (isTemporary ? " temporary" : "");

  const rect = element.getBoundingClientRect();
  const iframeWindow = doc.defaultView;
  const scrollX = iframeWindow.scrollX || 0;
  const scrollY = iframeWindow.scrollY || 0;
  highlighter.style.left = `${rect.left + scrollX}px`;
  highlighter.style.top = `${rect.top + scrollY}px`;
  highlighter.style.width = `${rect.width}px`;
  highlighter.style.height = `${rect.height}px`;

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

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && isSelecting) {
    cleanupSelection();
    console.log("Selection canceled by ESC");
  }
});

function handleClearButtonClick(clearBtn) {
  const fieldGroup = clearBtn.closest(".field-group");
  const fieldName = fieldGroup.querySelector(".field-name").value;

  // Remove highlighter if exists
  if (highlighters.has(fieldName)) {
    highlighters.get(fieldName).remove();
    highlighters.delete(fieldName);
  }

  fieldGroup.remove();
}

function cancelSelection(e) {
  if (!e.target.closest("#iframe-container")) {
    cleanupSelection();
    console.log("Selection canceled");
  }
}

// wait for the main page to be loaded
document.addEventListener("DOMContentLoaded", () => {
  // URL input text selection
  document.getElementById("url-input").addEventListener("click", (e) => {
    e.target.select();
  });
});
