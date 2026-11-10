"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { RoselandApi } from '@/lib/api';
import { AuthService } from '@/lib/auth';

interface CohortRecipient {
  name: string;
  phone: string;
  subLabel: string;
}

interface CohortInfo {
  label: string;
  totalRecipients: number;
  smsReachable: number;
  sampleRecipients: CohortRecipient[];
}

interface BroadcastLog {
  id: string;
  title: string;
  message: string;
  recipients: string;
  recipientCount: number;
  channel: string;
  date: string;
  status: string;
  sentBy?: string;
}

const DEFAULT_COHORT_LABELS = [
  'All Parents (Whole School)',
  'Early Years Parents (Crèche, Nursery & KG)',
  'Primary Cohort Parents (Basic 1–Basic 6)',
  'JHS Cohort Parents (Basic 7–Basic 9)',
  'JHS 3 BECE Candidates Parents (Basic 9)',
  'Fee Defaulters & Debtors',
  'All Faculty & Staff',
];

function isValidRealPhone(phone?: string | null): boolean {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 9) return false;
  if (digits.endsWith('0000000')) return false;
  return true;
}

function normalizePhoneKey(phone?: string | null): string {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 9 ? digits.slice(-9) : digits;
}

export default function AdminCommunicationsPage() {
  const [recipientTarget, setRecipientTarget] = useState('All Parents (Whole School)');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [messageChannel, setMessageChannel] = useState<'SMS' | 'WhatsApp' | 'Portal Notice'>('SMS');
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [cohorts, setCohorts] = useState<CohortInfo[]>([]);
  const [loadingCohorts, setLoadingCohorts] = useState(true);
  const [pastBroadcasts, setPastBroadcasts] = useState<BroadcastLog[]>([]);

  // Load cohorts (from backend /api/v1/notify/cohorts with client-side SIS/Finance/HR fallback)
  const loadCohorts = useCallback(async () => {
    setLoadingCohorts(true);
    try {
      const res = await RoselandApi.notify.getCohorts();
      if (res?.cohorts && Array.isArray(res.cohorts) && res.cohorts.length > 0) {
        setCohorts(res.cohorts);
        setLoadingCohorts(false);
        return;
      }
    } catch {
      // Fallback to computing cohorts directly from live SIS, Finance, and HR APIs
    }

    try {
      const [stuRes, invRes, staffRes, clsRes] = await Promise.allSettled([
        RoselandApi.sis.getStudents(),
        RoselandApi.finance.getInvoices(),
        RoselandApi.hr.getStaff(),
        RoselandApi.sis.getClasses(),
      ]);

      const students =
        stuRes.status === 'fulfilled'
          ? Array.isArray(stuRes.value?.data)
            ? stuRes.value.data
            : Array.isArray(stuRes.value)
            ? stuRes.value
            : []
          : [];
      const invoices =
        invRes.status === 'fulfilled'
          ? Array.isArray(invRes.value?.data)
            ? invRes.value.data
            : Array.isArray(invRes.value)
            ? invRes.value
            : []
          : [];
      const staff =
        staffRes.status === 'fulfilled'
          ? Array.isArray(staffRes.value?.data)
            ? staffRes.value.data
            : Array.isArray(staffRes.value)
            ? staffRes.value
            : []
          : [];
      const classes =
        clsRes.status === 'fulfilled'
          ? Array.isArray(clsRes.value?.data)
            ? clsRes.value.data
            : Array.isArray(clsRes.value)
            ? clsRes.value
            : []
          : [];

      const owingIndices = new Set<string>();
      invoices.forEach((inv: any) => {
        if (Number(inv.balance ?? 0) > 0) {
          const idx = inv.student_index_no || inv.studentIndexNo;
          if (idx) owingIndices.add(idx);
        }
      });

      const classLabels = classes.map((c: any) => `${c.name} Parents`);
      const allLabels = [...DEFAULT_COHORT_LABELS, ...classLabels];

      const buildForLabel = (label: string): CohortInfo => {
        const upper = label.toUpperCase();
        if (upper.includes('FACULTY') || upper.includes('STAFF')) {
          const members: CohortRecipient[] = staff.map((st: any) => ({
            name: st.full_name || st.name || 'Staff Member',
            phone: isValidRealPhone(st.phone) ? st.phone : '',
            subLabel: st.role || 'Staff',
          }));
          return {
            label,
            totalRecipients: members.length,
            smsReachable: members.filter((m) => Boolean(m.phone)).length,
            sampleRecipients: members.slice(0, 5),
          };
        }

        const matchedStudents = students.filter((s: any) => {
          const g = String(s.class_grade || '').toUpperCase();
          const sIdx = s.index_no || s.index_number || s.id;
          const feeSt = String(s.fee_status || '').toUpperCase();

          if (upper.includes('ALL PARENTS') || upper.includes('WHOLE SCHOOL')) return true;
          if (upper.includes('EARLY YEARS')) {
            return g.includes('CRECHE') || g.includes('CRÈCHE') || g.includes('NURSERY') || g.includes('KG');
          }
          if (upper.includes('PRIMARY COHORT')) {
            return /BASIC [1-6]/.test(g) || g.includes('PRIMARY');
          }
          if (upper.includes('BECE') || upper.includes('JHS 3')) {
            return g.includes('BASIC 9') || g.includes('JHS 3');
          }
          if (upper.includes('JHS COHORT')) {
            return /BASIC [7-9]/.test(g) || g.includes('JHS');
          }
          if (upper.includes('DEFAULTER') || upper.includes('DEBTOR')) {
            return owingIndices.has(sIdx) || ['OWING', 'PARTIAL', 'UNPAID', 'OVERDUE'].includes(feeSt);
          }
          const targetGrade = label.replace(/\s*Parents$/i, '').trim().toUpperCase();
          return g === targetGrade;
        });

        const map = new Map<string, CohortRecipient>();
        matchedStudents.forEach((s: any) => {
          const sIdx = s.index_no || s.index_number || s.id;
          const fullName = s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim();
          const rawPhone = isValidRealPhone(s.parent_phone)
            ? s.parent_phone
            : isValidRealPhone(s.emergency_phone)
            ? s.emergency_phone
            : '';
          const key = rawPhone ? normalizePhoneKey(rawPhone) : `stu-${sIdx}`;
          const existing = map.get(key);
          if (existing) {
            if (!existing.subLabel.includes(fullName)) {
              existing.subLabel = `${existing.subLabel}, ${fullName} (${s.class_grade})`;
            }
          } else {
            map.set(key, {
              name: s.parent_name || `Parent of ${fullName}`,
              phone: rawPhone,
              subLabel: `${fullName} (${s.class_grade})`,
            });
          }
        });

        const members = Array.from(map.values());
        return {
          label,
          totalRecipients: members.length,
          smsReachable: members.filter((m) => Boolean(m.phone)).length,
          sampleRecipients: members.slice(0, 5),
        };
      };

      setCohorts(allLabels.map(buildForLabel));
    } catch (err) {
      console.warn('Cohort fallback error:', err);
    } finally {
      setLoadingCohorts(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const res = await RoselandApi.notify.getLogs();
      if (res && Array.isArray(res)) {
        const mapped: BroadcastLog[] = res.map((l: any, idx: number) => ({
          id: l.id || `BC-${100 + idx}`,
          title: l.title || (l.message ? l.message.slice(0, 42) : 'Institutional Notice'),
          message: l.message || '',
          recipients: l.targetGroup || l.phone || l.recipient || 'All Registered Contacts',
          recipientCount: Number(l.recipientCount ?? 0),
          channel: l.channel || 'SMS',
          date: l.timestamp
            ? new Date(l.timestamp).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Recently',
          status: l.status === 'DELIVERED' ? 'Delivered (100%)' : l.status || 'Dispatched',
          sentBy: l.sentBy || 'Administration',
        }));
        setPastBroadcasts(mapped);
      } else {
        setPastBroadcasts([]);
      }
    } catch (err) {
      console.warn('Broadcast logs loading failed', err);
      setPastBroadcasts([]);
    }
  }, []);

  useEffect(() => {
    loadCohorts();
    loadLogs();
  }, [loadCohorts, loadLogs]);

  const activeCohort = useMemo(() => {
    return cohorts.find((c) => c.label === recipientTarget) || null;
  }, [cohorts, recipientTarget]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) {
      toast.error('Please enter a message to broadcast.');
      return;
    }

    const matchedCount = activeCohort?.totalRecipients ?? 0;
    if (matchedCount === 0 && cohorts.length > 0) {
      toast.error(`No active recipients found in "${recipientTarget}". Please select a cohort with enrolled members.`);
      return;
    }

    setIsSending(true);
    const title = broadcastTitle.trim() || 'Official School Announcement';
    const currentUser = AuthService.getCurrentUser();
    const sentBy = currentUser?.fullName || 'Administration';

    try {
      const res = await RoselandApi.notify.sendBroadcast({
        targetGroup: recipientTarget,
        title,
        message: messageText.trim(),
        channel: messageChannel,
        sentBy,
      });

      const resolvedCount = Number(res?.recipientsCount ?? matchedCount);
      toast.success(
        `Dispatched ${messageChannel} "${title}" to ${recipientTarget} (${resolvedCount} recipient${resolvedCount === 1 ? '' : 's'})!`
      );

      setMessageText('');
      setBroadcastTitle('');
      await loadLogs();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to dispatch broadcast');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    setPastBroadcasts((prev) => prev.filter((b) => b.id !== id));
    try {
      await RoselandApi.notify.deleteLog(id);
      toast.success('Broadcast log removed.');
    } catch {
      // optimistic removal
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-violet block mb-1">
            Omni-Channel Messaging Hub
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
            Communications & SMS Center
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
            Dispatch targeted SMS alerts, WhatsApp advisories, and in-portal announcements to verified school cohorts.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase text-gray-400 block">Selected Cohort Reach</span>
            <strong className="text-xl font-serif font-bold text-brand-violet">
              {loadingCohorts ? '...' : `${activeCohort?.totalRecipients ?? 0} Contacts`}
            </strong>
          </div>
        </div>
      </div>

      {/* Grid: Composer (Left) & History (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Composer (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="font-serif font-bold text-lg text-brand-textMain">Compose Notification</h3>
            <p className="text-xs text-brand-textMuted">
              Target specific student cohorts, fee defaulters, class streams, or faculty members.
            </p>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-brand-textMain uppercase mb-1.5">
                Announcement Title *
              </label>
              <input
                type="text"
                required
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="e.g. End of Term Examination & Vacation Notice"
                className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-brand-violet font-medium"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-brand-textMain uppercase">
                  Target Audience Cohort *
                </label>
                {activeCohort && (
                  <span className="text-[11px] font-bold text-brand-violet">
                    {activeCohort.totalRecipients} matched ({activeCohort.smsReachable} with verified SMS numbers)
                  </span>
                )}
              </div>
              <select
                value={recipientTarget}
                onChange={(e) => setRecipientTarget(e.target.value)}
                className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-brand-violet font-semibold"
              >
                {(cohorts.length > 0 ? cohorts : DEFAULT_COHORT_LABELS.map((l) => ({ label: l, totalRecipients: 0, smsReachable: 0, sampleRecipients: [] }))).map((c) => (
                  <option key={c.label} value={c.label}>
                    {c.label} {cohorts.length > 0 ? `(${c.totalRecipients} contacts)` : ''}
                  </option>
                ))}
              </select>

              {/* Live Cohort Verification Preview */}
              {activeCohort && (
                <div className="mt-2.5 p-3 rounded-2xl bg-gray-50 border border-gray-100 text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-600 flex items-center gap-1.5">
                      <i className="ph-bold ph-users-three text-brand-violet"></i>
                      Live Cohort Resolution:
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      activeCohort.totalRecipients > 0
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {activeCohort.totalRecipients} Recipient{activeCohort.totalRecipients === 1 ? '' : 's'}
                    </span>
                  </div>
                  {activeCohort.sampleRecipients.length > 0 ? (
                    <p className="text-gray-500 leading-relaxed">
                      <strong>Sample Recipients:</strong>{' '}
                      {activeCohort.sampleRecipients
                        .map((r) => `${r.name} [${r.subLabel}]${r.phone ? ` • ${r.phone}` : ''}`)
                        .join(' | ')}
                      {activeCohort.totalRecipients > activeCohort.sampleRecipients.length
                        ? ` +${activeCohort.totalRecipients - activeCohort.sampleRecipients.length} more`
                        : ''}
                    </p>
                  ) : (
                    <p className="text-amber-700 font-medium">
                      No active students or staff currently match this cohort filter.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-textMain uppercase mb-1.5">
                Delivery Channel *
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['SMS', 'WhatsApp', 'Portal Notice'] as const).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setMessageChannel(ch)}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-colors border cursor-pointer ${
                      messageChannel === ch
                        ? 'bg-brand-violetLight text-brand-violet border-brand-violet/30'
                        : 'bg-brand-bg text-brand-textMuted border-gray-200 hover:text-brand-textMain'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">
                {messageChannel === 'SMS' &&
                  'Dispatches via SMS gateway (Arkesel / mNotify) to all verified phone numbers in the cohort AND posts to their Portal Notification Bell.'}
                {messageChannel === 'WhatsApp' &&
                  'Logs the advisory to the cohort and allows direct WhatsApp follow-up with cohort members.'}
                {messageChannel === 'Portal Notice' &&
                  'Delivers directly into the in-app Notification Bell for all members of the selected cohort.'}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-brand-textMain uppercase">
                  Message Body *
                </label>
                <span className="text-[11px] text-gray-400 font-mono">
                  {messageText.length} chars ({Math.ceil(messageText.length / 160) || 1} SMS unit)
                </span>
              </div>
              <textarea
                rows={5}
                required
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type school announcement, PTA update, fee reminder, or urgent notice here..."
                className="w-full bg-brand-bg border border-gray-200 rounded-2xl p-4 text-xs outline-none focus:border-brand-violet leading-relaxed"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={isSending || (cohorts.length > 0 && (activeCohort?.totalRecipients ?? 0) === 0)}
              className="w-full py-3.5 bg-brand-violet text-white font-bold rounded-xl text-xs hover:bg-brand-violetDark shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSending ? (
                <span>Dispatching to {activeCohort?.totalRecipients ?? ''} Cohort Recipients...</span>
              ) : (
                <>
                  <i className="ph-bold ph-paper-plane-tilt text-base"></i>
                  Dispatch {messageChannel} to {recipientTarget} ({activeCohort?.totalRecipients ?? 0})
                </>
              )}
            </button>
          </form>
        </div>

        {/* History (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4 flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-lg text-brand-textMain">Broadcast Dispatch Logs</h3>
              <p className="text-xs text-brand-textMuted">Persistent history of circulars and cohort dispatches.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                loadCohorts();
                loadLogs();
              }}
              className="p-2 rounded-xl text-gray-400 hover:text-brand-violet hover:bg-gray-50 transition-colors"
              title="Refresh logs"
            >
              <i className="ph-bold ph-arrows-clockwise text-sm"></i>
            </button>
          </div>

          <div className="divide-y divide-gray-100 max-h-[540px] overflow-y-auto pr-1">
            {pastBroadcasts.length === 0 ? (
              <div className="text-center py-12 text-xs text-brand-textMuted">
                <i className="ph ph-envelope text-3xl text-gray-300 block mb-2"></i>
                No SMS or broadcast circulars dispatched yet.
              </div>
            ) : (
              pastBroadcasts.map((bc) => (
                <div key={bc.id} className="py-4 space-y-1.5 group">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-brand-violet bg-brand-violetLight px-2 py-0.5 rounded-md">
                      {bc.id} • {bc.channel}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                        {bc.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteLog(bc.id)}
                        className="text-gray-300 hover:text-rose-600 transition-colors text-xs"
                        title="Remove log entry"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-brand-textMain">{bc.title}</h4>
                  {bc.message && (
                    <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-2">{bc.message}</p>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-semibold pt-1">
                    <span>
                      Cohort: <strong className="text-gray-600">{bc.recipients}</strong>
                      {bc.recipientCount > 0 ? ` (${bc.recipientCount} contacts)` : ''}
                    </span>
                    <span>{bc.date}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
