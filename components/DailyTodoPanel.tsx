'use client';

import { useState, useMemo } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { DailyTodo, addDailyTodo, toggleDailyTodo, deleteDailyTodo } from '@/lib/dailyTodo';

interface Props {
  todos: DailyTodo[];
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

export default function DailyTodoPanel({ todos }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [inputMap, setInputMap] = useState<Record<string, string>>({});

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const weekStart = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 1 });
  const dates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const todosByDate = useMemo(() => {
    const map: Record<string, DailyTodo[]> = {};
    for (const todo of todos) {
      if (!map[todo.date]) map[todo.date] = [];
      map[todo.date].push(todo);
    }
    return map;
  }, [todos]);

  const handleAdd = async (dateStr: string) => {
    const text = (inputMap[dateStr] ?? '').trim();
    if (!text) return;
    await addDailyTodo({ id: uuidv4(), date: dateStr, text, done: false, createdAt: new Date().toISOString() });
    setInputMap(prev => ({ ...prev, [dateStr]: '' }));
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
      {/* Panel header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '7px 16px',
        borderBottom: '1px solid var(--bd)',
        background: '#FAFAF8',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 3, height: 14, borderRadius: 2, background: 'var(--accent)' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t1)', letterSpacing: '0.02em' }}>日次 ToDo</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => setWeekOffset(0)}
            style={{ fontSize: 11, color: 'var(--accent)', padding: '3px 8px', borderRadius: 6, background: 'var(--accent-soft)', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}
          >
            今週
          </button>
          {[-1, 1].map(dir => (
            <button key={dir}
              onClick={() => setWeekOffset(w => w + dir)}
              style={{ fontSize: 16, color: 'var(--t3)', padding: '1px 6px', borderRadius: 6, background: 'transparent', border: '1px solid var(--bd)', cursor: 'pointer', lineHeight: 1.2, fontFamily: 'inherit' }}
            >
              {dir === -1 ? '‹' : '›'}
            </button>
          ))}
        </div>
      </div>

      {/* Day columns */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden' }}>
        <div style={{ display: 'flex', height: '100%', minWidth: dates.length * 156 }}>
          {dates.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const isToday = dateStr === todayStr;
            const dayTodos = todosByDate[dateStr] ?? [];
            const doneTodos = dayTodos.filter(t => t.done);
            const openTodos = dayTodos.filter(t => !t.done);
            const dayName = DAY_NAMES[date.getDay()];
            const isSat = date.getDay() === 6;
            const isSun = date.getDay() === 0;

            return (
              <div
                key={dateStr}
                style={{
                  display: 'flex', flexDirection: 'column',
                  borderRight: '1px solid var(--bd-light)',
                  flex: 1, minWidth: 156,
                  background: isToday ? 'rgba(99,102,241,0.03)' : 'transparent',
                }}
              >
                {/* Date header */}
                <div style={{
                  padding: '6px 12px',
                  borderBottom: '1px solid var(--bd-light)',
                  flexShrink: 0,
                  background: isToday ? 'rgba(99,102,241,0.07)' : '#FAFAF8',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: isToday ? 'var(--accent)' : isSat ? '#3B82F6' : isSun ? '#EF4444' : 'var(--t2)',
                  }}>
                    {format(date, 'M/d')}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: isToday ? 'var(--accent)' : isSat ? '#3B82F6' : isSun ? '#EF4444' : 'var(--t3)',
                  }}>
                    {dayName}
                  </span>
                  {isToday && (
                    <span style={{
                      fontSize: 9, fontWeight: 700,
                      background: 'var(--accent)', color: 'white',
                      padding: '1px 5px', borderRadius: 10,
                    }}>TODAY</span>
                  )}
                  {dayTodos.length > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                      {doneTodos.length}/{dayTodos.length}
                    </span>
                  )}
                </div>

                {/* Todo list */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {openTodos.map(todo => (
                    <div key={todo.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }} className="group">
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => toggleDailyTodo(todo.id, true)}
                        style={{ marginTop: 2, flexShrink: 0, cursor: 'pointer', accentColor: 'var(--accent)' }}
                      />
                      <span style={{ flex: 1, fontSize: 12, lineHeight: 1.5, color: 'var(--t1)', wordBreak: 'break-word' }}>{todo.text}</span>
                      <button
                        onClick={() => deleteDailyTodo(todo.id)}
                        style={{ color: 'var(--bd)', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0, lineHeight: 1, transition: 'color 0.15s' }}
                        className="opacity-0 group-hover:opacity-100 hover:!text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {doneTodos.map(todo => (
                    <div key={todo.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }} className="group">
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => toggleDailyTodo(todo.id, false)}
                        style={{ marginTop: 2, flexShrink: 0, cursor: 'pointer', accentColor: 'var(--accent)' }}
                      />
                      <span style={{ flex: 1, fontSize: 12, lineHeight: 1.5, textDecoration: 'line-through', color: 'var(--t3)', wordBreak: 'break-word' }}>{todo.text}</span>
                      <button
                        onClick={() => deleteDailyTodo(todo.id)}
                        style={{ color: 'var(--bd)', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0, lineHeight: 1, transition: 'color 0.15s' }}
                        className="opacity-0 group-hover:opacity-100 hover:!text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add input */}
                <div style={{ padding: '5px 10px', borderTop: '1px solid var(--bd-light)', flexShrink: 0 }}>
                  <input
                    type="text"
                    value={inputMap[dateStr] ?? ''}
                    onChange={e => setInputMap(prev => ({ ...prev, [dateStr]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(dateStr); } }}
                    placeholder="+ 追加 (Enter)"
                    style={{
                      width: '100%', fontSize: 11, color: 'var(--t2)',
                      background: 'transparent', border: 'none', outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
