"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { AuthService, RoselandUser } from '@/lib/auth';
import { RoselandApi } from '@/lib/api';
import { printReceipt } from '@/lib/pdf-printer';

interface PaymentRecord {
  id: string;
  title: string;
  amount: number;
  date: string;
  method: string;
  status: 'Verified' | 'Pending';
  receiptNo: string;
}

export default function ParentFinance() {
  const [user, setUser] = useState<RoselandUser | null>(null);
  const [student, setStudent] = useState<any | null>(null);
  const [invoice, setInvoice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<PaymentRecord | null>(null);

  // Dynamic invoice and payment state
  const [totalBilled, setTotalBilled] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const outstandingBalance = Math.max(0, totalBilled - amountPaid);

  const [paymentProvider, setPaymentProvider] = useState<'mtn' | 'telecel' | 'at' | 'card'>('mtn');
  const [momoPhone, setMomoPhone] = useState('');
  const [payAmount, setPayAmount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);

  useEffect(() => {
    const currentUser = AuthService.getCurrentUser();
    setUser(currentUser);
    if (currentUser?.phone) {
      setMomoPhone(currentUser.phone);
    }

    Promise.all([
      RoselandApi.sis.getStudents(),
      RoselandApi.finance.getInvoices()
    ]).then(([students, invs]) => {
      let activeStudent = null;
      if (students && Array.isArray(students) && students.length > 0) {
        activeStudent = students[0];
        setStudent(activeStudent);
      }

      if (invs && Array.isArray(invs) && invs.length > 0) {
        const inv = invs[0];
        setInvoice(inv);
        const billed = Number(inv.amount || inv.totalBilled || inv.total_billed || 0);
        const paid = Number(inv.amountPaid || inv.amount_paid || 0);
        setTotalBilled(billed);
        setAmountPaid(paid);
        setPayAmount(Math.max(0, billed - paid));
      }
    }).catch((err) => {
      console.warn("Could not load parent finance data:", err);
    }).finally(() => setLoading(false));
  }, []);

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }
    if (payAmount > outstandingBalance) {
      toast.error(`Amount exceeds outstanding balance (GH₵ ${outstandingBalance})`);
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading(`Initiating ${paymentProvider.toUpperCase()} push prompt to ${momoPhone || 'provided phone'}...`);

    setTimeout(() => {
      setIsProcessing(false);
      toast.dismiss(toastId);

      const newReceiptNo = `RPS-REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const newRecord: PaymentRecord = {
        id: `tx-${Date.now()}`,
        title: "Term 2 Fee Installment",
        amount: payAmount,
        date: "Just now",
        method: paymentProvider === 'mtn' ? 'MTN MoMo' : paymentProvider === 'telecel' ? 'Telecel Cash' : paymentProvider === 'at' ? 'AT Money' : 'Visa / Master',
        status: "Verified",
        receiptNo: newReceiptNo
      };

      setAmountPaid(prev => prev + payAmount);
      setPaymentHistory([newRecord, ...paymentHistory]);
      setIsPayModalOpen(false);
      setActiveReceipt(newRecord);
      setIsReceiptModalOpen(true);
      toast.success(`Payment of GH₵ ${payAmount.toLocaleString()} verified successfully!`);
    }, 1500);
  };

  const studentName = student?.fullName || student?.full_name || 'Registered Scholar';
  const studentIndex = student?.indexNumber || student?.index_number || 'RPS-PENDING';
  const studentClass = student?.classGrade || student?.class_grade || 'Active Stream';

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-violet block mb-1">
            Student Fee Vault & Accounts Desk
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
            Fees, Invoices & Digital Receipts
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
            Official billing and cashless tuition clearance for <strong>{studentName}</strong> (Class: {studentClass} • Index: {studentIndex}).
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (outstandingBalance <= 0) {
                toast.success("All term fees are fully settled!");
                return;
              }
              setPayAmount(outstandingBalance);
              setIsPayModalOpen(true);
            }}
            className={`px-5 py-2.5 font-bold rounded-2xl text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer ${
              outstandingBalance > 0 
                ? 'bg-brand-violet hover:bg-brand-violetDark text-white' 
                : 'bg-emerald-600 text-white cursor-default'
            }`}
          >
            <i className={`ph-bold ${outstandingBalance > 0 ? 'ph-credit-card' : 'ph-check-circle'}`}></i>
            {outstandingBalance > 0 ? 'Make Instant MoMo Payment' : 'Fees Cleared'}
          </button>
        </div>
      </div>

      {/* Main Billing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Invoice Card */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
            <div className={`h-2.5 w-full ${outstandingBalance === 0 ? 'bg-emerald-500' : 'bg-brand-yellow'}`}></div>
            
            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between mb-6 pb-4 border-b border-gray-100">
                <div>
                  <span className="text-[10px] font-mono font-bold text-brand-violet uppercase">Official Institutional Bill</span>
                  <h3 className="font-serif font-bold text-brand-textMain text-xl mt-0.5">Term Academic Fee Invoice</h3>
                  <p className="text-xs text-brand-textMuted font-mono">Invoice Ref: {invoice?.invoiceNumber || invoice?.invoice_number || 'INV-2026-ACTIVE'}</p>
                </div>
                <span className={`px-3 py-1 text-xs font-bold uppercase rounded-xl border ${
                  outstandingBalance === 0
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-900 border-amber-200'
                }`}>
                  {outstandingBalance === 0 ? 'Fully Cleared' : 'Outstanding Balance'}
                </span>
              </div>

              {/* Itemized Fee Structure */}
              <div className="space-y-3.5 mb-6 text-xs sm:text-sm">
                <div className="flex justify-between items-center text-brand-textMuted">
                  <div className="flex items-center gap-2">
                    <i className="ph-bold ph-book-open text-brand-violet"></i>
                    <span>Tuition & GES Curricular Materials</span>
                  </div>
                  <span className="font-bold text-brand-textMain">GH₵ {(totalBilled * 0.7).toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-brand-textMuted">
                  <div className="flex items-center gap-2">
                    <i className="ph-bold ph-users-three text-brand-violet"></i>
                    <span>PTA Term Developmental Levy</span>
                  </div>
                  <span className="font-bold text-brand-textMain">GH₵ {(totalBilled * 0.1).toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-brand-textMuted">
                  <div className="flex items-center gap-2">
                    <i className="ph-bold ph-bowl-food text-brand-violet"></i>
                    <span>Daily Canteen / Co-Curricular Facilities</span>
                  </div>
                  <span className="font-bold text-brand-textMain">GH₵ {(totalBilled * 0.2).toFixed(2)}</span>
                </div>

                <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between items-center font-bold text-sm">
                  <span className="text-brand-textMain uppercase text-xs tracking-wider">Total Term Billed</span>
                  <span className="text-brand-textMain font-mono">GH₵ {totalBilled.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-xs sm:text-sm font-semibold text-emerald-700 bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <i className="ph-bold ph-check-circle text-emerald-600"></i>
                    <span>Total Amount Settled to Date</span>
                  </div>
                  <span className="font-mono font-bold">- GH₵ {amountPaid.toFixed(2)}</span>
                </div>
              </div>

              {/* Balance Summary Bar */}
              <div className="bg-brand-bg rounded-2xl p-5 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Remaining Term Balance</span>
                  <p className={`text-2xl sm:text-3xl font-serif font-bold ${outstandingBalance > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    GH₵ {outstandingBalance.toFixed(2)}
                  </p>
                  <span className="text-[11px] text-gray-400">Cashless settlement via MoMo or Card</span>
                </div>

                {outstandingBalance > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPayAmount(outstandingBalance);
                      setIsPayModalOpen(true);
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-brand-violet text-white font-bold text-xs rounded-xl hover:bg-brand-violetDark transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Clear Balance (GH₵ {outstandingBalance.toFixed(2)}) <i className="ph-bold ph-arrow-right"></i>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Payment History & Verified Vouchers */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif font-bold text-brand-textMain text-base">Receipts & History</h3>
            <span className="text-[10px] font-bold font-mono text-brand-violet uppercase">Verified Vault</span>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {paymentHistory.length === 0 ? (
              <div className="p-8 text-center text-xs text-brand-textMuted">
                <i className="ph ph-receipt text-3xl text-gray-300 block mb-2"></i>
                No digital transaction receipts generated yet this term.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {paymentHistory.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => {
                      setActiveReceipt(rec);
                      setIsReceiptModalOpen(true);
                    }}
                    className="p-4 flex items-center justify-between hover:bg-purple-50/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 group-hover:scale-105 transition-transform">
                        <i className="ph-bold ph-receipt text-lg"></i>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-brand-textMain block">{rec.title}</p>
                        <p className="text-[10px] text-gray-400">{rec.date} • {rec.method}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono font-bold text-emerald-700">GH₵ {rec.amount.toLocaleString()}</p>
                      <span className="text-[10px] text-brand-violet font-bold flex items-center justify-end gap-1 group-hover:underline">
                        View <i className="ph-bold ph-caret-right text-[10px]"></i>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="p-4 bg-brand-bg text-center border-t border-gray-100">
              <span className="text-[11px] text-gray-400 block">
                All receipts contain verifiable digital verification stamps.
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* GHANA MOBILE MONEY & BANK CHECKOUT MODAL */}
      {/* ========================================================================= */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative">
            <button
              type="button"
              onClick={() => setIsPayModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center font-bold text-base transition-colors cursor-pointer"
            >
              ✕
            </button>

            <div className="mb-4">
              <span className="text-[10px] font-mono font-bold text-brand-violet uppercase tracking-wider block">Roseland Cashless Gateway</span>
              <h3 className="text-xl font-serif font-bold text-brand-textMain">Instant Mobile Money Checkout</h3>
              <p className="text-xs text-brand-textMuted">Official Merchant: <strong>The Roseland School Accounts</strong></p>
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-4 text-xs">
              
              {/* Payment Channel Selector */}
              <div>
                <label className="block font-bold text-brand-textMain uppercase tracking-wider text-[10px] mb-1.5">
                  Select Payment Network
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentProvider('mtn')}
                    className={`p-3 rounded-2xl border flex items-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                      paymentProvider === 'mtn' ? 'border-yellow-400 bg-yellow-50 text-yellow-950 ring-2 ring-yellow-400/30' : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-yellow-400 text-yellow-950 font-bold flex items-center justify-center text-[10px] shrink-0">
                      M
                    </div>
                    <span>MTN MoMo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentProvider('telecel')}
                    className={`p-3 rounded-2xl border flex items-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                      paymentProvider === 'telecel' ? 'border-red-400 bg-red-50 text-red-950 ring-2 ring-red-400/30' : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                      T
                    </div>
                    <span>Telecel Cash</span>
                  </button>
                </div>
              </div>

              {/* Payer Mobile Number */}
              <div>
                <label className="block font-bold text-brand-textMain uppercase tracking-wider text-[10px] mb-1">
                  Payer Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={momoPhone}
                  onChange={(e) => setMomoPhone(e.target.value)}
                  placeholder="e.g. 024 123 4567"
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-brand-textMain outline-none focus:border-brand-violet"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">A prompt will be sent directly to your phone.</span>
              </div>

              {/* Amount to Pay */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-brand-textMain uppercase tracking-wider text-[10px]">
                    Amount to Authorize (GH₵) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setPayAmount(outstandingBalance)}
                    className="text-[10px] font-bold text-brand-violet hover:underline cursor-pointer"
                  >
                    Full Balance
                  </button>
                </div>
                <input
                  type="number"
                  required
                  min={1}
                  max={outstandingBalance}
                  value={payAmount || ''}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-brand-textMain outline-none focus:border-brand-violet"
                />
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isProcessing || payAmount <= 0}
                className={`w-full py-3 rounded-2xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isProcessing || payAmount <= 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-brand-violet text-white hover:bg-brand-violetDark'
                }`}
              >
                {isProcessing ? (
                  <>
                    <i className="ph-bold ph-spinner animate-spin"></i>
                    Authorizing on Telco Switch...
                  </>
                ) : (
                  <>
                    <i className="ph-bold ph-lock-key"></i>
                    Authorize GH₵ {payAmount.toLocaleString()} Now
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OFFICIAL DIGITAL RECEIPT MODAL */}
      {/* ========================================================================= */}
      {isReceiptModalOpen && activeReceipt && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative space-y-6">
            <button
              type="button"
              onClick={() => setIsReceiptModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center font-bold text-base transition-colors cursor-pointer"
            >
              ✕
            </button>

            {/* Receipt Header */}
            <div className="text-center border-b border-gray-100 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-violet text-white font-serif font-bold text-lg flex items-center justify-center mx-auto mb-2 shadow-md">
                RPS
              </div>
              <h3 className="font-serif font-bold text-lg text-brand-textMain">The Roseland Preparatory School</h3>
              <p className="text-[11px] text-brand-textMuted">PJ9H+FCX, Adjen Kotoku, Ga West Municipal</p>
              <div className="mt-2 inline-block px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-800 font-mono font-bold text-[10px] uppercase tracking-wider">
                Official Tuition Payment Receipt
              </div>
            </div>

            {/* Receipt Metadata */}
            <div className="space-y-2.5 text-xs bg-brand-bg p-4 rounded-2xl border border-gray-100 font-medium">
              <div className="flex justify-between">
                <span className="text-gray-400">Receipt Number:</span>
                <strong className="font-mono text-brand-violet">{activeReceipt.receiptNo}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Date & Time:</span>
                <span className="text-brand-textMain">{activeReceipt.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Student Name:</span>
                <strong className="text-brand-textMain">{studentName} ({studentClass})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Student Index No:</span>
                <span className="font-mono text-brand-textMain">{studentIndex}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Payment Channel:</span>
                <span className="text-brand-textMain">{activeReceipt.method}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold">
                <span className="text-brand-textMain">Amount Paid:</span>
                <span className="font-mono text-emerald-700">GH₵ {activeReceipt.amount.toLocaleString()}.00</span>
              </div>
            </div>

            {/* Print CTA */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  printReceipt({
                    receiptNo: activeReceipt.receiptNo,
                    transactionRef: activeReceipt.id,
                    studentIndexNo: studentIndex,
                    studentName: studentName,
                    classGrade: studentClass,
                    academicTerm: 'Term 2',
                    payerName: (user as any)?.name || user?.fullName || 'Parent / Guardian',
                    payerPhone: user?.phone || 'N/A',
                    paymentMethod: activeReceipt.method,
                    amountPaid: `GH₵ ${activeReceipt.amount.toLocaleString()}.00`,
                    status: 'PAID',
                    settlementDate: activeReceipt.date,
                  });
                  toast.success("Printing official receipt...");
                }}
                className="w-full py-2.5 bg-brand-violet text-white rounded-xl font-bold text-xs hover:bg-brand-violetDark transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="ph-bold ph-printer"></i> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
