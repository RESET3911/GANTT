'use client';

import { useState, useMemo } from 'react';
import { differenceInDays, parseISO, isBefore, startOfDay } from 'date-fns';
import { Task, ViewState, TaskStatus } from '@/types/task';

type Props = {
  tasks: Task[];
  viewState: ViewState;
  onTaskClick: (task: Task) => void;
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: '未着手',
  in_progress: '進行中',
  done: '完了',
  closed: 'クローズ',
};

const STATUS_STYLE: Record<TaskStatus, string> = {
  todo: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-600',
  closed: 'bg-gray-100 text-gray-400',
};

function daysRemaining(endDate: string): { label: string; color: string } {
  const today = startOfDay(new Date());
  const end = parseISO(endDate);
  const diff = differenceInDays(end, today);
  if (diff < 0) return { label: `${Math.abs(diff)}日超過`, color: 'text-red-500 font-semibold' };
  if (diff === 0) return { label: '今日', color: 'text-orange-500 font-semibold' };
  if (diff <= 3) return { label: `残り${diff}日`, color: 'text-orange-400' };
  return { label: `残り${diff}日`, color: 'text-gray-400' };
}

function TaskRow({ task, onTaskClick }: { task: Task; onTaskClick: (t: Task) => void }) {
  const rem = daysRemaining(task.endDate);
  const today = startOfDay(new Date());
  const isOverdue = isBefore(parseISO(task.endDate), today) && task.status !== 'done' && task.status !== 'closed';
  const isDone = task.status === 'done' || task.status === 'closed';
  const tdCls = 'px-3 py-2 text-sm';

  return (
    <tr
      onClick={() => onTaskClick(task)}
      className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${isOverdue ? 'bg-red-50' : ''} ${isDone ? 'opacity-60' : ''}`}
    >
      <td className={tdCls}>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[task.status]}`}>
          {STATUS_LABELS[task.status]}
        </span>
      </td>
      <td className={`${tdCls} max-w-[280px]`}>
        <span className="text-blue-600 hover:underline truncate block">
          {task.milestoneFlag && <span className="mr-1 text-yellow-500">◆</span>}
          {task.title}
        </span>
        {task.notes && (
          <span className="text-xs text-gray-400 truncate block mt-0.5">{task.notes}</span>
        )}
      </td>
      <td className={`${tdCls} text-gray-600`}>{task.assignee || '—'}</td>
      <td className={`${tdCls} text-gray-500`}>{task.category || '—'}</td>
      <td className={`${tdCls} tabular-nums text-gray-600`}>{task.startDate.replace(/-/g, '/')}</td>
      <td className={`${tdCls} tabular-nums text-gray-600`}>{task.endDate.replace(/-/g, '/')}</td>
      <td className={`${tdCls} ${rem.color}`}>
        {isDone ? <span className="text-gray-300">—</span> : rem.label}
      </td>
      <td className={tdCls}>
        {task.gcalEventId ? <span title="GCal同期済み">📅</span> : '—'}
      </td>
    </tr>
  );
}

function SectionHeader({
  label, count, color, collapsed, onToggle,
}: {
  label: string; count: number; color: string; collapsed?: boolean; onToggle?: () => void;
}) {
  return (
    <tr className={`${color} select-none ${onToggle ? 'cursor-pointer' : ''}`} onClick={onToggle}>
      <td colSpan={8} className="px-3 py-1.5">
        <div className="flex items-center gap-2">
          {onToggle && (
            <span className="text-gray-500 text-xs">{collapsed ? '▶' : '▼'}</span>
          )}
          <span className="text-xs font-bold text-gray-700">{label}</span>
          <span className="text-xs text-gray-500 bg-white/60 px-1.5 py-0.5 rounded-full">{count}</span>
        </div>
      </td>
    </tr>
  );
}

export default function ListView({ tasks, viewState, onTaskClick }: Props) {
  const [doneExpanded, setDoneExpanded] = useState(false);

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (viewState.filterStatus === 'all') return true;
      if (viewState.filterStatus === 'not_closed') return t.status !== 'closed';
      return t.status === viewState.filterStatus;
    });
  }, [tasks, viewState.filterStatus]);

  const inProgress = useMemo(() =>
    filtered.filter(t => t.status === 'in_progress').sort((a, b) => a.endDate.localeCompare(b.endDate)),
    [filtered]);

  const todo = useMemo(() =>
    filtered.filter(t => t.status === 'todo').sort((a, b) => a.endDate.localeCompare(b.endDate)),
    [filtered]);

  const done = useMemo(() =>
    filtered.filter(t => t.status === 'done' || t.status === 'closed').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [filtered]);

  const thCls = 'text-left text-xs font-semibold text-gray-500 px-3 py-2 whitespace-nowrap';

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
          <tr>
            <th className={thCls}>状態</th>
            <th className={thCls}>件名</th>
            <th className={thCls}>担当者</th>
            <th className={thCls}>カテゴリー</th>
            <th className={thCls}>開始日</th>
            <th className={thCls}>終了日</th>
            <th className={thCls}>残り日数</th>
            <th className={thCls}>GCal</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr>
              <td colSpan={8} className="text-center py-16 text-gray-400 text-sm">タスクがありません</td>
            </tr>
          )}

          {/* 進行中 */}
          {inProgress.length > 0 && (
            <>
              <SectionHeader label="進行中" count={inProgress.length} color="bg-blue-50" />
              {inProgress.map(t => <TaskRow key={t.id} task={t} onTaskClick={onTaskClick} />)}
            </>
          )}

          {/* 未着手 */}
          {todo.length > 0 && (
            <>
              <SectionHeader label="未着手" count={todo.length} color="bg-gray-50" />
              {todo.map(t => <TaskRow key={t.id} task={t} onTaskClick={onTaskClick} />)}
            </>
          )}

          {/* 完了（折りたたみ） */}
          {done.length > 0 && (
            <>
              <SectionHeader
                label="Done"
                count={done.length}
                color="bg-green-50"
                collapsed={!doneExpanded}
                onToggle={() => setDoneExpanded(v => !v)}
              />
              {doneExpanded && done.map(t => <TaskRow key={t.id} task={t} onTaskClick={onTaskClick} />)}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
