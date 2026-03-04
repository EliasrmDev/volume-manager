// Background script para manejar comandos de teclado

// Función para aplicar volumen en una pestaña
function setVolumeInTab(tabId, volume) {
  function updateVolume(volume) {
    let audios = document.querySelectorAll("video, audio") || [];
    for (const audio of audios) {
      audio.volume = volume;
    }
  }

  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: updateVolume,
    args: [volume]
  }).catch(() => {
    // Si hay error, probablemente la pestaña no permite scripting
    console.log("No se pudo aplicar volumen en esta pestaña");
  });
}

// Función para obtener volumen actual de una pestaña
async function getCurrentVolume(tabId) {
  try {
    const result = await chrome.storage.local.get(`volume${tabId}`);
    return parseFloat(result[`volume${tabId}`]) || 1.0;
  } catch (error) {
    return 1.0;
  }
}

// Función para obtener estado de mute de una pestaña
async function getMuteState(tabId) {
  try {
    const result = await chrome.storage.local.get(`isMuted${tabId}`);
    return result[`isMuted${tabId}`] === 'true';
  } catch (error) {
    return false;
  }
}

// Función para guardar el estado en storage
async function saveVolumeState(tabId, volume, isMuted = null, volumeBeforeMute = null) {
  const data = { [`volume${tabId}`]: volume.toString() };

  if (isMuted !== null) {
    data[`isMuted${tabId}`] = isMuted.toString();
  }

  if (volumeBeforeMute !== null) {
    data[`volumeBeforeMute${tabId}`] = volumeBeforeMute.toString();
  }

  await chrome.storage.local.set(data);
}

// Manejar comandos
chrome.commands.onCommand.addListener(async (command) => {
  try {
    // Obtener pestaña activa
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    const tabId = tab.id;

    switch (command) {
      case 'mute-toggle':
        await handleMuteToggle(tabId);
        break;

      case 'volume-up':
        await handleVolumeUp(tabId);
        break;

      case 'volume-down':
        await handleVolumeDown(tabId);
        break;
    }
  } catch (error) {
    console.error('Error ejecutando comando:', error);
  }
});

// Manejar mute/unmute
async function handleMuteToggle(tabId) {
  const isMuted = await getMuteState(tabId);

  if (isMuted) {
    // Unmute: restaurar volumen anterior
    const result = await chrome.storage.local.get(`volumeBeforeMute${tabId}`);
    const volumeBeforeMute = parseFloat(result[`volumeBeforeMute${tabId}`]) || 1.0;

    setVolumeInTab(tabId, volumeBeforeMute);
    await saveVolumeState(tabId, volumeBeforeMute, false);

    // Mostrar notificación
    showVolumeNotification(`🔊 Unmuted - ${Math.round(volumeBeforeMute * 100)}%`);
  } else {
    // Mute: guardar volumen actual y establecer a 0
    const currentVolume = await getCurrentVolume(tabId);

    setVolumeInTab(tabId, 0);
    await saveVolumeState(tabId, 0, true, currentVolume);

    // Mostrar notificación
    showVolumeNotification('🔇 Muted');
  }
}

// Manejar subir volumen
async function handleVolumeUp(tabId) {
  const isMuted = await getMuteState(tabId);

  if (isMuted) {
    // Si está muted, unmutear primero
    await handleMuteToggle(tabId);
    return;
  }

  const currentVolume = await getCurrentVolume(tabId);
  const newVolume = Math.min(1.0, currentVolume + 0.1);

  setVolumeInTab(tabId, newVolume);
  await saveVolumeState(tabId, newVolume);

  showVolumeNotification(`🔊 Volume: ${Math.round(newVolume * 100)}%`);
}

// Manejar bajar volumen
async function handleVolumeDown(tabId) {
  const isMuted = await getMuteState(tabId);

  if (isMuted) {
    // Si está muted, unmutear primero
    await handleMuteToggle(tabId);
    return;
  }

  const currentVolume = await getCurrentVolume(tabId);
  const newVolume = Math.max(0.0, currentVolume - 0.1);

  if (newVolume === 0) {
    // Si llega a 0, activar mute
    await saveVolumeState(tabId, 0, true, currentVolume);
    showVolumeNotification('🔇 Muted');
  } else {
    setVolumeInTab(tabId, newVolume);
    await saveVolumeState(tabId, newVolume);
    showVolumeNotification(`🔉 Volume: ${Math.round(newVolume * 100)}%`);
  }

  setVolumeInTab(tabId, newVolume);
}

// Mostrar notificación visual
function showVolumeNotification(message) {
  // Inyectar notificación en la pestaña activa
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: createVolumeNotification,
        args: [message]
      }).catch(() => {
        // Si no se puede inyectar, usar notificación del navegador
        if (chrome.notifications && chrome.notifications.create) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon.png',
            title: 'Volume Manager',
            message: message
          });
        }
      });
    }
  });
}

// Función que se inyecta para mostrar notificación en la página
function createVolumeNotification(message) {
  // Remover notificación anterior si existe
  const existingNotification = document.querySelector('#volume-extension-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  // Crear notificación
  const notification = document.createElement('div');
  notification.id = 'volume-extension-notification';
  notification.textContent = message;

  // Estilos
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 12px 20px;
    border-radius: 25px;
    font-family: system-ui, sans-serif;
    font-size: 14px;
    font-weight: 600;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
    pointer-events: none;
    opacity: 0;
    transform: translateY(-10px);
  `;

  document.body.appendChild(notification);

  // Animar entrada
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 10);

  // Remover después de 2 segundos
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 2000);
}

// Sincronizar storage entre local storage y chrome storage
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'syncStorage') {
    // Sincronizar datos del popup con chrome storage
    chrome.storage.local.set(request.data);
  }
});