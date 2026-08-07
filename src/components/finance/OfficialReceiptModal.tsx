"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { RoselandApi } from '@/lib/api';

export interface OfficialReceiptData {
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
  amountPaidNum?: number;
  previousPaid?: string;
  totalBilled?: string;
  balanceDue?: string;
  balanceDueNum?: number;
  advanceCredit?: string;
  status: string;
  settlementDate: string;
  chiefBursarSignature?: string;
  securitySealChecksum?: string;
}

interface OfficialReceiptModalProps {
  receipt: OfficialReceiptData | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OfficialReceiptModal: React.FC<OfficialReceiptModalProps> = ({
  receipt,
  isOpen,
  onClose,
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!isOpen || !receipt) return null;

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const cleanNum = (str?: string, num?: number) => {
        if (num !== undefined) return num;
        if (!str) return 0;
        return parseFloat(str.replace(/[^0-9.-]+/g, '')) || 0;
      };

      await RoselandApi.pdf.downloadReceipt({
        receiptNumber: receipt.receiptNo,
        transactionDate: receipt.settlementDate || new Date().toLocaleString(),
        studentName: receipt.studentName,
        studentIndex: receipt.studentIndexNo,
        classGrade: receipt.classGrade || 'N/A',
        academicYear: '2026/2027',
        term: receipt.academicTerm || 'Term 2',
        feeType: 'Tuition & Academic Levies',
        paymentMethod: receipt.paymentMethod,
        amountPaid: cleanNum(receipt.amountPaid, receipt.amountPaidNum),
        totalBill: cleanNum(receipt.totalBilled),
        previousBalance: cleanNum(receipt.previousPaid),
        balanceRemaining: cleanNum(receipt.balanceDue, receipt.balanceDueNum),
        cashierName: 'Chief Bursar & Accounts Directorate',
        status: receipt.status || 'PAID',
      });
    } catch (err: any) {
      console.warn('[PDF Service] Server download failed, falling back to local print:', err.message);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const formattedDate = receipt.settlementDate 
    ? new Date(receipt.settlementDate).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    : new Date().toLocaleString();

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      
      {/* Modal Container */}
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-gray-100 relative animate-fade-in my-auto max-h-[92vh] flex flex-col print:shadow-none print:border-none print:p-0 print:max-w-full print:max-h-full">
        
        {/* Sticky/Fixed Action Controls (Hidden in Print) */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Verified Digital Receipt
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-1.5 bg-brand-violet text-white text-xs font-bold rounded-xl hover:bg-brand-violetDark shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              <i className={isGeneratingPdf ? "ph ph-spinner animate-spin" : "ph-bold ph-file-pdf"}></i>
              {isGeneratingPdf ? "Rendering PDF..." : "Download Official PDF"}
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-xs font-bold cursor-pointer transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Printable Voucher Body */}
        <div className="overflow-y-auto pr-1 space-y-4 text-brand-textMain print:overflow-visible print:p-0">
          
          {/* Institutional Header with Official School Logo */}
          <div className="text-center border-b border-gray-200 pb-4">
            <div className="flex justify-center mb-2">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                <Image
                  src="/logo.png"
                  alt="The Roseland Preparatory School Crest"
                  fill
                  sizes="80px"
                  className="object-contain drop-shadow-xs"
                  priority
                />
              </div>
            </div>
            <h2 className="text-lg sm:text-xl font-serif font-bold tracking-tight text-brand-textMain uppercase">
              The Roseland Preparatory School
            </h2>
            <p className="text-[10px] font-bold text-brand-violet uppercase tracking-widest mt-0.5">
              Office of the Chief Bursar & Accounts Directorate
            </p>
            <p className="text-[9px] text-gray-500 mt-0.5">
              P.O. Box AC 490, Achimota - Accra, Ghana • Tel: +233 (0) 24 412 3456 • accounts@roseland.edu.gh
            </p>
          </div>

          {/* Receipt Title & Meta Card */}
          <div className="flex items-center justify-between gap-3 bg-brand-bg/80 p-3 rounded-2xl border border-gray-100">
            <div>
              <span className="text-[9px] uppercase font-bold text-gray-400 block tracking-wider">Official Receipt No</span>
              <strong className="text-sm font-mono font-bold text-brand-violet block">
                {receipt.receiptNo}
              </strong>
              <span className="text-[9px] text-gray-500 block font-mono truncate max-w-[160px] sm:max-w-[200px]">
                Ref: {receipt.transactionRef}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[9px] uppercase font-bold text-gray-400 block tracking-wider">Settlement Date</span>
              <strong className="text-[11px] font-semibold text-gray-800 block">
                {formattedDate}
              </strong>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800">
                {receipt.status}
              </span>
            </div>
          </div>

          {/* Pupil & Payer Particulars */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100">
              <span className="text-[9px] uppercase font-bold text-gray-400 block mb-1">Pupil Particulars</span>
              <strong className="text-xs font-bold text-brand-textMain block truncate">{receipt.studentName}</strong>
              <div className="mt-1 text-[10px] space-y-0.5 text-gray-600">
                <p><span className="font-semibold text-gray-400">Index:</span> <span className="font-mono">{receipt.studentIndexNo}</span></p>
                <p><span className="font-semibold text-gray-400">Class:</span> {receipt.classGrade || 'Primary Class'}</p>
                <p><span className="font-semibold text-gray-400">Term:</span> {receipt.academicTerm || 'Term 2'}</p>
              </div>
            </div>

            <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100">
              <span className="text-[9px] uppercase font-bold text-gray-400 block mb-1">Payer & Channel</span>
              <strong className="text-xs font-bold text-brand-textMain block truncate">{receipt.payerName}</strong>
              <div className="mt-1 text-[10px] space-y-0.5 text-gray-600">
                <p><span className="font-semibold text-gray-400">Phone:</span> <span className="font-mono">{receipt.payerPhone}</span></p>
                <p><span className="font-semibold text-gray-400">Mode:</span> <span className="font-semibold text-brand-violet">{receipt.paymentMethod}</span></p>
                <p><span className="font-semibold text-gray-400">Purpose:</span> Tuition & Levies</p>
              </div>
            </div>
          </div>

          {/* Itemized Financial Ledger Breakdown */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden text-xs">
            <div className="bg-brand-bg px-3.5 py-2 font-bold text-gray-500 uppercase tracking-wider text-[9px] border-b border-gray-200 flex justify-between">
              <span>Financial Ledger Description</span>
              <span>Amount (GH₵)</span>
            </div>

            <div className="p-3 space-y-2 divide-y divide-gray-100 text-[11px]">
              {receipt.totalBilled && (
                <div className="flex justify-between items-center pt-0.5 text-gray-600">
                  <span>Total Term Assessment Billed:</span>
                  <span className="font-mono font-semibold">{receipt.totalBilled}</span>
                </div>
              )}

              {receipt.previousPaid && (
                <div className="flex justify-between items-center pt-1.5 text-gray-600">
                  <span>Prior Settled Payments:</span>
                  <span className="font-mono font-semibold">{receipt.previousPaid}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-1.5 font-bold text-emerald-800 bg-emerald-50/60 p-2 rounded-lg">
                <span className="text-[11px] uppercase tracking-wider">Amount Paid in this Receipt:</span>
                <span className="font-mono text-sm font-bold">{receipt.amountPaid}</span>
              </div>

              {receipt.balanceDue && (
                <div className="flex justify-between items-center pt-1.5 text-gray-700 font-semibold">
                  <span>Outstanding Term Balance Due:</span>
                  <span className="font-mono font-bold text-rose-600">{receipt.balanceDue}</span>
                </div>
              )}

              {receipt.advanceCredit && (
                <div className="flex justify-between items-center pt-1.5 text-brand-violet font-semibold">
                  <span>Advance Overpayment Credit (Next Term):</span>
                  <span className="font-mono font-bold">{receipt.advanceCredit}</span>
                </div>
              )}
            </div>
          </div>

          {/* Signatures & Security Stamp */}
          <div className="pt-3 border-t border-gray-200 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-[9px] uppercase font-bold text-gray-400 block tracking-wider">Authentication Seal</span>
              <div className="font-mono text-[8px] text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200 inline-block">
                {receipt.securitySealChecksum || `RPS-SEAL-${receipt.receiptNo}`}
              </div>
              <span className="text-[8px] text-gray-400 block">Digitally authenticated by RPS Central Treasury.</span>
            </div>

            <div className="text-right space-y-0.5">
              <div className="font-serif italic text-xs text-brand-textMain font-bold border-b border-gray-400 pb-0.5 px-2 inline-block">
                Mrs. Rose Boateng
              </div>
              <span className="text-[9px] text-gray-500 block uppercase tracking-wider font-semibold">
                Chief Bursar & Managing Proprietress
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
