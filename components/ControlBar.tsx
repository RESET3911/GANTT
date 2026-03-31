'use client';

import { format, parseISO } from 'date-fns';
import { ViewState, GroupBy, FilterStatus } from '@/types/task';

type Props = {
  viewState: ViewState;
  onViewStateChange: (vs: ViewState) => void;
  onToday: () => void;
  onNavigateWeek: (dir: 1 | -1) => void;
};

const VIEW_RANGES: { value: ViewState['viewRange']; label: string }[] = [
  { value: 1, label: '1ヶ月' },
  { value: 2, label: '2ヶ月' },
  { value: 3, label: '3ヶ月' },
  { value: 6, label: '6ヶ月' },
];

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'none', label: 'なし' },
  { value: 'assignee', label: '担当者' },
  { value: 'category', label: 'カテゴリー' },
  { value: 'parent', label: '親課題' },
];

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'todo', label: '未対応' },
  { value: 'in_progress', label: '処理中' },
  { value: 'done', label: '処理済み' },
  { value: 'closed', label: '完了' },
  { value: 'not_closed', label: '完了以外' },
];

export default function ControlBar({ viewState, onViewStateChange, onToday, onNavigateWeek }: Props) {
  const update = (patch: Partial<ViewState>) => onViewStateChange({ ...viewState, ...patch });

  return (
    <div className="bg-gray-50 border-b flex-shrink-0 px-4 py-2 space-y-2">
      {/* Row 1: Date + View Range + Navigation */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium whitespace-nowrap">表示開始日</span>
          <input
            type="date"
            value={viewState.viewStartDate}
            onChange={e => update({ viewStartDate: e.target.value })}
            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <button
            onClick={onToday}
            className="text-xs bg-white border border-gray-300 hover:border-blue-400 hover:text-blue-500 px-2 py-1 rounded transition-colors"
          >
            今日
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium whitespace-nowrap">表示範囲</span>
          <div className="flex gap-1">
            {VIEW_RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => update({ viewRange: r.value })}
                className={`pill-btn ${viewState.viewRange === r.value ? 'pill-btn-active' : 'pill-btn-inactive'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => onNavigateWeek(-1)}
            className="text-xs bg-white border border-gray-300 hover:border-blue-400 hover:text-blue-500 px-3 py-1 rounded transition-colors"
          >
            ◀ 1週間前
          </button>
          <span className="text-xs font-semibold text-gray-700 min-w-[88px] text-center tabular-nums">
            {format(parseISO(viewState.viewStartDate), 'yyyy/MM/dd')}
          </span>
          <button
            onClick={() => onNavigateWeek(1)}
            className="text-xs bg-white border border-gray-300 hover:border-blue-400 hover:text-blue-500 px-3 py-1 rounded transition-colors"
          >
            1週間後 ▶
          </button>
        </div>
      </div>

      {/* Row 2: Grouping + Filter */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium whitespace-nowrap">グルーピング</span>
          <div className="flex gap-1">
            {GROUP_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => update({ groupBy: opt.value })}
                className={`pill-btn ${viewState.groupBy === opt.value ? 'pill-btn-active' : 'pill-btn-inactive'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium whitespace-nowrap">状態</span>
          <div className="flex gap-1 flex-wrap">
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => update({ filterStatus: opt.value })}
                className={`pill-btn ${viewState.filterStatus === opt.value ? 'pill-btn-active' : 'pill-btn-inactive'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
