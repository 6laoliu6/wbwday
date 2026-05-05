export function secondsToMinutes(seconds: number): number {
  return Math.floor(Math.max(0, seconds) / 60);
}

export function formatFocusDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours} 小时 ${minutes} 分钟`;
  }

  if (hours > 0) {
    return `${hours} 小时`;
  }

  return `${minutes} 分钟`;
}

export function formatTimer(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
      remainingSeconds,
    ).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function formatClockTime(isoString: string): string {
  const date = new Date(isoString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

export function getTaskFocusSeconds(task: { focusSeconds?: number; focusMinutes?: number }): number {
  if (typeof task.focusSeconds === 'number') {
    return Math.max(0, task.focusSeconds);
  }

  return Math.max(0, task.focusMinutes ?? 0) * 60;
}
