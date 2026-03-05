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
  styleSheet.insertRule(`#${rangeId}::-webkit-slider-container { background: linear-gradient(rgb(239, 239, 239), rgb(201, 201, 201)) ${percent * 2.5}px center no-repeat, linear-gradient(rgb(21, 151, 255), rgb(21, 151, 255)) }`, 0);
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

// Manager del indicador de audio
async function audioIndicatorManager() {
  const audioIndicator = document.querySelector('#audio-indicator');
  const audioTabsList = document.querySelector('#audio-tabs-list');

  // Función para detectar pestañas con audio
  const detectAudioTabs = async () => {
    try {
      const tabs = await chrome.tabs.query({});
      const audioTabs = tabs.filter(tab => tab.audible);
      const currentTab = await chrome.tabs.query({active: true, currentWindow: true});
      const currentTabId = currentTab[0]?.id;

      return {
        audioTabs,
        currentTabId
      };
    } catch (error) {
      console.error('Error detecting audio tabs:', error);
      return { audioTabs: [], currentTabId: null };
    }
  };
  // Function to update the audio indicator UI
  const updateAudioIndicator = async () => {

    const { audioTabs, currentTabId } = await detectAudioTabs();

    if (audioTabs.length === 0) {
      audioTabsList.innerHTML = '<div class="no-audio-message">No tabs are playing audio</div>';
      audioIndicator.style.opacity = '0.7';
    } else {
      audioIndicator.style.opacity = '1';
      audioTabsList.innerHTML = audioTabs.map(tab => {
        const isCurrentTab = tab.id === currentTabId;
        const domain = new URL(tab.url).hostname;
        const title = tab.title.length > 30 ? tab.title.substring(0, 30) + '...' : tab.title;

        return `
          <div class="audio-tab-item ${isCurrentTab ? 'current-tab' : ''}" data-tab-id="${tab.id}">
            <div class="tab-info">
              <div class="tab-title">${title}</div>
              <div class="tab-url">${domain}</div>
            </div>
            <div class="tab-audio-indicator">
              <span class="audio-icon">🎵</span>
              ${!isCurrentTab ? '<button class="tab-switch-btn" data-tab-id="' + tab.id + '">Go</button>' : '<span style="font-size: 0.7rem; color: #1597ff;">Current</span>'}
            </div>
          </div>
        `;
      }).join('');

      // Agregar event listeners para cambiar de pestaña
      const switchButtons = audioTabsList.querySelectorAll('.tab-switch-btn');
      switchButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
          e.stopPropagation();
          const tabId = parseInt(e.target.dataset.tabId);
          try {
            await chrome.tabs.update(tabId, { active: true });
            await chrome.windows.update((await chrome.tabs.get(tabId)).windowId, { focused: true });
            window.close(); // Cerrar popup después de cambiar
          } catch (error) {
            console.error('Error cambiando de pestaña:', error);
          }
        });
      });

      // Agregar event listeners para texto de pestaña (cambiar al hacer clic)
      const tabItems = audioTabsList.querySelectorAll('.audio-tab-item');
      tabItems.forEach(item => {
        item.addEventListener('click', async (e) => {
          if (e.target.classList.contains('tab-switch-btn')) return;

          const tabId = parseInt(item.dataset.tabId);
          try {
            await chrome.tabs.update(tabId, { active: true });
            await chrome.windows.update((await chrome.tabs.get(tabId)).windowId, { focused: true });
            window.close();
          } catch (error) {
            console.error('Error cambiando de pestaña:', error);
          }
        });
      });
    }
  };

  // Actualizar inmediatamente
  await updateAudioIndicator();

  // Configurar actualización periódica
  const updateInterval = setInterval(updateAudioIndicator, 2000);

  // Limpiar intervalo cuando se cierre el popup
  window.addEventListener('beforeunload', () => {
    clearInterval(updateInterval);
  });

  // Listener para cambios en pestañas
  if (chrome.tabs.onUpdated) {
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
      if (changeInfo.audible !== undefined) {
        await updateAudioIndicator();
      }
    });
  }
}

chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
  let tabId = tabs[0].id;
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError);
  } else {
    let volumeRange = document.querySelector("#volume-range");
    volumeRange.setAttribute('tab-id', tabId);

    // Inicializar managers
    await audioIndicatorManager(); // Inicializar indicador de audio
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
