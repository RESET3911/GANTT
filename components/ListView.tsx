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

const STATUS_STYLE: Record<TaskStatus, React.CSSProperties> = {
  todo:        { background: '#F4F4F5', color: '#71717A' },
  in_progress: { background: 'rgba(99,102,241,0.1)', color: '#4F46E5' },
  done:        { background: '#DCFCE7', color: '#16A34A' },
  closed:      { background: '#F4F4F5', color: '#A1A1AA' },
};

function daysRemaining(endDate: string): { label: string; color: string } {
  const today = startOfDay(new Date());
  const end = parseISO(endDate);
  const diff = differenceInDays(end, today);
  if (diff < 0) return { label: `${Math.abs(diff)}日超過`, color: '#EF4444' };
  if (diff === 0) return { label: '今日まで', color: '#F97316' };
  if (diff <= 3) return { label: `残り${diff}日`, color: '#F59E0B' };
  return { label: `残り${diff}日`, color: 'var(--t3)' };
}

function TaskRow({ task, onTaskClick }: { task: Task; onTaskClick: (t: Task) => void }) {
  const rem = daysRemaining(task.endDate);
  const today = startOfDay(new Date());
  const isOverdue = isBefore(parseISO(task.endDate), today) && task.status !== 'done' && task.status !== 'closed';
  const isDone = task.status === 'done' || task.status === 'closed';

  return (
    <tr
      onClick={() => onTaskClick(task)}
      style={{
        borderBottom: '1px solid var(--bd-light)',
        cursor: 'pointer',
        background: isOverdue ? 'rgba(239,68,68,0.03)' : 'transparent',
        opacity: isDone ? 0.55 : 1,
        transition: 'background 0.12s',
      }}
      className="hover:bg-blue-50/60 group"
    >
      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 8px',
          borderRadius: 20, display: 'inline-block',
          ...STATUS_STYLE[task.status],
        }}>
          {STATUS_LABELS[task.status]}
        </span>
      </td>
      <td style={{ padding: '10px 14px', maxWidth: 280 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {task.milestoneFlag && <span style={{ color: '#F59E0B', fontSize: 11, flexShrink: 0 }}>◆</span>}
          <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            className="group-hover:underline">
            {task.title}
          </span>
        </div>
        {task.notes && (
          <span style={{ fontSize: 11, color: 'var(--t3)', display: 'block', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.notes}
          </span>
        )}
      </td>
      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t2)', whiteSpace: 'nowrap' }}>{task.assignee || '—'}</td>
      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t2)', whiteSpace: 'nowrap' }}>{task.category || '—'}</td>
      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t2)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
        {task.startDate.replace(/-/g, '/')}
      </td>
      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t2)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
        {task.endDate.replace(/-/g, '/')}
      </td>
      <td style={{ padding: '10px 14px', fontSize: 11, fontWeight: 600, color: rem.color, whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
        {isDone ? <span style={{ color: 'var(--t3)', fontFamily: 'inherit' }}>—</span> : rem.label}
      </td>
      <td style={{ padding: '10px 14px', fontSize: 13, textAlign: 'center' }}>
        {task.gcalEventId ? '📅' : <span style={{ color: 'var(--bd)' }}>—</span>}
      </td>
    </tr>
  );
}

function SectionHeader({
  label, count, accent, collapsed, onToggle,
}: {
  label: string; count: number; accent: string; collapsed?: boolean; onToggle?: () => void;
}) {
  return (
    <tr
      style={{ background: '#F8F7F4', cursor: onToggle ? 'pointer' : 'default', userSelect: 'none', borderBottom: '1px solid var(--bd)' }}
      onClick={onToggle}
    >
      <td colSpan={8} style={{ padding: '8px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 3, height: 14, borderRadius: 2, background: accent, flexShrink: 0 }} />
          {onToggle && (
            <span style={{ fontSize: 10, color: 'var(--t3)', lineHeight: 1 }}>{collapsed ? '▶' : '▼'}</span>
          )}
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t1)', letterSpacing: '0.02em' }}>{label}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, color: accent,
            background: `${accent}18`, padding: '1px 7px', borderRadius: 20,
            fontFamily: 'var(--font-mono)',
          }}>{count}</span>
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

  const thStyle: React.CSSProperties = {
    textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--t3)',
    padding: '10px 14px', whiteSpace: 'nowrap', background: 'var(--surface)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    borderBottom: '2px solid var(--bd)',
    position: 'sticky', top: 0, zIndex: 10,
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', background: 'var(--canvas)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>状態</th>
            <th style={thStyle}>件名</th>
            <th style={thStyle}>担当者</th>
            <th style={thStyle}>カテゴリー</th>
            <th style={thStyle}>開始日</th>
            <th style={thStyle}>終了日</th>
            <th style={thStyle}>残り</th>
            <th style={thStyle}>GCal</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', padding: '64px 0', color: 'var(--t3)', fontSize: 13 }}>
                タスクがありません
              </td>
            </tr>
          )}

          {inProgress.length > 0 && (
            <>
              <SectionHeader label="進行中" count={inProgress.length} accent="var(--accent)" />
              {inProgress.map(t => <TaskRow key={t.id} task={t} onTaskClick={onTaskClick} />)}
            </>
          )}

          {todo.length > 0 && (
            <>
              <SectionHeader label="未着手" count={todo.length} accent="var(--t3)" />
              {todo.map(t => <TaskRow key={t.id} task={t} onTaskClick={onTaskClick} />)}
            </>
          )}

          {done.length > 0 && (
            <>
              <SectionHeader
                label="Done"
                count={done.length}
                accent="#16A34A"
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
