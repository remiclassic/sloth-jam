// Coloring pages: a click loads the full-size page into the hidden print sheet, waits for it to
// decode so the printout is never blank, then opens the print dialog. The print CSS shows only
// the sheet.
// The pictures are found next to this script, so the translated copies (es/, zh/, fr/) find them too.
(function () {
  var base = document.currentScript ? document.currentScript.src.replace(/[^/]*$/, '') : '';
  var sheet = document.querySelector('.print-sheet img');
  document.querySelectorAll('[data-print]').forEach(function (button) {
    button.addEventListener('click', function () {
      var src = base + 'media/coloring/' + button.getAttribute('data-print') + '.webp';
      button.disabled = true;
      sheet.src = src;
      var ready = sheet.decode ? sheet.decode() : Promise.resolve();
      ready.catch(function () {}).then(function () {
        button.disabled = false;
        window.print();
      });
    });
  });
})();
