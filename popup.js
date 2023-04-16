function volumeRangeManager() {
    let audioSourceList = document.querySelectorAll('.audio-source');
    audioSourceList.forEach((audioSource) => {
      let range = audioSource.querySelector('input[type="range"]');
      let textRange = audioSource.querySelector('h4');
      let rangeId = range.id;
      let rangeValue = 100;
      let rangePercent = rangeValue*100;
      let dinamicBgRangeStyle = (id) => {
      if (document.head.querySelectorAll('style').length > audioSourceList.length ) {
        document.head.querySelector(`style.${id}`).remove()
      }
      const styleEl = document.createElement("style");
      styleEl.classList.add(id)
      document.head.appendChild(styleEl);
      const styleSheet = styleEl.sheet;
      styleSheet.insertRule(`#${id}::-webkit-slider-container { background: linear-gradient(rgb(239, 239, 239), rgb(201, 201, 201)) ${rangePercent*3}px center no-repeat, linear-gradient(rgb(21, 151, 255), rgb(21, 151, 255)) }`, 0);
    }
    rangeValue = localStorageVolume(rangeId);
    range.addEventListener('input', setColor);

    function localStorageVolume(id) {
      let volumeStored = localStorage.getItem('volume' + id) ?? false;
      if (volumeStored) {
        range.value = volumeStored;
        setColor(id);
        return volumeStored;
      } else {
        return range.value;
      }
    }

    function setColor(el) {
      let id = el?.target?.id ?? el;
      rangeValue = range.value;
      localStorage.setItem('volume' + id, rangeValue);
      rangePercent = rangeValue*100;
      textRange.innerHTML = rangePercent + '%';
      range.style.filter = `hue-rotate(-${rangePercent}deg)`;
      textRange.style.filter = `hue-rotate(-${rangePercent}deg)`;
      range.style.setProperty('--bg-width', 'red');
      dinamicBgRangeStyle(id);
    }
  })
}

/* function setVolume(tab, setAudio) {

    function updateVolume(setAudio) {
        let videos = document.querySelectorAll("video");
        setAudio(videos)
        let audios = document.querySelectorAll("audio");
        setAudio(audios);


        console.log('Porfa!!!');
    }


    chrome.scripting
    .executeScript({
        target : {tabId : tab.id},
        func : updateVolume,
        args : [ setAudio ]
    })
    .then(() => console.log("injected a function"));
} */

chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  let tab = tabs[0];

  function setAudio(elements) {
    elements.forEach((el)=> {
        let template =`<h2>${tab.title}</h2>
                <label for="volume-range-${tab.id}">Volume:</label>
                <input class="range-style" type="range" id="volume-range-${tab.id}" min="0" max="1" step="0.1" value="1">
                <h4>100%</h4>`
        let newAudioSource = document.createElement('div');
        newAudioSource.classList.add('audio-source');
        newAudioSource.innerHTML = template;
        document.body.appendChild(newAudioSource);
        let volumeRange = newAudioSource.querySelector("volume-range");
        volumeRange.addEventListener("input", function() {
            el.volume = volumeRange.value;
        });
        el.volume = volumeRange.value;
    })
}
  /* setVolume(tab, setAudio); */
  let videos = document.querySelectorAll("video");
  setAudio(videos)
  let audios = document.querySelectorAll("audio");
  setAudio(audios);
  volumeRangeManager()
});
