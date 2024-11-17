console.log("Content script is loaded and running!");

document.body.style.backgroundColor = "lightblue";
let url1 = "";
let url2 = "";
let downloaded = false ;
let downloadedUrls = [];
let downloadedFiles = {}; 



// Assuming FFmpeg.wasm is installed, import the core package:
const { createFFmpeg, fetchFile } = FFmpeg;

const ffmpeg = createFFmpeg({
  corePath: chrome.runtime.getURL("../lib/ffmpeg-core.js"),
  log: true,
  mainName: 'main'
});

// const fs = require('fs').promises; // Node.js file system module

document.getElementById("runFFmpeg").addEventListener("click", () => {
  console.log("Received message to execute script");
  wait_andget_URLs();
});


async function readFileAsBinary(filePath) {
  const fileBuffer = await fs.readFile(filePath); // Reads as a Buffer
  return new Uint8Array(fileBuffer); // Convert Buffer to Uint8Array
}


async function wait_andget_URLs() {
  await check_urls(url1, url2);

  async function check_urls(url1, url2){
    if ( url1 === "" || url2 === "") {
      console.log('checking ...');
      await new Promise(r => setTimeout(r, 1000)) //sleep(1000);
      cleanedURLs = get_URLs();
    } else {
      console.log("####### found both final URLs")
      console.log(url1);
      console.log(url2);
      downloadMergedVideo(url1, url2)
    }
  }
  
  async function get_URLs(){
    await chrome.storage.local.get("final_url1", (data) => {
      url1 = data.final_url1 || "";
    }); 
    await chrome.storage.local.get("final_url2", (data) => {
      url2 = data.final_url2 || "";
    }); 
    check_urls(url1, url2);
  }

}

async function downloadMergedVideo(final_url1, final_url2) {
  const mergedVideoUrl = await mergeVideos(final_url1, final_url2);

  const a = document.createElement('a');
  a.href = mergedVideoUrl;
  a.download = 'pnowdeo.mp4';
  a.click();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function mergeVideos(videoUrl1, videoUrl2) {
  await initializeFFmpeg();
  // console.log("########################   ffmpeg is loaded!");
  console.log("########################   started merging!");

  // Fetch the video files from URLs
  const videoData1 = await fetchVideoData(videoUrl1);
  const videoData2 = await fetchVideoData(videoUrl2);
  
     

  // Write files to the FFmpeg virtual filesystem
  ffmpeg.FS('writeFile', 'video1.mp4', videoData1);
  ffmpeg.FS('writeFile', 'video2.mp4', videoData2);

  // Run FFmpeg command to concatenate the videos
  await ffmpeg.run(
    '-i', 'video1.mp4',
    '-i', 'video2.mp4',
    '-c:v', 'copy',  
    '-c:a', 'copy',  
    'output.mp4'
  );
  

  // Read the result
  const data = ffmpeg.FS('readFile', 'output.mp4');

  // Create a Blob from the result to save or download
  const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
  const videoUrl = URL.createObjectURL(videoBlob);

  console.log("Video merged and ready to download:", videoUrl);
  return videoUrl;
}


async function initializeFFmpeg() {
  if (ffmpeg.isLoaded()) {
    await ffmpeg.exit();
  }
  await ffmpeg.load();
  console.log("################ ffmpeg is loaded");
}

async function fetchVideoData(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer(); // Convert response to ArrayBuffer
  return new Uint8Array(arrayBuffer); // Convert ArrayBuffer to Uint8Array
}



async function downloadVideo(url) {
  const isDownloaded = await hasDownloaded(url);
  if (isDownloaded) {
    console.log("This file has already been downloaded.");
    return null; // or any other indication that it's already downloaded
  } else {
    console.log("Downloading URL:", url);

    // Wrap the download in a Promise to wait for it to finish
    return new Promise((resolve, reject) => {
      chrome.downloads.download({ url: url }, (downloadId) => {
        if (downloadId) {
          console.log("Download started for:", downloadId);

          // Listen for the download completion
          chrome.downloads.onChanged.addListener(function listener(downloadDelta) {
            if (downloadDelta.id === downloadId && downloadDelta.state && downloadDelta.state.current === "complete") {
              // Once download is complete, get the filename
              chrome.downloads.search({ id: downloadId }, (results) => {
                if (results && results.length > 0) {
                  const filename = results[0].filename;
                  console.log("Downloaded file with name:", filename);

                  // Remove the listener after download completes
                  chrome.downloads.onChanged.removeListener(listener);

                  // Mark the URL as downloaded
                  markAsDownloaded(url);

                  // Resolve the Promise with the filename
                  resolve(filename);
                } else {
                  reject(new Error("Failed to retrieve filename after download."));
                }
              });
            }
          });
        } else {
          console.log("Download failed for URL:", url);
          reject(new Error("Download failed."));
        }
      });
    });
  }
}



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

