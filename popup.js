const form = document.getElementById("form");
const listItemsSelectorElem = document.getElementById("listItemsSelector");
const overrideElem = document.getElementById("override");
const filterTextElem = document.getElementById("filterText");
filterTextElem.focus();

chrome.storage.sync.get(["filterText", "override"], data => {
  if ("filterText" in data)
    filterTextElem.value = data.filterText;
  if ("override" in data) {
    if (!data.override) {
      loadDefaultSelector();
      return;
    }
    overrideElem.checked = true;
    listItemsSelectorElem.disabled = false;
    loadSavedSelector();
  }
});

overrideElem.addEventListener("click", (event) => {

  const checked = event.target.checked;

  listItemsSelectorElem.disabled = !checked;

  chrome.storage.sync.set({ override: checked });

  checked ? loadSavedSelector() : loadDefaultSelector();    
});

const testPageSelector = "#job-container li";

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const filterText = event.target.filterText.value;
  const listItemsSelector = event.target.listItemsSelector.value;

  chrome.storage.sync.set({ filterText, listItemsSelector });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.insertCSS({
    target: { tabId: tab.id },
    css: ".highlight { background-color: gold; }"
  });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: filter,
    args: [filterText.toLowerCase().split(','), listItemsSelector]
  });
});

function loadDefaultSelector() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const domain = new URL(tabs[0].url).hostname;

    fetch("selectors.json")
      .then(res => res.json())
      .then(selectors => {
        if (domain in selectors)
          listItemsSelectorElem.value = selectors[domain];
      });
  });
}

function loadSavedSelector() {
  chrome.storage.sync.get(["listItemsSelector"], data => {
    if ("listItemsSelector" in data)
      listItemsSelectorElem.value = data.listItemsSelector;
  });
}

function filter(filterTerms, listItemsSelector) {
  const listItems = document.querySelectorAll(listItemsSelector);

  for (item of listItems) { // highlight items that don't contain filter terms
    const itemText = item.innerText.toLowerCase();

    if (filterTerms.some(term => itemText.includes(term)))
      item.classList.remove("highlight");
    else    
      item.classList.add("highlight");
  }
}

document.getElementById("clearButton").addEventListener("click", async () => {
  const listItemsSelector = listItemsSelectorElem.value || testPageSelector;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: clear,
    args: [listItemsSelector]
  });
});

function clear(listItemsSelector) {
  const listItems = document.querySelectorAll(listItemsSelector);

  for (item of listItems) // remove highlight from any highlighted items
    item.classList.remove("highlight");
}