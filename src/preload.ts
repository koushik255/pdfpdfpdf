// No imports here. We'll use the globally available 'require' or 'contextBridge' if sandboxing is off.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getPdfPath: () => 'file:///home/koushikk/Downloads/Calc1jamesstewart9E.pdf',
  getAppPath: () => 'file:///home/koushikk/Documents/anew/elpdf/'
});

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector: string, text: string) => {
    const element = document.getElementById(selector);
    if (element) {
        element.innerText = text;
    }
  };

  const process_any = process as any;
  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process_any.versions[type]);
  }
});
