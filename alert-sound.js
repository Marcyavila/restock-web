(function () {
  function makeBeepWavDataUrl(freq, sec, sampleRate) {
    sampleRate = sampleRate || 44100;
    var numSamples = Math.floor(sec * sampleRate);
    var buf = new ArrayBuffer(44 + numSamples * 2);
    var view = new DataView(buf);
    function writeStr(offset, str) {
      for (var i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    }
    writeStr(0, "RIFF");
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, "data");
    view.setUint32(40, numSamples * 2, true);
    var omega = (2 * Math.PI * freq) / sampleRate;
    for (var i = 0; i < numSamples; i++) {
      var s = 0.25 * Math.sin(omega * i) * Math.exp(-i / (sampleRate * 0.1));
      view.setInt16(44 + i * 2, s * 32767, true);
    }
    var bytes = new Uint8Array(buf);
    var binary = "";
    for (var j = 0; j < bytes.length; j++) binary += String.fromCharCode(bytes[j]);
    return "data:audio/wav;base64," + btoa(binary);
  }
  function closeTab() {
    try { window.close(); } catch (_) {}
  }
  function playTwoTones() {
    var a = new Audio(makeBeepWavDataUrl(523.25, 0.2));
    a.volume = 0.5;
    a.play().then(function () {
      setTimeout(function () {
        var a2 = new Audio(makeBeepWavDataUrl(659.25, 0.25));
        a2.volume = 0.5;
        a2.play().then(function () { setTimeout(closeTab, 300); }).catch(closeTab);
      }, 220);
    }).catch(closeTab);
    setTimeout(closeTab, 2000);
  }
  if (document.readyState === "complete") playTwoTones();
  else window.addEventListener("load", playTwoTones);
})();
