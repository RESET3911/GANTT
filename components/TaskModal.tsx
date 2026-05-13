'use client';

import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Task, TaskStatus, Checkpoint } from '@/types/task';

export type SaveData = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;

type Props = {
  task: Task | null;
  tasks: Task[];
  assignees?: string[];         // 設定から取得した担当者リスト
  initialDate?: string;        // 日付クリックで開く場合のプリフィル
  gcalConnected?: boolean;
  onSave: (data: SaveData | Task, syncToGCal: boolean) => void;
  onDelete?: () => void;
  onClose: () => void;
};

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: '未対応' },
  { value: 'in_progress', label: '処理中' },
  { value: 'done', label: '処理済み' },
  { value: 'closed', label: '完了' },
];

export default function TaskModal({ task, tasks, assignees = [], initialDate, gcalConnected, onSave, onDelete, onClose }: Props) {
  const isEdit = task !== null;
  const defaultDate = initialDate ?? format(new Date(), 'yyyy-MM-dd');
  const defaultEndDate = initialDate ?? format(addDays(new Date(), 14), 'yyyy-MM-dd');

  const inputCls = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors bg-white';
  const labelCls = 'block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide';

  const [title, setTitle] = useState(task?.title ?? '');
  const [startDate, setStartDate] = useState(task?.startDate ?? defaultDate);
  const [endDate, setEndDate] = useState(task?.endDate ?? defaultEndDate);
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo');
  const [assignee, setAssignee] = useState(task?.assignee ?? '');
  const [category, setCategory] = useState(task?.category ?? '');
  const [parentId, setParentId] = useState(task?.parentId ?? '');
  const [milestoneFlag, setMilestoneFlag] = useState(task?.milestoneFlag ?? false);
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [syncToGCal, setSyncToGCal] = useState(gcalConnected ? !isEdit : false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(task?.checkpoints ?? []);
  const [newCpDate, setNewCpDate] = useState('');
  const [newCpLabel, setNewCpLabel] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const data: SaveData = {
      title: title.trim(),
      startDate,
      endDate,
      status,
      assignee: assignee.trim(),
      category: category.trim() || undefined,
      parentId: parentId || undefined,
      milestoneFlag,
      notes: notes.trim() || undefined,
      color: task?.color,
      gcalEventId: task?.gcalEventId,
      checkpoints: checkpoints.length > 0 ? checkpoints : undefined,
    };

    if (isEdit) {
      onSave({ ...task, ...data } as Task, syncToGCal);
    } else {
      onSave(data, syncToGCal);
    }
  };

  const parentTasks = tasks.filter(t => t.id !== task?.id);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 18, width: '100%', maxWidth: 560, boxShadow: '0 24px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px 16px', borderBottom: '1px solid var(--bd)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: 'var(--accent)' }} />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)', fontFamily: 'Syne, sans-serif', letterSpacing: '-0.2px' }}>
              {isEdit ? 'タスクを編集' : initialDate ? `${initialDate.replace(/-/g, '/')} にタスクを追加` : 'タスクを追加'}
            </h2>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid var(--bd)', background: 'transparent', cursor: 'pointer', color: 'var(--t3)', fontSize: 14, transition: 'all 0.15s' }}>✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className={labelCls}>タスク名 <span style={{ color: '#EF4444' }}>*</span></label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="例: デザインレビュー" className={inputCls}
              style={{ borderColor: 'var(--bd)', fontSize: 14, fontWeight: 500 }}
              required autoFocus />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className={labelCls}>開始日 <span style={{ color: '#EF4444' }}>*</span></label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls}
                style={{ borderColor: 'var(--bd)', fontFamily: 'var(--font-mono)', fontSize: 13 }} required />
            </div>
            <div>
              <label className={labelCls}>終了日 <span style={{ color: '#EF4444' }}>*</span></label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} className={inputCls}
                style={{ borderColor: 'var(--bd)', fontFamily: 'var(--font-mono)', fontSize: 13 }} required />
            </div>
          </div>

          <div>
            <label className={labelCls}>ステータス</label>
            <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)} className={inputCls}
              style={{ borderColor: 'var(--bd)', fontSize: 13 }}>
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className={labelCls}>担当者</label>
              {assignees.length > 0 ? (
                <select value={assignee} onChange={e => setAssignee(e.target.value)} className={inputCls}
                  style={{ borderColor: 'var(--bd)', fontSize: 13 }}>
                  <option value="">未設定</option>
                  {assignees.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              ) : (
                <input type="text" value={assignee} onChange={e => setAssignee(e.target.value)}
                  placeholder="例: さく" className={inputCls} style={{ borderColor: 'var(--bd)', fontSize: 13 }} />
              )}
            </div>
            <div>
              <label className={labelCls}>カテゴリー</label>
              <input type="text" value={category} onChange={e => setCategory(e.target.value)}
                placeholder="例: 開発" className={inputCls} style={{ borderColor: 'var(--bd)', fontSize: 13 }} />
            </div>
          </div>

          <div>
            <label className={labelCls}>親課題（任意）</label>
            <select value={parentId} onChange={e => setParentId(e.target.value)} className={inputCls}
              style={{ borderColor: 'var(--bd)', fontSize: 13 }}>
              <option value="">なし</option>
              {parentTasks.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="milestone" checked={milestoneFlag}
              onChange={e => setMilestoneFlag(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: '#F59E0B', cursor: 'pointer' }} />
            <label htmlFor="milestone" style={{ fontSize: 13, color: 'var(--t2)', cursor: 'pointer', fontWeight: 500 }}>
              ◆ マイルストーンとして設定
            </label>
          </div>

          <div>
            <label className={labelCls}>メモ（任意）</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="詳細・備考など..." rows={3}
              className={inputCls}
              style={{ borderColor: 'var(--bd)', fontSize: 13, resize: 'none' }} />
          </div>

          {/* Checkpoints */}
          <div>
            <label className={labelCls}>チェックポイント</label>

            {/* 既存のチェックポイント一覧 */}
            {checkpoints.length > 0 && (
              <div className="mb-2 space-y-1">
                {checkpoints
                  .slice()
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map(cp => (
                    <div key={cp.id} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                      <span className="text-amber-500 text-xs">◆</span>
                      <span className="text-xs font-semibold text-gray-700 tabular-nums">
                        {cp.date.replace(/-/g, '/')}
                      </span>
                      {cp.label && (
                        <span className="text-xs text-gray-600 flex-1 truncate">{cp.label}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setCheckpoints(prev => prev.filter(c => c.id !== cp.id))}
                        className="text-gray-400 hover:text-red-500 transition-colors text-xs ml-auto"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
              </div>
            )}

            {/* 追加フォーム */}
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={newCpDate}
                onChange={e => setNewCpDate(e.target.value)}
                min={startDate}
                max={endDate}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 w-36"
              />
              <input
                type="text"
                value={newCpLabel}
                onChange={e => setNewCpLabel(e.target.value)}
                placeholder="ラベル（例: 中間レビュー）"
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 flex-1"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!newCpDate) return;
                    setCheckpoints(prev => [
                      ...prev,
                      { id: uuidv4(), date: newCpDate, label: newCpLabel.trim() || undefined },
                    ]);
                    setNewCpDate('');
                    setNewCpLabel('');
                  }
                }}
              />
              <button
                type="button"
                disabled={!newCpDate}
                onClick={() => {
                  if (!newCpDate) return;
                  setCheckpoints(prev => [
                    ...prev,
                    { id: uuidv4(), date: newCpDate, label: newCpLabel.trim() || undefined },
                  ]);
                  setNewCpDate('');
                  setNewCpLabel('');
                }}
                className="px-3 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
              >
                ＋追加
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">日付はタスクの期間内（{startDate.replace(/-/g, '/')} 〜 {endDate.replace(/-/g, '/')}）で選択してください</p>
          </div>

          {/* Google Calendar sync */}
          {gcalConnected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--accent-soft)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 10, padding: '10px 14px' }}>
              <input type="checkbox" id="syncGCal" checked={syncToGCal}
                onChange={e => setSyncToGCal(e.target.checked)}
                style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer' }} />
              <label htmlFor="syncGCal" style={{ fontSize: 13, color: '#4338CA', cursor: 'pointer', fontWeight: 500 }}>
                📅 Googleカレンダーにも{isEdit ? '同期' : '追加'}する
                {isEdit && task?.gcalEventId && (
                  <span style={{ marginLeft: 8, fontSize: 11, color: '#6366F1' }}>（既存イベントを更新）</span>
                )}
              </label>
            </div>
          )}
        </form>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--bd)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          {isEdit && onDelete && !showDeleteConfirm && (
            <button type="button" onClick={() => setShowDeleteConfirm(true)}
              style={{ fontSize: 12, color: '#EF4444', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: '5px 8px', borderRadius: 7, transition: 'all 0.15s' }}>
              削除
            </button>
          )}
          {showDeleteConfirm && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>本当に削除しますか？</span>
              <button type="button" onClick={onDelete}
                style={{ fontSize: 12, background: '#EF4444', color: 'white', border: 'none', padding: '5px 12px', borderRadius: 7, cursor: 'pointer', fontWeight: 600 }}>
                削除する
              </button>
              <button type="button" onClick={() => setShowDeleteConfirm(false)}
                style={{ fontSize: 12, color: 'var(--t2)', background: 'none', border: 'none', cursor: 'pointer' }}>
                キャンセル
              </button>
            </div>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '8px 18px', fontSize: 13, fontWeight: 500, color: 'var(--t2)', background: 'white', border: '1px solid var(--bd)', borderRadius: 9, cursor: 'pointer', transition: 'all 0.15s' }}>
              キャンセル
            </button>
            <button type="submit" form="" onClick={handleSubmit as unknown as React.MouseEventHandler<HTMLButtonElement>}
              disabled={!title.trim()}
              style={{ padding: '8px 22px', fontSize: 13, fontWeight: 700, background: title.trim() ? 'var(--accent)' : 'var(--bd)', color: 'white', border: 'none', borderRadius: 9, cursor: title.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.15s', boxShadow: title.trim() ? '0 2px 8px rgba(99,102,241,0.35)' : 'none' }}>
              {isEdit ? '保存する' : '追加する'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
