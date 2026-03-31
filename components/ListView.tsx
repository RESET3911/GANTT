'use client';

import { useState, useMemo } from 'react';
import { differenceInDays, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';
import { Task, ViewState, TaskStatus } from '@/types/task';

type Props = {
  tasks: Task[];
  viewState: ViewState;
  onTaskClick: (task: Task) => void;
};

type SortKey = 'startDate' | 'endDate' | 'status' | 'title' | 'assignee';

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: '未対応',
  in_progress: '処理中',
  done: '処理済み',
  closed: '完了',
};

const STATUS_STYLE: Record<TaskStatus, string> = {
  todo: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-600',
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

export default function ListView({ tasks, viewState, onTaskClick }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('startDate');
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (viewState.filterStatus === 'all') return true;
      if (viewState.filterStatus === 'not_closed') return t.status !== 'closed';
      return t.status === viewState.filterStatus;
    });
  }, [tasks, viewState.filterStatus]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'startDate' || sortKey === 'endDate') {
        cmp = a[sortKey].localeCompare(b[sortKey]);
      } else if (sortKey === 'status') {
        const order: Record<TaskStatus, number> = { todo: 0, in_progress: 1, done: 2, closed: 3 };
        cmp = order[a.status] - order[b.status];
      } else {
        cmp = (a[sortKey] ?? '').localeCompare(b[sortKey] ?? '');
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(v => !v);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => (
    <span style={{ marginLeft: 4, color: sortKey === k ? '#3b82f6' : '#d1d5db' }}>
      {sortKey === k ? (sortAsc ? '▲' : '▼') : '⇅'}
    </span>
  );

  const thCls = 'text-left text-xs font-semibold text-gray-500 px-3 py-2 select-none cursor-pointer hover:text-blue-500 whitespace-nowrap';
  const tdCls = 'px-3 py-2 text-sm';

  const today = startOfDay(new Date());

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
          <tr>
            <th className={thCls} onClick={() => handleSort('status')}>
              状態 <SortIcon k="status" />
            </th>
            <th className={thCls} onClick={() => handleSort('title')}>
              件名 <SortIcon k="title" />
            </th>
            <th className={thCls} onClick={() => handleSort('assignee')}>
              担当者 <SortIcon k="assignee" />
            </th>
            <th className={thCls}>カテゴリー</th>
            <th className={thCls} onClick={() => handleSort('startDate')}>
              開始日 <SortIcon k="startDate" />
            </th>
            <th className={thCls} onClick={() => handleSort('endDate')}>
              終了日 <SortIcon k="endDate" />
            </th>
            <th className={thCls}>残り日数</th>
            <th className={thCls}>GCal</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={8} className="text-center py-16 text-gray-400 text-sm">
                タスクがありません
              </td>
            </tr>
          )}
          {sorted.map(task => {
            const rem = daysRemaining(task.endDate);
            const isOverdue = isBefore(parseISO(task.endDate), today) && task.status !== 'done' && task.status !== 'closed';
            return (
              <tr
                key={task.id}
                onClick={() => onTaskClick(task)}
                className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${isOverdue ? 'bg-red-50' : ''}`}
              >
                <td className={tdCls}>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[task.status]}`}>
                    {STATUS_LABELS[task.status]}
                  </span>
                </td>
                <td className={`${tdCls} max-w-[300px]`}>
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
                <td className={`${tdCls} tabular-nums text-gray-600`}>
                  {task.startDate.replace(/-/g, '/')}
                </td>
                <td className={`${tdCls} tabular-nums text-gray-600`}>
                  {task.endDate.replace(/-/g, '/')}
                </td>
                <td className={`${tdCls} ${rem.color}`}>
                  {task.status === 'done' || task.status === 'closed' ? (
                    <span className="text-gray-300">—</span>
                  ) : rem.label}
                </td>
                <td className={tdCls}>
                  {task.gcalEventId ? (
                    <span title="Googleカレンダーに同期済み" className="text-base">📅</span>
                  ) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
