// js/background.js

console.log("Background script fired!!!");


let downloaded = false ;
let leastSimilarUrl = null; // Initial least similar URL
let leastSimilarity = 100;  // Start with 100% similarity (maximum)
let postProcessDone = false;  // Flag to track if post-process has been done
let startTime = Date.now();
let downloadedUrls = [];
let final_url1 = "";
let final_url2 = "";
let cleanedURLs = [];
let cleanedUrl = '' ;
let listener ; 
let videoUrls = [];

// Initialize msg with a default value 
let msg = ""; 
// Retrieve the value from chrome.storage.local 
chrome.storage.local.get("msg", (result) => { 
  if (chrome.runtime.lastError) { 
    console.error("Error retrieving msg:", chrome.runtime.lastError); 
  } else { 
    // Update msg if a value is found 
    if (result.msg !== undefined) { 
      msg = result.msg; 
    } 
  } // Now you can use msg safely 
  console.log(msg); 
});

chrome.storage.local.set({ cleanedURLs: [] });

// chrome.tabs.onActivated.addListener(function(activeInfo) {
//   // This event fires when a tab is switched
//   console.log("background js started");
//   clearVideoList();
// });

const update_listen = chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  // This event fires when a tab is refreshed or its URL is updated
  if (changeInfo.status === 'loading') {
    clearVideoList();
    chrome.webRequest.onCompleted.removeListener(update_listen);
    chrome.webRequest.onCompleted.removeListener(listener);
    chrome.webRequest.onCompleted.removeListener(message_listen);
    if (tab.url.startsWith('https://www.instagram.com/')) {
      console.log("cleaning storage ...");
      chrome.storage.local.remove(['final_url1', 'final_url2']);
      chrome.storage.local.remove('contentTabOpen');
      chrome.storage.local.remove('msg');
    }
  }
});

const message_listen = chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "captureMediaUrlsInTab") {
    downloaded = false;
    clearVideoList(); 
    // Get the current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const currentTabId = tabs[0].id;
        
        // Call captureMediaUrlsInTab with the current tab ID
        console.log("sent captureMediaUrlsInTab in ",currentTabId);
        captureMediaUrlsInTab(currentTabId);
        sendResponse({ status: "started" });
      } else {
        console.log("No active tab found.");
        sendResponse({ status: "no_active_tab" });
      }
    });
    
    // Return true to indicate asynchronous response
    return true;
  }
});

const msg_listener = chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "downloadVideo") {
    const interval = setInterval(() => {
      chrome.runtime.sendMessage({action: "updateProgress", msg});
      if (msg === "Found it") {
        clearInterval(interval);
      }
    }, 1000);
  }
});


function clearVideoList() {
  chrome.storage.local.set({ cleanedURLs: [] }, function() {
    console.log("Video URLs cleared.");
    cleanedURLs = []; // Clear the variable in memory as well
    postProcessDone = false ;
    chrome.storage.local.set({ cleanedURLs: [] });
  });
}



// chrome.tabs.onCreated.addListener((tab) => {
//   console.log("New tab opened:", tab);

//   // Check if the new tab has a `url` or `pendingUrl` that includes "instagram.com"
//   const tabUrl = tab.pendingUrl || tab.url || "";
  
//   if (tabUrl.includes("https://www.instagram.com")) {
//       console.log("Instagram tab opened.");

//       // Add a delay before calling captureMediaUrlsInTab
//       setTimeout(() => {
//         captureMediaUrlsInTab(tab.id);
//       }, 2000);  // 2000 ms = 2 seconds delay
//   } else {
//       console.log("Non-Instagram tab or no URL detected.");
//   }
// });

function getLastSegment(url) {
  if (!url || typeof url !== 'string') {
      console.error("Invalid URL:", url);
      return '';  // Return an empty string or handle error as needed
  }
  const parts = url.split('/');
  return parts.pop() || parts.pop();  // Handles potential trailing slash
}


function compareUrls(url1, url2) {
  if (!url1 || typeof url1 !== 'string') {
    console.error("Invalid URL1:", url1);
    return '';  // Return an empty string or handle error as needed
  }
  if (!url2 || typeof url2 !== 'string') {
    console.error("Invalid URL2:", url2);
    return '';  // Return an empty string or handle error as needed
  }
  const segments1 = url1.split('/');
  const segments2 = url2.split('/');

  // Compare each segment one by one
  let matchCount = 0;
  const maxLength = Math.min(segments1.length, segments2.length);

  for (let i = 0; i < maxLength; i++) {
      // If the segments don't match, stop the comparison
      if (segments1[i] !== segments2[i]) {
          break;
      }
      matchCount++;
  }

  // Calculate similarity as a percentage of matching segments
  let diff = maxLength - matchCount;
  return diff;
}


function similarityPercentage(str1, str2) {
  const length = Math.max(str1.length, str2.length);
  let matches = 0;
  
  for (let i = 0; i < length; i++) {
      if (str1[i] === str2[i]) matches++;
  }
  
  return (matches / length) * 100;
}

// Call this when you get a new `cleanedUrl`
function checkSimilarityAndTrack(url1, url2) {
  const segment1 = getLastSegment(url1); // Assuming url1 is a list of URLs to compare against.
  const segment2 = getLastSegment(url2);
  const similarity = similarityPercentage(segment1, segment2);
  
  console.log(`URLs similarity: ${similarity}%`);
  
  if (leastSimilarity === null || similarity < leastSimilarity) {
      leastSimilarity = similarity;
      leastSimilarUrl = url2;
      console.log(`New least similar URL: ${leastSimilarUrl}`);
  }
}

// Function to remove the listener 
function removeOnCompletedListener() { 
  chrome.webRequest.onCompleted.removeListener(onCompletedListener); 
}

function captureMediaUrlsInTab(tabId) {
  // Add logic here to handle the media capture for a new Instagram tab
  console.log("started capturing");
  // downloaded = false ;
  listener = chrome.webRequest.onCompleted.addListener(
    (details) => {
      if (msg === "Found it") {
        return
      }
      // msg = "Inspecting links form Instagram";
      sendmsg("Inspecting links form Instagram");
      // Inspect the response to see if it matches our video content criteria
      if ((details.url.includes("https://scontent.cdninstagram.com/") || details.url.includes("https://instagram.flyn1-1.fna.fbcdn.net")) && details.responseHeaders) {
        // msg = "Fitlering videos by URLs";
        sendmsg("Fitlering videos by URLs");
        console.log("started finding urls ..");
        let contentType = details.responseHeaders.find(
          (header) => header.name.toLowerCase() === "content-type"
        );

        // Check if the content is a video (video/mp4)
        if (contentType && contentType.value.includes("video/")) {
          // msg = "Looking for the video links";
          sendmsg("Looking for the video links");
          // Normalize the URL by removing the last part of the path
          let normalizedUrl = details.url;

          // Retrieve the existing list of video URLs from storage
          chrome.storage.local.get("cleanedURLs", (data) => {
            videoUrls = data.videoUrls || []; // Initialize an empty array if no data is found
            cleanedURLs = data.cleanedURLs || [];
          });

          if (cleanedURLs.length < 2) {
            videoUrls.push(normalizedUrl);  // Add the normalized URL to the list
            chrome.storage.local.set({ videoUrls: videoUrls });
            cleanedUrl = removeByteStartAndEndParameters(normalizedUrl);
            // console.log(cleanedUrl);
            
            if (cleanedURLs.length === 0) {
              console.log("cleanedURLs were empty.");
              cleanedURLs.push(cleanedUrl);
              chrome.storage.local.set({ cleanedURLs: cleanedURLs });
            }

            // const matchCount = compareUrls(cleanedURLs[0], cleanedUrl);
            const diff = compareUrls(cleanedURLs[0], cleanedUrl);
            // console.log(`URLs differences: ${diff}`);
            
            if (diff > 1 ){
              cleanedURLs.push(cleanedUrl)
              chrome.storage.local.set({ cleanedURLs: cleanedURLs });
              handlePostProcess();        
            }
            
            if (diff === 1){
              const interval = setInterval(() => {
                // Calculate elapsed time
                const elapsedTime = Date.now() - startTime;
              
                // Check if 1 minute has passed
                if (elapsedTime >= 20000) { // 60,000 milliseconds = 1 minute
                  clearInterval(interval); // Stop the interval
              
                  // After 1 minute, process the least similar URL
                  if (leastSimilarUrl) {
                    console.log("1 minute passed. Least similar URL:", leastSimilarUrl);
                    cleanedURLs.push(leastSimilarUrl)
                    chrome.storage.local.set({ cleanedURLs: cleanedURLs });
                    // console.log("cleaned Video URL : ", cleanedURLs);
                    handlePostProcess();        // Additional actions like downloading can go here
                  } else {
                    console.log("No sufficiently dissimilar URL found in 1 minute.");
                  }
                  postProcessDone = true;
                }
              
                // Simulate checking for a new URL (cleanedUrl) to compare
              
                if (cleanedUrl) {
                  const segment1 = getLastSegment(cleanedURLs[0]);
                  const segment2 = getLastSegment(cleanedUrl);
                  const similarity = similarityPercentage(segment1, segment2);
                  console.log(`URLs similarity: ${similarity}%`);
                  
                  // Update least similar URL if this one has a lower similarity percentage
                  if (similarity < leastSimilarity) {
                    leastSimilarity = similarity;
                    leastSimilarUrl = cleanedUrl;
                  }
              
                  // Stop this loop if the similarity is low enough
                  if (similarity <= 20) {
                    console.log("Found a sufficiently dissimilar URL:", cleanedUrl);
                    clearInterval(interval); // Stop checking further
                    return;
                  }
                }
              }, 1000); // Run every 1 second (adjust as needed)
            }
            if (diff === 0){
              console.log(`URLs are identical`);
              return
            }
            // msg = "Trying to find video/audio URLs";
            sendmsg("Trying to find video/audio URLs");
          }

          let l = cleanedURLs.length ;
          console.log("cleanedURLs.length = ",l);
          console.log("URL = ",cleanedUrl);

           

          function handlePostProcess(){
            if (postProcessDone) return;  
            console.log("DONE");
            console.log("FINAL URL 1 : ", cleanedURLs[0]);
            console.log("FINAL URL 2 : ", cleanedURLs[1]);
            // console.log("downloading the video ..");
            // msg = "Found it";
            sendmsg("Found it");
            chrome.storage.local.set({ msg: "Found it" }, () => { 
              if (chrome.runtime.lastError) { 
                console.error("Error setting msg:", chrome.runtime.lastError); 
              } else { 
                console.log("msg has been set to 'Found it'"); 
              } 
            });
            // chrome.storage.local.set({ msg: "Found it" });      
            // removeOnCompletedListener();
            chrome.webRequest.onCompleted.removeListener(listener);
            openContentTab(cleanedURLs[0],cleanedURLs[1]);
            if (!chrome.webRequest.onCompleted.hasListener(listener)) {
              console.log("Listener successfully removed.");
            } else {
              console.log("Listener is still active.");
            }
          }
          
        }
      }
    },
    {
      urls: ["https://scontent.cdninstagram.com/*", "https://instagram.flyn1-1.fna.fbcdn.net/*"]
    },
    ["responseHeaders"]  // Required to access the response headers
  );
}

function removeByteStartAndEndParameters(url) {
  try {
    // Create a URL object to parse and modify the URL
    let parsedUrl = new URL(url);
    
    // Remove both `bytestart` and `byteend` parameters if they exist
    parsedUrl.searchParams.delete('bytestart');
    parsedUrl.searchParams.delete('byteend');
    
    // Return the cleaned URL as a string
    return parsedUrl.toString();
  } catch (error) {
    console.error("Invalid URL:", error);
    return url;  // Return the original URL if there's an error
  }
}


// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.action === "clearVideoList") {
//     clearVideoList(); // Replace with the function you want to call
//     sendResponse({ status: "started" });
//   }
// });




// Function to check if the URL has been downloaded already
function hasDownloaded(url) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["downloadedUrls"], (data) => {
      const downloadedUrls = data.downloadedUrls || [];
      resolve(downloadedUrls.includes(url));
    });
  });
}

// Function to add the URL to the downloaded list
function markAsDownloaded(url) {
  chrome.storage.local.get(["downloadedUrls"], (data) => {
    let downloadedUrls = data.downloadedUrls || [];
    if (!downloadedUrls.includes(url)) {
      downloadedUrls.push(url);
      chrome.storage.local.set({ downloadedUrls: downloadedUrls });
      console.log(`URL ${url} added to downloaded list.`);
    }
  });
}

function openContentTab(url1, url2) {
  // Check if the tab is already marked as open in storage
  chrome.storage.local.get('contentTabOpen', (data) => {
    if (!data.contentTabOpen) {
      // Check if a tab with 'content.html' URL is already open
      chrome.tabs.query({ url: chrome.runtime.getURL('../html/content.html') }, (tabs) => {
        if ((tabs.length === 0) || (msg !== "Found it")) {
          // If no tab is found, open a new one and set the storage flag
          chrome.storage.local.set({ 
            final_url1: url1, 
            final_url2: url2, 
            contentTabOpen: true 
          });
          chrome.webRequest.onCompleted.removeListener(update_listen);
          chrome.webRequest.onCompleted.removeListener(listener);
          chrome.webRequest.onCompleted.removeListener(message_listen);
          
          chrome.tabs.create({ url: chrome.runtime.getURL('../html/content.html') }, (tab) => {
            // Listen for tab close event to reset flag
            chrome.tabs.onRemoved.addListener((tabId) => {
              if (tabId === tab.id) {
                chrome.storage.local.remove('contentTabOpen');
                chrome.storage.local.remove('msg');
                
              }
            });
          });
        }
      });
    }
  });
}



// Function to download the video if not already downloaded
async function downloadVideo(url) {
  const isDownloaded = await hasDownloaded(url);
  if (isDownloaded) {
    console.log("This file has already been downloaded.");
  } else {
    // Proceed to download the video
    chrome.downloads.download({
      url: url,
    }, (downloadId) => {
      if (downloadId) {
        console.log("Download started for:", url);
        // Mark the URL as downloaded once the download starts
        markAsDownloaded(url);
      } else {
        console.log("Download failed.");
      }
    });
  }
}


function sendmsg(msg) {
  chrome.runtime.sendMessage({action: "updateProgress", msg});
}

// document.addEventListener('DOMContentLoaded', () => { 
//   const button = document.getElementById('downloadVideo'); 
//   button.addEventListener('click', () => { 
//     chrome.tabs.query({ 
//       active: true, 
//       currentWindow: true 
//     }, 
//     (tabs) => { 
//       chrome.scripting.executeScript({ 
//         target: { 
//           tabId: tabs[0].id 
//         }, 
//         func: () => { 
//           alert('Hello from the extension!'); 
//         } 
//       }); 
//     }); 
//   }); 
// });


// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.action === "downloadVideo") {
//       // Simulate a long-running script
//       let progress = 0;
//       const interval = setInterval(() => {
//           progress += 10;
//           if (progress <= 100) {
//               chrome.runtime.sendMessage({action: "updateProgress", progress});
//           } else {
//               clearInterval(interval);
//           }
//       }, 1000);
//   }
// });


// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.action === "updateProgress") {
//       alert(`Progress: ${request.progress}%`);
//   }
// });
