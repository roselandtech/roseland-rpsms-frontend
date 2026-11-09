"use client";

import { useState, useEffect } from 'react';
import { RoselandApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

export default function HRPage() {
  const [activeTab, setActiveTab] = useState<'staff' | 'payroll' | 'leave'>('staff');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'TEACHER' | 'ADMINISTRATION'>('ALL');
  const [staff, setStaff] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [payrollMonth, setPayrollMonth] = useState('2026-08');
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveStaffId, setLeaveStaffId] = useState('');
  const [leaveType, setLeaveType] = useState('Annual');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [editSalaryVal, setEditSalaryVal] = useState('');
  const [editSsnitVal, setEditSsnitVal] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffRes, authStaffRes, payrollRes, leaveRes] = await Promise.all([
        RoselandApi.hr.getStaff().catch(() => []),
        RoselandApi.auth.getStaffDirectory().catch(() => []),
        RoselandApi.hr.getPayroll().catch(() => []),
        RoselandApi.hr.getLeave().catch(() => []),
      ]);

      const hrList = Array.isArray(staffRes) ? staffRes : [];
      const authList = Array.isArray(authStaffRes)
        ? authStaffRes.filter((u: any) => ['TEACHER', 'HEADMASTER', 'BURSAR', 'SUPER_ADMIN'].includes(u.role))
        : [];

      if (authList.length > 0) {
        const hrByUserId = new Map(hrList.map((h: any) => [String(h.user_id), h]));
        const merged = authList.map((u: any) => {
          const existingHr = hrByUserId.get(String(u.id));
          const jobTitle = u.role === 'TEACHER' ? 'Teacher' : u.role === 'BURSAR' ? 'Bursar' : 'Headmaster';
          const department = u.role === 'TEACHER' ? 'Academics' : 'Administration';
          if (existingHr) {
            return {
              ...existingHr,
              full_name: u.fullName || existingHr.full_name,
              job_title: jobTitle,
              department,
            };
          }
          return {
            id: u.id,
            user_id: u.id,
            full_name: u.fullName,
            job_title: jobTitle,
            department,
            base_salary: 2000,
            allowances: 0,
            ssnit_number: '',
            is_active: true,
          };
        });
        setStaff(merged.sort((a: any, b: any) => String(a.full_name).localeCompare(String(b.full_name))));
      } else {
        setStaff(hrList.filter((s: any) => s.is_active !== false));
      }

      setPayroll(Array.isArray(payrollRes) ? payrollRes : []);
      setLeaves(Array.isArray(leaveRes) ? leaveRes : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load HR data");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayroll = async () => {
    if (!payrollMonth) return;
    
    try {
      await RoselandApi.hr.generatePayroll(payrollMonth);
      toast.success(`Payroll generated for ${payrollMonth}`);
      setIsPayrollModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate payroll");
    }
  };

  const handleOpenEdit = (s: any) => {
    setEditingStaff(s);
    setEditSalaryVal(s.base_salary.toString());
    setEditSsnitVal(s.ssnit_number || '');
  };

  const handleSaveSalary = async () => {
    if (!editingStaff) return;

    const salaryVal = parseFloat(editSalaryVal);
    if (isNaN(salaryVal) || salaryVal < 0) {
      toast.error("Please enter a valid salary amount");
      return;
    }

    try {
      await RoselandApi.hr.updateStaff(editingStaff.id, {
        user_id: editingStaff.user_id,
        full_name: editingStaff.full_name,
        base_salary: salaryVal,
        ssnit_number: editSsnitVal
      });
      toast.success("Staff remuneration updated!");
      setEditingStaff(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update staff");
    }
  };

  const filteredStaff = staff.filter((s) => {
    if (roleFilter === 'TEACHER') return s.job_title === 'Teacher';
    if (roleFilter === 'ADMINISTRATION') return s.job_title !== 'Teacher';
    return true;
  });

  const totalMonthlyPayroll = filteredStaff.reduce((sum, s) => sum + (Number(s.base_salary) || 0), 0);
  const staffNameById = new Map(staff.map((s) => [String(s.id), s.full_name]));
  const pendingLeavesCount = leaves.filter((l) => l.status === 'Pending').length;

  const handleCreateLeave = async () => {
    if (!leaveStaffId || !leaveStartDate || !leaveEndDate) {
      toast.error('Please select a staff member and start/end dates.');
      return;
    }
    setIsSubmittingLeave(true);
    try {
      await RoselandApi.hr.createLeave({
        staff_id: leaveStaffId,
        leave_type: leaveType,
        start_date: leaveStartDate,
        end_date: leaveEndDate,
        reason: leaveReason,
      });
      toast.success('Leave application submitted!');
      setIsLeaveModalOpen(false);
      setLeaveReason('');
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Could not submit leave request');
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const handleUpdateLeaveStatus = async (leaveId: string, status: 'Approved' | 'Rejected') => {
    try {
      await RoselandApi.hr.updateLeaveStatus(leaveId, status);
      toast.success(`Leave request ${status.toLowerCase()}!`);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Could not update leave status');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-brand-textMain">HR & Payroll Center</h1>
          <p className="text-brand-textMuted text-sm mt-1">Manage staff registry, exact tax calculations, and leave applications.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => {
              if (!leaveStaffId && staff.length > 0) setLeaveStaffId(staff[0].id);
              setIsLeaveModalOpen(true);
            }}
            icon={<i className="ph-bold ph-calendar-plus"></i>}
          >
            Log Leave Request
          </Button>
          <Button
            variant="primary"
            onClick={() => setIsPayrollModalOpen(true)}
            icon={<i className="ph-bold ph-calculator"></i>}
          >
            Run Monthly Payroll
          </Button>
        </div>
      </div>

      {/* HR KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Active Staff</span>
          <h3 className="text-2xl font-serif font-bold text-brand-textMain mt-1">{staff.length}</h3>
          <span className="text-xs text-brand-violet font-semibold">Synced from Core Auth</span>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Est. Monthly Payroll</span>
          <h3 className="text-2xl font-serif font-bold text-emerald-600 mt-1">GH₵ {totalMonthlyPayroll.toFixed(2)}</h3>
          <span className="text-xs text-brand-textMuted font-semibold">Base salary obligations</span>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Leaves</span>
          <h3 className="text-2xl font-serif font-bold text-amber-500 mt-1">{pendingLeavesCount}</h3>
          <span className="text-xs text-amber-600 font-semibold">Requires headmaster approval</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'staff' ? 'bg-brand-violet text-white shadow-sm' : 'text-brand-textMuted hover:bg-white'
            }`}
          >
            Staff Directory ({staff.length})
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'payroll' ? 'bg-brand-violet text-white shadow-sm' : 'text-brand-textMuted hover:bg-white'
            }`}
          >
            Payroll Ledger ({payroll.length})
          </button>
          <button
            onClick={() => setActiveTab('leave')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'leave' ? 'bg-brand-violet text-white shadow-sm' : 'text-brand-textMuted hover:bg-white'
            }`}
          >
            Leave Requests ({leaves.length})
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          {activeTab === 'staff' && (
            <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 gap-1">
              <button
                onClick={() => setRoleFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  roleFilter === 'ALL' ? 'bg-brand-violet text-white' : 'text-gray-500 hover:text-brand-textMain'
                }`}
              >
                All Staff ({staff.length})
              </button>
              <button
                onClick={() => setRoleFilter('TEACHER')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  roleFilter === 'TEACHER' ? 'bg-brand-violet text-white' : 'text-gray-500 hover:text-brand-textMain'
                }`}
              >
                Teachers ({staff.filter((s) => s.job_title === 'Teacher').length})
              </button>
              <button
                onClick={() => setRoleFilter('ADMINISTRATION')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  roleFilter === 'ADMINISTRATION' ? 'bg-brand-violet text-white' : 'text-gray-500 hover:text-brand-textMain'
                }`}
              >
                Headmaster & Admin ({staff.filter((s) => s.job_title !== 'Teacher').length})
              </button>
            </div>
          )}
          <button
            onClick={loadData}
            className="px-3 py-1.5 border border-gray-200 text-gray-600 font-bold rounded-xl text-xs hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <i className="ph-bold ph-arrows-clockwise"></i> Refresh
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-gray-400 flex flex-col items-center">
            <i className="ph ph-spinner animate-spin text-2xl mb-2 text-brand-violet"></i>
            Loading HR data...
          </div>
        ) : (
          <>
            {activeTab === 'staff' && (
              filteredStaff.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <p className="font-serif font-bold text-base text-brand-textMain">No Staff Profiles Found</p>
                  <p className="text-xs text-brand-textMuted">Staff must be synced from the Auth module.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-brand-bg text-gray-400 uppercase font-bold tracking-wider border-b border-gray-100 text-[10px]">
                      <tr>
                        <th className="py-4 px-6">Faculty Member</th>
                        <th className="py-4 px-4">Role & Dept</th>
                        <th className="py-4 px-4">Base Salary</th>
                        <th className="py-4 px-4">SSNIT / TIN</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredStaff.map(s => (
                        <tr key={s.id} className="hover:bg-brand-bg transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-full overflow-hidden border border-gray-200 shrink-0 shadow-xs">
                                <div className="w-full h-full bg-brand-violet/10 flex items-center justify-center">
                                  <i className="ph-bold ph-user-circle text-brand-violet text-lg"></i>
                                </div>
                              </div>
                              <div>
                                <strong className="text-sm font-bold text-brand-textMain block">{s.full_name}</strong>
                                <span className="font-mono text-[10px] text-gray-400">{s.id.substring(0,8)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide inline-block mb-1">{s.job_title}</span>
                            <br />
                            <span className="text-gray-400 text-xs">{s.department}</span>
                          </td>
                          <td className="py-4 px-4 font-mono text-sm text-emerald-600 font-bold">GH₵ {s.base_salary.toFixed(2)}</td>
                          <td className="py-4 px-4 text-gray-500 font-mono">{s.ssnit_number || 'Not Set'}</td>
                          <td className="py-4 px-6 text-right">
                            <button 
                              onClick={() => handleOpenEdit(s)}
                              className="px-3 py-1.5 border border-brand-violet text-brand-violet rounded-lg hover:bg-brand-violet hover:text-white transition-colors text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <i className="ph-bold ph-pencil-simple"></i> Set Remuneration
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {activeTab === 'payroll' && (
              payroll.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <p className="font-serif font-bold text-base text-brand-textMain">No Payroll Records</p>
                  <p className="text-xs text-brand-textMuted">Click "Run Monthly Payroll" to generate ledgers for the current month.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-brand-bg text-gray-400 uppercase font-bold tracking-wider border-b border-gray-100 text-[10px]">
                      <tr>
                        <th className="py-4 px-6">Month</th>
                        <th className="py-4 px-4">Staff ID</th>
                        <th className="py-4 px-4">Gross Pay</th>
                        <th className="py-4 px-4">SSNIT (5.5%)</th>
                        <th className="py-4 px-4">PAYE Tax</th>
                        <th className="py-4 px-4">Net Pay</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {payroll.map(p => (
                        <tr key={p.id} className="hover:bg-brand-bg transition-colors">
                          <td className="py-4 px-6 font-bold text-brand-textMain">{p.month_year}</td>
                          <td className="py-4 px-4">
                            <span className="font-bold text-brand-textMain block">{staffNameById.get(String(p.staff_id)) || 'Staff Member'}</span>
                            <span className="text-gray-400 font-mono text-[10px]">{p.staff_id.substring(0,8)}</span>
                          </td>
                          <td className="py-4 px-4 font-mono font-bold text-brand-textMain">GH₵ {p.gross_pay.toFixed(2)}</td>
                          <td className="py-4 px-4 font-mono font-bold text-rose-500">GH₵ {p.ssnit_tier_2_employee.toFixed(2)}</td>
                          <td className="py-4 px-4 font-mono font-bold text-rose-500">GH₵ {p.gra_paye_tax.toFixed(2)}</td>
                          <td className="py-4 px-4 font-mono text-sm font-bold text-emerald-600 bg-emerald-50/10">GH₵ {p.net_pay.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
            
            {activeTab === 'leave' && (
              leaves.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <p className="font-serif font-bold text-base text-brand-textMain">No Leave Requests</p>
                  <p className="text-xs text-brand-textMuted">Click &ldquo;Log Leave Request&rdquo; above or submit a request from the Teacher Portal.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-brand-bg text-gray-400 uppercase font-bold tracking-wider border-b border-gray-100 text-[10px]">
                      <tr>
                        <th className="py-4 px-6">Staff Member</th>
                        <th className="py-4 px-4">Leave Type</th>
                        <th className="py-4 px-4">Duration</th>
                        <th className="py-4 px-4">Reason</th>
                        <th className="py-4 px-4">Status</th>
                        <th className="py-4 px-6 text-right">Decision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {leaves.map((l) => {
                        const resolvedName = l.staff_name || staffNameById.get(String(l.staff_id)) || 'Staff Member';
                        return (
                          <tr key={l.id} className="hover:bg-brand-bg transition-colors">
                            <td className="py-4 px-6">
                              <strong className="text-sm font-bold text-brand-textMain block">{resolvedName}</strong>
                              <span className="text-[10px] text-gray-400">{l.job_title || 'Faculty'}</span>
                            </td>
                            <td className="py-4 px-4 font-bold text-brand-violet">{l.leave_type}</td>
                            <td className="py-4 px-4 font-mono text-[11px] text-gray-600">
                              {l.start_date} &rarr; {l.end_date}
                            </td>
                            <td className="py-4 px-4 text-gray-600 max-w-xs truncate">{l.reason || '—'}</td>
                            <td className="py-4 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                l.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                                l.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {l.status}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              {l.status === 'Pending' ? (
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    onClick={() => handleUpdateLeaveStatus(l.id, 'Approved')}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleUpdateLeaveStatus(l.id, 'Rejected')}
                                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-gray-400 italic">Decision recorded</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* Edit Remuneration Modal */}
      <Modal
        isOpen={!!editingStaff}
        onClose={() => setEditingStaff(null)}
        title="Set Staff Remuneration"
        subtitle={editingStaff?.full_name}
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <p className="text-xs text-blue-800">
              Update the base salary and statutory ID numbers for <strong>{editingStaff?.full_name}</strong>. This data will be securely used in the next payroll calculation.
            </p>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Base Salary (GH₵)</label>
            <input
              type="number"
              value={editSalaryVal}
              onChange={(e) => setEditSalaryVal(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20"
              placeholder="e.g. 2500"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">SSNIT / TIN Number</label>
            <input
              type="text"
              value={editSsnitVal}
              onChange={(e) => setEditSsnitVal(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20 font-mono"
              placeholder="Enter SSNIT or TIN"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Button variant="ghost" onClick={() => setEditingStaff(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveSalary}>
              Save Remuneration
            </Button>
          </div>
        </div>
      </Modal>

      {/* Generate Payroll Modal */}
      <Modal
        isOpen={isPayrollModalOpen}
        onClose={() => setIsPayrollModalOpen(false)}
        title="Run Monthly Payroll"
        subtitle="Batch Tax & Salary Processing"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-brand-bg p-4 rounded-xl border border-gray-100">
            <p className="text-xs text-brand-textMuted">
              This will automatically process salaries for all active staff, deducting the statutory 5.5% Tier 2 SSNIT and enforcing the exact GRA PAYE tax brackets.
            </p>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Payroll Month</label>
            <input
              type="month"
              value={payrollMonth}
              onChange={(e) => setPayrollMonth(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Button variant="ghost" onClick={() => setIsPayrollModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleGeneratePayroll} icon={<i className="ph-bold ph-calculator"></i>}>
              Process Payroll
            </Button>
          </div>
        </div>
      </Modal>

      {/* Log / Request Leave Modal */}
      <Modal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        title="Log Staff Leave Request"
        subtitle="Annual, Sick, Maternity, or Compassionate Leave"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Staff Member</label>
            <select
              value={leaveStaffId}
              onChange={(e) => setLeaveStaffId(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-violet"
            >
              <option value="">Select staff member...</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.job_title})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Leave Type</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-violet"
            >
              <option value="Annual">Annual Leave</option>
              <option value="Sick">Sick / Medical Leave</option>
              <option value="Maternity">Maternity / Paternity Leave</option>
              <option value="Compassionate">Compassionate Leave</option>
              <option value="Study">Study / Exam Leave</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                value={leaveStartDate}
                onChange={(e) => setLeaveStartDate(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-violet"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                value={leaveEndDate}
                onChange={(e) => setLeaveEndDate(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-violet"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Reason / Notes</label>
            <textarea
              rows={3}
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder="Provide reason or coverage notes..."
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-violet"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Button variant="ghost" onClick={() => setIsLeaveModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateLeave} disabled={isSubmittingLeave}>
              {isSubmittingLeave ? 'Submitting...' : 'Submit Leave Request'}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
