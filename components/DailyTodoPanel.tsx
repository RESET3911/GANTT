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
    <div className="h-full flex flex-col bg-white">
      {/* Panel header */}
      <div className="flex items-center px-4 py-1.5 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <span className="text-xs font-bold text-gray-600">📋 日次 ToDo</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setWeekOffset(0)}
            className="text-xs text-blue-500 px-2 py-0.5 rounded hover:bg-blue-50 transition-colors"
          >
            今週
          </button>
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="text-xs text-gray-500 px-2 py-0.5 rounded hover:bg-gray-100"
          >
            ‹
          </button>
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="text-xs text-gray-500 px-2 py-0.5 rounded hover:bg-gray-100"
          >
            ›
          </button>
        </div>
      </div>

      {/* Day columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full" style={{ minWidth: dates.length * 160 }}>
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
                className={`flex flex-col border-r border-gray-100 flex-1 min-w-[160px] ${isToday ? 'bg-blue-50/40' : ''}`}
              >
                {/* Date header */}
                <div className={`px-3 py-1.5 border-b flex-shrink-0 ${isToday ? 'bg-blue-100' : 'bg-gray-50'}`}>
                  <span className={`text-xs font-bold ${isToday ? 'text-blue-700' : isSat ? 'text-blue-500' : isSun ? 'text-red-500' : 'text-gray-700'}`}>
                    {format(date, 'M/d')}（{dayName}）
                  </span>
                  {isToday && <span className="ml-1.5 text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full">今日</span>}
                  {dayTodos.length > 0 && (
                    <span className="ml-1 text-xs text-gray-400">
                      {doneTodos.length}/{dayTodos.length}
                    </span>
                  )}
                </div>

                {/* Todo list */}
                <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-1">
                  {/* Open todos */}
                  {openTodos.map(todo => (
                    <div key={todo.id} className="flex items-start gap-1.5 group">
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => toggleDailyTodo(todo.id, true)}
                        className="mt-0.5 flex-shrink-0 cursor-pointer accent-blue-500"
                      />
                      <span className="flex-1 text-xs leading-relaxed text-gray-700">{todo.text}</span>
                      <button
                        onClick={() => deleteDailyTodo(todo.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 text-xs flex-shrink-0 transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {/* Done todos */}
                  {doneTodos.map(todo => (
                    <div key={todo.id} className="flex items-start gap-1.5 group">
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => toggleDailyTodo(todo.id, false)}
                        className="mt-0.5 flex-shrink-0 cursor-pointer accent-blue-500"
                      />
                      <span className="flex-1 text-xs leading-relaxed line-through text-gray-300">{todo.text}</span>
                      <button
                        onClick={() => deleteDailyTodo(todo.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 text-xs flex-shrink-0 transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add input */}
                <div className="px-2 pb-2 pt-1 border-t border-gray-100 flex-shrink-0">
                  <input
                    type="text"
                    value={inputMap[dateStr] ?? ''}
                    onChange={e => setInputMap(prev => ({ ...prev, [dateStr]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(dateStr); } }}
                    placeholder="+ 追加 (Enter)"
                    className="w-full text-xs text-gray-600 placeholder-gray-300 focus:outline-none bg-transparent"
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
