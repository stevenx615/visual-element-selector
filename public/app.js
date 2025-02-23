let isSelecting = false;
let currentField = null;
let listenersAdded = false;

// Field template
const fieldTemplate = document.createElement("div");
fieldTemplate.className = "field-group";
fieldTemplate.innerHTML = `
    <input type="text" placeholder="Field name" class="field-name">
    <input type="text" readonly class="selector-input" onclick="startSelection(this)">
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

function startSelection(field) {
  cleanupSelection();
  isSelecting = true;
  currentField = field;
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

let currentHighlightedElement = null;

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

  // Get element position relative to viewport
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
  highlighter.style.left = `${rect.left + window.scrollX - borderLeft}px`;
  highlighter.style.top = `${rect.top + window.scrollY - borderTop}px`;

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
  e.stopImmediatePropagation();
  if (currentField) {
    currentField.value = generateCssSelector(e.target);
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
