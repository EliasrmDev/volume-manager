function volumeRangeManager() {
  let audioSourceList = document.querySelectorAll('.audio-source');
  audioSourceList.forEach((audioSource) => {
    let range = audioSource.querySelector('input[type="range"]');
    let textRange = audioSource.querySelector('h4');
    let rangeId = range.id;
    let tabId = range.getAttribute('tab-id');
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
    styleSheet.insertRule(`#${id}::-webkit-slider-container { background: linear-gradient(rgb(239, 239, 239), rgb(201, 201, 201)) ${rangePercent*2}px center no-repeat, linear-gradient(rgb(21, 151, 255), rgb(21, 151, 255)) }`, 0);
  }
  rangeValue = localStorageVolume(rangeId);
  range.addEventListener('input', setColor);

  function localStorageVolume(id) {
    let volumeStored = localStorage.getItem('volume' + tabId) ?? false;
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
    localStorage.setItem('volume' + tabId, rangeValue);
    rangePercent = rangeValue*100;
    textRange.innerHTML = rangePercent + '%';
    range.style.filter = `hue-rotate(-${rangePercent}deg)`;
    textRange.style.filter = `hue-rotate(-${rangePercent}deg)`;
    range.style.setProperty('--bg-width', 'red');
    dinamicBgRangeStyle(id);
  }
})
}

function setVolume(tabId, volume) {

  function updateVolume(volume) {
    let audios = document.querySelectorAll("video, audio") || [];
    for (const audio of audios) {
      audio.volume = volume;
    }
  }

  chrome.scripting
  .executeScript({
      target : {tabId : tabId},
      func : updateVolume,
      args : [ volume ]
  })
  .then(() => console.log("injected a function"));
}

function muteManager(tabId) {
  const muteBtn = document.querySelector('#mute-btn');
  const volumeRange = document.querySelector('#volume-range');
  const volumeText = document.querySelector('h4');
  const muteIcon = document.querySelector('.mute-icon');
  const muteText = document.querySelector('.mute-text');

  let isMuted = localStorage.getItem('isMuted' + tabId) === 'true';
  let volumeBeforeMute = localStorage.getItem('volumeBeforeMute' + tabId) || '1';

  // Establecer estado inicial
  updateMuteUI();

  muteBtn.addEventListener('click', function() {
    if (isMuted) {
      // Unmute
      isMuted = false;
      volumeRange.value = volumeBeforeMute;
      volumeRange.disabled = false;
      setVolume(tabId, volumeBeforeMute);
      localStorage.setItem('volume' + tabId, volumeBeforeMute);

      // Trigger range input event to update UI
      volumeRange.dispatchEvent(new Event('input'));
    } else {
      // Mute
      volumeBeforeMute = volumeRange.value;
      localStorage.setItem('volumeBeforeMute' + tabId, volumeBeforeMute);
      isMuted = true;
      volumeRange.value = 0;
      volumeRange.disabled = true;
      setVolume(tabId, 0);
      localStorage.setItem('volume' + tabId, '0');

      // Update UI manually since range is disabled
      volumeText.innerHTML = '0%';
      volumeRange.style.filter = 'hue-rotate(0deg)';
      volumeText.style.filter = 'hue-rotate(0deg)';
    }

    localStorage.setItem('isMuted' + tabId, isMuted.toString());
    updateMuteUI();
  });

  function updateMuteUI() {
    if (isMuted) {
      muteBtn.classList.add('muted');
      muteIcon.textContent = '🔇';
      muteText.textContent = 'Unmute';
      volumeRange.disabled = true;
    } else {
      muteBtn.classList.remove('muted');
      muteIcon.textContent = '🔊';
      muteText.textContent = 'Mute';
      volumeRange.disabled = false;
    }
  }
}

chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  let tabId = tabs[0].id;
  if (chrome.runtime.lastError) {
    expect(console.error, chrome.runtime.lastError)
  } else {
    let volumeRange = document.querySelector("#volume-range");
    volumeRange.setAttribute('tab-id', tabId)
    volumeRange.addEventListener("input", function() {
      // Solo actuar si no está muted
      const isMuted = localStorage.getItem('isMuted' + tabId) === 'true';
      if (!isMuted) {
        setVolume(tabId, volumeRange.value);
      }
    });
    volumeRangeManager();
    muteManager(tabId);

    // Verificar si está muted al inicializar
    const isMuted = localStorage.getItem('isMuted' + tabId) === 'true';
    if (!isMuted) {
      setVolume(tabId, volumeRange.value);
    } else {
      setVolume(tabId, 0);
    }
  }
});
