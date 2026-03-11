// Global types for objects exposed via HTML/Preload
declare const pdfjsLib: any;

function init() {
  const lib = (window as any).pdfjsLib;
  if (!lib) {
    console.error('pdfjsLib not found on window. Retrying...');
    setTimeout(init, 100);
    return;
  }

  console.log('pdfjsLib keys:', Object.keys(lib));

  const electronAPI = (window as any).electronAPI;
  if (!electronAPI) {
    console.error('electronAPI not found on window. Retrying...');
    setTimeout(init, 100);
    return;
  }

  const pdfPath = electronAPI.getPdfPath();
  
  // Worker must be set before any getDocument calls (legacy version with polyfills)
  lib.GlobalWorkerOptions.workerSrc = './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs';

  const standardFontDataUrl = './node_modules/pdfjs-dist/standard_fonts/';
  const cMapUrl = './node_modules/pdfjs-dist/cmaps/';

  let pdfDoc: any = null;
  let pageNum = 1;
  let pageRendering = false;
  let pageNumPending: number | null = null;
  let scale = 1.5;

  const canvas = document.getElementById('pdf-render') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  const textLayerDiv = document.getElementById('text-layer') as HTMLDivElement;
  const loadingMsg = document.getElementById('loading-msg') as HTMLDivElement;
  const sidebar = document.getElementById('sidebar') as HTMLDivElement;
  const resizer = document.getElementById('resizer') as HTMLDivElement;
  const pageNumInput = document.getElementById('page-num') as HTMLInputElement;
  const pageCountSpan = document.getElementById('page-count') as HTMLSpanElement;
  const zoomRange = document.getElementById('zoom-range') as HTMLInputElement;
  const zoomVal = document.getElementById('zoom-val') as HTMLSpanElement;

  const sidebarRight = document.getElementById('sidebar-right') as HTMLDivElement;
  const resizerRight = document.getElementById('resizer-right') as HTMLDivElement;
  const collapseBtnRight = document.getElementById('collapse-btn-right') as HTMLButtonElement;
  const collapseBtn = document.getElementById('collapse-btn') as HTMLButtonElement;

  // Sidebar Resizing and Collapse Logic (Left)
  let isResizing = false;
  let lastWidth = 200;

  collapseBtn.addEventListener('click', () => {
    if (sidebar.classList.contains('collapsed')) {
      sidebar.classList.remove('collapsed');
      sidebar.style.width = `${lastWidth}px`;
      collapseBtn.innerHTML = '&laquo;';
      resizer.style.display = 'block';
    } else {
      lastWidth = sidebar.offsetWidth;
      sidebar.classList.add('collapsed');
      collapseBtn.innerHTML = '&raquo;';
      resizer.style.display = 'none';
    }
  });

  resizer.addEventListener('mousedown', () => {
    if (sidebar.classList.contains('collapsed')) return;
    isResizing = true;
    document.body.style.cursor = 'col-resize';
  });

  // Sidebar Resizing and Collapse Logic (Right)
  let isResizingRight = false;
  let lastWidthRight = 250;

  collapseBtnRight.addEventListener('click', () => {
    if (sidebarRight.classList.contains('collapsed')) {
      sidebarRight.classList.remove('collapsed');
      sidebarRight.style.width = `${lastWidthRight}px`;
      collapseBtnRight.innerHTML = '&raquo;';
      resizerRight.style.display = 'block';
    } else {
      lastWidthRight = sidebarRight.offsetWidth;
      sidebarRight.classList.add('collapsed');
      collapseBtnRight.innerHTML = '&laquo;';
      resizerRight.style.display = 'none';
    }
  });

  resizerRight.addEventListener('mousedown', () => {
    if (sidebarRight.classList.contains('collapsed')) return;
    isResizingRight = true;
    document.body.style.cursor = 'col-resize';
  });

  document.addEventListener('mousemove', (e) => {
    if (isResizing && !sidebar.classList.contains('collapsed')) {
      let newWidth = e.clientX;
      if (newWidth >= 150 && newWidth <= window.innerWidth / 2) {
        sidebar.style.width = `${newWidth}px`;
      }
    }

    if (isResizingRight && !sidebarRight.classList.contains('collapsed')) {
      let newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 150 && newWidth <= window.innerWidth / 2) {
        sidebarRight.style.width = `${newWidth}px`;
      }
    }
  });

  document.addEventListener('mouseup', () => {
    isResizing = false;
    isResizingRight = false;
    document.body.style.cursor = 'default';
  });

  async function renderPage(num: number) {
    pageRendering = true;
    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: scale });

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render Canvas
    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };
    const renderTask = page.render(renderContext);

    await renderTask.promise;

    // Clear and Render Text Layer
    textLayerDiv.innerHTML = '';
    textLayerDiv.style.width = `${viewport.width}px`;
    textLayerDiv.style.height = `${viewport.height}px`;

    try {
        const textContent = await page.getTextContent();
        if (lib.TextLayer) {
            const textLayer = new lib.TextLayer({
                textContentSource: textContent,
                container: textLayerDiv,
                viewport: viewport
            });
            await textLayer.render();
        } else if (lib.renderTextLayer) {
            await lib.renderTextLayer({
                textContentSource: textContent,
                container: textLayerDiv,
                viewport: viewport,
                textDivs: []
            }).promise;
        } else {
            console.error('No TextLayer or renderTextLayer found');
        }
    } catch (err) {
        console.error('Error rendering text layer:', err);
    }

    pageRendering = false;
    loadingMsg.style.display = 'none';
    if (pageNumPending !== null) {
      renderPage(pageNumPending);
      pageNumPending = null;
    }
    
    pageNumInput.value = num.toString();
  }

  function queueRenderPage(num: number) {
    if (pageRendering) {
      pageNumPending = num;
    } else {
      renderPage(num);
    }
  }

  // Load PDF with local assets
  lib.getDocument({
    url: pdfPath,
    standardFontDataUrl: standardFontDataUrl,
    cMapUrl: cMapUrl,
    cMapPacked: true,
  }).promise.then((pdfDoc_: any) => {
    pdfDoc = pdfDoc_;
    pageCountSpan.textContent = `/ ${pdfDoc.numPages}`;
    renderPage(pageNum);
  }).catch((err: any) => {
    console.error('Error loading PDF:', err);
    loadingMsg.textContent = 'Error loading PDF. Make sure the file exists at the specified path.';
  });

  // Navigation events
  pageNumInput.addEventListener('change', (e: any) => {
    const val = parseInt(e.target.value);
    if (pdfDoc && val > 0 && val <= pdfDoc.numPages) {
      pageNum = val;
      queueRenderPage(pageNum);
    } else if (pdfDoc) {
      e.target.value = pageNum.toString();
    }
  });

  // Zoom event
  zoomRange.addEventListener('input', (e: any) => {
    scale = parseFloat(e.target.value);
    zoomVal.textContent = `${scale.toFixed(1)}x`;
    if (pdfDoc) {
      queueRenderPage(pageNum);
    }
  });

  // Keyboard support
  document.addEventListener('keydown', (e) => {
    if (!pdfDoc) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      if (pageNum < pdfDoc.numPages) {
        pageNum++;
        queueRenderPage(pageNum);
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      if (pageNum > 1) {
        pageNum--;
        queueRenderPage(pageNum);
      }
    }
  });
}

// Start initialization when the DOM is ready
window.addEventListener('DOMContentLoaded', init);
