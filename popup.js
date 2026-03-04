async function volumeRangeManager() {
  let audioSourceList = document.querySelectorAll('.audio-source');

  for (const audioSource of audioSourceList) {
    let range = audioSource.querySelector('input[type="range"]');
    let textRange = audioSource.querySelector('h4');
    let rangeId = range.id;
    let tabId = range.getAttribute('tab-id');
    let rangeValue = 100;
    let rangePercent = rangeValue * 100;

    // Función para aplicar estilo dinámico
    const dinamicBgRangeStyle = (id, percent) => {
      if (document.head.querySelectorAll('style').length > audioSourceList.length) {
        const existingStyle = document.head.querySelector(`style.${id}`);
        if (existingStyle) {
          existingStyle.remove();
        }
      }
      const styleEl = document.createElement("style");
      styleEl.classList.add(id);
      document.head.appendChild(styleEl);
      const styleSheet = styleEl.sheet;
      styleSheet.insertRule(`#${id}::-webkit-slider-container { background: linear-gradient(rgb(239, 239, 239), rgb(201, 201, 201)) ${percent * 2}px center no-repeat, linear-gradient(rgb(21, 151, 255), rgb(21, 151, 255)) }`, 0);
    };

    // Función para cargar volumen desde storage
    const localStorageVolume = async () => {
      try {
        const result = await chrome.storage.local.get('volume' + tabId);
        const volumeStored = result['volume' + tabId];
        if (volumeStored) {
          range.value = volumeStored;
          await updateRangeUI(volumeStored);
          return volumeStored;
        } else {
          return range.value;
        }
      } catch {
        return range.value;
      }
    };

    // Función para actualizar UI del range
    const updateRangeUI = async (value) => {
      const currentValue = value || range.value;
      rangeValue = currentValue;
      await chrome.storage.local.set({['volume' + tabId]: rangeValue});
      rangePercent = rangeValue * 100;
      textRange.innerHTML = Math.round(rangePercent) + '%';
      range.style.filter = `hue-rotate(-${rangePercent}deg)`;
      textRange.style.filter = `hue-rotate(-${rangePercent}deg)`;
      dinamicBgRangeStyle(rangeId, rangePercent);
    };

    // Cargar volumen inicial
    rangeValue = await localStorageVolume();

    // Configurar event listener para este range específico
    range.addEventListener('input', async (event) => {
      await updateRangeUI(event.target.value);
    });
  }
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

async function muteManager(tabId) {
  const muteBtn = document.querySelector('#mute-btn');
  const volumeRange = document.querySelector('#volume-range');
  const volumeText = document.querySelector('h4');
  const muteIcon = document.querySelector('.mute-icon');
  const muteText = document.querySelector('.mute-text');

  let muteResult = await chrome.storage.local.get(['isMuted' + tabId, 'volumeBeforeMute' + tabId]);
  let isMuted = muteResult['isMuted' + tabId] === 'true';
  let volumeBeforeMute = muteResult['volumeBeforeMute' + tabId] || '1';

  // Establecer estado inicial
  updateMuteUI();

  muteBtn.addEventListener('click', async function() {
    if (isMuted) {
      // Unmute
      isMuted = false;
      volumeRange.value = volumeBeforeMute;
      volumeRange.disabled = false;
      setVolume(tabId, volumeBeforeMute);
      await chrome.storage.local.set({['volume' + tabId]: volumeBeforeMute});

      // Actualizar UI manualmente
      const rangePercent = volumeBeforeMute * 100;
      volumeText.innerHTML = Math.round(rangePercent) + '%';
      volumeRange.style.filter = `hue-rotate(-${rangePercent}deg)`;
      volumeText.style.filter = `hue-rotate(-${rangePercent}deg)`;
    } else {
      // Mute
      volumeBeforeMute = volumeRange.value;
      await chrome.storage.local.set({['volumeBeforeMute' + tabId]: volumeBeforeMute});
      isMuted = true;
      volumeRange.value = 0;
      volumeRange.disabled = true;
      setVolume(tabId, 0);
      await chrome.storage.local.set({['volume' + tabId]: '0'});

      // Update UI manually since range is disabled
      volumeText.innerHTML = '0%';
      volumeRange.style.filter = 'hue-rotate(0deg)';
      volumeText.style.filter = 'hue-rotate(0deg)';
    }

    await chrome.storage.local.set({['isMuted' + tabId]: isMuted.toString()});
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

chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
  let tabId = tabs[0].id;
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError);
  } else {
    let volumeRange = document.querySelector("#volume-range");
    volumeRange.setAttribute('tab-id', tabId);

    // Inicializar managers primero
    await volumeRangeManager();
    await muteManager(tabId);

    // Event listener principal para sincronizar con setVolume
    volumeRange.addEventListener("input", async function() {
      // Solo actuar si no está muted
      const result = await chrome.storage.local.get('isMuted' + tabId);
      const isMuted = result['isMuted' + tabId] === 'true';
      if (!isMuted) {
        setVolume(tabId, volumeRange.value);
      }
    });

    // Verificar si está muted al inicializar
    const result = await chrome.storage.local.get('isMuted' + tabId);
    const isMuted = result['isMuted' + tabId] === 'true';
    if (!isMuted) {
      setVolume(tabId, volumeRange.value);
    } else {
      setVolume(tabId, 0);
    }
  }
});
