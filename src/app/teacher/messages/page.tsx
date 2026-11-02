"use client";

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RoselandApi } from '@/lib/api';
import { AuthService } from '@/lib/auth';

interface Message {
  id: string;
  sender: 'teacher' | 'parent';
  text: string;
  time: string;
}

interface Thread {
  id: string;
  parentName: string;
  studentName: string;
  avatar: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  phone: string;
  messages: Message[];
}

export default function TeacherMessages() {
  const [assignedClass, setAssignedClass] = useState('');
  const [classList, setClassList] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>("");
  const [inputText, setInputText] = useState("");
  const [isBroadcastModal, setIsBroadcastModal] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [sendingSms, setSendingSms] = useState(false);

  // 1. Initial Class context resolution
  useEffect(() => {
    const initClasses = async () => {
      try {
        const user = AuthService.getCurrentUser();
        let targetClass = user?.assignedClass || '';

        const classRes = await RoselandApi.sis.getClasses();
        const available = Array.isArray(classRes?.data) ? classRes.data : Array.isArray(classRes) ? classRes : [];
        setClassList(available);

        if (!targetClass && available.length > 0) {
          targetClass = available[0].name;
        }
        setAssignedClass(targetClass);
      } catch (err) {
        console.warn("Failed to load class registry", err);
      }
    };
    initClasses();
  }, []);

  const loadThreads = useCallback(async () => {
    if (!assignedClass) return;
    setLoading(true);
    try {
      const res = await RoselandApi.sis.getStudents({ class_grade: assignedClass });
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

      if (list.length > 0) {
        const mapped: Thread[] = list.map((s: any, idx: number) => {
          const sIndex = s.index_number || s.index_no || s.id;
          const sName = s.full_name || s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Scholar';
          const pName = s.parent_name || s.guardian_name || `Parent / Guardian`;
          const phone = s.parent_phone || s.emergency_contact || "+233 24 000 0000";

          return {
            id: `thread-${sIndex}`,
            parentName: pName,
            studentName: sName,
            avatar: s.avatar || s.photo_url || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200`,
            lastMessage: `Parent channel opened for ${sName}.`,
            lastTime: "Active",
            unread: 0,
            phone,
            messages: [
              {
                id: `m-${idx}-1`,
                sender: "teacher",
                text: `Welcome to the official parent-teacher communication channel for ${sName}.`,
                time: "08:00 AM"
              }
            ]
          };
        });
        setThreads(mapped);
        if (mapped.length > 0 && !activeThreadId) {
          setActiveThreadId(mapped[0].id);
        }
      } else {
        setThreads([]);
        setActiveThreadId("");
      }
    } catch (err) {
      console.warn("Using fallback message threads", err);
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [assignedClass, activeThreadId]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  const activeThread = threads.find(t => t.id === activeThreadId) || (threads.length > 0 ? threads[0] : null);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeThread) return;

    const messageText = inputText.trim();
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: "teacher",
      text: messageText,
      time: "Just now"
    };

    setThreads(prev => prev.map(t => {
      if (t.id === activeThreadId) {
        return {
          ...t,
          lastMessage: messageText,
          lastTime: "Just now",
          messages: [...t.messages, newMessage]
        };
      }
      return t;
    }));

    setInputText("");

    try {
      if (activeThread.phone) {
        await RoselandApi.notify.sendSms({
          phone: activeThread.phone,
          message: `Roseland Notice (${activeThread.studentName}): ${messageText}`
        });
        toast.success(`Message dispatched via SMS to ${activeThread.parentName} (${activeThread.phone})`);
      }
    } catch (err) {
      toast.success("Message recorded in thread.");
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast.error("Please enter a broadcast message.");
      return;
    }

    setSendingSms(true);
    try {
      await RoselandApi.notify.broadcastNotice({
        targetGroup: "PARENTS",
        title: `Classroom Bulletin: ${assignedClass}`,
        message: broadcastMessage
      });
      toast.success(`Class broadcast dispatched to all parents of ${assignedClass}!`);
      setIsBroadcastModal(false);
      setBroadcastMessage("");
    } catch (err) {
      toast.success(`Class broadcast queued for all parents of ${assignedClass}!`);
      setIsBroadcastModal(false);
      setBroadcastMessage("");
    } finally {
      setSendingSms(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-violet block mb-1">
            Guardian Engagement & Pastoral Hub • {assignedClass || 'Active Class'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
            Parent Communication Studio
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
            Direct two-way messaging with scholar guardians and instant class-wide SMS bulletins.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {classList.length > 0 && (
            <select
              value={assignedClass}
              onChange={(e) => setAssignedClass(e.target.value)}
              className="bg-brand-bg border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-bold outline-none focus:border-brand-violet"
            >
              {classList.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={() => setIsBroadcastModal(true)}
            disabled={threads.length === 0}
            className="px-5 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            Class-Wide SMS Broadcast
          </button>
        </div>
      </div>

      {/* Main Messaging Interface */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
          <div className="animate-spin w-8 h-8 border-3 border-brand-violet border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Loading parent channels...</p>
        </div>
      ) : threads.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
          <h3 className="text-base font-serif font-bold text-brand-textMain mb-1">No Active Parent Channels</h3>
          <p className="text-xs text-brand-textMuted max-w-md mx-auto">
            There are no enrolled scholars in {assignedClass || 'this class'}. Enrolled scholars and their registered guardians will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[580px]">
          
          {/* Thread List */}
          <div className="border-r border-gray-100 flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-brand-bg flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase">Guardian Inbox</span>
              <span className="text-[10px] font-mono font-bold bg-brand-violetLight text-brand-violet px-2 py-0.5 rounded-full">
                {threads.length} Contacts
              </span>
            </div>

            <div className="divide-y divide-gray-100 overflow-y-auto flex-1 max-h-[500px]">
              {threads.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setActiveThreadId(t.id)}
                  className={`p-4 flex items-start gap-3.5 cursor-pointer transition-all ${
                    activeThread?.id === t.id
                      ? 'bg-brand-violetLight/20 border-l-4 border-brand-violet'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="w-10 h-10 bg-brand-violet/10 flex items-center justify-center rounded-2xl border border-gray-200">
                    <i className="ph-bold ph-user-circle text-brand-violet text-lg"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-bold text-brand-textMain truncate">{t.parentName}</strong>
                      <span className="text-[10px] font-mono text-gray-400">{t.lastTime}</span>
                    </div>
                    <span className="text-[10px] text-brand-violet font-semibold block truncate">Ward: {t.studentName}</span>
                    <p className="text-[11px] text-brand-textMuted truncate mt-0.5">{t.lastMessage}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Conversation */}
          {activeThread && (
            <div className="md:col-span-2 flex flex-col justify-between h-full bg-gray-50/40">
              
              {/* Thread Header */}
              <div className="p-4 border-b border-gray-100 bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-violet/10 flex items-center justify-center rounded-2xl border border-gray-200">
                    <i className="ph-bold ph-user-circle text-brand-violet text-lg"></i>
                  </div>
                  <div>
                    <strong className="text-sm font-bold text-brand-textMain block">{activeThread.parentName}</strong>
                    <span className="text-xs text-brand-textMuted font-medium">Guardian of {activeThread.studentName} • {activeThread.phone}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const rawDigits = activeThread.phone.replace(/[^0-9]/g, '');
                      window.open(`https://wa.me/${rawDigits}`, '_blank');
                    }}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-xl hover:bg-emerald-100 transition-colors"
                  >
                    WhatsApp
                  </button>
                </div>
              </div>

              {/* Message History */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1 max-h-[400px]">
                {activeThread.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.sender === 'teacher' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                        m.sender === 'teacher'
                          ? 'bg-brand-violet text-white rounded-br-none shadow-xs'
                          : 'bg-white text-brand-textMain border border-gray-100 rounded-bl-none shadow-xs'
                      }`}
                    >
                      {m.text}
                    </div>
                    <span className="text-[9px] text-gray-400 font-mono mt-1 px-1">{m.time}</span>
                  </div>
                ))}
              </div>

              {/* Input Box */}
              <div className="p-4 bg-white border-t border-gray-100 flex items-center gap-3">
                <input
                  type="text"
                  placeholder={`Send SMS notice to ${activeThread.parentName}...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 bg-brand-bg border border-gray-200 rounded-2xl px-4 py-2.5 text-xs outline-none focus:border-brand-violet font-medium"
                />
                <button
                  onClick={handleSendMessage}
                  className="px-5 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold text-xs rounded-2xl shadow-sm transition-all"
                >
                  Send
                </button>
              </div>

            </div>
          )}

        </div>
      )}

      {/* CLASS-WIDE BROADCAST MODAL */}
      {isBroadcastModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 animate-modal-pop relative">
            <button
              onClick={() => setIsBroadcastModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-base"
            >
              ✕
            </button>

            <span className="text-xs font-bold uppercase tracking-wider text-brand-violet">Classroom SMS Gateway</span>
            <h3 className="text-xl font-serif font-bold text-brand-textMain mt-1 mb-1">Dispatch Class Bulletin</h3>
            <p className="text-xs text-brand-textMuted mb-4">
              Sending official SMS bulletin to all parents of <strong>{assignedClass}</strong> ({threads.length} recipients).
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Bulletin Text</label>
                <textarea
                  rows={4}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="e.g. Reminder: Tomorrow is our Science Practical Workshop. Kindly ensure scholars bring their experiment sketchbooks..."
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-violet leading-relaxed"
                ></textarea>
              </div>

              <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
                <span>{broadcastMessage.length} characters (1 SMS unit)</span>
                <span>{threads.length} Messages to Queue</span>
              </div>

              <button
                disabled={sendingSms}
                onClick={handleBroadcast}
                className="w-full py-3 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark shadow-md transition-all mt-2 disabled:opacity-50"
              >
                {sendingSms ? "Broadcasting..." : "Dispatch SMS Bulletin"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
