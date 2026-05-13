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
  { value: 1, label: '1M' },
  { value: 2, label: '2M' },
  { value: 3, label: '3M' },
  { value: 6, label: '6M' },
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

const divider = (
  <div style={{ width: 1, height: 16, background: 'var(--bd)', flexShrink: 0 }} />
);

export default function ControlBar({ viewState, onViewStateChange, onToday, onNavigateWeek }: Props) {
  const update = (patch: Partial<ViewState>) => onViewStateChange({ ...viewState, ...patch });

  return (
    <div style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--bd)',
      flexShrink: 0,
      padding: '8px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {/* Row 1 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {/* Date nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => onNavigateWeek(-1)}
            style={navBtn}
            title="1週間前"
          >
            ‹
          </button>
          <input
            type="date"
            value={viewState.viewStartDate}
            onChange={e => update({ viewStartDate: e.target.value })}
            className="ctrl-input"
            style={{ width: 120 }}
          />
          <button
            onClick={() => onNavigateWeek(1)}
            style={navBtn}
            title="1週間後"
          >
            ›
          </button>
          <button onClick={onToday} style={ghostBtn}>今日</button>
        </div>

        {divider}

        {/* View range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={labelStyle}>表示</span>
          <div style={{ display: 'flex', gap: 3 }}>
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

        {/* Current date display */}
        <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--t2)', fontWeight: 500, letterSpacing: '0.02em' }}>
          {format(parseISO(viewState.viewStartDate), 'yyyy / MM / dd')}
        </div>
      </div>

      {/* Row 2 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={labelStyle}>グループ</span>
          <div style={{ display: 'flex', gap: 3 }}>
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

        {divider}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={labelStyle}>状態</span>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
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

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--t3)',
  whiteSpace: 'nowrap',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const navBtn: React.CSSProperties = {
  width: 28, height: 28,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 18, fontWeight: 400, lineHeight: 1,
  background: 'transparent', border: '1px solid var(--bd)',
  borderRadius: 7, cursor: 'pointer', color: 'var(--t2)',
  transition: 'all 0.15s',
};

const ghostBtn: React.CSSProperties = {
  padding: '4px 10px', fontSize: 11, fontWeight: 600,
  background: 'transparent', border: '1px solid var(--bd)',
  borderRadius: 7, cursor: 'pointer', color: 'var(--t2)',
  transition: 'all 0.15s',
};
