import React, { useEffect, useState } from 'react';
import {
  CheckSquare,
  Bell,
  Check,
  Trash2,
  StickyNote,
  Plus,
  Mic,
  Calendar,
  Clock,
  Tag,
  AlertTriangle,
  Building2,
  User,
  Candy,
  Utensils,
  Store,
  Layers,
  Sparkles,
  Send,
  BellRing
} from 'lucide-react';
import { db } from '../services/db';
import { Task, Reminder, Note, BusinessId, BUSINESSES } from '../types/database';
import { useTranslation } from '../services/i18n';
import { androidAutomation } from '../services/androidAutomation';
import { aiAgent } from '../services/aiAgent';
import { voice } from '../services/voice';

interface TasksRemindersViewProps {
  currentBusinessId?: BusinessId;
}

export const TasksRemindersView: React.FC<TasksRemindersViewProps> = ({ currentBusinessId = 'jain-sweets' }) => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'tasks' | 'reminders' | 'notes'>('tasks');

  // Filters
  const [selectedWorkspace, setSelectedWorkspace] = useState<BusinessId | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState<boolean>(true);

  // New Item State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<'personal' | 'supplier_payment' | 'stock_alert' | 'staff_task' | 'routine'>('routine');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskWorkspace, setNewTaskWorkspace] = useState<BusinessId>('jain-sweets');
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);

  const [newRemTitle, setNewRemTitle] = useState('');
  const [newRemTime, setNewRemTime] = useState('');
  const [newRemPriority, setNewRemPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newRemWorkspace, setNewRemWorkspace] = useState<BusinessId>('jain-sweets');

  const [newNoteContent, setNewNoteContent] = useState('');
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [aiPromptInput, setAiPromptInput] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const loadData = async () => {
    const tList = await db.getTasks();
    const rList = await db.getReminders();
    const nList = await db.getNotes();
    setTasks(tList);
    setReminders(rList);
    setNotes(nList);
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(loadData);
    return unsub;
  }, []);

  // Filtered Tasks
  const filteredTasks = tasks.filter((task) => {
    if (selectedWorkspace !== 'all' && task.businessId !== selectedWorkspace) return false;
    if (selectedCategory !== 'all' && task.category !== selectedCategory) return false;
    if (!showCompleted && task.completed) return false;
    return true;
  });

  // Filtered Reminders
  const filteredReminders = reminders.filter((rem) => {
    if (selectedWorkspace !== 'all' && rem.businessId !== selectedWorkspace) return false;
    return true;
  });

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    await db.addTask({
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim() || undefined,
      category: newTaskCategory,
      priority: newTaskPriority,
      dueDate: newTaskDueDate || undefined,
      businessId: newTaskWorkspace
    });

    // Fire Android notification if high priority
    if (newTaskPriority === 'high') {
      androidAutomation.showSystemNotification(
        `High Priority Task Created`,
        `Task "${newTaskTitle}" added for ${newTaskWorkspace}`
      );
    }

    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskDueDate('');
    setShowAddTaskModal(false);
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemTitle.trim() || !newRemTime) return;

    const newRem = await db.addReminder({
      title: newRemTitle.trim(),
      dateTime: newRemTime,
      priority: newRemPriority,
      businessId: newRemWorkspace
    });

    // Fire immediate Android push notification
    androidAutomation.showSystemNotification(
      `Reminder Set: ${newRem.title}`,
      `Scheduled for ${new Date(newRemTime).toLocaleString()}`
    );

    setNewRemTitle('');
    setNewRemTime('');
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    await db.addNote({
      title: `Note - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      content: newNoteContent.trim(),
      isVoiceNote: false
    });

    setNewNoteContent('');
  };

  const handleVoiceCommandSubmit = async (customPrompt?: string) => {
    const textToRun = customPrompt || aiPromptInput;
    if (!textToRun.trim()) return;

    setIsAiProcessing(true);
    try {
      const { result } = await aiAgent.processCommand(textToRun, currentBusinessId);
      const msg = await aiAgent.executeAction(result);
      setAiPromptInput('');

      // Send Android notification confirmation
      androidAutomation.showSystemNotification('GopalAI Action Completed', msg);
    } catch (e) {
      console.error('Error executing voice command in tasks:', e);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const toggleMicListening = () => {
    if (isVoiceListening) {
      voice.stopListening();
      setIsVoiceListening(false);
    } else {
      setIsVoiceListening(true);
      androidAutomation.playSoundEffect('mic_start');
      voice.startListening('hi-IN');

      const unsub = voice.subscribe(async (state) => {
        if (state.transcript) {
          setAiPromptInput(state.transcript);
        }
        if (!state.isListening && isVoiceListening) {
          setIsVoiceListening(false);
          unsub();
          if (state.transcript.trim()) {
            await handleVoiceCommandSubmit(state.transcript);
          }
        }
      });
    }
  };

  const getPriorityBadge = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high':
        return <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 uppercase">High Priority</span>;
      case 'medium':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase">Medium</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 uppercase">Low</span>;
    }
  };

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case 'supplier_payment':
        return 'Supplier Payment';
      case 'stock_alert':
        return 'Stock Alert';
      case 'staff_task':
        return 'Staff Task';
      case 'personal':
        return 'Personal';
      default:
        return 'Routine Task';
    }
  };

  const getWorkspaceIcon = (id?: BusinessId) => {
    switch (id) {
      case 'jain-sweets':
        return <Candy className="w-3.5 h-3.5 text-amber-500" />;
      case 'paan-bai':
        return <Utensils className="w-3.5 h-3.5 text-emerald-500" />;
      case 'kesarwadi':
        return <Store className="w-3.5 h-3.5 text-orange-500" />;
      case 'personal':
        return <User className="w-3.5 h-3.5 text-blue-500" />;
      default:
        return <Building2 className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <CheckSquare className="w-5 h-5" />
            <span>{t('tasksRemindersNotesTitle')}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('personalAutomation')}</p>
        </div>

        <button
          onClick={() => setShowAddTaskModal(true)}
          className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 transition"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Task</span>
        </button>
      </div>

      {/* GopalAI Quick Command Entry Bar */}
      <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
            <Sparkles className="w-4 h-4 animate-pulse text-amber-500" />
            <span>AI Voice & Text Task Assistant</span>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">Hindi / English / Hinglish</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={aiPromptInput}
            onChange={(e) => setAiPromptInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleVoiceCommandSubmit()}
            placeholder="e.g., 'Kal shaam 5 baje milk vendor ko payment karne ka reminder set karo'..."
            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={toggleMicListening}
            className={`p-2.5 rounded-xl flex items-center justify-center transition shadow-xs ${
              isVoiceListening
                ? 'bg-rose-500 text-white animate-bounce'
                : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 hover:bg-amber-500 hover:text-slate-950'
            }`}
          >
            <Mic className="w-4 h-4 stroke-[2.5]" />
          </button>
          <button
            onClick={() => handleVoiceCommandSubmit()}
            disabled={isAiProcessing || !aiPromptInput.trim()}
            className="p-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold hover:brightness-110 disabled:opacity-40 transition shadow-xs"
          >
            <Send className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Business Workspace Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedWorkspace('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
            selectedWorkspace === 'all'
              ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
          }`}
        >
          All Workspaces ({tasks.length})
        </button>

        {Object.entries(BUSINESSES).map(([id, info]) => {
          const count = tasks.filter((t) => t.businessId === id).length;
          return (
            <button
              key={id}
              onClick={() => setSelectedWorkspace(id as BusinessId)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition border ${
                selectedWorkspace === id
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/50 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
              }`}
            >
              {getWorkspaceIcon(id as BusinessId)}
              <span>{info.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold gap-1 shadow-xs">
        {(['tasks', 'reminders', 'notes'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 capitalize transition ${
              activeSubTab === tab
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab === 'tasks' && <CheckSquare className="w-4 h-4 text-amber-500" />}
            {tab === 'reminders' && <Bell className="w-4 h-4 text-amber-500" />}
            {tab === 'notes' && <StickyNote className="w-4 h-4 text-amber-500" />}
            <span>{t(tab as any) || tab}</span>
          </button>
        ))}
      </div>

      {/* Sub-Tab 1: Tasks */}
      {activeSubTab === 'tasks' && (
        <div className="space-y-3">
          {/* Category Filter & Status Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-slate-400 font-semibold text-[11px] mr-1">Category:</span>
              {['all', 'personal', 'supplier_payment', 'stock_alert', 'staff_task', 'routine'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border ${
                    selectedCategory === cat
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40'
                      : 'bg-white/70 dark:bg-slate-900/70 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {cat === 'all' ? 'All' : getCategoryLabel(cat)}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-500"
              />
              <span>Show Done Tasks</span>
            </label>
          </div>

          {/* Task List */}
          <div className="space-y-2">
            {filteredTasks.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-dashed border-slate-300 dark:border-slate-800 space-y-2">
                <CheckSquare className="w-8 h-8 text-slate-400 mx-auto stroke-1" />
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('noActiveTasks')}</div>
                <button
                  onClick={() => setShowAddTaskModal(true)}
                  className="px-3 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-xl hover:bg-amber-500/20 transition"
                >
                  Create Task Now
                </button>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 shadow-xs transition hover:border-slate-300 dark:hover:border-slate-700 ${
                    task.completed ? 'opacity-50 bg-slate-50/50 dark:bg-slate-950/50' : ''
                  }`}
                >
                  <div
                    onClick={() => db.toggleTask(task.id)}
                    className="mt-0.5 cursor-pointer text-slate-400 hover:text-amber-500 transition"
                  >
                    <div
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center transition ${
                        task.completed
                          ? 'bg-amber-500 border-amber-500 text-slate-950'
                          : 'border-slate-300 dark:border-slate-700 hover:border-amber-500'
                      }`}
                    >
                      {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        onClick={() => db.toggleTask(task.id)}
                        className={`text-xs font-bold cursor-pointer text-slate-900 dark:text-slate-100 ${
                          task.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''
                        }`}
                      >
                        {task.title}
                      </span>
                      {getPriorityBadge(task.priority)}
                    </div>

                    {task.description && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500 pt-1 flex-wrap">
                      <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        {getWorkspaceIcon(task.businessId)}
                        <span>{BUSINESSES[task.businessId || 'jain-sweets']?.name}</span>
                      </span>

                      {task.category && (
                        <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400 font-medium">
                          <Tag className="w-2.5 h-2.5" />
                          <span>{getCategoryLabel(task.category)}</span>
                        </span>
                      )}

                      {task.dueDate && (
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                          <Calendar className="w-2.5 h-2.5" />
                          <span>Due: {task.dueDate}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => db.deleteTask(task.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Reminders */}
      {activeSubTab === 'reminders' && (
        <div className="space-y-3">
          <form
            onSubmit={handleAddReminder}
            className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 space-y-3 shadow-xs"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              <BellRing className="w-4 h-4" />
              <span>{t('setReminder')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={newRemTitle}
                onChange={(e) => setNewRemTitle(e.target.value)}
                placeholder="Reminder Title (e.g. Pay electricity bill)"
                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
              />
              <input
                type="datetime-local"
                required
                value={newRemTime}
                onChange={(e) => setNewRemTime(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 font-semibold block mb-1">Business Workspace</label>
                <select
                  value={newRemWorkspace}
                  onChange={(e) => setNewRemWorkspace(e.target.value as BusinessId)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                >
                  {Object.entries(BUSINESSES).map(([id, b]) => (
                    <option key={id} value={id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-semibold block mb-1">Priority</label>
                <select
                  value={newRemPriority}
                  onChange={(e) => setNewRemPriority(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-xs flex items-center gap-1.5"
            >
              <Bell className="w-4 h-4" />
              <span>{t('setReminder')}</span>
            </button>
          </form>

          {/* Scheduled Reminders List */}
          <div className="space-y-2">
            {filteredReminders.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-500">
                {t('noReminders')}
              </div>
            ) : (
              filteredReminders.map((r) => (
                <div
                  key={r.id}
                  className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{r.title}</span>
                      {getPriorityBadge(r.priority)}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <Clock className="w-3 h-3 text-amber-500" />
                      <span>{new Date(r.dateTime).toLocaleString()}</span>
                      <span>•</span>
                      <span>{BUSINESSES[r.businessId || 'jain-sweets']?.name}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => db.deleteReminder(r.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Notes */}
      {activeSubTab === 'notes' && (
        <div className="space-y-3">
          <form onSubmit={handleAddNote} className="space-y-2">
            <textarea
              rows={3}
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Write a quick note, supplier instructions, or shop reminder..."
              className="w-full bg-white/90 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-xs"
            />
            <button
              type="submit"
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-xs flex items-center gap-1.5"
            >
              <StickyNote className="w-4 h-4" />
              <span>{t('saveNote')}</span>
            </button>
          </form>

          <div className="space-y-2">
            {notes.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-500">
                {t('noNotes')}
              </div>
            ) : (
              notes.map((n) => (
                <div
                  key={n.id}
                  className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2 shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-amber-600 dark:text-amber-400">{n.title}</div>
                    <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{n.content}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleDateString()}</div>
                  </div>
                  <button
                    onClick={() => db.deleteNote(n.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showAddTaskModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 w-full max-w-md space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-amber-500" />
                <span>Create New Task</span>
              </div>
              <button
                onClick={() => setShowAddTaskModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Reorder packaging boxes"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Description / Instructions
                </label>
                <textarea
                  rows={2}
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Optional task details..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-2 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Workspace
                  </label>
                  <select
                    value={newTaskWorkspace}
                    onChange={(e) => setNewTaskWorkspace(e.target.value as BusinessId)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    {Object.entries(BUSINESSES).map(([id, b]) => (
                      <option key={id} value={id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Category
                  </label>
                  <select
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="routine">Routine Task</option>
                    <option value="supplier_payment">Supplier Payment</option>
                    <option value="stock_alert">Stock Alert</option>
                    <option value="staff_task">Staff Task</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Priority Level
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddTaskModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-xs hover:brightness-110"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
