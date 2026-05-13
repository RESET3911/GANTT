'use client';

import { useState, useMemo } from 'react';
import { parseISO, differenceInDays, format, isWeekend, isToday, addMonths } from 'date-fns';
import { Task, ViewState, GroupBy, Checkpoint } from '@/types/task';
import { getDaysInView, DAY_WIDTHS } from '@/lib/dateUtils';
import { getTaskColor } from '@/lib/taskColors';

const LEFT_PANEL_WIDTH = 380;
const ROW_HEIGHT = 40;
const HEADER_MONTH_H = 28;
const HEADER_DAY_H = 28;
const GROUP_ROW_H = 32;

type DisplayRow =
  | { type: 'group'; label: string; key: string }
  | { type: 'task'; task: Task };

function buildDisplayRows(tasks: Task[], viewState: ViewState): DisplayRow[] {
  const filtered = tasks.filter(t => {
    if (viewState.filterStatus === 'all') return true;
    if (viewState.filterStatus === 'not_closed') return t.status !== 'closed';
    return t.status === viewState.filterStatus;
  });

  if (viewState.groupBy === 'none') {
    return filtered.map(t => ({ type: 'task', task: t }));
  }

  const getKey = (t: Task): string => {
    if (viewState.groupBy === 'assignee') return t.assignee || '未割り当て';
    if (viewState.groupBy === 'category') return t.category || 'カテゴリなし';
    if (viewState.groupBy === 'parent') return t.parentId || 'トップレベル';
    return '';
  };

  const groups = new Map<string, Task[]>();
  filtered.forEach(t => {
    const key = getKey(t);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  });

  const rows: DisplayRow[] = [];
  groups.forEach((groupTasks, label) => {
    rows.push({ type: 'group', label, key: label });
    groupTasks.forEach(t => rows.push({ type: 'task', task: t }));
  });
  return rows;
}

type Props = {
  tasks: Task[];
  viewState: ViewState;
  onTaskClick: (task: Task) => void;
  onDateClick?: (date: string) => void;
};

export default function GanttChart({ tasks, viewState, onTaskClick, onDateClick }: Props) {
  const [panelVisible, setPanelVisible] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  const dayWidth = DAY_WIDTHS[viewState.viewRange];
  const viewStart = parseISO(viewState.viewStartDate);
  const viewEnd = addMonths(viewStart, viewState.viewRange);
  const totalDays = differenceInDays(viewEnd, viewStart);
  const days = useMemo(() => getDaysInView(viewState.viewStartDate, viewState.viewRange), [viewState.viewStartDate, viewState.viewRange]);
  const totalGanttWidth = totalDays * dayWidth;
  const leftW = panelVisible ? LEFT_PANEL_WIDTH : 40;

  const displayRows = useMemo(() => buildDisplayRows(tasks, viewState), [tasks, viewState]);

  // y positions for each row
  const { rowYs, totalHeight } = useMemo(() => {
    const ys: number[] = [];
    let y = 0;
    displayRows.forEach(row => {
      ys.push(y);
      y += row.type === 'group' ? GROUP_ROW_H : ROW_HEIGHT;
    });
    return { rowYs: ys, totalHeight: y };
  }, [displayRows]);

  // Month groups for header
  const monthGroups = useMemo(() => {
    const groups: { label: string; dayCount: number }[] = [];
    days.forEach(day => {
      const label = format(day, 'yyyy/MM');
      if (groups.length === 0 || groups[groups.length - 1].label !== label) {
        groups.push({ label, dayCount: 1 });
      } else {
        groups[groups.length - 1].dayCount++;
      }
    });
    return groups;
  }, [days]);

  const todayOffset = differenceInDays(new Date(), viewStart);
  const showTodayLine = todayOffset >= 0 && todayOffset < totalDays;

  const groupBy: GroupBy = viewState.groupBy;

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-auto">
        <div style={{ minWidth: leftW + totalGanttWidth, position: 'relative' }}>

          {/* ── Sticky Header ── */}
          <div style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', backgroundColor: 'white', borderBottom: '1px solid var(--bd)' }}>

            {/* Left panel header */}
            <div style={{
              position: 'sticky', left: 0, zIndex: 30,
              width: leftW, minWidth: leftW, flexShrink: 0,
              backgroundColor: '#FAFAF8', borderRight: '1px solid var(--bd)',
            }}>
              {panelVisible ? (
                <div style={{ height: HEADER_MONTH_H + HEADER_DAY_H, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <div style={{ display: 'flex', alignItems: 'center', height: HEADER_DAY_H, padding: '0 14px', gap: 8 }}>
                    <span style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 700, flex: 1, textTransform: 'uppercase', letterSpacing: '0.06em' }}>件名</span>
                    <span style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 700, width: 80, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.06em' }}>担当者</span>
                    <button
                      onClick={() => setPanelVisible(false)}
                      title="パネルを隠す"
                      style={{ fontSize: 11, color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
                    >
                      ‹
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ height: HEADER_MONTH_H + HEADER_DAY_H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button
                    onClick={() => setPanelVisible(true)}
                    title="パネルを表示"
                    style={{ fontSize: 11, color: 'var(--t2)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    ›
                  </button>
                </div>
              )}
            </div>

            {/* Date header */}
            <div style={{ width: totalGanttWidth, flexShrink: 0 }}>
              {/* Month row */}
              <div style={{ display: 'flex', height: HEADER_MONTH_H, borderBottom: '1px solid var(--bd-light)' }}>
                {monthGroups.map((g, i) => (
                  <div key={i} style={{
                    width: g.dayCount * dayWidth, flexShrink: 0,
                    borderRight: '1px solid var(--bd-light)',
                    display: 'flex', alignItems: 'center',
                    padding: '0 10px', overflow: 'hidden',
                  }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, color: 'var(--t2)', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>{g.label}</span>
                  </div>
                ))}
              </div>
              {/* Day row */}
              <div style={{ display: 'flex', height: HEADER_DAY_H }}>
                {days.map((day, i) => (
                  <div key={i} style={{
                    width: dayWidth, flexShrink: 0,
                    borderRight: '1px solid var(--bd-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isToday(day) ? 'rgba(99,102,241,0.06)' : isWeekend(day) ? 'var(--weekend)' : 'white',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: isToday(day) ? 700 : 400,
                    color: isToday(day) ? 'var(--accent)' : isWeekend(day) ? 'var(--t3)' : 'var(--t2)',
                    cursor: onDateClick ? 'pointer' : 'default',
                    transition: 'background 0.1s',
                  }}
                  onClick={() => onDateClick?.(format(day, 'yyyy-MM-dd'))}
                  title={onDateClick ? `${format(day, 'yyyy/MM/dd')} にタスクを追加` : undefined}
                  >
                    {format(day, 'd')}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Content ── */}
          <div style={{ display: 'flex' }}>

            {/* Left panel (sticky) */}
            <div style={{
              position: 'sticky', left: 0, zIndex: 10,
              width: leftW, minWidth: leftW, flexShrink: 0,
              backgroundColor: 'white', borderRight: '1px solid var(--bd)',
            }}>
              {displayRows.map((row, i) => {
                if (row.type === 'group') {
                  return (
                    <div key={row.key} style={{
                      height: GROUP_ROW_H,
                      backgroundColor: '#F7F6F4',
                      borderBottom: '1px solid var(--bd)',
                      borderTop: i > 0 ? '1px solid var(--bd)' : undefined,
                      display: 'flex', alignItems: 'center',
                      padding: '0 14px', gap: 6,
                    }}>
                      <div style={{ width: 3, height: 14, borderRadius: 2, background: 'var(--accent)', opacity: 0.6, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t1)', letterSpacing: '0.01em' }}>{row.label}</span>
                    </div>
                  );
                }
                return panelVisible ? (
                  <div
                    key={row.task.id}
                    onClick={() => onTaskClick(row.task)}
                    style={{
                      height: ROW_HEIGHT,
                      borderBottom: '1px solid var(--bd-light)',
                      display: 'flex', alignItems: 'center',
                      padding: '0 14px', gap: 8,
                      cursor: 'pointer',
                      transition: 'background 0.12s',
                    }}
                    className="hover:bg-blue-50 group"
                  >
                    <span style={{
                      fontSize: 12.5, color: 'var(--accent)', flex: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      fontWeight: 500,
                    }}
                    className="group-hover:underline"
                    >
                      {row.task.milestoneFlag && <span style={{ marginRight: 4, color: '#F59E0B' }}>◆</span>}
                      {row.task.title}
                    </span>
                    <span style={{
                      fontSize: 11, color: 'var(--t3)', width: 80,
                      textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {row.task.assignee}
                    </span>
                  </div>
                ) : (
                  <div key={row.task.id} style={{ height: ROW_HEIGHT, borderBottom: '1px solid var(--bd-light)' }} />
                );
              })}
            </div>

            {/* Gantt area */}
            <div style={{ position: 'relative', width: totalGanttWidth, height: Math.max(totalHeight, 200), flexShrink: 0 }}>

              {/* Weekend column shading */}
              {days.map((day, i) => isWeekend(day) && (
                <div key={i} style={{
                  position: 'absolute', top: 0, height: '100%',
                  left: i * dayWidth, width: dayWidth,
                  backgroundColor: 'var(--weekend)', pointerEvents: 'none',
                }} />
              ))}

              {/* Group row backgrounds */}
              {displayRows.map((row, i) => row.type === 'group' && (
                <div key={row.key} style={{
                  position: 'absolute', left: 0, width: '100%',
                  top: rowYs[i], height: GROUP_ROW_H,
                  backgroundColor: '#F7F6F4',
                  borderBottom: '1px solid var(--bd)',
                  pointerEvents: 'none',
                }} />
              ))}

              {/* Row dividers */}
              {displayRows.map((row, i) => (
                <div key={i} style={{
                  position: 'absolute', left: 0, right: 0,
                  top: rowYs[i] + (row.type === 'group' ? GROUP_ROW_H : ROW_HEIGHT) - 1,
                  height: 1, backgroundColor: row.type === 'group' ? 'var(--bd)' : 'var(--bd-light)',
                  pointerEvents: 'none',
                }} />
              ))}

              {/* Today column background */}
              {showTodayLine && (
                <div style={{
                  position: 'absolute', top: 0, height: '100%',
                  left: todayOffset * dayWidth, width: dayWidth,
                  backgroundColor: 'rgba(99,102,241,0.04)',
                  pointerEvents: 'none', zIndex: 1,
                }} />
              )}

              {/* Today vertical line */}
              {showTodayLine && (
                <div style={{
                  position: 'absolute', top: 0, height: '100%',
                  left: todayOffset * dayWidth + dayWidth / 2 - 1,
                  width: 2,
                  background: 'linear-gradient(to bottom, rgba(244,63,94,0.9), rgba(244,63,94,0.3))',
                  pointerEvents: 'none', zIndex: 5,
                }} />
              )}

              {/* Checkpoint cell highlights（バーの下層、行全体を薄く染める） */}
              {displayRows.map((row, i) => {
                if (row.type === 'group' || !row.task.checkpoints?.length) return null;
                const { task } = row;
                const y = rowYs[i];
                return (task.checkpoints as Checkpoint[]).map(cp => {
                  const cpOffset = differenceInDays(parseISO(cp.date), viewStart);
                  if (cpOffset < 0 || cpOffset >= totalDays) return null;
                  const taskStart = differenceInDays(parseISO(task.startDate), viewStart);
                  const taskEnd   = differenceInDays(parseISO(task.endDate),   viewStart);
                  if (cpOffset < taskStart || cpOffset > taskEnd) return null;
                  const cpColor = cp.color ?? '#f59e0b';
                  return (
                    <div key={`${task.id}-${cp.id}-bg`} style={{
                      position: 'absolute',
                      left: cpOffset * dayWidth,
                      top: y,
                      width: dayWidth,
                      height: ROW_HEIGHT,
                      backgroundColor: `${cpColor}22`,
                      borderLeft: `2px solid ${cpColor}88`,
                      pointerEvents: 'none',
                      zIndex: 9,
                    }} />
                  );
                });
              })}

              {/* Task bars */}
              {displayRows.map((row, i) => {
                if (row.type === 'group') return null;
                const { task } = row;
                const barStart = differenceInDays(parseISO(task.startDate), viewStart);
                const barDays = differenceInDays(parseISO(task.endDate), parseISO(task.startDate)) + 1;
                const clampedStart = Math.max(barStart, 0);
                const clampedEnd = Math.min(barStart + barDays, totalDays);
                if (clampedEnd <= 0 || clampedStart >= totalDays) return null;
                const barLeft = clampedStart * dayWidth;
                const barWidth = Math.max((clampedEnd - clampedStart) * dayWidth, dayWidth / 2);
                const color = getTaskColor(task, groupBy);
                const y = rowYs[i];

                if (task.milestoneFlag) {
                  const cx = barStart * dayWidth + dayWidth / 2;
                  return (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      style={{
                        position: 'absolute', zIndex: 10,
                        left: cx - 9, top: y + ROW_HEIGHT / 2 - 9,
                        width: 18, height: 18, cursor: 'pointer',
                        transform: 'rotate(45deg)',
                        background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                        borderRadius: 3,
                        boxShadow: '0 2px 6px rgba(245,158,11,0.45)',
                      }}
                      title={task.title}
                    />
                  );
                }

                return (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    style={{
                      position: 'absolute', zIndex: 10,
                      left: barLeft,
                      top: y + (ROW_HEIGHT - 24) / 2,
                      width: barWidth, height: 24,
                      backgroundColor: color,
                      borderRadius: 6,
                      display: 'flex', alignItems: 'center',
                      padding: '0 9px', overflow: 'hidden',
                      cursor: 'pointer',
                      boxShadow: `0 1px 3px ${color}55, inset 0 1px 0 rgba(255,255,255,0.18)`,
                    }}
                    className="hover:opacity-85 transition-opacity"
                    title={task.title}
                  >
                    <span style={{ color: 'white', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.01em', textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
                      {task.title}
                    </span>
                  </div>
                );
              })}

              {/* Checkpoint markers（バー上層のオーバーレイ＋ラベル） */}
              {displayRows.map((row, i) => {
                if (row.type === 'group' || !row.task.checkpoints?.length) return null;
                const { task } = row;
                const y = rowYs[i];
                const barTop = y + (ROW_HEIGHT - 26) / 2;
                return (task.checkpoints as Checkpoint[]).map(cp => {
                  const cpOffset = differenceInDays(parseISO(cp.date), viewStart);
                  if (cpOffset < 0 || cpOffset >= totalDays) return null;
                  const taskStart = differenceInDays(parseISO(task.startDate), viewStart);
                  const taskEnd   = differenceInDays(parseISO(task.endDate),   viewStart);
                  if (cpOffset < taskStart || cpOffset > taskEnd) return null;
                  const cpColor = cp.color ?? '#f59e0b';
                  const cpLeft  = cpOffset * dayWidth;
                  return (
                    <div key={`${task.id}-${cp.id}`}>
                      {/* バー内のストライプ */}
                      <div style={{
                        position: 'absolute',
                        left: cpLeft,
                        top: barTop,
                        width: dayWidth,
                        height: 26,
                        backgroundColor: `${cpColor}55`,
                        borderLeft: `3px solid ${cpColor}`,
                        borderRight: `1px solid ${cpColor}44`,
                        pointerEvents: 'none',
                        zIndex: 12,
                      }} />
                      {/* ラベル（バーの下） */}
                      {cp.label && (
                        <div style={{
                          position: 'absolute',
                          left: cpLeft + dayWidth / 2,
                          top: barTop + 27,
                          transform: 'translateX(-50%)',
                          fontSize: 9,
                          fontWeight: 700,
                          color: cpColor,
                          whiteSpace: 'nowrap',
                          zIndex: 15,
                          pointerEvents: 'none',
                          backgroundColor: 'rgba(255,255,255,0.95)',
                          padding: '1px 4px',
                          borderRadius: 3,
                          border: `1px solid ${cpColor}66`,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                        }}>
                          {cp.label}
                        </div>
                      )}
                    </div>
                  );
                });
              })}
            </div>
          </div>

          {/* Empty state */}
          {displayRows.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📋</div>
              <p style={{ color: 'var(--t3)', fontSize: 13, fontWeight: 500 }}>タスクがありません</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
