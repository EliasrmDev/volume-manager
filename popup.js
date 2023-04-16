function setVolume(tab, volume) {

  function updateVolume(volume) {
    function setAudio(elements) {
      for (const element of elements) {
        element.volume = volume;
      }
    }

    let videos = document.querySelectorAll("video") || [];
    setAudio(videos)
    let audios = document.querySelectorAll("audio") || [];
    setAudio(audios);
  }

  chrome.scripting
  .executeScript({
      target : {tabId : tab.id},
      func : updateVolume,
      args : [ volume ]
  })
  .then(() => console.log("injected a function"));
}

chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  let tab = tabs[0];
  let volumeRange = document.querySelector("#volume-range");
  volumeRange.addEventListener("input", function() {
      setVolume(tab, volumeRange.value);
    });
    setVolume(tab, volumeRange.value);
});
