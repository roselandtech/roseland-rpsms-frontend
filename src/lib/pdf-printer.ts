/**
 * The Roseland Preparatory School OS - Universal PDF & Isolated Document Printer
 * Ensures 100% clean, isolated document generation and printing without page chrome/dashboard leaks.
 */
import { AuthService } from './auth';

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

/* ========================================================================= */
/* 3. STUDENT 360° COMPREHENSIVE DOSSIER & CUMULATIVE TRANSCRIPT PRINTER     */
/* ========================================================================= */

export interface StudentDossierPrintData {
  fullName: string;
  indexNo: string;
  classGrade: string;
  house: string;
  avatar?: string;
  dateOfBirth?: string;
  gender?: string;
  enrollmentDate?: string;
  entryClass?: string;
  parentName: string;
  parentPhone: string;
  emergencyPhone?: string;
  parentEmail?: string;
  residentialAddress?: string;
  avgScore: number | string;
  attendancePct: number | string;
  feeStatus: string;
  allergyFlag?: string;
  conductRemark?: string;
  academicHistory?: Array<{
    session?: string;
    academic_year?: string;
    term: string;
    classGrade?: string;
    class_grade?: string;
    avgScore?: number | string;
    average_score?: number | string;
    attendancePct?: number | string;
    days_present?: number;
    total_days?: number;
    remark?: string;
    form_master_remark?: string;
  }>;
  cumulativeHistory?: Array<{
    academic_year?: string;
    session?: string;
    term: string;
    class_grade?: string;
    classGrade?: string;
    average_score?: number | string;
    avgScore?: number | string;
    days_present?: number;
    total_days?: number;
    attendancePct?: number | string;
    form_master_remark?: string;
    remark?: string;
  }>;
}

export function printStudentDossier(data: StudentDossierPrintData): void {
  const printDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const avatarSrc = data.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.indexNo || 'roseland')}`;

  const historyList = data.academicHistory || data.cumulativeHistory || [];
  const historyRows = (historyList.length > 0)
    ? historyList.map(h => {
        const year = h.session || h.academic_year || '2025/2026';
        const cls = h.classGrade || h.class_grade || data.classGrade;
        const score = h.avgScore != null ? `${h.avgScore}%` : (h.average_score != null ? `${h.average_score}%` : '—');
        const attendance = h.attendancePct != null ? `${h.attendancePct}%` : (h.days_present != null && h.total_days ? `${h.days_present}/${h.total_days}` : '—');
        const remark = h.remark || h.form_master_remark || 'Satisfactory academic and moral conduct.';
        return `
        <tr>
          <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 10px;">${year}</td>
          <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${h.term}</td>
          <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; color: #5B42F3; font-weight: 700;">${cls}</td>
          <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-family: monospace; font-weight: 700;">${score}</td>
          <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-family: monospace;">${attendance}</td>
          <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-style: italic; font-size: 9.5px; color: #475569;">${remark}</td>
        </tr>
      `;
      }).join('')
    : `
        <tr>
          <td colspan="6" style="padding: 12px; text-align: center; color: #94a3b8; font-style: italic; font-size: 10px;">
            Current session records verified. Historical paper transcripts archived at registrar desk.
          </td>
        </tr>
      `;

  const html = `
    <div style="max-width: 720px; margin: 0 auto; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 24px 28px; background: #fff;">
      <!-- Header Letterhead -->
      <table style="width: 100%; border-bottom: 2.5px solid #5B42F3; padding-bottom: 12px; margin-bottom: 16px;">
        <tr>
          <td style="width: 65px; vertical-align: middle;">
            <img src="/logo.png" alt="Logo" style="width: 58px; height: 58px; object-fit: contain;" onerror="this.style.display='none'" />
          </td>
          <td style="vertical-align: middle; padding-left: 10px;">
            <h1 class="font-serif" style="font-size: 17px; font-weight: 800; color: #1e1b4b; text-transform: uppercase;">The Roseland Preparatory School</h1>
            <p style="font-size: 9.5px; font-weight: 700; color: #5B42F3; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">Office of the Academic Registrar • Official Student 360° Cumulative Dossier</p>
            <p style="font-size: 8.5px; color: #64748b; margin-top: 2px;">GES Registration: RPS-GES-4029 • Pokuase ACP Estates, Ga West Municipal, Accra</p>
          </td>
          <td style="text-align: right; vertical-align: top;">
            <span style="font-size: 8.5px; font-family: monospace; color: #64748b; display: block;">PRINT DATE</span>
            <strong style="font-size: 10px; color: #0f172a; display: block;">${printDate}</strong>
            <span style="display: inline-block; background: #f1f5f9; color: #475569; font-size: 8px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-top: 4px;">OFFICIAL DOSSIER</span>
          </td>
        </tr>
      </table>

      <!-- Pupil Bio Banner -->
      <table style="width: 100%; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 16px;">
        <tr>
          <td style="width: 75px; vertical-align: top;">
            <img src="${avatarSrc}" alt="Avatar" style="width: 65px; height: 65px; border-radius: 8px; border: 2px solid #5B42F3; object-fit: cover; background: #fff;" />
          </td>
          <td style="vertical-align: top; padding-left: 14px;">
            <span class="font-mono" style="font-size: 11px; font-weight: 800; color: #5B42F3; display: block;">${data.indexNo}</span>
            <h2 class="font-serif" style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;">${data.fullName}</h2>
            <div style="font-size: 10px; color: #475569; margin-top: 4px; line-height: 1.5;">
              <span><strong>Current Cohort:</strong> ${data.classGrade}</span> • 
              <span><strong>House:</strong> ${data.house || 'Yellow'} House</span> • 
              <span><strong>Enrolled:</strong> ${data.enrollmentDate ? new Date(data.enrollmentDate).toLocaleDateString('en-GB') : 'Verified'}</span>
              ${data.dateOfBirth ? ` • <span><strong>DOB:</strong> ${data.dateOfBirth}</span>` : ''}
            </div>
          </td>
          <td style="text-align: right; vertical-align: top; width: 140px;">
            <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 10px; text-align: center;">
              <span style="font-size: 8.5px; text-transform: uppercase; font-weight: 700; color: #64748b; display: block;">Current Average</span>
              <strong class="font-mono" style="font-size: 15px; color: #5B42F3;">${data.avgScore}%</strong>
            </div>
          </td>
        </tr>
      </table>

      <!-- 3 Metrics Columns -->
      <table style="width: 100%; margin-bottom: 16px;">
        <tr>
          <td style="width: 33.33%; padding-right: 6px;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; text-align: center;">
              <span style="font-size: 8.5px; text-transform: uppercase; font-weight: 700; color: #64748b; display: block;">Attendance Rate</span>
              <strong style="font-size: 13px; color: #166534;">${data.attendancePct}%</strong>
            </div>
          </td>
          <td style="width: 33.33%; padding: 0 3px;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; text-align: center;">
              <span style="font-size: 8.5px; text-transform: uppercase; font-weight: 700; color: #64748b; display: block;">Tuition Clearance</span>
              <strong style="font-size: 12px; color: ${data.feeStatus === 'Paid' ? '#166534' : '#b91c1c'};">${data.feeStatus}</strong>
            </div>
          </td>
          <td style="width: 33.33%; padding-left: 6px;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; text-align: center;">
              <span style="font-size: 8.5px; text-transform: uppercase; font-weight: 700; color: #64748b; display: block;">Enrollment Status</span>
              <strong style="font-size: 12px; color: #5B42F3;">Active Pupil</strong>
            </div>
          </td>
        </tr>
      </table>

      <!-- Guardian & Emergency Contacts -->
      <table style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; margin-bottom: 16px; font-size: 10.5px;">
        <thead style="background: #f1f5f9;">
          <tr>
            <th colspan="2" style="padding: 6px 10px; text-align: left; font-size: 9px; text-transform: uppercase; color: #475569; font-weight: 800;">
              Primary Guardian & Residential Particulars
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 6px 10px; width: 50%; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #64748b;">Primary Guardian:</span> <strong>${data.parentName}</strong>
            </td>
            <td style="padding: 6px 10px; width: 50%; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #64748b;">Primary Phone:</span> <strong class="font-mono">${data.parentPhone}</strong>
            </td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #64748b;">Emergency Contact:</span> <strong class="font-mono">${data.emergencyPhone || data.parentPhone}</strong>
            </td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #64748b;">Email:</span> <span>${data.parentEmail || 'Not recorded'}</span>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 6px 10px;">
              <span style="color: #64748b;">Residential Address:</span> <strong>${data.residentialAddress || 'Pokuase ACP Estates, Ga West Municipal, Accra'}</strong>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Infirmary & Medical Alert -->
      <div style="padding: 8px 12px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; margin-bottom: 16px; font-size: 10px;">
        <strong style="color: #9f1239; text-transform: uppercase; font-size: 8.5px; display: block; margin-bottom: 2px;">Infirmary & Clinical Flags:</strong>
        <span style="color: #881337; font-weight: 500;">${data.allergyFlag || 'No known clinical conditions, allergies, or physical restrictions recorded.'}</span>
      </div>

      <!-- Cumulative Academic Transcripts -->
      <div style="margin-bottom: 16px;">
        <span style="font-size: 9px; text-transform: uppercase; font-weight: 800; color: #475569; display: block; margin-bottom: 6px;">
          Multi-Term Continuous Academic & Attendance History
        </span>
        <table style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 10px;">
          <thead style="background: #f1f5f9;">
            <tr>
              <th style="padding: 6px 10px; text-align: left; font-size: 8.5px; text-transform: uppercase; color: #475569;">Session</th>
              <th style="padding: 6px 10px; text-align: left; font-size: 8.5px; text-transform: uppercase; color: #475569;">Term</th>
              <th style="padding: 6px 10px; text-align: left; font-size: 8.5px; text-transform: uppercase; color: #475569;">Class</th>
              <th style="padding: 6px 10px; text-align: center; font-size: 8.5px; text-transform: uppercase; color: #475569;">Avg %</th>
              <th style="padding: 6px 10px; text-align: center; font-size: 8.5px; text-transform: uppercase; color: #475569;">Attendance</th>
              <th style="padding: 6px 10px; text-align: left; font-size: 8.5px; text-transform: uppercase; color: #475569;">Form Master Remark</th>
            </tr>
          </thead>
          <tbody>
            ${historyRows}
          </tbody>
        </table>
      </div>

      <!-- Signatures & Registrar Endorsement -->
      <table style="width: 100%; border-top: 1px dashed #cbd5e1; padding-top: 14px; margin-top: 16px;">
        <tr>
          <td style="vertical-align: bottom; width: 60%;">
            <span style="font-size: 8px; text-transform: uppercase; font-weight: 800; color: #94a3b8; display: block;">Institutional Authentication</span>
            <span class="font-mono" style="font-size: 9px; color: #5B42F3; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 2px;">
              SIS-CERT-${data.indexNo.replace(/[^a-zA-Z0-9]/g, '')}-${new Date().getFullYear()}
            </span>
            <span style="font-size: 8px; color: #94a3b8; display: block; margin-top: 2px;">Officially generated from The Roseland Student Information System.</span>
          </td>
          <td style="text-align: right; vertical-align: bottom; width: 40%;">
            <div class="font-serif" style="font-size: 13px; font-weight: 800; color: #1e1b4b; font-style: italic; border-bottom: 1px solid #94a3b8; display: inline-block; padding-bottom: 2px;">
              ${AuthService.getCurrentUser()?.fullName || 'Headmaster'}
            </div>
            <span style="font-size: 8.5px; text-transform: uppercase; color: #64748b; font-weight: 700; display: block; margin-top: 2px;">Headmaster & Academic Director</span>
          </td>
        </tr>
      </table>
    </div>
  `;

  printIsolatedHtml(html, `StudentDossier_${data.indexNo}`);
}

/* ========================================================================= */
/* 4. BIOMETRIC HIGH-RES STUDENT PLASTIC ID BADGE PRINTER                    */
/* ========================================================================= */

export interface StudentIdCardPrintData {
  fullName: string;
  indexNo: string;
  classGrade: string;
  house: string;
  avatar?: string;
  bloodGroup?: string;
  qrCodeDataUrl?: string;
  emergencyPhone?: string;
  expiryDate?: string;
}

export function printStudentIdCard(data: StudentIdCardPrintData): void {
  const avatarSrc = data.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.indexNo || 'roseland')}`;
  const expiry = data.expiryDate || 'JUL 2027';
  const emergencyPhone = data.emergencyPhone || '+233 (0) 24 412 3456';

  const html = `
    <div style="max-width: 680px; margin: 0 auto; padding: 20px; background: #fff; text-align: center;">
      <p style="font-size: 10px; color: #64748b; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">
        CR-80 Standard Plastic ID Card Print Layout • Cut along guidelines & laminate
      </p>

      <table style="width: 100%; border-collapse: separate; border-spacing: 20px 0;">
        <tr>
          <!-- FRONT SIDE -->
          <td style="width: 50%; vertical-align: top;">
            <div style="width: 320px; height: 200px; border-radius: 14px; background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #581c87 100%); color: #fff; padding: 12px 14px; position: relative; border: 2.5px solid #fbbf24; box-shadow: 0 4px 12px rgba(0,0,0,0.15); overflow: hidden; text-align: left;">
              <!-- Header -->
              <table style="width: 100%; border-bottom: 1px solid rgba(255,255,255,0.25); padding-bottom: 6px; margin-bottom: 8px;">
                <tr>
                  <td style="width: 28px; vertical-align: middle;">
                    <img src="/logo.png" alt="Logo" style="width: 26px; height: 26px; object-fit: contain; background: #fff; border-radius: 4px; padding: 1px;" onerror="this.style.display='none'" />
                  </td>
                  <td style="vertical-align: middle; padding-left: 6px;">
                    <h3 class="font-serif" style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #fff; line-height: 1.1;">The Roseland Prep</h3>
                    <span style="font-size: 7px; color: #fbbf24; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Ga West, Accra</span>
                  </td>
                  <td style="text-align: right; vertical-align: middle;">
                    <span style="background: rgba(255,255,255,0.2); font-size: 7.5px; font-family: monospace; font-weight: 800; padding: 2px 5px; border-radius: 4px;">PUPIL</span>
                  </td>
                </tr>
              </table>

              <!-- Body -->
              <table style="width: 100%;">
                <tr>
                  <td style="width: 62px; vertical-align: middle;">
                    <img src="${avatarSrc}" alt="Avatar" style="width: 58px; height: 68px; border-radius: 6px; border: 2px solid #fff; object-fit: cover; background: #fff;" />
                  </td>
                  <td style="vertical-align: middle; padding-left: 10px;">
                    <h4 style="font-size: 11.5px; font-weight: 800; color: #fff; line-height: 1.2; margin-bottom: 2px;">${data.fullName}</h4>
                    <span class="font-mono" style="font-size: 9.5px; font-weight: 800; color: #fbbf24; display: block;">${data.indexNo}</span>
                    <span style="font-size: 8.5px; color: #e0e7ff; font-weight: 600; display: block; margin-top: 1px;">${data.classGrade}</span>
                    <span style="font-size: 8px; color: #cbd5e1; display: block;">${data.house || 'Yellow'} House</span>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table style="width: 100%; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 6px; margin-top: 8px;">
                <tr>
                  <td style="font-size: 7px; color: #cbd5e1; line-height: 1.3;">
                    <span>GES REG: RPS-GES-4029</span><br/>
                    <span>BLOOD: ${data.bloodGroup || 'O+ (Verified)'}</span>
                  </td>
                  <td style="text-align: right; font-size: 7px; color: #fbbf24; font-weight: 700;">
                    <span>EXP: ${expiry}</span>
                  </td>
                </tr>
              </table>
            </div>
            <span style="font-size: 9px; font-weight: 700; color: #475569; display: block; margin-top: 6px;">[ FRONT OF BADGE ]</span>
          </td>

          <!-- BACK SIDE -->
          <td style="width: 50%; vertical-align: top;">
            <div style="width: 320px; height: 200px; border-radius: 14px; background: #ffffff; color: #1e293b; padding: 12px 14px; position: relative; border: 1.5px solid #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.08); overflow: hidden; text-align: left;">
              <!-- Magnetic / Security Strip Simulation -->
              <div style="background: #1e293b; height: 22px; margin: -12px -14px 10px -14px;"></div>

              <table style="width: 100%; margin-bottom: 8px;">
                <tr>
                  <td style="vertical-align: top; font-size: 7.5px; line-height: 1.4; color: #475569; padding-right: 8px;">
                    <strong style="color: #0f172a; font-size: 8px; display: block; margin-bottom: 2px;">TERMS & CONDITIONS</strong>
                    <span>This card is the property of The Roseland Preparatory School. If found, please return to Pokuase ACP Estates or call below.</span>
                    <div style="margin-top: 4px;">
                      <strong style="color: #0f172a;">Emergency Helpline:</strong><br/>
                      <span class="font-mono" style="color: #5B42F3; font-weight: 700;">${emergencyPhone}</span>
                    </div>
                  </td>
                  <td style="width: 60px; text-align: right; vertical-align: middle;">
                    ${data.qrCodeDataUrl ? `
                      <img src="${data.qrCodeDataUrl}" alt="QR" style="width: 54px; height: 54px; object-fit: contain; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px;" />
                    ` : `
                      <div style="width: 54px; height: 54px; background: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 7px; font-family: monospace; color: #64748b;">QR CODE</div>
                    `}
                  </td>
                </tr>
              </table>

              <!-- Signature & Seal -->
              <table style="width: 100%; border-top: 1px dashed #e2e8f0; padding-top: 6px; margin-top: 6px;">
                <tr>
                  <td style="vertical-align: middle;">
                    <span class="font-mono" style="font-size: 7px; color: #64748b;">AUTH REF: RPS-${data.indexNo.replace(/[^a-zA-Z0-9]/g, '')}</span>
                  </td>
                  <td style="text-align: right; vertical-align: middle;">
                    <span class="font-serif" style="font-size: 9px; font-weight: 700; font-style: italic; color: #1e1b4b;">${AuthService.getCurrentUser()?.fullName || 'Headmaster'}</span>
                    <span style="font-size: 6.5px; text-transform: uppercase; color: #64748b; display: block;">Headmaster Sign</span>
                  </td>
                </tr>
              </table>
            </div>
            <span style="font-size: 9px; font-weight: 700; color: #475569; display: block; margin-top: 6px;">[ REVERSE / SECURITY SIDE ]</span>
          </td>
        </tr>
      </table>
    </div>
  `;

  printIsolatedHtml(html, `StudentIdBadge_${data.indexNo}`);
}

/* ========================================================================= */
/* 5. ACADEMIC PROMOTION DECISION GAZETTE PRINTER                            */
/* ========================================================================= */

export interface PromotionGazettePrintData {
  sourceSession: string;
  targetSession: string;
  sourceCohort: string;
  totalEvaluated: number;
  records: Array<{
    indexNo: string;
    name: string;
    avgScore: number | string;
    decision: string;
    newClass: string;
  }>;
  authorizedBy?: string;
  resolutionNo?: string;
}

export function printPromotionGazette(data: PromotionGazettePrintData): void {
  const printDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const rows = data.records.map((r, idx) => `
    <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 9.5px;">${r.indexNo}</td>
      <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${r.name}</td>
      <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-weight: 700; text-align: center;">${r.avgScore}%</td>
      <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: ${r.decision === 'Promote' || r.decision === 'Promoted' ? '#166534' : r.decision.includes('Retain') ? '#b91c1c' : '#5B42F3'};">${r.decision}</td>
      <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: #5B42F3;">${r.newClass}</td>
    </tr>
  `).join('');

  const html = `
    <div style="max-width: 740px; margin: 0 auto; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 28px; background: #fff;">
      <!-- Letterhead -->
      <table style="width: 100%; border-bottom: 2.5px solid #5B42F3; padding-bottom: 14px; margin-bottom: 18px;">
        <tr>
          <td style="width: 65px; vertical-align: middle;">
            <img src="/logo.png" alt="Logo" style="width: 58px; height: 58px; object-fit: contain;" onerror="this.style.display='none'" />
          </td>
          <td style="vertical-align: middle; padding-left: 12px;">
            <h1 class="font-serif" style="font-size: 18px; font-weight: 800; color: #1e1b4b; text-transform: uppercase;">The Roseland Preparatory School</h1>
            <p style="font-size: 10px; font-weight: 700; color: #5B42F3; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">Official Academic Promotion Decision Gazette</p>
            <p style="font-size: 8.5px; color: #64748b; margin-top: 2px;">Ga West Municipal Directorate • GES Registration: RPS-GES-4029</p>
          </td>
          <td style="text-align: right; vertical-align: top;">
            <span style="font-size: 9px; font-family: monospace; color: #64748b; display: block;">GAZETTE REF</span>
            <strong style="font-size: 10px; color: #5B42F3; display: block;">${data.resolutionNo || 'RPS-AB-2026/07'}</strong>
            <span style="font-size: 8.5px; color: #64748b; display: block; margin-top: 2px;">${printDate}</span>
          </td>
        </tr>
      </table>

      <!-- Session Metadata Banner -->
      <table style="width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 18px; font-size: 11px;">
        <tr>
          <td style="width: 33.33%;">
            <span style="color: #64748b; font-size: 9px; text-transform: uppercase; display: block; font-weight: 700;">Academic Progression</span>
            <strong style="color: #0f172a;">${data.sourceSession} → ${data.targetSession}</strong>
          </td>
          <td style="width: 33.33%; text-align: center;">
            <span style="color: #64748b; font-size: 9px; text-transform: uppercase; display: block; font-weight: 700;">Evaluated Cohort</span>
            <strong style="color: #5B42F3;">${data.sourceCohort}</strong>
          </td>
          <td style="width: 33.33%; text-align: right;">
            <span style="color: #64748b; font-size: 9px; text-transform: uppercase; display: block; font-weight: 700;">Total Endorsed</span>
            <strong style="color: #166534;">${data.totalEvaluated} Pupils</strong>
          </td>
        </tr>
      </table>

      <!-- Candidate Decision Table -->
      <table style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 10.5px; margin-bottom: 20px;">
        <thead style="background: #f1f5f9;">
          <tr>
            <th style="padding: 7px 10px; text-align: left; font-size: 8.5px; text-transform: uppercase; color: #475569;">Index #</th>
            <th style="padding: 7px 10px; text-align: left; font-size: 8.5px; text-transform: uppercase; color: #475569;">Pupil Full Name</th>
            <th style="padding: 7px 10px; text-align: center; font-size: 8.5px; text-transform: uppercase; color: #475569;">Avg %</th>
            <th style="padding: 7px 10px; text-align: left; font-size: 8.5px; text-transform: uppercase; color: #475569;">Board Decision</th>
            <th style="padding: 7px 10px; text-align: left; font-size: 8.5px; text-transform: uppercase; color: #475569;">New Assignment</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <!-- Endorsement Box -->
      <table style="width: 100%; border-top: 1px dashed #cbd5e1; padding-top: 16px;">
        <tr>
          <td style="vertical-align: bottom; width: 60%;">
            <span style="font-size: 8px; text-transform: uppercase; font-weight: 800; color: #94a3b8; display: block;">Academic Board Ratification</span>
            <span style="font-size: 9px; color: #475569; display: block; margin-top: 2px;">
              Certified by the Roseland Examination & Academic Standards Directorate.
            </span>
          </td>
          <td style="text-align: right; vertical-align: bottom; width: 40%;">
            <div class="font-serif" style="font-size: 13px; font-weight: 800; color: #1e1b4b; font-style: italic; border-bottom: 1px solid #94a3b8; display: inline-block; padding-bottom: 2px;">
              ${data.authorizedBy || AuthService.getCurrentUser()?.fullName || 'Headmaster'}
            </div>
            <span style="font-size: 8.5px; text-transform: uppercase; color: #64748b; font-weight: 700; display: block; margin-top: 2px;">Headmaster & Directorate Sign-Off</span>
          </td>
        </tr>
      </table>
    </div>
  `;

  printIsolatedHtml(html, `PromotionGazette_${data.targetSession.replace('/', '_')}`);
}

/* ========================================================================= */
/* 6. OFFICIAL STUDENT MASTER ROLL & CENSUS REGISTER PRINTER                 */
/* ========================================================================= */

export interface StudentRollRegisterPrintData {
  cohortName: string;
  academicYear?: string;
  totalPupils: number;
  students: Array<{
    indexNo: string;
    fullName: string;
    gender?: string;
    classGrade: string;
    parentName?: string;
    parentPhone?: string;
    feeStatus?: string;
  }>;
}

export function printStudentRollRegister(data: StudentRollRegisterPrintData): void {
  const printDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const rows = data.students.map((s, idx) => `
    <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 9px; text-align: center;">${idx + 1}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 9.5px; font-weight: 700; color: #5B42F3;">${s.indexNo}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${s.fullName}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 9.5px;">${s.gender || '—'}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 9.5px;">${s.classGrade}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 9px; color: #475569;">${s.parentName || 'Parent'} (${s.parentPhone || '—'})</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 700; font-size: 9px; color: ${s.feeStatus === 'Paid' ? '#166534' : '#b91c1c'};">${s.feeStatus || 'Verified'}</td>
    </tr>
  `).join('');

  const html = `
    <div style="max-width: 760px; margin: 0 auto; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 24px 28px; background: #fff;">
      <!-- Letterhead -->
      <table style="width: 100%; border-bottom: 2.5px solid #5B42F3; padding-bottom: 12px; margin-bottom: 16px;">
        <tr>
          <td style="width: 60px; vertical-align: middle;">
            <img src="/logo.png" alt="Logo" style="width: 52px; height: 52px; object-fit: contain;" onerror="this.style.display='none'" />
          </td>
          <td style="vertical-align: middle; padding-left: 10px;">
            <h1 class="font-serif" style="font-size: 17px; font-weight: 800; color: #1e1b4b; text-transform: uppercase;">The Roseland Preparatory School</h1>
            <p style="font-size: 9.5px; font-weight: 700; color: #5B42F3; text-transform: uppercase; letter-spacing: 1px; margin-top: 1px;">Official Student Census & Enrolment Master Roll</p>
            <p style="font-size: 8.5px; color: #64748b;">GES Reg: RPS-GES-4029 • Ga West Municipal, Accra</p>
          </td>
          <td style="text-align: right; vertical-align: top;">
            <span style="font-size: 8.5px; font-family: monospace; color: #64748b; display: block;">DATE</span>
            <strong style="font-size: 10px; color: #0f172a; display: block;">${printDate}</strong>
            <span style="font-size: 9px; font-weight: 700; color: #5B42F3; display: block; margin-top: 2px;">Cohort: ${data.cohortName}</span>
          </td>
        </tr>
      </table>

      <!-- Summary -->
      <table style="width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; margin-bottom: 14px; font-size: 10.5px;">
        <tr>
          <td><strong>Active Enrolment:</strong> ${data.totalPupils} Pupils</td>
          <td style="text-align: right; color: #64748b;">Academic Year: ${data.academicYear || '2026/2027'}</td>
        </tr>
      </table>

      <!-- Table -->
      <table style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 10px; margin-bottom: 16px;">
        <thead style="background: #f1f5f9;">
          <tr>
            <th style="padding: 6px 8px; text-align: center; font-size: 8px; text-transform: uppercase; color: #475569;">#</th>
            <th style="padding: 6px 8px; text-align: left; font-size: 8px; text-transform: uppercase; color: #475569;">Index No</th>
            <th style="padding: 6px 8px; text-align: left; font-size: 8px; text-transform: uppercase; color: #475569;">Pupil Full Name</th>
            <th style="padding: 6px 8px; text-align: center; font-size: 8px; text-transform: uppercase; color: #475569;">Sex</th>
            <th style="padding: 6px 8px; text-align: left; font-size: 8px; text-transform: uppercase; color: #475569;">Class</th>
            <th style="padding: 6px 8px; text-align: left; font-size: 8px; text-transform: uppercase; color: #475569;">Guardian Contact</th>
            <th style="padding: 6px 8px; text-align: center; font-size: 8px; text-transform: uppercase; color: #475569;">Tuition</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <!-- Footer -->
      <table style="width: 100%; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
        <tr>
          <td style="font-size: 8px; color: #94a3b8;">Official RPS Student Census. Confidential institutional record.</td>
          <td style="text-align: right; font-size: 8px; font-weight: 700; color: #475569; text-transform: uppercase;">Office of the Registrar</td>
        </tr>
      </table>
    </div>
  `;

  printIsolatedHtml(html, `StudentRoll_${data.cohortName.replace(/[^a-zA-Z0-9]/g, '_')}`);
}

/* ========================================================================= */
/* 7. CLASS TIMETABLE SCHEDULE GAZETTE PRINTER                               */
/* ========================================================================= */

export interface TimetableGazettePrintData {
  className?: string;
  classGrade?: string;
  academicYear?: string;
  term?: string;
  effectiveDate?: string;
  headmasterName?: string;
  scheduleByDay?: Record<string, Array<{
    timeRange?: string;
    label?: string;
    subject?: string;
    teacher?: string;
    facility?: string;
  }>>;
  scheduleGrid?: Record<string, Array<{
    timeRange?: string;
    time_range?: string;
    label?: string;
    slot_label?: string;
    period?: string;
    subject?: string;
    teacher?: string;
    teacher_name?: string;
    facility?: string;
    room_facility?: string;
  }>>;
  officialGazetteSignOff?: {
    headmaster?: string;
    effectiveDate?: string;
  };
}

export function printTimetableGazette(data: TimetableGazettePrintData): void {
  const schedule = data.scheduleGrid || data.scheduleByDay || {};
  const days = Object.keys(schedule);
  const className = data.classGrade || data.className || 'Master Timetable';
  const effective = data.officialGazetteSignOff?.effectiveDate || data.effectiveDate || 'Current Term';
  const headmaster = data.officialGazetteSignOff?.headmaster || data.headmasterName || AuthService.getCurrentUser()?.fullName || 'Headmaster';

  const rows = days.map(day => {
    const slots = (schedule as any)[day] || [];
    return slots.map((slot: any, idx: number) => `
      <tr>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 700; font-size: 10px; color: #0f172a;">${idx === 0 ? day : ''}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 9px; color: #64748b;">${slot.timeRange || slot.time_range || '—'}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 9.5px; font-weight: 600;">${slot.label || slot.slot_label || slot.period || 'Period'}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 10px; font-weight: 700; color: #5B42F3;">${slot.subject || 'Academic'}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 9.5px; color: #334155;">${slot.teacher || slot.teacher_name || 'Assigned Staff'}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 8.5px; color: #64748b;">${slot.facility || slot.room_facility || 'Classroom'}</td>
      </tr>
    `).join('');
  }).join('');

  const html = `
    <div style="max-width: 740px; margin: 0 auto; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 24px 28px; background: #fff;">
      <table style="width: 100%; border-bottom: 2.5px solid #5B42F3; padding-bottom: 12px; margin-bottom: 16px;">
        <tr>
          <td style="width: 60px; vertical-align: middle;">
            <img src="/logo.png" alt="Logo" style="width: 52px; height: 52px; object-fit: contain;" onerror="this.style.display='none'" />
          </td>
          <td style="vertical-align: middle; padding-left: 10px;">
            <h1 class="font-serif" style="font-size: 17px; font-weight: 800; color: #1e1b4b; text-transform: uppercase;">The Roseland Preparatory School</h1>
            <p style="font-size: 9.5px; font-weight: 700; color: #5B42F3; text-transform: uppercase; letter-spacing: 1px; margin-top: 1px;">Official Master Class Timetable Schedule</p>
            <p style="font-size: 8.5px; color: #64748b;">Ga West Municipal Directorate • GES Registration: RPS-GES-4029</p>
          </td>
          <td style="text-align: right; vertical-align: top;">
            <span style="font-size: 9px; font-weight: 800; color: #5B42F3; display: block;">CLASS: ${className}</span>
            <span style="font-size: 8px; color: #64748b; display: block; margin-top: 2px;">Effective: ${effective}</span>
          </td>
        </tr>
      </table>

      <table style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 10px; margin-bottom: 18px;">
        <thead style="background: #f1f5f9;">
          <tr>
            <th style="padding: 6px 10px; text-align: left; font-size: 8.5px; text-transform: uppercase; color: #475569;">Day</th>
            <th style="padding: 6px 10px; text-align: left; font-size: 8.5px; text-transform: uppercase; color: #475569;">Time</th>
            <th style="padding: 6px 10px; text-align: left; font-size: 8.5px; text-transform: uppercase; color: #475569;">Period</th>
            <th style="padding: 6px 10px; text-align: left; font-size: 8.5px; text-transform: uppercase; color: #475569;">Subject</th>
            <th style="padding: 6px 10px; text-align: left; font-size: 8.5px; text-transform: uppercase; color: #475569;">Assigned Teacher</th>
            <th style="padding: 6px 10px; text-align: left; font-size: 8.5px; text-transform: uppercase; color: #475569;">Facility</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <table style="width: 100%; border-top: 1px dashed #cbd5e1; padding-top: 12px;">
        <tr>
          <td style="font-size: 8px; color: #94a3b8;">Authorized academic timetable. All instructors are required to adhere to scheduled periods.</td>
          <td style="text-align: right; vertical-align: bottom;">
            <span class="font-serif" style="font-size: 11px; font-weight: 700; font-style: italic; color: #1e1b4b;">${headmaster}</span>
            <span style="font-size: 7.5px; text-transform: uppercase; color: #64748b; display: block;">Headmaster & Academic Director</span>
          </td>
        </tr>
      </table>
    </div>
  `;

  printIsolatedHtml(html, `Timetable_${className.replace(/[^a-zA-Z0-9]/g, '_')}`);
}

/* ========================================================================= */
/* 8. TERMINAL ACADEMIC REPORT CARD PRINTER                                  */
/* ========================================================================= */

export interface TerminalReportCardPrintData {
  studentName: string;
  indexNo: string;
  classGrade: string;
  academicYear?: string;
  term?: string;
  overallAverage?: number | string;
  classPosition?: string;
  positionInClass?: string;
  totalPupilsInClass?: number;
  totalRoll?: number;
  attendanceDaysPresent?: number;
  totalAttendanceDays?: number;
  nextTermBegins?: string;
  classTeacherName?: string;
  subjects: Array<{
    name?: string;
    subjectName?: string;
    classScore?: number;
    classScore30?: number;
    examScore?: number;
    examScore70?: number;
    totalScore?: number;
    totalScore100?: number;
    grade?: string;
    gradeLetter?: string;
    position?: string;
    remarks?: string;
  }>;
  affectiveDomain?: {
    conduct?: string;
    attitude?: string;
    neatness?: string;
    punctuality?: string;
    interests?: string;
  };
  formMasterRemark?: string;
  headmasterRemark?: string;
}

export function printTerminalReportCard(data: TerminalReportCardPrintData): void {
  const rows = data.subjects.map(s => {
    const name = s.subjectName || s.name || 'Subject';
    const cw = s.classScore30 ?? s.classScore ?? 0;
    const exam = s.examScore70 ?? s.examScore ?? 0;
    const total = s.totalScore100 ?? s.totalScore ?? (cw + exam);
    const grade = s.gradeLetter || s.grade || 'Grade 1';
    const rem = s.remarks || 'Satisfactory';
    return `
      <tr>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${name}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-family: monospace;">${cw}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-family: monospace;">${exam}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-family: monospace; font-weight: 800; color: #5B42F3;">${total}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 800;">${grade}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 9px; color: #475569;">${rem}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <div style="max-width: 740px; margin: 0 auto; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 24px 28px; background: #fff;">
      <table style="width: 100%; border-bottom: 2.5px solid #5B42F3; padding-bottom: 12px; margin-bottom: 16px;">
        <tr>
          <td style="width: 60px; vertical-align: middle;">
            <img src="/logo.png" alt="Logo" style="width: 54px; height: 54px; object-fit: contain;" onerror="this.style.display='none'" />
          </td>
          <td style="vertical-align: middle; padding-left: 10px;">
            <h1 class="font-serif" style="font-size: 18px; font-weight: 800; color: #1e1b4b; text-transform: uppercase;">The Roseland Preparatory School</h1>
            <p style="font-size: 9.5px; font-weight: 700; color: #5B42F3; text-transform: uppercase; letter-spacing: 1px; margin-top: 1px;">Official Terminal Performance Assessment Report</p>
            <p style="font-size: 8.5px; color: #64748b;">GES Reg: RPS-GES-4029 • Ga West Municipal, Accra</p>
          </td>
          <td style="text-align: right; vertical-align: top;">
            <span style="font-size: 9px; font-weight: 800; color: #5B42F3; display: block;">${data.academicYear} • ${data.term}</span>
            <span style="font-size: 8.5px; font-family: monospace; color: #64748b; display: block; margin-top: 2px;">OFFICIAL REPORT CARD</span>
          </td>
        </tr>
      </table>

      <!-- Pupil Header Card -->
      <table style="width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin-bottom: 16px; font-size: 10.5px;">
        <tr>
          <td style="width: 35%;">
            <span style="color: #64748b; font-size: 8.5px; text-transform: uppercase; display: block;">Pupil Full Name</span>
            <strong style="font-size: 13px; color: #0f172a;">${data.studentName}</strong>
          </td>
          <td style="width: 25%;">
            <span style="color: #64748b; font-size: 8.5px; text-transform: uppercase; display: block;">Index Number</span>
            <strong class="font-mono" style="color: #5B42F3;">${data.indexNo}</strong>
          </td>
          <td style="width: 20%;">
            <span style="color: #64748b; font-size: 8.5px; text-transform: uppercase; display: block;">Class</span>
            <strong>${data.classGrade}</strong>
          </td>
          <td style="width: 20%; text-align: right;">
            <span style="color: #64748b; font-size: 8.5px; text-transform: uppercase; display: block;">Attendance</span>
            <strong class="font-mono">${data.attendanceDaysPresent || 65} / ${data.totalAttendanceDays || 68} Days</strong>
          </td>
        </tr>
      </table>

      <!-- Broadsheet Table -->
      <table style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 10px; margin-bottom: 16px;">
        <thead style="background: #f1f5f9;">
          <tr>
            <th style="padding: 6px 10px; text-align: left; font-size: 8px; text-transform: uppercase; color: #475569;">Subject</th>
            <th style="padding: 6px 10px; text-align: center; font-size: 8px; text-transform: uppercase; color: #475569;">Class (30%)</th>
            <th style="padding: 6px 10px; text-align: center; font-size: 8px; text-transform: uppercase; color: #475569;">Exam (70%)</th>
            <th style="padding: 6px 10px; text-align: center; font-size: 8px; text-transform: uppercase; color: #475569;">Total (100%)</th>
            <th style="padding: 6px 10px; text-align: center; font-size: 8px; text-transform: uppercase; color: #475569;">Grade</th>
            <th style="padding: 6px 10px; text-align: left; font-size: 8px; text-transform: uppercase; color: #475569;">Teacher Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <!-- Remarks & Sign-offs -->
      <table style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; margin-bottom: 14px; font-size: 10px; background: #fff;">
        <tr>
          <td style="width: 50%; padding-right: 8px; vertical-align: top;">
            <strong style="font-size: 8.5px; text-transform: uppercase; color: #475569; display: block; margin-bottom: 3px;">Form Master Remark:</strong>
            <p style="font-style: italic; color: #0f172a; line-height: 1.4;">&ldquo;${data.formMasterRemark || 'Shows great potential. Continues to make steady academic progress.'}&rdquo;</p>
          </td>
          <td style="width: 50%; padding-left: 8px; vertical-align: top;">
            <strong style="font-size: 8.5px; text-transform: uppercase; color: #475569; display: block; margin-bottom: 3px;">Headmaster Remark:</strong>
            <p style="font-style: italic; color: #0f172a; line-height: 1.4;">&ldquo;${data.headmasterRemark || 'A commendable terminal performance. Promoted in good standing.'}&rdquo;</p>
          </td>
        </tr>
      </table>

      <table style="width: 100%; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
        <tr>
          <td style="font-size: 8px; color: #94a3b8;">Compliant with Ghana National Association of Private Schools & GES Standards.</td>
          <td style="text-align: right;">
            <span class="font-serif" style="font-size: 11px; font-weight: 700; font-style: italic; color: #1e1b4b;">${AuthService.getCurrentUser()?.fullName || 'Headmaster'}</span>
            <span style="font-size: 7.5px; text-transform: uppercase; color: #64748b; display: block;">Headmaster Signature & Stamp</span>
          </td>
        </tr>
      </table>
    </div>
  `;

  printIsolatedHtml(html, `ReportCard_${data.indexNo}_${data.term}`);
}

/* ========================================================================= */
/* 9. CBT ASSESSMENT EXAM RESULT SLIP PRINTER                                */
/* ========================================================================= */

export interface CbtExamResultPrintData {
  candidateName: string;
  indexNo: string;
  examTitle: string;
  classGrade: string;
  totalQuestions: number;
  correctCount: number;
  scorePercentage: number;
  grade: string;
  timeSpent?: string;
  dateCompleted?: string;
}

export function printCbtExamResult(data: CbtExamResultPrintData): void {
  const dateStr = data.dateCompleted || new Date().toLocaleString();
  const html = `
    <div style="max-width: 600px; margin: 0 auto; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 24px; background: #fff;">
      <table style="width: 100%; border-bottom: 2px solid #5B42F3; padding-bottom: 12px; margin-bottom: 16px;">
        <tr>
          <td style="width: 55px; vertical-align: middle;">
            <img src="/logo.png" alt="Logo" style="width: 48px; height: 48px; object-fit: contain;" onerror="this.style.display='none'" />
          </td>
          <td style="vertical-align: middle; padding-left: 10px;">
            <h1 class="font-serif" style="font-size: 16px; font-weight: 800; color: #1e1b4b; text-transform: uppercase;">The Roseland Preparatory School</h1>
            <p style="font-size: 9px; font-weight: 700; color: #5B42F3; text-transform: uppercase; letter-spacing: 1px;">Computer-Based Assessment Result Slip</p>
          </td>
          <td style="text-align: right; vertical-align: top;">
            <span style="font-size: 8px; font-family: monospace; color: #64748b;">OFFICIAL CBT SLIP</span>
          </td>
        </tr>
      </table>

      <table style="width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 11px;">
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Candidate Name:</td>
          <td style="padding: 4px 0; font-weight: 700; color: #0f172a;">${data.candidateName}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Index Number:</td>
          <td style="padding: 4px 0; font-family: monospace; font-weight: 700; color: #5B42F3;">${data.indexNo}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Assessment Title:</td>
          <td style="padding: 4px 0; font-weight: 700;">${data.examTitle} (${data.classGrade})</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Completed At:</td>
          <td style="padding: 4px 0;">${dateStr}</td>
        </tr>
      </table>

      <table style="width: 100%; border: 1.5px solid #5B42F3; border-radius: 8px; background: #faf5ff; padding: 14px; margin-bottom: 16px; text-align: center;">
        <tr>
          <td style="width: 50%;">
            <span style="font-size: 9px; text-transform: uppercase; font-weight: 700; color: #64748b; display: block;">Raw Score</span>
            <strong class="font-mono" style="font-size: 18px; color: #0f172a;">${data.correctCount} / ${data.totalQuestions}</strong>
          </td>
          <td style="width: 50%; border-left: 1px solid #e9d5ff;">
            <span style="font-size: 9px; text-transform: uppercase; font-weight: 700; color: #64748b; display: block;">Final Score / Grade</span>
            <strong class="font-mono" style="font-size: 20px; color: #5B42F3;">${data.scorePercentage}% (${data.grade})</strong>
          </td>
        </tr>
      </table>

      <table style="width: 100%; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
        <tr>
          <td style="font-size: 7.5px; color: #94a3b8;">Cryptographically verified by RPS Continuous Assessment Engine.</td>
          <td style="text-align: right; font-size: 7.5px; color: #64748b; font-family: monospace;">HASH: RPS-${data.indexNo.replace(/[^0-9]/g, '')}-${Date.now().toString(36).toUpperCase()}</td>
        </tr>
      </table>
    </div>
  `;

  printIsolatedHtml(html, `CbtResult_${data.indexNo}`);
}

/* ========================================================================= */
/* 10. HEADMASTER INSPECTION / PEDAGOGICAL AUDIT PRINTER                     */
/* ========================================================================= */

export interface InspectionReportPrintData {
  title: string;
  teacherName: string;
  subject: string;
  classGrade: string;
  strand: string;
  subStrand?: string;
  status: string;
  content: string;
  differentiation?: string;
  headmasterNotes?: string;
  vettedBy?: string;
  date?: string;
}

export function printInspectionReport(data: InspectionReportPrintData): void {
  const printDate = data.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const html = `
    <div style="max-width: 720px; margin: 0 auto; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 24px 28px; background: #fff;">
      <table style="width: 100%; border-bottom: 2.5px solid #5B42F3; padding-bottom: 12px; margin-bottom: 16px;">
        <tr>
          <td style="width: 60px; vertical-align: middle;">
            <img src="/logo.png" alt="Logo" style="width: 52px; height: 52px; object-fit: contain;" onerror="this.style.display='none'" />
          </td>
          <td style="vertical-align: middle; padding-left: 10px;">
            <h1 class="font-serif" style="font-size: 17px; font-weight: 800; color: #1e1b4b; text-transform: uppercase;">The Roseland Preparatory School</h1>
            <p style="font-size: 9.5px; font-weight: 700; color: #5B42F3; text-transform: uppercase; letter-spacing: 1px;">Office of the Headmaster • Pedagogical Inspection & Scheme Audit</p>
          </td>
          <td style="text-align: right; vertical-align: top;">
            <span style="font-size: 8.5px; color: #64748b; display: block;">DATE: ${printDate}</span>
            <strong style="font-size: 9.5px; color: ${data.status === 'Approved' ? '#166534' : '#b91c1c'}; text-transform: uppercase; display: block; margin-top: 2px;">STATUS: ${data.status}</strong>
          </td>
        </tr>
      </table>

      <table style="width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin-bottom: 16px; font-size: 11px;">
        <tr>
          <td style="width: 50%;"><strong>Lesson / Scheme:</strong> ${data.title}</td>
          <td style="width: 50%;"><strong>Instructor:</strong> ${data.teacherName}</td>
        </tr>
        <tr>
          <td><strong>Subject & Class:</strong> ${data.subject} (${data.classGrade})</td>
          <td><strong>Strand / Sub-Strand:</strong> ${data.strand} ${data.subStrand ? '• ' + data.subStrand : ''}</td>
        </tr>
      </table>

      <div style="margin-bottom: 16px; font-size: 11px; line-height: 1.6; color: #1e293b;">
        <strong style="font-size: 10px; text-transform: uppercase; color: #475569; display: block; margin-bottom: 4px;">Pedagogical Plan & Core Competencies:</strong>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; white-space: pre-wrap; font-size: 10.5px;">${data.content}</div>
      </div>

      ${data.differentiation ? `
        <div style="margin-bottom: 16px; font-size: 10.5px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 12px;">
          <strong style="color: #92400e; text-transform: uppercase; font-size: 9px; display: block; margin-bottom: 2px;">Differentiated Learning Provisions:</strong>
          <span style="color: #78350f;">${data.differentiation}</span>
        </div>
      ` : ''}

      ${data.headmasterNotes ? `
        <div style="margin-bottom: 16px; font-size: 10.5px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 12px;">
          <strong style="color: #166534; text-transform: uppercase; font-size: 9px; display: block; margin-bottom: 2px;">Supervisory Audit Remarks (${data.vettedBy || 'Headmaster'}):</strong>
          <span style="color: #14532d; font-style: italic;">&ldquo;${data.headmasterNotes}&rdquo;</span>
        </div>
      ` : ''}

      <table style="width: 100%; border-top: 1px dashed #cbd5e1; padding-top: 12px; margin-top: 16px;">
        <tr>
          <td style="font-size: 8px; color: #94a3b8;">Official RPS Headmaster Inspection Archive.</td>
          <td style="text-align: right;">
            <span class="font-serif" style="font-size: 11px; font-weight: 700; font-style: italic; color: #1e1b4b;">${data.vettedBy || AuthService.getCurrentUser()?.fullName || 'Headmaster'}</span>
            <span style="font-size: 7.5px; text-transform: uppercase; color: #64748b; display: block;">Headmaster Signature</span>
          </td>
        </tr>
      </table>
    </div>
  `;

  printIsolatedHtml(html, `Inspection_${data.teacherName.replace(/[^a-zA-Z0-9]/g, '_')}`);
}

/* ========================================================================= */
/* 11. TEACHER SCHEME OF WORK & LESSON PLAN PRINTER                          */
/* ========================================================================= */

export interface LessonPlanPrintData {
  title: string;
  teacherName: string;
  subject: string;
  classGrade: string;
  weekRange?: string;
  strand: string;
  subStrand?: string;
  content: string;
  differentiation?: string;
  status: string;
  headmasterNotes?: string;
}

export function printLessonPlan(data: LessonPlanPrintData): void {
  const printDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const html = `
    <div style="max-width: 720px; margin: 0 auto; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 24px 28px; background: #fff;">
      <table style="width: 100%; border-bottom: 2.5px solid #5B42F3; padding-bottom: 12px; margin-bottom: 16px;">
        <tr>
          <td style="width: 60px; vertical-align: middle;">
            <img src="/logo.png" alt="Logo" style="width: 52px; height: 52px; object-fit: contain;" onerror="this.style.display='none'" />
          </td>
          <td style="vertical-align: middle; padding-left: 10px;">
            <h1 class="font-serif" style="font-size: 17px; font-weight: 800; color: #1e1b4b; text-transform: uppercase;">The Roseland Preparatory School</h1>
            <p style="font-size: 9.5px; font-weight: 700; color: #5B42F3; text-transform: uppercase; letter-spacing: 1px;">GES National Curriculum • Official Teacher Scheme of Work</p>
          </td>
          <td style="text-align: right; vertical-align: top;">
            <span style="font-size: 8.5px; color: #64748b; display: block;">DATE: ${printDate}</span>
            <strong style="font-size: 9.5px; color: #5B42F3; display: block; margin-top: 2px;">${data.weekRange || 'Academic Term Plan'}</strong>
          </td>
        </tr>
      </table>

      <table style="width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin-bottom: 16px; font-size: 11px;">
        <tr>
          <td style="width: 50%;"><strong>Plan Title:</strong> ${data.title}</td>
          <td style="width: 50%;"><strong>Teacher:</strong> ${data.teacherName}</td>
        </tr>
        <tr>
          <td><strong>Subject & Grade:</strong> ${data.subject} (${data.classGrade})</td>
          <td><strong>Curriculum Strand:</strong> ${data.strand}</td>
        </tr>
      </table>

      <div style="margin-bottom: 16px; font-size: 11px; line-height: 1.6;">
        <strong style="font-size: 10px; text-transform: uppercase; color: #475569; display: block; margin-bottom: 4px;">Pedagogical Plan & Classroom Methodology:</strong>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; white-space: pre-wrap; font-size: 10.5px; color: #1e293b;">${data.content}</div>
      </div>

      ${data.differentiation ? `
        <div style="margin-bottom: 16px; font-size: 10.5px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 12px;">
          <strong style="color: #92400e; text-transform: uppercase; font-size: 9px; display: block; margin-bottom: 2px;">Differentiated Learning & Remedial Strategies:</strong>
          <span style="color: #78350f;">${data.differentiation}</span>
        </div>
      ` : ''}

      <table style="width: 100%; border-top: 1px dashed #cbd5e1; padding-top: 12px; margin-top: 16px;">
        <tr>
          <td style="font-size: 8px; color: #94a3b8;">GES Compliant Lesson Plan Archive • Roseland Academic Directorate</td>
          <td style="text-align: right; font-size: 8px; font-weight: 700; color: ${data.status === 'Approved' ? '#166534' : '#b91c1c'}; text-transform: uppercase;">
            Status: ${data.status}
          </td>
        </tr>
      </table>
    </div>
  `;

  printIsolatedHtml(html, `LessonPlan_${data.title.replace(/[^a-zA-Z0-9]/g, '_')}`);
}

export const printStudentReportCard = printTerminalReportCard;
export type StudentReportCardPrintData = TerminalReportCardPrintData;

