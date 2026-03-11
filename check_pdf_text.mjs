import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function checkPdf() {
    try {
        const loadingTask = pdfjsLib.getDocument('/home/koushikk/Downloads/Calc1jamesstewart9E.pdf');
        const pdf = await loadingTask.promise;
        console.log(`Total Pages: ${pdf.numPages}`);

        for (let i = 1; i <= Math.min(3, pdf.numPages); i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const hasText = textContent.items.length > 0;
            console.log(`Page ${i} has text: ${hasText} (Items found: ${textContent.items.length})`);
            
            if (hasText) {
                const sampleText = textContent.items.slice(0, 5).map(item => item.str).join(' ');
                console.log(`Sample text from page ${i}: "${sampleText}"`);
            }
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

checkPdf();
