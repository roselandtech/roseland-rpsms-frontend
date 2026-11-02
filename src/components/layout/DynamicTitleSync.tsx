"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const ROUTE_TITLES: Record<string, string> = {
  "/": "The Roseland Preparatory School | Adjen Kotoku, Accra",
  "/about": "About & Vision | Roseland Preparatory School",
  "/about/leadership": "Leadership & Faculty | Roseland Preparatory School",
  "/about/campus": "Campus & Facilities | Roseland Preparatory School",
  "/about/accreditation": "Accreditation & Standards | Roseland Preparatory School",
  "/academics": "Curriculum & Approach | Roseland Preparatory School",
  "/academics/early-years": "Early Years (Crèche & Nursery) | Roseland Preparatory School",
  "/academics/primary": "Primary School (P1–P6) | Roseland Preparatory School",
  "/academics/jhs": "Junior High School (JHS 1–3) | Roseland Preparatory School",
  "/academics/calendar": "Academic Calendar | Roseland Preparatory School",
  "/admissions": "Admissions Guide | Roseland Preparatory School",
  "/admissions/apply": "Apply Online | Roseland Preparatory School",
  "/admissions/fees": "Tuition & Fees | Roseland Preparatory School",
  "/admissions/tour": "Book a Campus Tour | Roseland Preparatory School",
  "/admissions/faq": "Admissions FAQ | Roseland Preparatory School",
  "/student-life/clubs": "Clubs & STEAM | Roseland Preparatory School",
  "/student-life/sports": "Sports & Athletics | Roseland Preparatory School",
  "/student-life/welfare": "Health & Guidance | Roseland Preparatory School",
  "/student-life/services": "Canteen & Transport | Roseland Preparatory School",
  "/news": "News & Announcements | Roseland Preparatory School",
  "/events": "Events & Calendar | Roseland Preparatory School",
  "/gallery": "Campus Photo Gallery | Roseland Preparatory School",
  "/careers": "Careers & Teaching Opportunities | Roseland Preparatory School",
  "/pta": "Parent-Teacher Association (PTA) | Roseland Preparatory School",
  "/contact": "Contact Us | Roseland Preparatory School",
  "/portals": "Institutional Portals | Roseland Preparatory School",
  "/login": "Portal Login | Roseland Preparatory School",
  "/cbt": "CBT Examination Center | Roseland Preparatory School",
  // Admin Portal
  "/admin": "Executive Dashboard | Roseland Admin Portal",
  "/admin/students": "Student Directory & SIS | Roseland Admin Portal",
  "/admin/admissions": "Admissions Vetting | Roseland Admin Portal",
  "/admin/academics": "Academics & SBA Engine | Roseland Admin Portal",
  "/admin/academics/calendar": "Academic Calendar Setup | Roseland Admin Portal",
  "/admin/staff": "Staff & Faculty Allocation | Roseland Admin Portal",
  "/admin/hr": "HR & Payroll Engine | Roseland Admin Portal",
  "/admin/finance": "Bursary & Fee Ledger | Roseland Admin Portal",
  "/admin/cbt": "CBT Exam Proctoring | Roseland Admin Portal",
  "/admin/communications": "SMS & Broadcast Hub | Roseland Admin Portal",
  "/admin/transport": "Fleet & Bus Routes | Roseland Admin Portal",
  "/admin/health": "Infirmary & Clinic Log | Roseland Admin Portal",
  "/admin/inventory": "Campus Asset Registry | Roseland Admin Portal",
  "/admin/settings": "Institutional Settings | Roseland Admin Portal",
  // Headmaster Portal
  "/headmaster": "Headmaster Cockpit | Roseland Preparatory School",
  "/headmaster/approvals": "Lesson Scheme Vetting | Roseland Headmaster Portal",
  "/headmaster/appraisals": "Teacher Appraisals | Roseland Headmaster Portal",
  "/headmaster/at-risk": "At-Risk Scholars | Roseland Headmaster Portal",
  "/headmaster/bece-analytics": "BECE Mock Analytics | Roseland Headmaster Portal",
  "/headmaster/inspections": "Supervisory Walkthroughs | Roseland Headmaster Portal",
  "/headmaster/discipline": "Discipline & Conduct | Roseland Headmaster Portal",
  // Teacher Portal
  "/teacher": "Classroom Cockpit | Roseland Teacher Portal",
  "/teacher/roster": "My Class Roster | Roseland Teacher Portal",
  "/teacher/attendance": "Daily Roll Call | Roseland Teacher Portal",
  "/teacher/lessons": "GES Lesson Studio | Roseland Teacher Portal",
  "/teacher/ca-tracker": "Dynamic CA Tracker | Roseland Teacher Portal",
  "/teacher/grading": "SBA Gradebook | Roseland Teacher Portal",
  "/teacher/assignments": "Assignments & CBT | Roseland Teacher Portal",
  "/teacher/messages": "Parent Messages | Roseland Teacher Portal",
  "/teacher/remedial": "Remedial Registry | Roseland Teacher Portal",
  "/teacher/appraisal": "My Appraisal & CPD | Roseland Teacher Portal",
  // Parent Portal
  "/parent": "Family Overview | Roseland Parent Portal",
  "/parent/academics": "Terminal Report Cards | Roseland Parent Portal",
  "/parent/finance": "School Fees & Receipts | Roseland Parent Portal",
  "/parent/notices": "School Notice Board | Roseland Parent Portal",
};

function formatFallbackTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return "The Roseland Preparatory School | Adjen Kotoku, Accra";
  }
  const last = segments[segments.length - 1]
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return `${last} | Roseland Preparatory School`;
}

export default function DynamicTitleSync() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const cleanPath = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
    document.title = ROUTE_TITLES[cleanPath] || formatFallbackTitle(cleanPath);
  }, [pathname]);

  return null;
}
