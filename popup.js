const form = document.getElementById("form");

const filterTextElem = document.getElementById("filterText");
filterTextElem.focus();

chrome.storage.sync.get("filterText", data => {
  if ("filterText" in data)
    filterTextElem.value = data.filterText;  
})

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const filterText = event.target.filterText.value;

  chrome.storage.sync.set({ filterText });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

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
      continue;
    
    item.style.backgroundColor = "red";
  }
}