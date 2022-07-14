const form = document.getElementById("form");
const listItemsSelectorElem = document.getElementById("listItemsSelector");
const filterTextElem = document.getElementById("filterText");
filterTextElem.focus();

chrome.storage.sync.get(["filterText", "listItemsSelector"] , data => {
  if ("filterText" in data)
    filterTextElem.value = data.filterText;
  if ("listItemsSelector" in data)
    listItemsSelectorElem.value = data.listItemsSelector;
});

const testPageSelector = "#job-container li";

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const filterText = event.target.filterText.value;
  const listItemsSelector = event.target.listItemsSelector.value || testPageSelector;

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