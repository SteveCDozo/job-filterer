const form = document.getElementById("form");

const filterTextElem = document.getElementById("filterText");
filterTextElem.focus();

chrome.storage.sync.get("filterText", data => {
  if ("filterText" in data)
    filterTextElem.value = data.filterText;  
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const filterText = event.target.filterText.value;

  chrome.storage.sync.set({ filterText });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.insertCSS({
    target: { tabId: tab.id },
    css: ".highlight { background-color: gold; }"
  });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: filter,
    args: [filterText.toLowerCase().split(',')]
  });
});

function filter(filterTerms) {
  const listItems = document.querySelectorAll("#job-container li");

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

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: clear
  });
});

function clear() {
  const listItems = document.querySelectorAll("#job-container li");

  for (item of listItems) // remove highlight from any highlighted items
    item.classList.remove("highlight");
}