'use client';

import { useState } from 'react';
import { GanttSettings, saveGanttSettings } from '@/lib/ganttSettings';
import { GCalCalendar } from '@/lib/gcal';

type Props = {
  settings: GanttSettings;
  gcalConnected?: boolean;
  calendars?: GCalCalendar[];
  onClose: () => void;
};

export default function SettingsModal({ settings, gcalConnected, calendars = [], onClose }: Props) {
  const [assignees, setAssignees] = useState<string[]>(settings.assignees);
  const [gcalCalendarId, setGcalCalendarId] = useState(settings.gcalCalendarId ?? 'primary');
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = () => {
    const name = newName.trim();
    if (!name || assignees.includes(name)) return;
    setAssignees(prev => [...prev, name]);
    setNewName('');
  };

  const handleRemove = (name: string) => {
    setAssignees(prev => prev.filter(a => a !== name));
  };

  const handleSave = async () => {
    setSaving(true);
    await saveGanttSettings({ ...settings, assignees, gcalCalendarId });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-bold text-gray-900">設定</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">担当者リスト</label>

            {/* Current assignees */}
            <div className="space-y-1 mb-3 max-h-48 overflow-y-auto">
              {assignees.length === 0 && (
                <p className="text-xs text-gray-400 py-2">担当者が登録されていません</p>
              )}
              {assignees.map(name => (
                <div key={name} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-700">{name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(name)}
                    className="text-gray-400 hover:text-red-500 transition-colors text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Add new */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="名前を入力"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
              />
              <button
                type="button"
                onClick={handleAdd}
                disabled={!newName.trim()}
                className="px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
              >
                追加
              </button>
            </div>
          </div>

          {/* Google Calendar */}
          {gcalConnected && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">📅 同期先カレンダー</label>
              {calendars.length > 0 ? (
                <select
                  value={gcalCalendarId}
                  onChange={e => setGcalCalendarId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {calendars.map(cal => (
                    <option key={cal.id} value={cal.id}>{cal.summary}</option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-gray-400">カレンダー一覧を取得中...</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
            キャンセル
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors font-medium">
            {saving ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>
    </div>
  );
}
