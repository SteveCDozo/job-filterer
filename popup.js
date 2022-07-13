const form = document.getElementById("form");

document.getElementById("filterText").focus();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: filter,
    args: [event.target.filterText.value.toLowerCase().split(',')]
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