const colorElem = document.getElementById("color");
const statusElem = document.getElementById("status");

function loadOptions() {
  chrome.storage.sync.get(
    { color: "#ffd700" }, // use gold as default highlight color
    ({ color }) => colorElem.value = color
  );
}

function saveOptions() {
  chrome.storage.sync.set({ color: colorElem.value }, () => {
    statusElem.textContent = "Options saved";
    setTimeout(() => statusElem.textContent = "", 1000);
  });
}

document.getElementById("save").addEventListener("click", saveOptions);
loadOptions();