const form = document.getElementById("form");
const selectorElem = document.getElementById("selector");
const overrideElem = document.getElementById("override");
const filterTextElem = document.getElementById("filterText");
filterTextElem.focus();

let savedSelector, prevSelector;

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
    loadSavedSelector();
  }
});

overrideElem.addEventListener("click", (event) => {

  const checked = event.target.checked;

  selectorElem.disabled = !checked;

  chrome.storage.sync.set({ override: checked });

  checked ? loadSavedSelector() : loadDefaultSelector();    
});

const testPageSelector = "#job-container li";

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const filterText = event.target.filterText.value;
  const newSelector = event.target.selector.value;

  chrome.storage.sync.set({ filterText });

  if (event.target.override.checked && newSelector !== savedSelector)
    chrome.storage.sync.set({ selector: newSelector });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.insertCSS({
    target: { tabId: tab.id },
    css: ".highlight { background-color: gold; }"
  });

  if (prevSelector && newSelector !== prevSelector)
    executeClearAndFilter(tab.id, filterText, prevSelector, newSelector);
  else
    executeFilter(tab.id, filterText, newSelector);

  prevSelector = newSelector;
});

function loadDefaultSelector() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const domain = new URL(tabs[0].url).hostname;

    fetch("selectors.json")
      .then(res => res.json())
      .then(selectors => {
        if (domain in selectors)
          selectorElem.value = selectors[domain];
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

function executeClearAndFilter(tabId, filterText, oldSelector, newSelector) {
  chrome.scripting.executeScript({
    target: { tabId },
    function: clear,
    args: [oldSelector]
  }, () => executeFilter(tabId, filterText, newSelector));
}

function executeFilter(tabId, filterText, itemSelector) {
  chrome.scripting.executeScript({
    target: { tabId },
    function: filter,
    args: [filterText.toLowerCase().split(','), itemSelector]
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
  const selector = selectorElem.value || testPageSelector;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: clear,
    args: [selector]
  });
});

function clear(selector) {
  const listItems = document.querySelectorAll(selector);

  for (item of listItems) // remove highlight from any highlighted items
    item.classList.remove("highlight");
}