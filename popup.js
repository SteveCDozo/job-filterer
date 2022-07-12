const form = document.getElementById("form");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: filter,
    args: [event.target.filterText.value.split(',')]
  }); 
});

function filter(filterTerms) {
  const listItems = document.querySelectorAll("#job-container li");

  for (item of listItems) { // highlight items that don't contain filter terms
    if (filterTerms.some(term => item.innerText.includes(term)))
      continue;
    
    item.style.backgroundColor = "red";
  }
}