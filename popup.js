const form = document.getElementById("form");
const selectorElem = document.getElementById("selector");
const overrideElem = document.getElementById("override");
const extractElem = document.getElementById("extract");
const filterTextElem = document.getElementById("filterText");
filterTextElem.focus();

let defaultSelector, savedSelector, prevSelector;

chrome.storage.sync.get(["filterText", "override"], data => {
  if ("filterText" in data)
    filterTextElem.value = data.filterText;
  if ("override" in data) {
    if (!data.override) {
      loadDefaultSelector();
      return;
    }
    overrideElem.checked = true;
    selectorElem.disabled = false;
    extractElem.classList.remove("hidden");
    loadSavedSelector();
  }
});

overrideElem.addEventListener("click", (event) => {

  const checked = event.target.checked;

  selectorElem.disabled = !checked;
  extractElem.classList.toggle("hidden");

  chrome.storage.sync.set({ override: checked });

  checked ? loadSavedSelector() : loadDefaultSelector();    
});

extractElem.addEventListener("click", async () => {
  if (!chrome.runtime.onMessage.hasListeners()) {
    chrome.runtime.onMessage.addListener(message => {
      if ("extractedClassName" in message)     
        selectorElem.value = '.' + message.extractedClassName.replace(/ /g, '.');
    });
  }
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => chrome.runtime.sendMessage({extractedClassName: getSelection().anchorNode.parentElement.className})
  })
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const filterText = event.target.filterText.value;
  const newSelector = event.target.selector.value;

  if (!filterText || !newSelector) return; // ensure filter & selector aren't empty

  chrome.storage.sync.set({ filterText });

  if (event.target.override.checked && newSelector !== savedSelector)
    chrome.storage.sync.set({ selector: newSelector });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.insertCSS({
    target: { tabId: tab.id },
    css: ".highlight { background-color: gold; }"
  });

  const args = [tab.id, filterText, newSelector];

  if (prevSelector && newSelector !== prevSelector)
    executeClearAndFilter(...args);
  else
    executeFilter(...args);

  prevSelector = newSelector;
});

function loadDefaultSelector() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const domain = new URL(tabs[0].url).hostname;

    fetch("selectors.json")
      .then(res => res.json())
      .then(selectors => {
        if (domain in selectors) {
          defaultSelector = selectors[domain];
          selectorElem.value = defaultSelector;
        }
      });
  });
}

function loadSavedSelector() {
  chrome.storage.sync.get(["selector"], data => {
    if ("selector" in data) {
      savedSelector = data.selector;
      selectorElem.value = savedSelector;
    }
  });
}

function executeClearAndFilter(tabId, filterText, selector) {
  executeClear(tabId, () => executeFilter(tabId, filterText, selector));
}

function executeClear(tabId, callback) {
  const prevSelectors = []; // the possiblities for the previously used selector

  if (prevSelector)
    prevSelectors.push(prevSelector);
  else { // the previously used selector could be the default or saved selector
    if (defaultSelector)
      prevSelectors.push(defaultSelector);
    if (savedSelector)
      prevSelectors.push(savedSelector);
    if (!prevSelectors.length)
      return;
  }

  chrome.scripting.executeScript({
    target: { tabId },
    function: clear,
    args: [prevSelectors]
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

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  executeClear(tab.id);
});

function clear(selectors) {
  for (const selector of selectors) {
    const listItems = document.querySelectorAll(selector);

    for (item of listItems) // remove highlight from any highlighted items
      item.classList.remove("highlight");
  }
}