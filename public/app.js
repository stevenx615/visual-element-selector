let isSelecting = false;
let currentField = null;

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
  document.getElementById("target-frame").src = proxyUrl;
}

function startSelection(field) {
  isSelecting = true;
  currentField = field;
  enableElementSelection();
}

function enableElementSelection() {
  const iframe = document.getElementById("target-frame");
  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

  // Add highlight on mouseover
  iframeDoc.body.querySelectorAll("*").forEach((element) => {
    element.addEventListener("mouseover", handleElementHover);
    element.addEventListener("mouseout", handleElementHoverEnd);
    element.addEventListener("click", handleElementClick);
  });
}

function handleElementHover(e) {
  e.stopPropagation();
  const element = e.target;
  element.classList.add("highlight");
}

function handleElementHoverEnd(e) {
  e.target.classList.remove("highlight");
}

function handleElementClick(e) {
  e.preventDefault();
  e.stopPropagation();

  if (currentField) {
    currentField.value = generateCssSelector(e.target);
    cleanupSelection();
  }
}

function cleanupSelection() {
  const iframe = document.getElementById("target-frame");
  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

  iframeDoc.body.querySelectorAll("*").forEach((element) => {
    element.classList.remove("highlight");
    element.removeEventListener("mouseover", handleElementHover);
    element.removeEventListener("mouseout", handleElementHoverEnd);
    element.removeEventListener("click", handleElementClick);
  });

  isSelecting = false;
  currentField = null;
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
