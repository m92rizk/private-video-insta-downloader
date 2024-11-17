"use strict";

// background.js
var _FFmpegWASM = FFmpegWASM,
    FFmpeg = _FFmpegWASM.FFmpeg;
console.log("hi");
throw '';
var downloaded = false;
var leastSimilarUrl = null; // Initial least similar URL

var leastSimilarity = 100; // Start with 100% similarity (maximum)

var postProcessDone = false; // Flag to track if post-process has been done

var startTime = Date.now();
var downloadedUrls = []; // chrome.downloads.onChanged.addListener(function (delta) {
//   if (delta.state && delta.state.current === "complete") {
//     // Get the URL of the downloaded file
//     const downloadUrl = delta.id;  // This gives you the download ID
//     chrome.downloads.search({ id: delta.id }, function (results) {
//       const downloadUrl = results[0].url;
//       // Add the downloaded URL to the list
//       if (!downloadedUrls.includes(downloadUrl)) {
//         downloadedUrls.push(downloadUrl);
//         console.log("Downloaded URL: ", downloadUrl);
//         // Check if both URLs are downloaded
//         if (downloadedUrls.length === 2) {
//           // Run FFmpeg when both files are downloaded
//           // runFFmpeg(downloadedUrls[0], downloadedUrls[1]);
//           processVideos(vid1, vid2); // Call the function with the URLs
//         }
//       }
//     });
//   }
// });

var cleanedURLs = [];
var ffmpeg;
var downloadCount = 0;
var videoFilename, audioFilename;
var videoFile, audioFile; // Load FFmpeg from CDN and initialize it once loaded

function initializeFFmpeg() {
  return regeneratorRuntime.async(function initializeFFmpeg$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          return _context2.abrupt("return", new Promise(function (resolve, reject) {
            // Check if FFmpeg is already loaded
            if (typeof FFmpeg !== "undefined") {
              ffmpeg = FFmpeg.createFFmpeg({
                log: true
              });
              ffmpeg.load().then(resolve)["catch"](reject);
              return;
            } // Dynamically add script to load FFmpeg


            var script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.10.0/dist/ffmpeg.min.js';

            script.onload = function _callee() {
              return regeneratorRuntime.async(function _callee$(_context) {
                while (1) {
                  switch (_context.prev = _context.next) {
                    case 0:
                      // Once loaded, initialize ffmpeg
                      ffmpeg = FFmpeg.createFFmpeg({
                        log: true
                      });
                      _context.next = 3;
                      return regeneratorRuntime.awrap(ffmpeg.load());

                    case 3:
                      resolve();

                    case 4:
                    case "end":
                      return _context.stop();
                  }
                }
              });
            };

            script.onerror = function () {
              return reject(new Error("Failed to load ffmpeg.wasm"));
            };

            document.head.appendChild(script);
          }));

        case 1:
        case "end":
          return _context2.stop();
      }
    }
  });
}

chrome.downloads.onChanged.addListener(function _callee3(delta) {
  return regeneratorRuntime.async(function _callee3$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          if (delta.state && delta.state.current === "complete") {
            downloadCount++;
            chrome.downloads.search({
              id: delta.id
            }, function _callee2(downloadItems) {
              var downloadItem, fileBlob;
              return regeneratorRuntime.async(function _callee2$(_context3) {
                while (1) {
                  switch (_context3.prev = _context3.next) {
                    case 0:
                      if (!(downloadItems && downloadItems.length > 0)) {
                        _context3.next = 26;
                        break;
                      }

                      downloadItem = downloadItems[0]; // Fetch file as blob after each download

                      _context3.next = 4;
                      return regeneratorRuntime.awrap(fetch(downloadItem.url).then(function (r) {
                        return r.blob();
                      }));

                    case 4:
                      fileBlob = _context3.sent;

                      if (!(downloadCount === 1)) {
                        _context3.next = 10;
                        break;
                      }

                      videoFilename = downloadItem.filename;
                      videoFile = new File([fileBlob], videoFilename);
                      _context3.next = 24;
                      break;

                    case 10:
                      if (!(downloadCount === 2)) {
                        _context3.next = 24;
                        break;
                      }

                      audioFilename = downloadItem.filename;
                      audioFile = new File([fileBlob], audioFilename); // Initialize FFmpeg (if not already initialized)

                      _context3.prev = 13;
                      _context3.next = 16;
                      return regeneratorRuntime.awrap(initializeFFmpeg());

                    case 16:
                      _context3.next = 18;
                      return regeneratorRuntime.awrap(mergeFilesWithFFmpeg(videoFile, audioFile));

                    case 18:
                      _context3.next = 23;
                      break;

                    case 20:
                      _context3.prev = 20;
                      _context3.t0 = _context3["catch"](13);
                      console.error("FFmpeg initialization error:", _context3.t0);

                    case 23:
                      // Reset download count for the next batch
                      downloadCount = 0;

                    case 24:
                      _context3.next = 27;
                      break;

                    case 26:
                      console.error("Error: Failed to retrieve download information.");

                    case 27:
                    case "end":
                      return _context3.stop();
                  }
                }
              }, null, null, [[13, 20]]);
            });
          }

        case 1:
        case "end":
          return _context4.stop();
      }
    }
  });
});

function mergeFilesWithFFmpeg(videoFile, audioFile) {
  var data, outputBlob, url;
  return regeneratorRuntime.async(function mergeFilesWithFFmpeg$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          _context5.t0 = ffmpeg;
          _context5.t1 = videoFile.name;
          _context5.next = 4;
          return regeneratorRuntime.awrap(fetchFile(videoFile));

        case 4:
          _context5.t2 = _context5.sent;

          _context5.t0.FS.call(_context5.t0, "writeFile", _context5.t1, _context5.t2);

          _context5.t3 = ffmpeg;
          _context5.t4 = audioFile.name;
          _context5.next = 10;
          return regeneratorRuntime.awrap(fetchFile(audioFile));

        case 10:
          _context5.t5 = _context5.sent;

          _context5.t3.FS.call(_context5.t3, "writeFile", _context5.t4, _context5.t5);

          _context5.next = 14;
          return regeneratorRuntime.awrap(ffmpeg.run("-i", videoFile.name, "-i", audioFile.name, "-c:v", "copy", "-c:a", "copy", "output.mp4"));

        case 14:
          // Read the output file from ffmpeg.wasm
          data = ffmpeg.FS("readFile", "output.mp4"); // Create a Blob from the output file and download it

          outputBlob = new Blob([data.buffer], {
            type: "video/mp4"
          });
          url = URL.createObjectURL(outputBlob); // Trigger the download in Chrome

          chrome.downloads.download({
            url: url,
            filename: "merged_output.mp4"
          });

        case 18:
        case "end":
          return _context5.stop();
      }
    }
  });
} // Define the processVideos function


function processVideos(vid1, vid2) {
  var data = {
    vid1: vid1,
    vid2: vid2
  };
  fetch('http://localhost:3000/process-videos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  }).then(function (response) {
    return response.json();
  }).then(function (data) {
    console.log('Video processing started:', data);
  })["catch"](function (error) {
    console.error('Error:', error);
  });
}

chrome.tabs.onActivated.addListener(function (activeInfo) {
  // This event fires when a tab is switched
  clearVideoList();
});
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  // This event fires when a tab is refreshed or its URL is updated
  if (changeInfo.status === 'loading') {
    clearVideoList();
  }
});

function clearVideoList() {
  chrome.storage.local.set({
    cleanedURLs: []
  }, function () {
    console.log("Video URLs cleared.");
    cleanedURLs = []; // Clear the variable in memory as well
  });
}

chrome.tabs.onCreated.addListener(function (tab) {
  console.log("New tab opened:", tab); // Check if the new tab has a `url` or `pendingUrl` that includes "instagram.com"

  var tabUrl = tab.pendingUrl || tab.url || "";

  if (tabUrl.includes("https://www.instagram.com")) {
    console.log("Instagram tab opened."); // Add a delay before calling captureMediaUrlsInTab

    setTimeout(function () {
      captureMediaUrlsInTab(tab.id);
    }, 2000); // 2000 ms = 2 seconds delay
  } else {
    console.log("Non-Instagram tab or no URL detected.");
  }
});

function getLastSegment(url) {
  if (!url || typeof url !== 'string') {
    console.error("Invalid URL:", url);
    return ''; // Return an empty string or handle error as needed
  }

  var parts = url.split('/');
  return parts.pop() || parts.pop(); // Handles potential trailing slash
}

function compareUrls(url1, url2) {
  // Split the URLs into segments
  // console.log("url 1 : ", url1);
  // console.log("url 2 : ", url2);
  if (!url1 || typeof url1 !== 'string') {
    console.error("Invalid URL1:", url1);
    return ''; // Return an empty string or handle error as needed
  }

  if (!url2 || typeof url2 !== 'string') {
    console.error("Invalid URL2:", url2);
    return ''; // Return an empty string or handle error as needed
  }

  var segments1 = url1.split('/');
  var segments2 = url2.split('/'); // Compare each segment one by one

  var matchCount = 0;
  var maxLength = Math.min(segments1.length, segments2.length);

  for (var i = 0; i < maxLength; i++) {
    // If the segments don't match, stop the comparison
    if (segments1[i] !== segments2[i]) {
      break;
    }

    matchCount++;
  } // Calculate similarity as a percentage of matching segments
  // const similarity = (matchCount / maxLength) * 100;


  var diff = maxLength - matchCount;
  return diff;
}

function similarityPercentage(str1, str2) {
  var length = Math.max(str1.length, str2.length);
  var matches = 0;

  for (var i = 0; i < length; i++) {
    if (str1[i] === str2[i]) matches++;
  }

  return matches / length * 100;
} // Call this when you get a new `cleanedUrl`


function checkSimilarityAndTrack(url1, url2) {
  var segment1 = getLastSegment(url1); // Assuming url1 is a list of URLs to compare against.

  var segment2 = getLastSegment(url2);
  var similarity = similarityPercentage(segment1, segment2);
  console.log("URLs similarity: ".concat(similarity, "%"));

  if (leastSimilarity === null || similarity < leastSimilarity) {
    leastSimilarity = similarity;
    leastSimilarUrl = url2;
    console.log("New least similar URL: ".concat(leastSimilarUrl));
  }
}

function captureMediaUrlsInTab(tabId) {
  // Add logic here to handle the media capture for a new Instagram tab
  console.log("started capturing");
  downloaded = false;
  chrome.webRequest.onCompleted.addListener(function (details) {
    // Inspect the response to see if it matches our video content criteria
    if (details.url.includes("https://scontent.cdninstagram.com/") && details.responseHeaders || details.url.includes("https://instagram.flyn1") && details.responseHeaders) {
      var contentType = details.responseHeaders.find(function (header) {
        return header.name.toLowerCase() === "content-type";
      }); // Check if the content is a video (video/mp4)

      if (contentType && contentType.value.includes("video/")) {
        // console.log("Video URL found:", details.url);
        // Normalize the URL by removing the last part of the path
        var normalizedUrl = details.url; // Retrieve the existing list of video URLs from storage

        chrome.storage.local.get("cleanedURLs", function (data) {
          var videoUrls = data.videoUrls || []; // Initialize an empty array if no data is found

          var cleanedURLs = data.cleanedURLs || []; // console.log("Currently stored URLs:", videoUrls);

          var cleanedUrl = '';

          if (cleanedURLs.length < 2) {
            videoUrls.push(normalizedUrl); // Add the normalized URL to the list

            chrome.storage.local.set({
              videoUrls: videoUrls
            });
            cleanedUrl = removeByteStartAndEndParameters(normalizedUrl);
            console.log(cleanedUrl); // console.log("length=:",cleanedURLs.length);
            // console.log(cleanedURLs);
            // if (cleanedURLs[0] !== undefined) {
            //   // There is a first element in the array
            //   // console.log("First element:", cleanedURLs[0]);
            // } else {
            //   // The array is empty or first element is undefined
            //   console.log("cleanedURLs is empty or has no defined first element.");
            //   cleanedURLs.push(cleanedUrl);
            //   chrome.storage.local.set({ cleanedURLs: cleanedURLs });
            // }

            if (cleanedURLs.length === 0) {
              console.log("cleanedURLs was empty.");
              cleanedURLs.push(cleanedUrl);
              chrome.storage.local.set({
                cleanedURLs: cleanedURLs
              });
            } // const matchCount = compareUrls(cleanedURLs[0], cleanedUrl);


            var diff = compareUrls(cleanedURLs[0], cleanedUrl);
            console.log("URLs differences: ".concat(diff));

            if (diff === 1) {
              // const segment1 = getLastSegment(cleanedURLs[0]);
              // const segment2 = getLastSegment(cleanedUrl);
              // const similarity = similarityPercentage(segment1, segment2);
              // console.log(`URLs similarity: ${similarity}%`);
              // if (similarity > 20){
              //   return
              // }
              var interval = setInterval(function () {
                // Calculate elapsed time
                var elapsedTime = Date.now() - startTime; // Check if 1 minute has passed

                if (elapsedTime >= 20000) {
                  // 60,000 milliseconds = 1 minute
                  clearInterval(interval); // Stop the interval
                  // After 1 minute, process the least similar URL

                  if (leastSimilarUrl) {
                    console.log("1 minute passed. Least similar URL:", leastSimilarUrl);
                    cleanedURLs.push(leastSimilarUrl);
                    chrome.storage.local.set({
                      cleanedURLs: cleanedURLs
                    });
                    console.log("cleaned Video URL : ", cleanedURLs);
                    handlePostProcess(); // Additional actions like downloading can go here
                  } else {
                    console.log("No sufficiently dissimilar URL found in 1 minute.");
                  }

                  postProcessDone = true;
                } // Simulate checking for a new URL (cleanedUrl) to compare


                if (cleanedUrl) {
                  var segment1 = getLastSegment(cleanedURLs[0]);
                  var segment2 = getLastSegment(cleanedUrl);
                  var similarity = similarityPercentage(segment1, segment2);
                  console.log("URLs similarity: ".concat(similarity, "%")); // Update least similar URL if this one has a lower similarity percentage

                  if (similarity < leastSimilarity) {
                    leastSimilarity = similarity;
                    leastSimilarUrl = cleanedUrl;
                  } // Stop this loop if the similarity is low enough


                  if (similarity <= 20) {
                    console.log("Found a sufficiently dissimilar URL:", cleanedUrl);
                    clearInterval(interval); // Stop checking further

                    return;
                  }
                }
              }, 1000); // Run every 1 second (adjust as needed)
            }

            if (diff === 0) {
              console.log("URLs are identical");
              return;
            } // const segment1 = getLastSegment(cleanedURLs[0]);
            // const segment2 = getLastSegment(cleanedUrl);
            // const similarity = similarityPercentage(segment1, segment2);
            // console.log(`Similarity: ${similarity}%`);
            // cleanedURLs.push(cleanedUrl)
            // chrome.storage.local.set({ cleanedURLs: cleanedURLs });
            // console.log("cleaned Video URL : ", cleanedURLs);
            // console.log("downloaded is: ", downloaded);
            // console.log("length=:",cleanedURLs.length);

          }

          ;

          function handlePostProcess() {
            if (postProcessDone) return; // if ((cleanedURLs.length === 2)) {
            // if (cleanedURLs[2] !== "DONE") {

            console.log("DONE"); // downloaded = true;

            console.log("FINAL URL 1 : ", cleanedURLs[0]);
            console.log("FINAL URL 2 : ", cleanedURLs[1]); // cleanedURLs.push("DONE");
            // const segment1 = getLastSegment(cleanedURLs[0]);
            // const segment2 = getLastSegment(cleanedURLs[1]);
            // const similarity = similarityPercentage(segment1, segment2);
            // console.log(`Similarity: ${similarity}%`);

            downloadVideo(cleanedURLs[0]);
            downloadVideo(cleanedURLs[1]); //   chrome.downloads.download({
            //     url: cleanedURLs[0],
            // });
            //   chrome.downloads.download({
            //     url: cleanedURLs[1],
            // });
          } // vid1 = cleanedURLs[0];
          // vid2 = cleanedURLs[1];
          // function processVideos(vid1, vid2) {
          //   const data = { vid1, vid2 };
          //   fetch('http://localhost:3000/process-videos', {
          //     method: 'POST',
          //     headers: { 'Content-Type': 'application/json' },
          //     body: JSON.stringify(data),
          //   })
          //   .then(response => response.json())
          //   .then(data => {
          //     console.log('Video processing started:', data);
          //   })
          //   .catch(error => {
          //     console.error('Error:', error);
          //   });
          // }

        });
      }
    }
  }, {
    urls: ["https://scontent.cdninstagram.com/*"]
  }, ["responseHeaders"] // Required to access the response headers
  );
}

function removeByteStartAndEndParameters(url) {
  try {
    // Create a URL object to parse and modify the URL
    var parsedUrl = new URL(url); // Remove both `bytestart` and `byteend` parameters if they exist

    parsedUrl.searchParams["delete"]('bytestart');
    parsedUrl.searchParams["delete"]('byteend'); // Return the cleaned URL as a string

    return parsedUrl.toString();
  } catch (error) {
    console.error("Invalid URL:", error);
    return url; // Return the original URL if there's an error
  }
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "clearVideoList") {
    clearVideoList(); // Replace with the function you want to call

    sendResponse({
      status: "started"
    });
  }
});
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "captureMediaUrlsInTab") {
    downloaded = false; // Get the current active tab

    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, function (tabs) {
      if (tabs.length > 0) {
        var currentTabId = tabs[0].id; // Call captureMediaUrlsInTab with the current tab ID

        console.log("sent captureMediaUrlsInTab in ", currentTabId);
        captureMediaUrlsInTab(currentTabId);
        sendResponse({
          status: "started"
        });
      } else {
        console.log("No active tab found.");
        sendResponse({
          status: "no_active_tab"
        });
      }
    }); // Return true to indicate asynchronous response

    return true;
  }
}); // Function to check if the URL has been downloaded already

function hasDownloaded(url) {
  return new Promise(function (resolve, reject) {
    chrome.storage.local.get(["downloadedUrls"], function (data) {
      var downloadedUrls = data.downloadedUrls || [];
      resolve(downloadedUrls.includes(url));
    });
  });
} // Function to add the URL to the downloaded list


function markAsDownloaded(url) {
  chrome.storage.local.get(["downloadedUrls"], function (data) {
    var downloadedUrls = data.downloadedUrls || [];

    if (!downloadedUrls.includes(url)) {
      downloadedUrls.push(url);
      chrome.storage.local.set({
        downloadedUrls: downloadedUrls
      });
      console.log("URL ".concat(url, " added to downloaded list."));
    }
  });
} // Function to download the video if not already downloaded


function downloadVideo(url) {
  var isDownloaded;
  return regeneratorRuntime.async(function downloadVideo$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          _context6.next = 2;
          return regeneratorRuntime.awrap(hasDownloaded(url));

        case 2:
          isDownloaded = _context6.sent;

          if (isDownloaded) {
            console.log("This file has already been downloaded.");
          } else {
            // Proceed to download the video
            chrome.downloads.download({
              url: url
            }, function (downloadId) {
              if (downloadId) {
                console.log("Download started for:", url); // Mark the URL as downloaded once the download starts

                markAsDownloaded(url);
              } else {
                console.log("Download failed.");
              }
            });
          }

        case 4:
        case "end":
          return _context6.stop();
      }
    }
  });
}