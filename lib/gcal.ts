import { format, addDays, parseISO } from 'date-fns';
import { Task } from '@/types/task';

// Google Identity Services type declarations
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
let _accessToken: string | null = null;

export function isGCalConnected(): boolean {
  return _accessToken !== null;
}

export function connectGCal(onSuccess: () => void, onError: (msg: string) => void): void {
  const clientId = process.env.NEXT_PUBLIC_GCAL_CLIENT_ID;
  if (!clientId) {
    onError('NEXT_PUBLIC_GCAL_CLIENT_ID が .env.local に設定されていません');
    return;
  }
  if (!window.google) {
    onError('Google Identity Services が読み込まれていません');
    return;
  }
  const tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: resp => {
      if (resp.access_token) {
        _accessToken = resp.access_token;
        onSuccess();
      } else {
        onError(resp.error ?? '認証に失敗しました');
      }
    },
  });
  tokenClient.requestAccessToken();
}

export function disconnectGCal(): void {
  _accessToken = null;
}

interface GCalEvent {
  summary: string;
  description?: string;
  start: { date: string };
  end: { date: string };
}

function taskToEvent(task: Pick<Task, 'title' | 'startDate' | 'endDate' | 'notes'>): GCalEvent {
  return {
    summary: task.title,
    description: task.notes || undefined,
    start: { date: task.startDate },
    // Google Calendar end date is exclusive for all-day events
    end: { date: format(addDays(parseISO(task.endDate), 1), 'yyyy-MM-dd') },
  };
}

export async function createGCalEvent(task: Task): Promise<string> {
  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${_accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskToEvent(task)),
    }
  );
  if (!res.ok) throw new Error(`GCal create failed: ${res.status}`);
  const data = await res.json();
  return data.id as string;
}

export async function updateGCalEvent(eventId: string, task: Task): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${_accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskToEvent(task)),
    }
  );
  if (!res.ok) throw new Error(`GCal update failed: ${res.status}`);
}

export async function deleteGCalEvent(eventId: string): Promise<void> {
  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${_accessToken}` },
    }
  );
}
