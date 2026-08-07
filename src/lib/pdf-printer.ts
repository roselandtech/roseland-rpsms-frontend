/**
 * The Roseland Preparatory School OS - Universal PDF & Isolated Document Printer
 * Ensures 100% clean, isolated document generation and printing without page chrome/dashboard leaks.
 */

export interface ReceiptPrintData {
  receiptNo: string;
  transactionRef: string;
  studentIndexNo: string;
  studentName: string;
  classGrade?: string;
  academicTerm?: string;
  payerName: string;
  payerPhone: string;
  paymentMethod: string;
  amountPaid: string;
  totalBilled?: string;
  previousPaid?: string;
  balanceDue?: string;
  advanceCredit?: string;
  status: string;
  settlementDate: string;
  chiefBursarSignature?: string;
  securitySealChecksum?: string;
}

/**
 * Print any HTML document in a completely isolated hidden iframe.
 * Prevents the main window and dashboard elements from being printed.
 */
export function printIsolatedHtml(htmlContent: string, title: string = 'Document'): void {
  if (typeof window === 'undefined') return;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800&family=Roboto+Mono:wght@500;700&display=swap');
          
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #ffffff;
            color: #1e293b;
            padding: 12mm 15mm;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }

          .font-serif {
            font-family: 'Playfair Display', Georgia, serif;
          }

          .font-mono {
            font-family: 'Roboto Mono', monospace;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          .badge-paid {
            display: inline-block;
            background: #dcfce7;
            color: #166534;
            padding: 3px 8px;
            border-radius: 9999px;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `);
  doc.close();

  // Trigger print after iframe renders fonts and styles
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2000);
  }, 400);
}

/**
 * Generate isolated official receipt HTML for printing/PDF
 */
export function printReceipt(receipt: ReceiptPrintData): void {
  const formattedDate = receipt.settlementDate
    ? new Date(receipt.settlementDate).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : new Date().toLocaleString();

  const receiptHtml = `
    <div style="max-width: 650px; margin: 0 auto; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 24px; background: #fff;">
      <!-- Header -->
      <table style="margin-bottom: 16px; border-bottom: 2px solid #5B42F3; padding-bottom: 12px;">
        <tr>
          <td style="width: 70px; vertical-align: middle;">
            <img src="/logo.png" alt="Logo" style="width: 60px; height: 60px; object-fit: contain;" onerror="this.style.display='none'" />
          </td>
          <td style="vertical-align: middle; padding-left: 10px;">
            <h1 class="font-serif" style="font-size: 18px; font-weight: 800; color: #1e1b4b; text-transform: uppercase; letter-spacing: 0.5px;">The Roseland Preparatory School</h1>
            <p style="font-size: 10px; font-weight: 700; color: #5B42F3; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">Office of the Chief Bursar & Accounts Directorate</p>
            <p style="font-size: 9px; color: #64748b; margin-top: 2px;">Pokuase ACP Estates, Accra, Ghana • Tel: +233 (0) 24 412 3456 • accounts@roseland.edu.gh</p>
          </td>
          <td style="text-align: right; vertical-align: top;">
            <span class="badge-paid">${receipt.status || 'PAID OFFICIAL'}</span>
          </td>
        </tr>
      </table>

      <!-- Title Bar -->
      <table style="margin-bottom: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px;">
        <tr>
          <td>
            <span style="font-size: 9px; text-transform: uppercase; font-weight: 700; color: #64748b; display: block;">Official Receipt No</span>
            <strong class="font-mono" style="font-size: 14px; color: #5B42F3;">${receipt.receiptNo}</strong>
            <span class="font-mono" style="font-size: 9px; color: #94a3b8; display: block;">Ref: ${receipt.transactionRef}</span>
          </td>
          <td style="text-align: right;">
            <span style="font-size: 9px; text-transform: uppercase; font-weight: 700; color: #64748b; display: block;">Date & Time</span>
            <strong style="font-size: 11px; color: #0f172a;">${formattedDate}</strong>
          </td>
        </tr>
      </table>

      <!-- Particulars Grid -->
      <table style="margin-bottom: 16px;">
        <tr>
          <td style="width: 50%; padding-right: 8px; vertical-align: top;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; font-size: 10.5px;">
              <span style="font-size: 8.5px; text-transform: uppercase; font-weight: 700; color: #64748b; display: block; margin-bottom: 2px;">Pupil Particulars</span>
              <strong style="font-size: 12px; color: #0f172a; display: block;">${receipt.studentName}</strong>
              <div style="margin-top: 4px; color: #475569; line-height: 1.4;">
                <div><span style="color: #94a3b8;">Index No:</span> <strong class="font-mono">${receipt.studentIndexNo}</strong></div>
                <div><span style="color: #94a3b8;">Class:</span> <strong>${receipt.classGrade || 'N/A'}</strong></div>
                <div><span style="color: #94a3b8;">Term:</span> <strong>${receipt.academicTerm || 'Term 2'}</strong></div>
              </div>
            </div>
          </td>
          <td style="width: 50%; padding-left: 8px; vertical-align: top;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; font-size: 10.5px;">
              <span style="font-size: 8.5px; text-transform: uppercase; font-weight: 700; color: #64748b; display: block; margin-bottom: 2px;">Payer & Payment Channel</span>
              <strong style="font-size: 12px; color: #0f172a; display: block;">${receipt.payerName}</strong>
              <div style="margin-top: 4px; color: #475569; line-height: 1.4;">
                <div><span style="color: #94a3b8;">Phone:</span> <strong class="font-mono">${receipt.payerPhone}</strong></div>
                <div><span style="color: #94a3b8;">Payment Mode:</span> <strong style="color: #5B42F3;">${receipt.paymentMethod}</strong></div>
                <div><span style="color: #94a3b8;">Purpose:</span> <strong>Tuition & Levies</strong></div>
              </div>
            </div>
          </td>
        </tr>
      </table>

      <!-- Ledger Table -->
      <table style="border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 16px; font-size: 11px;">
        <thead style="background: #f1f5f9;">
          <tr>
            <th style="padding: 8px 12px; text-align: left; font-size: 9px; text-transform: uppercase; color: #475569;">Description / Financial Schedule</th>
            <th style="padding: 8px 12px; text-align: right; font-size: 9px; text-transform: uppercase; color: #475569;">Amount (GH₵)</th>
          </tr>
        </thead>
        <tbody style="border-top: 1px solid #cbd5e1;">
          ${receipt.totalBilled ? `
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">Total Term Assessment Billed</td>
            <td style="padding: 8px 12px; text-align: right; border-bottom: 1px solid #e2e8f0;" class="font-mono">${receipt.totalBilled}</td>
          </tr>` : ''}
          ${receipt.previousPaid ? `
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">Prior Settled Payments</td>
            <td style="padding: 8px 12px; text-align: right; border-bottom: 1px solid #e2e8f0;" class="font-mono">${receipt.previousPaid}</td>
          </tr>` : ''}
          <tr style="background: #f0fdf4; font-weight: 800;">
            <td style="padding: 10px 12px; color: #166534; font-size: 12px; border-bottom: 1px solid #e2e8f0;">AMOUNT PAID IN THIS RECEIPT</td>
            <td style="padding: 10px 12px; text-align: right; color: #166534; font-size: 13px; border-bottom: 1px solid #e2e8f0;" class="font-mono">${receipt.amountPaid}</td>
          </tr>
          ${receipt.balanceDue ? `
          <tr>
            <td style="padding: 8px 12px; color: #b91c1c;">Outstanding Term Balance Due</td>
            <td style="padding: 8px 12px; text-align: right; color: #b91c1c; font-weight: 700;" class="font-mono">${receipt.balanceDue}</td>
          </tr>` : ''}
          ${receipt.advanceCredit ? `
          <tr>
            <td style="padding: 8px 12px; color: #5B42F3;">Advance Overpayment Credit (Next Term)</td>
            <td style="padding: 8px 12px; text-align: right; color: #5B42F3; font-weight: 700;" class="font-mono">${receipt.advanceCredit}</td>
          </tr>` : ''}
        </tbody>
      </table>

      <!-- Signatures & Seal -->
      <table style="border-top: 1px dashed #94a3b8; padding-top: 12px; margin-top: 16px;">
        <tr>
          <td style="vertical-align: top; width: 60%;">
            <span style="font-size: 8.5px; text-transform: uppercase; font-weight: 700; color: #94a3b8; display: block;">Authentication Seal</span>
            <span class="font-mono" style="font-size: 9px; color: #64748b; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 2px;">
              ${receipt.securitySealChecksum || `RPS-SEAL-${receipt.receiptNo}`}
            </span>
            <span style="font-size: 8px; color: #94a3b8; display: block; margin-top: 2px;">Digitally authenticated by RPS Central Treasury.</span>
          </td>
          <td style="text-align: right; vertical-align: top; width: 40%;">
            <div style="font-family: 'Playfair Display', serif; font-style: italic; font-size: 12px; font-weight: 700; color: #1e1b4b; border-bottom: 1px solid #94a3b8; padding-bottom: 2px; display: inline-block;">
              Mrs. Rose Boateng
            </div>
            <span style="font-size: 8.5px; text-transform: uppercase; color: #64748b; font-weight: 700; display: block; margin-top: 2px;">Chief Bursar & Accounts Directorate</span>
          </td>
        </tr>
      </table>
    </div>
  `;

  printIsolatedHtml(receiptHtml, `Receipt_${receipt.receiptNo}`);
}

export interface AdmissionLetterPrintData {
  parentName: string;
  childName: string;
  targetClass: string;
  refNo: string;
  date?: string;
  reportingDate?: string;
}

export function printAdmissionLetter(data: AdmissionLetterPrintData): void {
  const dateStr = data.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const reportingDate = data.reportingDate || 'September 08, 2026';

  const html = `
    <div style="max-width: 700px; margin: 0 auto; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 32px; background: #fff;">
      <!-- Letterhead -->
      <table style="width: 100%; border-bottom: 2.5px solid #5B42F3; padding-bottom: 16px; margin-bottom: 24px;">
        <tr>
          <td style="width: 70px; vertical-align: middle;">
            <img src="/logo.png" alt="Logo" style="width: 65px; height: 65px; object-fit: contain;" onerror="this.style.display='none'" />
          </td>
          <td style="vertical-align: middle; padding-left: 12px;">
            <h1 class="font-serif" style="font-size: 20px; font-weight: 800; color: #1e1b4b; text-transform: uppercase;">The Roseland Preparatory School</h1>
            <p style="font-size: 10px; font-weight: 700; color: #5B42F3; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">Office of Admissions & Academic Registrar</p>
            <p style="font-size: 9px; color: #64748b; margin-top: 2px;">P.O. Box AM 4029, Ga West Municipality, Greater Accra, Ghana</p>
          </td>
          <td style="text-align: right; vertical-align: top;">
            <span style="font-size: 9px; font-family: monospace; color: #64748b; display: block;">GES REG: RPS-GES-4029</span>
            <span style="font-size: 10px; font-weight: 800; color: #5B42F3; display: block; margin-top: 4px;">OFFICIAL OFFER</span>
          </td>
        </tr>
      </table>

      <!-- Body -->
      <div style="font-size: 12px; line-height: 1.7; color: #1e293b;">
        <p style="margin-bottom: 12px;"><strong>Date:</strong> ${dateStr}</p>
        <p style="margin-bottom: 14px;">Dear <strong>${data.parentName}</strong>,</p>

        <p style="margin-bottom: 16px;">
          Following the satisfactory evaluation of your application and placement performance, School Management is pleased to offer provisional admission to <strong>${data.childName}</strong> into <strong>${data.targetClass}</strong> for the <strong>2026/2027 Academic Year</strong>.
        </p>

        <!-- Placement Details Card -->
        <table style="width: 100%; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 18px; padding: 14px; font-size: 11.5px;">
          <tr>
            <td style="padding: 4px 8px; width: 40%; color: #64748b; font-weight: 600;">Student Reference Index:</td>
            <td style="padding: 4px 8px; font-family: monospace; font-weight: 800; color: #5B42F3;">${data.refNo}</td>
          </tr>
          <tr>
            <td style="padding: 4px 8px; color: #64748b; font-weight: 600;">Admitted Cohort:</td>
            <td style="padding: 4px 8px; font-weight: 700; color: #0f172a;">${data.targetClass}</td>
          </tr>
          <tr>
            <td style="padding: 4px 8px; color: #64748b; font-weight: 600;">Academic Resumption Date:</td>
            <td style="padding: 4px 8px; font-weight: 700; color: #0f172a;">${reportingDate}</td>
          </tr>
        </table>

        <p style="margin-bottom: 16px;">
          Please note that full seat reservation is confirmed upon the settlement of the initial admission acceptance fee and term tuition at our bursary desk prior to the commencement of the term.
        </p>

        <p style="margin-bottom: 24px;">
          We warmly welcome you and your ward to the Roseland family, where excellence in character and academic achievement is our standard.
        </p>

        <!-- Signature -->
        <table style="width: 100%; border-top: 1px dashed #cbd5e1; padding-top: 18px; margin-top: 24px;">
          <tr>
            <td style="vertical-align: bottom;">
              <div class="font-serif" style="font-size: 14px; font-weight: 800; color: #1e1b4b; font-style: italic; border-bottom: 1px solid #94a3b8; display: inline-block; padding-bottom: 2px;">
                Mrs. Rose Boateng
              </div>
              <p style="font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; margin-top: 4px;">Managing Director & Proprietress</p>
              <p style="font-size: 9px; color: #94a3b8;">The Roseland Preparatory School Directorate</p>
            </td>
            <td style="text-align: right; vertical-align: bottom;">
              <div style="display: inline-block; border: 1.5px solid #5B42F3; border-radius: 8px; padding: 6px 12px; text-align: center;">
                <span style="font-size: 8px; text-transform: uppercase; font-weight: 800; color: #5B42F3; display: block;">Official School Seal</span>
                <span class="font-mono" style="font-size: 8px; color: #64748b;">AUTHENTICATED</span>
              </div>
            </td>
          </tr>
        </table>
      </div>
    </div>
  `;

  printIsolatedHtml(html, `AdmissionOffer_${data.refNo}`);
}

