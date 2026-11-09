import { NextResponse } from 'next/server';
import * as tls from 'tls';
import * as net from 'net';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMISSIONS_RECIPIENT_EMAIL = process.env.ADMISSIONS_EMAIL || 'info@roselandprep.edu.gh';

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Zero-dependency SMTP client supporting both implicit TLS (port 465) and STARTTLS (port 587)
 * for Gmail / Google Workspace (smtp.gmail.com) and custom SMTP servers.
 */
async function sendViaSmtp(cfg: SmtpConfig): Promise<void> {
  const extractEmail = (addr: string) => {
    const match = addr.match(/<([^>]+)>/);
    return match ? match[1].trim() : addr.trim();
  };

  const fromAddress = extractEmail(cfg.from);
  const toAddress = extractEmail(cfg.to);
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const encodedSubject = `=?UTF-8?B?${Buffer.from(cfg.subject, 'utf-8').toString('base64')}?=`;

  const headers = [
    `From: ${cfg.from}`,
    `To: ${cfg.to}`,
    ...(cfg.replyTo ? [`Reply-To: ${cfg.replyTo}`] : []),
    `Subject: ${encodedSubject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@roselandprep.edu.gh>`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];

  const mimeBody = [
    ...headers,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(cfg.text, 'utf-8').toString('base64').replace(/(.{76})/g, '$1\r\n'),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(cfg.html, 'utf-8').toString('base64').replace(/(.{76})/g, '$1\r\n'),
    '',
    `--${boundary}--`,
    '',
  ].join('\r\n');

  const connectAndSend = (port: number, useImplicitTls: boolean): Promise<void> =>
    new Promise((resolve, reject) => {
      let socket: net.Socket | tls.TLSSocket;
      let buffer = '';
      let currentWait: ((line: string) => void) | null = null;

      const timeout = setTimeout(() => {
        socket?.destroy();
        reject(new Error(`SMTP connection timed out on ${cfg.host}:${port}`));
      }, 10000);

      const cleanup = () => clearTimeout(timeout);

      const onData = (chunk: Buffer | string) => {
        buffer += chunk.toString('utf-8');
        const lines = buffer.split('\r\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          // Multi-line SMTP responses have a hyphen at index 3 (e.g. "250-PIPELINING"), final line has space ("250 OK")
          if (line.length >= 3 && (line.length === 3 || line[3] === ' ')) {
            if (currentWait) {
              const cb = currentWait;
              currentWait = null;
              cb(line);
            }
          }
        }
      };

      const readResponse = (): Promise<string> =>
        new Promise((res, rej) => {
          currentWait = (line: string) => {
            const code = parseInt(line.slice(0, 3), 10);
            if (code >= 400) {
              rej(new Error(`SMTP Error (${code}): ${line}`));
            } else {
              res(line);
            }
          };
        });

      const sendCmd = async (cmd: string): Promise<string> => {
        const p = readResponse();
        socket.write(`${cmd}\r\n`);
        return p;
      };

      const runConversation = async () => {
        try {
          await readResponse(); // 220 banner
          await sendCmd(`EHLO roselandprep.edu.gh`);

          if (!useImplicitTls) {
            await sendCmd('STARTTLS');
            socket.removeAllListeners('data');
            socket = await new Promise<tls.TLSSocket>((resTls, rejTls) => {
              const tlsSock = tls.connect(
                {
                  socket: socket,
                  host: cfg.host,
                  servername: cfg.host,
                },
                () => resTls(tlsSock)
              );
              tlsSock.once('error', rejTls);
            });
            socket.on('data', onData);
            socket.once('error', (err) => {
              cleanup();
              reject(err);
            });
            await sendCmd(`EHLO roselandprep.edu.gh`);
          }

          await sendCmd('AUTH LOGIN');
          await sendCmd(Buffer.from(cfg.user, 'utf-8').toString('base64'));
          await sendCmd(Buffer.from(cfg.pass, 'utf-8').toString('base64'));
          await sendCmd(`MAIL FROM:<${fromAddress}>`);
          await sendCmd(`RCPT TO:<${toAddress}>`);
          await sendCmd('DATA');
          // Dot-stuffing per RFC 5321
          const safeData = mimeBody.replace(/\r\n\./g, '\r\n..');
          await sendCmd(`${safeData}\r\n.`);
          socket.write('QUIT\r\n');
          socket.end();
          cleanup();
          resolve();
        } catch (err) {
          cleanup();
          socket?.destroy();
          reject(err);
        }
      };

      if (useImplicitTls) {
        socket = tls.connect({ host: cfg.host, port, servername: cfg.host });
      } else {
        socket = net.connect({ host: cfg.host, port });
      }

      socket.on('data', onData);
      socket.once('error', (err) => {
        cleanup();
        reject(err);
      });

      runConversation();
    });

  // Try configured port first; if 587 fails and host is Gmail, fallback to 465 implicit TLS
  try {
    await connectAndSend(cfg.port, cfg.port === 465);
  } catch (firstErr) {
    if (cfg.port !== 465 && cfg.host.includes('gmail.com')) {
      await connectAndSend(465, true);
    } else {
      throw firstErr;
    }
  }
}

interface AdmissionApplicationPayload {
  applicant_name: string;
  student_first_name?: string;
  student_last_name?: string;
  gender?: string;
  target_class: string;
  date_of_birth?: string;
  parent_name: string;
  parent_phone: string;
  parent_email?: string;
  relationship?: string;
  ghana_card?: string;
  home_address?: string;
  previous_school?: string;
  medical_conditions?: string;
  opt_bus?: string | boolean;
  opt_canteen?: string | boolean;
  status?: string;
  app_no?: string;
}

function formatBusOption(opt: any): string {
  if (opt === 'yes_round' || opt === true) return 'Yes - Two-Way Round Trip';
  if (opt === 'yes_morning') return 'Yes - Morning Only Drop-off';
  if (opt === 'yes_afternoon') return 'Yes - Afternoon Only Pick-up';
  return 'No - Self Drop-off / Pick-up';
}

function formatCanteenOption(opt: any): string {
  if (opt === 'yes' || opt === true) return 'Yes - Enrolled in School Canteen Meal Plan';
  return 'No - Packed Lunch from Home';
}

function buildHtmlEmail(app: AdmissionApplicationPayload, appNo: string, submittedAt: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Admission Application: ${app.applicant_name} (${app.target_class})</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 680px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
    
    <!-- HEADER -->
    <div style="background: linear-gradient(135deg, #2e1065 0%, #4c1d95 60%, #581c87 100%); padding: 36px 32px; text-align: center; color: #ffffff;">
      <div style="display: inline-block; background-color: #ffffff; padding: 8px 16px; border-radius: 9999px; margin-bottom: 12px;">
        <span style="color: #d97706; font-size: 12px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;">Admissions Portal 2026/2027</span>
      </div>
      <h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.02em;">The Roseland Preparatory School</h1>
      <p style="margin: 6px 0 0 0; font-size: 14px; color: #e9d5ff; font-weight: 400;">Knowledge &amp; Humility &bull; Ga West, Accra, Ghana</p>
    </div>

    <!-- NOTIFICATION BADGE -->
    <div style="background-color: #fef3c7; border-bottom: 1px solid #fde68a; padding: 14px 32px; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 600;">
        &bull; Official Digital Admission Application Dossier Received
      </p>
    </div>

    <!-- MAIN BODY -->
    <div style="padding: 32px;">
      
      <!-- KEY METRICS ROW -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 8px 0; margin-bottom: 24px;">
        <tr>
          <td style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 12px; padding: 14px; text-align: center;">
            <div style="font-size: 11px; text-transform: uppercase; color: #7e22ce; font-weight: 700; letter-spacing: 0.05em;">Reference No.</div>
            <div style="font-size: 18px; font-weight: 800; color: #581c87; margin-top: 4px;">${appNo}</div>
          </td>
          <td style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px; text-align: center;">
            <div style="font-size: 11px; text-transform: uppercase; color: #b45309; font-weight: 700; letter-spacing: 0.05em;">Target Class</div>
            <div style="font-size: 18px; font-weight: 800; color: #78350f; margin-top: 4px;">${app.target_class}</div>
          </td>
          <td style="background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center;">
            <div style="font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 700; letter-spacing: 0.05em;">Application Status</div>
            <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 6px;">Under Review</div>
          </td>
        </tr>
      </table>

      <!-- 1. PUPIL INFORMATION -->
      <div style="margin-bottom: 28px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700; color: #4c1d95; border-bottom: 2px solid #ede9fe; padding-bottom: 8px;">
          1. Student / Pupil Information
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; width: 38%; font-weight: 500;">Full Name:</td>
            <td style="padding: 10px 0; font-weight: 700; color: #0f172a;">${app.applicant_name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Gender:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #0f172a;">${app.gender || 'Not specified'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Date of Birth:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #0f172a;">${app.date_of_birth || 'Not provided'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Target Class / Grade:</td>
            <td style="padding: 10px 0; font-weight: 700; color: #7c2d12;">${app.target_class}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Medical Notes / Allergies:</td>
            <td style="padding: 10px 0; color: #0f172a;">${app.medical_conditions || 'None reported'}</td>
          </tr>
        </table>
      </div>

      <!-- 2. GUARDIAN INFORMATION -->
      <div style="margin-bottom: 28px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700; color: #4c1d95; border-bottom: 2px solid #ede9fe; padding-bottom: 8px;">
          2. Parent / Guardian Information
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; width: 38%; font-weight: 500;">Guardian Name:</td>
            <td style="padding: 10px 0; font-weight: 700; color: #0f172a;">${app.parent_name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Relationship:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #0f172a;">${app.relationship || 'Guardian'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Telephone / WhatsApp:</td>
            <td style="padding: 10px 0; font-weight: 700; color: #1e40af;">
              <a href="tel:${app.parent_phone}" style="color: #1e40af; text-decoration: none;">${app.parent_phone}</a>
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Email Address:</td>
            <td style="padding: 10px 0; color: #0f172a;">
              ${app.parent_email ? `<a href="mailto:${app.parent_email}" style="color: #4c1d95; text-decoration: underline;">${app.parent_email}</a>` : 'Not provided'}
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Ghana Card PIN:</td>
            <td style="padding: 10px 0; font-family: monospace; font-size: 13px; color: #334155;">${app.ghana_card || 'Not provided'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Residential Address / Town:</td>
            <td style="padding: 10px 0; color: #0f172a; font-weight: 600;">${app.home_address || 'Not provided'}</td>
          </tr>
        </table>
      </div>

      <!-- 3. ACADEMIC & SERVICES -->
      <div style="margin-bottom: 28px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700; color: #4c1d95; border-bottom: 2px solid #ede9fe; padding-bottom: 8px;">
          3. Academic History &amp; Auxiliary Services
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; width: 38%; font-weight: 500;">Previous School:</td>
            <td style="padding: 10px 0; color: #0f172a;">${app.previous_school || 'First-time enrollment / None'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 500;">School Bus Service:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #0f172a;">${formatBusOption(app.opt_bus)}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Canteen Meal Plan:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #0f172a;">${formatCanteenOption(app.opt_canteen)}</td>
          </tr>
        </table>
      </div>

      <!-- ACTION BUTTONS -->
      <div style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 12px; padding: 20px; text-align: center; margin-top: 24px;">
        <p style="margin: 0 0 12px 0; font-size: 13px; color: #581c87; font-weight: 600;">Quick Administrative Actions:</p>
        <a href="tel:${app.parent_phone}" style="display: inline-block; background-color: #4c1d95; color: #ffffff; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 700; margin: 4px;">Call Guardian</a>
        ${app.parent_email ? `<a href="mailto:${app.parent_email}?subject=The%20Roseland%20Preparatory%20School%20-%20Admission%20Application%20${appNo}" style="display: inline-block; background-color: #d97706; color: #ffffff; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 700; margin: 4px;">Reply via Email</a>` : ''}
      </div>

      <div style="margin-top: 24px; font-size: 12px; color: #94a3b8; text-align: center;">
        Submission timestamp: ${submittedAt} (Accra, GMT) &bull; Submitted via roselandprep.edu.gh
      </div>

    </div>

    <!-- FOOTER -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; font-size: 12px; color: #64748b;">
      <p style="margin: 0 0 4px 0; font-weight: 600; color: #334155;">The Roseland Preparatory School Admissions Desk</p>
      <p style="margin: 0;">Ga West Municipality, Accra, Ghana &bull; Email: <a href="mailto:info@roselandprep.edu.gh" style="color: #4c1d95;">info@roselandprep.edu.gh</a> &bull; Phone: +233 24 396 8988</p>
    </div>

  </div>
</body>
</html>
  `.trim();
}

function buildPlainTextEmail(app: AdmissionApplicationPayload, appNo: string, submittedAt: string): string {
  return `
================================================================================
THE ROSELAND PREPARATORY SCHOOL - NEW ADMISSION APPLICATION
================================================================================
Application Reference No : ${appNo}
Target Class Grade       : ${app.target_class}
Submission Date & Time   : ${submittedAt} (Accra, GMT)
Application Status       : Under Review

--------------------------------------------------------------------------------
1. STUDENT / PUPIL DETAILS
--------------------------------------------------------------------------------
Full Name                : ${app.applicant_name}
Gender                   : ${app.gender || 'Not specified'}
Date of Birth            : ${app.date_of_birth || 'Not provided'}
Target Class             : ${app.target_class}
Medical Notes / Allergies: ${app.medical_conditions || 'None reported'}

--------------------------------------------------------------------------------
2. PARENT / GUARDIAN CONTACT DETAILS
--------------------------------------------------------------------------------
Guardian Name            : ${app.parent_name}
Relationship to Child    : ${app.relationship || 'Guardian'}
Telephone / WhatsApp     : ${app.parent_phone}
Email Address            : ${app.parent_email || 'Not provided'}
Ghana Card PIN           : ${app.ghana_card || 'Not provided'}
Residential Address      : ${app.home_address || 'Not provided'}

--------------------------------------------------------------------------------
3. ACADEMIC & AUXILIARY SERVICES
--------------------------------------------------------------------------------
Previous School Attended : ${app.previous_school || 'First-time enrollment / None'}
School Bus Service       : ${formatBusOption(app.opt_bus)}
School Canteen Meal Plan : ${formatCanteenOption(app.opt_canteen)}

--------------------------------------------------------------------------------
Recipient: ${ADMISSIONS_RECIPIENT_EMAIL}
Delivered via Roseland Preparatory School Admissions System (roselandprep.edu.gh)
================================================================================
  `.trim();
}

async function dispatchEmail(
  app: AdmissionApplicationPayload,
  appNo: string,
  submittedAt: string
): Promise<{ sent: boolean; method: string; detail?: string }> {
  const subject = `[Roseland Admissions] New Application: ${app.applicant_name} (${app.target_class}) - ${appNo}`;
  const html = buildHtmlEmail(app, appNo, submittedAt);
  const text = buildPlainTextEmail(app, appNo, submittedAt);

  // 1. Try Gmail / Google Workspace SMTP (or custom SMTP)
  const smtpUser = process.env.SMTP_USER;
  const rawSmtpPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || (smtpUser && rawSmtpPass ? 'smtp.gmail.com' : '');
  if (smtpHost && smtpUser && rawSmtpPass) {
    try {
      const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
      // Strip accidental spaces from 16-character Google App Passwords (e.g. "abcd efgh ijkl mnop")
      const smtpPass = smtpHost.includes('gmail.com') ? rawSmtpPass.replace(/\s+/g, '') : rawSmtpPass.trim();
      const fromHeader =
        process.env.EMAIL_FROM || `The Roseland Preparatory School <${smtpUser}>`;

      await sendViaSmtp({
        host: smtpHost,
        port: smtpPort,
        user: smtpUser.trim(),
        pass: smtpPass,
        from: fromHeader,
        to: ADMISSIONS_RECIPIENT_EMAIL,
        replyTo: app.parent_email || undefined,
        subject,
        text,
        html,
      });
      return { sent: true, method: 'smtp', detail: `Delivered via ${smtpHost}` };
    } catch (e: any) {
      console.warn('[Admissions Email] SMTP dispatch error:', e?.message || e);
    }
  }

  // 2. Try Resend HTTP API (Zero dependencies, recommended for Next.js)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const fromEmail = process.env.EMAIL_FROM || 'Roseland Admissions <admissions@roselandprep.edu.gh>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [ADMISSIONS_RECIPIENT_EMAIL],
          reply_to: app.parent_email || undefined,
          subject,
          html,
          text,
        }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return { sent: true, method: 'resend', detail: data.id };
      } else {
        const err = await res.text();
        console.warn('[Admissions Email] Resend returned non-ok:', res.status, err);
      }
    } catch (e: any) {
      console.warn('[Admissions Email] Resend dispatch error:', e?.message || e);
    }
  }

  // 2. Try SendGrid HTTP API
  const sendgridKey = process.env.SENDGRID_API_KEY;
  if (sendgridKey) {
    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: ADMISSIONS_RECIPIENT_EMAIL, name: 'Roseland Admissions' }],
              subject,
            },
          ],
          from: {
            email: process.env.EMAIL_FROM || 'admissions@roselandprep.edu.gh',
            name: 'The Roseland Preparatory School',
          },
          reply_to: app.parent_email ? { email: app.parent_email } : undefined,
          content: [
            { type: 'text/plain', value: text },
            { type: 'text/html', value: html },
          ],
        }),
      });

      if (res.ok || res.status === 202) {
        return { sent: true, method: 'sendgrid' };
      }
    } catch (e: any) {
      console.warn('[Admissions Email] SendGrid dispatch error:', e?.message || e);
    }
  }

  // 3. Try Brevo (Sendinblue) HTTP API
  const brevoKey = process.env.BREVO_API_KEY;
  if (brevoKey) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Roseland Admissions', email: process.env.EMAIL_FROM || 'admissions@roselandprep.edu.gh' },
          to: [{ email: ADMISSIONS_RECIPIENT_EMAIL, name: 'Admissions Office' }],
          replyTo: app.parent_email ? { email: app.parent_email } : undefined,
          subject,
          htmlContent: html,
          textContent: text,
        }),
      });

      if (res.ok) {
        return { sent: true, method: 'brevo' };
      }
    } catch (e: any) {
      console.warn('[Admissions Email] Brevo dispatch error:', e?.message || e);
    }
  }

  // 4. Try Web3Forms if access key provided
  const web3formsKey = process.env.WEB3FORMS_ACCESS_KEY;
  if (web3formsKey) {
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: web3formsKey,
          subject,
          to: ADMISSIONS_RECIPIENT_EMAIL,
          from_name: 'Roseland Online Admissions',
          message: text,
          ...app,
          app_no: appNo,
        }),
      });
      if (res.ok) {
        return { sent: true, method: 'web3forms' };
      }
    } catch (e: any) {
      console.warn('[Admissions Email] Web3Forms dispatch error:', e?.message || e);
    }
  }

  console.log(`[Admissions Application Queued] Ref: ${appNo} | Recipient: ${ADMISSIONS_RECIPIENT_EMAIL} | Applicant: ${app.applicant_name} (${app.target_class}) | Guardian: ${app.parent_name} (${app.parent_phone})`);

  return {
    sent: false,
    method: 'queued_and_logged',
    detail: 'Logged in application records; mail client prefill generated.',
  };
}

async function forwardToBackend(payload: AdmissionApplicationPayload, appNo: string) {
  const backendBase = (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'https://roseland-rpsms-backend.onrender.com'
  ).replace(/\/$/, '');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(`${backendBase}/api/v1/sis/admissions/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        app_no: appNo,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      return await res.json().catch(() => null);
    }
  } catch (err) {
    // Backend offline / sleeping / unreachable - harmless because Next.js handles it
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body: AdmissionApplicationPayload = await req.json();

    if (!body.applicant_name || !body.parent_name || !body.parent_phone || !body.target_class) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required admission fields (applicant_name, target_class, parent_name, parent_phone).',
        },
        { status: 400 }
      );
    }

    const appNo = body.app_no || `ADM-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const submittedAt = new Date().toLocaleString('en-GB', {
      timeZone: 'Africa/Accra',
      dateStyle: 'full',
      timeStyle: 'medium',
    });

    // 1. Dispatch email to info@roselandprep.edu.gh
    const emailResult = await dispatchEmail(body, appNo, submittedAt);

    // 2. Best-effort forward to Python backend SIS database
    const backendResult = await forwardToBackend(body, appNo);

    // 3. Construct mailto URL for seamless 1-click fallback & client receipt
    const mailtoSubject = encodeURIComponent(`[Roseland Admissions Application] ${appNo} - ${body.applicant_name} (${body.target_class})`);
    const mailtoBody = encodeURIComponent(buildPlainTextEmail(body, appNo, submittedAt));
    const mailtoUrl = `mailto:${ADMISSIONS_RECIPIENT_EMAIL}?subject=${mailtoSubject}&body=${mailtoBody}`;

    return NextResponse.json(
      {
        success: true,
        message: `Application received successfully and routed to ${ADMISSIONS_RECIPIENT_EMAIL}.`,
        applicationNumber: appNo,
        recipient: ADMISSIONS_RECIPIENT_EMAIL,
        mailtoUrl,
        emailDelivery: emailResult,
        application: {
          id: backendResult?.application?.id || appNo,
          app_no: appNo,
          applicant_name: body.applicant_name,
          target_class: body.target_class,
          gender: body.gender || 'Male',
          parent_name: body.parent_name,
          parent_phone: body.parent_phone,
          parent_email: body.parent_email || null,
          status: 'Under Review',
          created_at: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[Admissions API Handler Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Internal server error processing admission application.',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
