const form = document.getElementById("form");
const selectorElem = document.getElementById("selector");
const overrideElem = document.getElementById("override");
const extractElem = document.getElementById("extract");
const filterTextElem = document.getElementById("filterText");
filterTextElem.focus();

let defaultSelector = "", savedSelector = "", prevSelector;

async function loadInitialData() {

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const domain = new URL(tab.url).hostname;

  const [selectors, data] = await Promise.all([ // load default & saved selectors
    fetch("selectors.json").then(res => res.json()),
    chrome.storage.sync.get("selector")
  ]);

  if (domain in selectors)
    defaultSelector = selectors[domain];
  if ("selector" in data)
    savedSelector = data.selector;

  chrome.storage.sync.get(["prevSelector", "filterText", "override"], data => {
    if ("prevSelector" in data)
      prevSelector = data.prevSelector;
    if ("filterText" in data)
      filterTextElem.value = data.filterText;
    if ("override" in data) {
      if (!data.override) {
        selectorElem.value = defaultSelector;
        return;
      }
      overrideElem.checked = true;
      selectorElem.disabled = false;
      extractElem.classList.remove("hidden");
      selectorElem.value = savedSelector;
    }
  });
}

loadInitialData();

overrideElem.addEventListener("click", (event) => {

  const checked = event.target.checked;

  selectorElem.disabled = !checked;
  extractElem.classList.toggle("hidden");

  chrome.storage.sync.set({ override: checked });

  selectorElem.value = checked ? savedSelector : defaultSelector;
});

extractElem.addEventListener("click", async () => {  
  if (!chrome.runtime.onMessage.hasListener(extractionListener))
    chrome.runtime.onMessage.addListener(extractionListener);
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => {
      const selection = getSelection();
      if (selection.type === "None") return;
      chrome.runtime.sendMessage({extractedClassName: selection.anchorNode.parentElement.className})
    }
  })
});

function extractionListener(message) {
  if ("extractedClassName" in message)     
    selectorElem.value = '.' + message.extractedClassName.replace(/ /g, '.');
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const filterText = event.target.filterText.value;
  const newSelector = event.target.selector.value;

  if (!filterText || !newSelector) return; // ensure filter & selector aren't empty

  chrome.storage.sync.set({ filterText });

  if (event.target.override.checked && newSelector !== savedSelector) {
    chrome.storage.sync.set({ selector: newSelector });
    savedSelector = newSelector;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  insertCSS(tab.id);

  const args = [tab.id, filterText, newSelector];

  if (prevSelector && newSelector !== prevSelector)
    executeClearAndFilter(...args);
  else
    executeFilter(...args);

  if (newSelector !== prevSelector) {
    prevSelector = newSelector;
    chrome.storage.sync.set({ prevSelector });    
  }
});

function insertCSS(tabId) {
  if (!chrome.runtime.onMessage.hasListener(cssInsertionListener))
    chrome.runtime.onMessage.addListener(cssInsertionListener);
  
  chrome.scripting.executeScript({
    target: { tabId },
    function: (tabId) => {
      chrome.runtime.sendMessage({ cssInserted: "cssInserted" in window, tabId })
      cssInserted = true;
    },
    args: [tabId]
  })
}

function cssInsertionListener(message) {
  if (!("cssInserted" in message) || !("tabId" in message) || message.cssInserted)
    return;
  
  chrome.storage.sync.get(
    { color: "#ffd700" }, // use gold as default highlight color
    ({ color }) => chrome.scripting.insertCSS({
      target: { tabId: message.tabId },
      css: `.highlight { background-color: ${ color }; }`
    })
  );
}

function executeClearAndFilter(tabId, filterText, selector) {
  executeClear(tabId, () => executeFilter(tabId, filterText, selector));
}

function executeClear(tabId, callback) {
  chrome.scripting.executeScript({
    target: { tabId },
    function: clear,
    args: [prevSelector]
  }, callback);
}

function executeFilter(tabId, filterText, selector) {
  chrome.scripting.executeScript({
    target: { tabId },
    function: filter,
    args: [filterText.toLowerCase().split(','), selector]
  });
}

function filter(filterTerms, selector) {
  const listItems = document.querySelectorAll(selector);

  for (item of listItems) { // highlight items that don't contain filter terms
    const itemText = item.innerText.toLowerCase();

    if (filterTerms.some(term => itemText.includes(term)))
      item.classList.remove("highlight");
    else    
      item.classList.add("highlight");
  }
}

document.getElementById("clearButton").addEventListener("click", async () => {

  if (!prevSelector) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  executeClear(tab.id);
  prevSelector = "";
  chrome.storage.sync.set({ prevSelector });
});

function clear(selector) {  
  const listItems = document.querySelectorAll(selector);

  for (item of listItems) // remove highlight from any highlighted items
    item.classList.remove("highlight");  
}