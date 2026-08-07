export default function ParentNotices() {
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-brand-textMain">Notice Board</h2>
          <p className="text-sm text-brand-textMuted mt-1">Official communications from Roseland Prep.</p>
      </div>

      <div className="max-w-3xl space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-brand-violet/30 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-brand-violet"></div>
              <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-brand-violet uppercase tracking-wider bg-brand-violetLight px-2 py-1 rounded-md">Urgent Event</span>
                  <span className="text-xs text-brand-textMuted flex items-center gap-1"><i className="ph ph-clock"></i> Today, 08:30 AM</span>
              </div>
              <h3 className="font-bold text-brand-textMain text-lg mb-2">PTA Meeting - Term 2 Focus</h3>
              <p className="text-sm text-brand-textMain leading-relaxed mb-4">Dear Parents, please be reminded of our upcoming PTA meeting scheduled for this Saturday at 10:00 AM. We will be discussing the new CBT assessment platform and adjustments to the feeding fees. Attendance is highly encouraged.</p>
              <p className="text-xs font-medium text-gray-500">- Mr. Asamoah (Headmaster)</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-100 px-2 py-1 rounded-md">Reminder</span>
                  <span className="text-xs text-brand-textMuted flex items-center gap-1"><i className="ph ph-clock"></i> Yesterday</span>
              </div>
              <h3 className="font-bold text-brand-textMain text-lg mb-2">Mid-Term Break Schedule</h3>
              <p className="text-sm text-brand-textMain leading-relaxed mb-4">The school will go on a short mid-term break starting next Thursday, the 14th. Students are expected back on campus the following Tuesday. Have a restful weekend.</p>
              <p className="text-xs font-medium text-gray-500">- Administration</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 opacity-75">
              <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-100 px-2 py-1 rounded-md">Class Specific (Pri. 4)</span>
                  <span className="text-xs text-brand-textMuted flex items-center gap-1"><i className="ph ph-clock"></i> Last Week</span>
              </div>
              <h3 className="font-bold text-brand-textMain text-lg mb-2">Math Project Materials</h3>
              <p className="text-sm text-brand-textMain leading-relaxed mb-4">Please ensure all Primary 4 students bring cardboard, glue, and scissors for their practical fractions project on Monday. Thank you for your support.</p>
              <p className="text-xs font-medium text-gray-500">- Mr. E. Osei (Class Teacher)</p>
          </div>
      </div>
    </div>
  );
}
