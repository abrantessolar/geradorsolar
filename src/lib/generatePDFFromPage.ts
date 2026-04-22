import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Generates a PDF by capturing the actual rendered proposal page sections.
 * This guarantees the PDF matches exactly what the client sees on screen.
 *
 * Sections to capture must be marked with `data-pdf-section` attribute.
 * Elements with `.no-print` class will be hidden during capture.
 */
export async function generatePDFFromPage(rootEl: HTMLElement): Promise<jsPDF> {
  const sections = Array.from(
    rootEl.querySelectorAll<HTMLElement>('[data-pdf-section]'),
  );
  if (sections.length === 0) {
    throw new Error('Nenhuma seção marcada com data-pdf-section foi encontrada.');
  }

  // Add a body class so CSS can hide .no-print and force-show collapsed blocks
  document.body.classList.add('pdf-capturing');
  // Wait a tick so layout/animations settle
  await new Promise((r) => setTimeout(r, 250));

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
  const pageW = pdf.internal.pageSize.getWidth(); // 210
  const pageH = pdf.internal.pageSize.getHeight(); // 297
  const margin = 8;
  const contentW = pageW - margin * 2;

  try {
    let isFirst = true;
    for (const section of sections) {
      // Skip if hidden
      if (section.offsetHeight === 0) continue;

      const canvas = await html2canvas(section, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: rootEl.scrollWidth,
      });

      const imgW = contentW;
      const imgH = (canvas.height * imgW) / canvas.width;
      const imgData = canvas.toDataURL('image/jpeg', 0.92);

      if (imgH <= pageH - margin * 2) {
        // Fits on a single page
        if (!isFirst) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, margin, imgW, imgH, undefined, 'FAST');
        isFirst = false;
      } else {
        // Split tall section across multiple pages
        const pxPerMm = canvas.width / imgW;
        const pageContentH = pageH - margin * 2;
        const sliceHeightPx = Math.floor(pageContentH * pxPerMm);
        let yPx = 0;
        while (yPx < canvas.height) {
          const sliceH = Math.min(sliceHeightPx, canvas.height - yPx);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceH;
          const ctx = sliceCanvas.getContext('2d')!;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(canvas, 0, -yPx);
          const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92);
          const sliceMmH = sliceH / pxPerMm;
          if (!isFirst) pdf.addPage();
          pdf.addImage(sliceData, 'JPEG', margin, margin, imgW, sliceMmH, undefined, 'FAST');
          isFirst = false;
          yPx += sliceH;
        }
      }
    }
  } finally {
    document.body.classList.remove('pdf-capturing');
  }

  return pdf;
}
