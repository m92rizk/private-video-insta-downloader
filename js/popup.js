
document.getElementById("downloadVideo").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.reload(tabs[0].id); // Refresh the current tab
      console.log("Tab reloaded to capture video.");
    };

    chrome.runtime.sendMessage({ action: "clearVideoList" }, (response) => {
      console.log(response.status); // Should log "started" if successful
    });
    chrome.runtime.sendMessage({ action: "captureMediaUrlsInTab" }, (response) => {
      console.log(response.status); // Should log "started" if successful
    });
  });
});

document.addEventListener('DOMContentLoaded', () => { 
  const button = document.getElementById('downloadVideo'); 
  const progresscontainer = document.getElementById('progresscontainer');
  const progressDisplay = document.getElementById('progressDisplay');
  const spinner = document.getElementById('spinner');

  button.addEventListener('click', () => { 
    chrome.tabs.query({ 
      active: true, 
      currentWindow: true 
    }, (tabs) => { 
      chrome.scripting.executeScript({ 
        target: { 
          tabId: tabs[0].id 
        }, 
        func: () => { 
          chrome.runtime.sendMessage({action: "downloadVideo"});
        } 
      }); 
    }); 
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateProgress") {
      progresscontainer.style.display = 'block';
      progressDisplay.style.display = 'block';
      if (`${request.msg}` === "Looking for the video links") {
        spinner.style.display = 'flex';
      } else {
        spinner.style.display = 'none';
      }
      if (`${request.msg}` === "Fount it") {
        spinner.style.display = 'none';
      }
      progressDisplay.textContent = `${request.msg}`;
      document.body.style.height = 'auto'; // Adjust popup height dynamically
    }
  });
});

