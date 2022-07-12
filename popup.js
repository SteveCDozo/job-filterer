const form = document.getElementById("form");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: filter
  }); 
});

function filter() {
  const listItems = document.querySelectorAll("#job-container li");

  for (item of listItems)
    item.style.backgroundColor = "red";
}