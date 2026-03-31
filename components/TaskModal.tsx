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
  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">
            {isEdit ? 'タスクを編集' : initialDate ? `${initialDate.replace(/-/g, '/')} にタスクを追加` : 'タスクを追加'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          <div>
            <label className={labelCls}>タスク名 <span className="text-red-500">*</span></label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="例: デザインレビュー" className={inputCls} required autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>開始日 <span className="text-red-500">*</span></label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>終了日 <span className="text-red-500">*</span></label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} className={inputCls} required />
            </div>
          </div>

          <div>
            <label className={labelCls}>ステータス</label>
            <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)} className={inputCls}>
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>担当者</label>
              {assignees.length > 0 ? (
                <select value={assignee} onChange={e => setAssignee(e.target.value)} className={inputCls}>
                  <option value="">未設定</option>
                  {assignees.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              ) : (
                <input type="text" value={assignee} onChange={e => setAssignee(e.target.value)}
                  placeholder="例: さく" className={inputCls} />
              )}
            </div>
            <div>
              <label className={labelCls}>カテゴリー</label>
              <input type="text" value={category} onChange={e => setCategory(e.target.value)}
                placeholder="例: 開発" className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>親課題（任意）</label>
            <select value={parentId} onChange={e => setParentId(e.target.value)} className={inputCls}>
              <option value="">なし</option>
              {parentTasks.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="milestone" checked={milestoneFlag}
              onChange={e => setMilestoneFlag(e.target.checked)} className="w-4 h-4 accent-blue-500" />
            <label htmlFor="milestone" className="text-sm text-gray-700 cursor-pointer">
              マイルストーンとして設定
            </label>
          </div>

          <div>
            <label className={labelCls}>メモ（任意）</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="詳細・備考など..." rows={3} className={`${inputCls} resize-none`} />
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
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <input type="checkbox" id="syncGCal" checked={syncToGCal}
                onChange={e => setSyncToGCal(e.target.checked)} className="w-4 h-4 accent-blue-500" />
              <label htmlFor="syncGCal" className="text-sm text-blue-700 cursor-pointer">
                📅 Googleカレンダーにも{isEdit ? '同期' : '追加'}する
                {isEdit && task?.gcalEventId && (
                  <span className="ml-2 text-xs text-blue-500">（既存イベントを更新）</span>
                )}
              </label>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex-shrink-0 flex items-center gap-3">
          {isEdit && onDelete && !showDeleteConfirm && (
            <button type="button" onClick={() => setShowDeleteConfirm(true)}
              className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors">
              削除
            </button>
          )}
          {showDeleteConfirm && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600 font-medium">本当に削除しますか？</span>
              <button type="button" onClick={onDelete}
                className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors">
                削除する
              </button>
              <button type="button" onClick={() => setShowDeleteConfirm(false)}
                className="text-xs text-gray-500 hover:text-gray-700">
                キャンセル
              </button>
            </div>
          )}
          <div className="ml-auto flex gap-3">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
              キャンセル
            </button>
            <button type="submit" form="" onClick={handleSubmit as unknown as React.MouseEventHandler<HTMLButtonElement>}
              disabled={!title.trim()}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">
              {isEdit ? '保存する' : '追加する'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
