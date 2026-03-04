// Función global para aplicar estilo dinámico al slider
function aplicarEstiloDinamico(rangeId, percent) {
  const audioSourceList = document.querySelectorAll('.audio-source');
  if (document.head.querySelectorAll('style').length > audioSourceList.length) {
    const existingStyle = document.head.querySelector(`style.${rangeId}`);
    if (existingStyle) {
      existingStyle.remove();
    }
  }
  const styleEl = document.createElement("style");
  styleEl.classList.add(rangeId);
  document.head.appendChild(styleEl);
  const styleSheet = styleEl.sheet;
  styleSheet.insertRule(`#${rangeId}::-webkit-slider-container { background: linear-gradient(rgb(239, 239, 239), rgb(201, 201, 201)) ${percent * 2}px center no-repeat, linear-gradient(rgb(21, 151, 255), rgb(21, 151, 255)) }`, 0);
}

async function volumeRangeManager() {
  let audioSourceList = document.querySelectorAll('.audio-source');

  for (const audioSource of audioSourceList) {
    let range = audioSource.querySelector('input[type="range"]');
    let textRange = audioSource.querySelector('h4');
    let rangeId = range.id;
    let tabId = range.getAttribute('tab-id');
    let rangeValue = 100;
    let rangePercent = rangeValue * 100;

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
      aplicarEstiloDinamico(rangeId, rangePercent);
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

checkMuteState = async (tabId) => {
  try {
    const result = await chrome.storage.local.get(['isMuted' + tabId, 'volumeBeforeMute' + tabId]);
    return [result['isMuted' + tabId] === 'true', result['volumeBeforeMute' + tabId] || '1'];
  } catch (error) {
    return [false, '1'];
  }
};

async function muteManager(tabId) {
  const muteBtn = document.querySelector('#mute-btn');
  const volumeRange = document.querySelector('#volume-range');
  const volumeText = document.querySelector('h4');
  const muteIcon = document.querySelector('.mute-icon');
  const muteText = document.querySelector('.mute-text');

  let [isMuted, volumeBeforeMute] = await checkMuteState(tabId);

  // Establecer estado inicial
  updateMuteUI();

  muteBtn.addEventListener('click', async function() {
    [isMuted, volumeBeforeMute] = await checkMuteState(tabId);
    if (isMuted) {
      // Unmute
      isMuted = false;
      volumeRange.value = volumeBeforeMute;
      volumeRange.disabled = false;
      setVolume(tabId, volumeBeforeMute);
      await chrome.storage.local.set({['volume' + tabId]: volumeBeforeMute});

      // Usar updateRangeUI para actualizar completamente la UI
      const rangePercent = volumeBeforeMute * 100;
      volumeText.innerHTML = Math.round(rangePercent) + '%';
      volumeRange.style.filter = `hue-rotate(-${rangePercent}deg)`;
      volumeText.style.filter = `hue-rotate(-${rangePercent}deg)`;

      // Aplicar estilo dinámico del fondo
      const rangeId = volumeRange.id;
      aplicarEstiloDinamico(rangeId, rangePercent);
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

      // Aplicar estilo dinámico para estado muted
      const rangeId = volumeRange.id;
      aplicarEstiloDinamico(rangeId, 0);
    }

    await chrome.storage.local.set({['isMuted' + tabId]: isMuted.toString()});
    await updateMuteUI();
  });

  async function updateMuteUI() {
    [isMuted, volumeBeforeMute] = await checkMuteState(tabId);
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

    // Listener para cambios en storage (comandos de teclado)
    chrome.storage.onChanged.addListener(async (changes, areaName) => {
      if (areaName === 'local') {
        const volumeKey = 'volume' + tabId;
        const muteKey = 'isMuted' + tabId;
        const volumeBeforeKey = 'volumeBeforeMute' + tabId;

        let shouldUpdateUI = false;
        let newVolume = null;
        let newMuteState = null;

        if (changes[volumeKey]) {
          newVolume = parseFloat(changes[volumeKey].newValue);
          shouldUpdateUI = true;
        }

        if (changes[muteKey]) {
          newMuteState = changes[muteKey].newValue === 'true';
          shouldUpdateUI = true;
        }

        if (shouldUpdateUI) {
          // Actualizar UI basado en los cambios
          const volumeText = document.querySelector('h4');
          const muteBtn = document.querySelector('#mute-btn');
          const muteIcon = document.querySelector('.mute-icon');
          const muteText = document.querySelector('.mute-text');

          if (newMuteState !== null) {
            // Cambio en estado de mute
            if (newMuteState) {
              // Muted
              volumeRange.value = 0;
              volumeRange.disabled = true;
              volumeText.innerHTML = '0%';
              volumeRange.style.filter = 'hue-rotate(0deg)';
              volumeText.style.filter = 'hue-rotate(0deg)';
              aplicarEstiloDinamico(volumeRange.id, 0);

              muteBtn.classList.add('muted');
              muteIcon.textContent = '🔇';
              muteText.textContent = 'Unmute';
            } else {
              // Unmuted
              volumeRange.disabled = false;
              muteBtn.classList.remove('muted');
              muteIcon.textContent = '🔊';
              muteText.textContent = 'Mute';
            }
          }

          if (newVolume !== null && newVolume > 0) {
            // Cambio en volumen
            volumeRange.value = newVolume;
            const rangePercent = newVolume * 100;
            volumeText.innerHTML = Math.round(rangePercent) + '%';
            volumeRange.style.filter = `hue-rotate(-${rangePercent}deg)`;
            volumeText.style.filter = `hue-rotate(-${rangePercent}deg)`;
            aplicarEstiloDinamico(volumeRange.id, rangePercent);
          }
        }
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
