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

volumeRangeManager();