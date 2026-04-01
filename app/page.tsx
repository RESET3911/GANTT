'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Task, ViewState } from '@/types/task';
import { subscribeTasks, saveTask, updateTaskFields, deleteTask } from '@/lib/storage';
import { connectGCal, disconnectGCal, isGCalConnected, createGCalEvent, updateGCalEvent, deleteGCalEvent, listCalendars, listEvents, GCalCalendar } from '@/lib/gcal';
import { subscribeGanttSettings, GanttSettings } from '@/lib/ganttSettings';
import { SaveData } from '@/components/TaskModal';
import ControlBar from '@/components/ControlBar';
import GanttChart from '@/components/GanttChart';
import ListView from '@/components/ListView';
import TaskModal from '@/components/TaskModal';
import SettingsModal from '@/components/SettingsModal';

type AppMode = 'gantt' | 'list';

const DEFAULT_VIEW_STATE: ViewState = {
  viewStartDate: format(new Date(), 'yyyy-MM-dd'),
  viewRange: 3,
  groupBy: 'none',
  filterStatus: 'all',
};

type ModalState =
  | { type: 'new'; date?: string }
  | { type: 'edit'; task: Task }
  | null;

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewState, setViewState] = useState<ViewState>(DEFAULT_VIEW_STATE);
  const [mode, setMode] = useState<AppMode>('gantt');
  const [modal, setModal] = useState<ModalState>(null);
  const [loading, setLoading] = useState(true);
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalError, setGcalError] = useState<string | null>(null);
  const [ganttSettings, setGanttSettings] = useState<GanttSettings>({ assignees: [] });
  const [showSettings, setShowSettings] = useState(false);
  const [calendars, setCalendars] = useState<GCalCalendar[]>([]);
  const [syncing, setSyncing] = useState(false);

  // Firebase リアルタイム購読
  useEffect(() => {
    const unsub = subscribeTasks(
      items => { setTasks(items); setLoading(false); },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  // GCal接続状態を再確認（ページ再表示時）
  useEffect(() => {
    setGcalConnected(isGCalConnected());
  }, []);

  // Gantt設定購読
  useEffect(() => {
    const unsub = subscribeGanttSettings(s => setGanttSettings(s));
    return () => unsub();
  }, []);

  const handleCreate = useCallback(async (data: SaveData | Task, syncToGCal: boolean) => {
    const now = new Date().toISOString();
    const base = data as SaveData;
    const task: Task = {
      ...base,
      id: uuidv4(),
      assignee: base.assignee ?? '',
      milestoneFlag: base.milestoneFlag ?? false,
      status: base.status ?? 'todo',
      createdAt: now,
      updatedAt: now,
    };
    await saveTask(task);

    if (syncToGCal && gcalConnected) {
      try {
        const calId = ganttSettings.gcalCalendarId ?? 'primary';
        const eventId = await createGCalEvent(task, calId);
        await updateTaskFields(task.id, { gcalEventId: eventId });
      } catch (e) {
        console.error('GCal sync failed:', e);
      }
    }
    setModal(null);
  }, [gcalConnected, ganttSettings]);

  const handleUpdate = useCallback(async (data: SaveData | Task, syncToGCal: boolean) => {
    const task = data as Task;
    const updated: Task = { ...task, updatedAt: new Date().toISOString() };
    await saveTask(updated);

    if (syncToGCal && gcalConnected) {
      try {
        const calId = ganttSettings.gcalCalendarId ?? 'primary';
        if (updated.gcalEventId) {
          await updateGCalEvent(updated.gcalEventId, updated, calId);
        } else {
          const eventId = await createGCalEvent(updated, calId);
          await updateTaskFields(updated.id, { gcalEventId: eventId });
        }
      } catch (e) {
        console.error('GCal sync failed:', e);
      }
    }
    setModal(null);
  }, [gcalConnected, ganttSettings]);

  const handleDelete = useCallback(async (task: Task) => {
    if (task.gcalEventId && gcalConnected) {
      try {
        const calId = ganttSettings.gcalCalendarId ?? 'primary';
        await deleteGCalEvent(task.gcalEventId, calId);
      } catch { /* ignore */ }
    }
    await deleteTask(task.id);
    setModal(null);
  }, [gcalConnected]);

  const navigateWeek = (dir: 1 | -1) => {
    setViewState(prev => ({
      ...prev,
      viewStartDate: format(
        dir === 1 ? addDays(parseISO(prev.viewStartDate), 7) : subDays(parseISO(prev.viewStartDate), 7),
        'yyyy-MM-dd'
      ),
    }));
  };

  const handleConnectGCal = () => {
    setGcalError(null);
    connectGCal(
      async () => {
        setGcalConnected(true);
        try {
          const cals = await listCalendars();
          setCalendars(cals);
        } catch { /* ignore */ }
      },
      msg => setGcalError(msg)
    );
  };

  const handleDisconnectGCal = () => {
    disconnectGCal();
    setGcalConnected(false);
    setCalendars([]);
  };

  const handleSyncFromGCal = useCallback(async () => {
    if (!gcalConnected) return;
    setSyncing(true);
    setGcalError(null);
    try {
      const calId = ganttSettings.gcalCalendarId ?? 'primary';
      // 過去3ヶ月〜未来12ヶ月の範囲で取得
      const timeMin = format(subDays(new Date(), 90), 'yyyy-MM-dd');
      const timeMax = format(addDays(new Date(), 365), 'yyyy-MM-dd');
      const events = await listEvents(calId, timeMin, timeMax);

      const now = new Date().toISOString();
      for (const ev of events) {
        if (!ev.summary) continue;

        // 日付を正規化（終日イベントのendは exclusive なので -1日）
        const startDate = ev.start.date
          ? ev.start.date
          : format(new Date(ev.start.dateTime!), 'yyyy-MM-dd');
        const endDateRaw = ev.end.date
          ? ev.end.date
          : format(new Date(ev.end.dateTime!), 'yyyy-MM-dd');
        // GCal の終日イベントは end が exclusive なので1日戻す
        const endDate = ev.end.date
          ? format(subDays(new Date(endDateRaw), 1), 'yyyy-MM-dd')
          : endDateRaw;

        // 既存タスクと gcalEventId で照合
        const existing = tasks.find(t => t.gcalEventId === ev.id);
        if (existing) {
          // タイトル・日付が変わっていれば更新
          if (
            existing.title !== ev.summary ||
            existing.startDate !== startDate ||
            existing.endDate !== endDate ||
            existing.notes !== (ev.description ?? undefined)
          ) {
            await saveTask({
              ...existing,
              title: ev.summary,
              startDate,
              endDate,
              notes: ev.description || undefined,
              updatedAt: now,
            });
          }
        } else {
          // 新規タスクとして登録
          const task: Task = {
            id: uuidv4(),
            title: ev.summary,
            startDate,
            endDate,
            status: 'todo',
            assignee: '',
            milestoneFlag: false,
            notes: ev.description || undefined,
            gcalEventId: ev.id,
            createdAt: now,
            updatedAt: now,
          };
          await saveTask(task);
        }
      }
    } catch (e) {
      setGcalError('GCalからの同期に失敗しました');
      console.error(e);
    } finally {
      setSyncing(false);
    }
  }, [gcalConnected, ganttSettings, tasks]);

  const modalTask = modal?.type === 'edit' ? modal.task : null;
  const modalDate = modal?.type === 'new' ? modal.date : undefined;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      {/* Header */}
      <header className="h-12 bg-white border-b flex items-center px-4 gap-3 flex-shrink-0 shadow-sm">
        <span className="text-xl">📊</span>
        <h1 className="text-base font-bold text-gray-900">Gantt Scheduler</h1>

        {/* Mode toggle */}
        <div className="flex border border-gray-300 rounded-lg overflow-hidden ml-4">
          <button
            onClick={() => setMode('gantt')}
            className={`px-3 py-1 text-xs font-medium transition-colors ${mode === 'gantt' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            ガント
          </button>
          <button
            onClick={() => setMode('list')}
            className={`px-3 py-1 text-xs font-medium transition-colors ${mode === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            リスト
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-gray-600 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
          >
            ⚙️ 設定
          </button>

          {/* Google Calendar button */}
          {gcalConnected ? (
            <>
              <button
                onClick={handleSyncFromGCal}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
              >
                {syncing ? '同期中...' : '📥 GCalから同期'}
              </button>
              <button
                onClick={handleDisconnectGCal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-300 rounded-lg hover:bg-green-100 transition-colors"
              >
                📅 GCal連携中
              </button>
            </>
          ) : (
            <button
              onClick={handleConnectGCal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-gray-600 border border-gray-300 rounded-lg hover:border-blue-400 hover:text-blue-500 transition-colors"
            >
              📅 Googleカレンダー連携
            </button>
          )}

          <button
            onClick={() => setModal({ type: 'new' })}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            + タスク追加
          </button>
        </div>
      </header>

      {/* GCal error */}
      {gcalError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-red-600">⚠️ {gcalError}</span>
          <button onClick={() => setGcalError(null)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
        </div>
      )}

      {/* Control Bar */}
      <ControlBar
        viewState={viewState}
        onViewStateChange={setViewState}
        onToday={() => setViewState(prev => ({ ...prev, viewStartDate: format(new Date(), 'yyyy-MM-dd') }))}
        onNavigateWeek={navigateWeek}
      />

      {/* Main content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400 text-sm">読み込み中...</p>
        </div>
      ) : mode === 'gantt' ? (
        <GanttChart
          tasks={tasks}
          viewState={viewState}
          onTaskClick={task => setModal({ type: 'edit', task })}
          onDateClick={date => setModal({ type: 'new', date })}
        />
      ) : (
        <ListView
          tasks={tasks}
          viewState={viewState}
          onTaskClick={task => setModal({ type: 'edit', task })}
        />
      )}

      {/* Task Modal */}
      {modal !== null && (
        <TaskModal
          task={modalTask}
          tasks={tasks}
          assignees={ganttSettings.assignees}
          initialDate={modalDate}
          gcalConnected={gcalConnected}
          onSave={modal.type === 'new' ? handleCreate : handleUpdate}
          onDelete={modal.type === 'edit' ? () => handleDelete(modal.task) : undefined}
          onClose={() => setModal(null)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={ganttSettings}
          gcalConnected={gcalConnected}
          calendars={calendars}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
