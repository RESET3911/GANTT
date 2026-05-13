'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Task, ViewState } from '@/types/task';
import { subscribeTasks, saveTask, updateTaskFields, deleteTask } from '@/lib/storage';
import { connectGCal, disconnectGCal, isGCalConnected, wasGCalConnected, createGCalEvent, updateGCalEvent, deleteGCalEvent, listCalendars, listEvents, GCalCalendar } from '@/lib/gcal';
import { subscribeGanttSettings, GanttSettings } from '@/lib/ganttSettings';
import { subscribeDailyTodos, DailyTodo } from '@/lib/dailyTodo';
import { SaveData } from '@/components/TaskModal';
import DailyTodoPanel from '@/components/DailyTodoPanel';
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
  const [dailyTodos, setDailyTodos] = useState<DailyTodo[]>([]);
  const [todoHeight, setTodoHeight] = useState(260);
  const isDragging = useRef(false);

  // Firebase リアルタイム購読
  useEffect(() => {
    const unsub = subscribeTasks(
      items => { setTasks(items); setLoading(false); },
      () => setLoading(false)
    );
    const unsubTodos = subscribeDailyTodos(items => setDailyTodos(items));
    return () => { unsub(); unsubTodos(); };
  }, []);

  // GCal自動再接続（前回接続済みの場合）
  useEffect(() => {
    if (!wasGCalConnected()) return;
    const tryAutoConnect = () => {
      connectGCal(
        async () => {
          setGcalConnected(true);
          try {
            const cals = await listCalendars();
            setCalendars(cals);
          } catch { /* ignore */ }
        },
        () => { /* サイレント失敗 - ユーザーが手動で再接続 */ },
        true // silent
      );
    };
    // GISスクリプトのロード待ち
    if (window.google) {
      tryAutoConnect();
    } else {
      const timer = setTimeout(tryAutoConnect, 1500);
      return () => clearTimeout(timer);
    }
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
      const msg = e instanceof Error ? e.message : String(e);
      setGcalError(`GCalからの同期に失敗しました: ${msg}`);
      console.error(e);
    } finally {
      setSyncing(false);
    }
  }, [gcalConnected, ganttSettings, tasks]);

  const handleDividerMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    const startY = e.clientY;
    const startHeight = todoHeight;

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = startY - ev.clientY;
      setTodoHeight(Math.max(140, Math.min(520, startHeight + delta)));
    };
    const onUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const modalTask = modal?.type === 'edit' ? modal.task : null;
  const modalDate = modal?.type === 'new' ? modal.date : undefined;

  const hdrBtn = (style?: React.CSSProperties): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '5px 12px', fontSize: 12, fontWeight: 500,
    borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.78)',
    cursor: 'pointer', transition: 'all 0.15s', ...style,
  });

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--canvas)' }}>
      {/* Header */}
      <header className="flex items-center px-5 gap-4 flex-shrink-0" style={{ background: 'var(--header)', height: 52 }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="15" height="13" viewBox="0 0 15 13" fill="none">
              <rect x="0" y="0" width="6" height="2.5" rx="1.25" fill="white"/>
              <rect x="0" y="5.25" width="11" height="2.5" rx="1.25" fill="white" opacity="0.75"/>
              <rect x="0" y="10.5" width="8.5" height="2.5" rx="1.25" fill="white" opacity="0.5"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
            Gantt Scheduler
          </h1>
        </div>

        {/* Mode toggle */}
        <div style={{ background: 'rgba(255,255,255,0.09)', borderRadius: 9, padding: 3, display: 'flex', gap: 2 }}>
          {(['gantt', 'list'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: '4px 13px', fontSize: 12, fontWeight: 600, borderRadius: 7,
              background: mode === m ? 'white' : 'transparent',
              color: mode === m ? 'var(--header)' : 'rgba(255,255,255,0.6)',
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {m === 'gantt' ? 'ガント' : 'リスト'}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setShowSettings(true)} style={hdrBtn()}>⚙️ 設定</button>

          {gcalConnected ? (
            <>
              <button onClick={handleSyncFromGCal} disabled={syncing} style={hdrBtn({ opacity: syncing ? 0.5 : 1, borderColor: 'rgba(99,102,241,0.45)', background: 'rgba(99,102,241,0.15)', color: '#A5B4FC' })}>
                {syncing ? '同期中...' : '📥 GCalから同期'}
              </button>
              <button onClick={handleDisconnectGCal} style={hdrBtn({ borderColor: 'rgba(34,197,94,0.38)', background: 'rgba(34,197,94,0.1)', color: '#86EFAC' })}>
                📅 GCal連携中
              </button>
            </>
          ) : (
            <button onClick={handleConnectGCal} style={hdrBtn()}>📅 Googleカレンダー連携</button>
          )}

          <button onClick={() => setModal({ type: 'new' })} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 16px', fontSize: 13, fontWeight: 600,
            borderRadius: 8, background: 'var(--accent)', color: 'white',
            border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
          }}>
            + タスク追加
          </button>
        </div>
      </header>

      {/* GCal error */}
      {gcalError && (
        <div style={{ background: '#FFF1F2', borderBottom: '1px solid #FECDD3', padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#E11D48' }}>⚠️ {gcalError}</span>
          <button onClick={() => setGcalError(null)} style={{ color: '#FDA4AF', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Control Bar */}
      <ControlBar
        viewState={viewState}
        onViewStateChange={setViewState}
        onToday={() => setViewState(prev => ({ ...prev, viewStartDate: format(new Date(), 'yyyy-MM-dd') }))}
        onNavigateWeek={navigateWeek}
      />

      {/* Main content: split top/bottom */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Top: Gantt / List */}
        <div className="flex-1 overflow-hidden min-h-0">
          {loading ? (
            <div className="h-full flex items-center justify-center">
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
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={handleDividerMouseDown}
          className="h-1.5 bg-gray-200 hover:bg-blue-400 active:bg-blue-500 cursor-row-resize flex-shrink-0 transition-colors flex items-center justify-center"
          title="ドラッグでサイズ調整"
        >
          <div className="w-12 h-0.5 bg-gray-400 rounded-full" />
        </div>

        {/* Bottom: Daily ToDo */}
        <div className="flex-shrink-0 overflow-hidden border-t border-gray-200" style={{ height: todoHeight }}>
          <DailyTodoPanel todos={dailyTodos} />
        </div>
      </div>

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
