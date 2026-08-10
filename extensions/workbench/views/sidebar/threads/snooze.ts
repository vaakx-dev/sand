export interface Preset {
  label: string;
  until: string;
}

export function presets(now = new Date()): Preset[] {
  const hour = new Date(now.getTime() + 60 * 60 * 1_000);
  const evening = atHour(now, 18);
  const tomorrow = atHour(addDays(now, 1), 9);
  const monday = atHour(addDays(now, daysUntilMonday(now)), 9);
  const values: Preset[] = [
    { label: `In 1 hour (${timeLabel(hour)})`, until: hour.toISOString() },
  ];
  if (evening.getTime() - now.getTime() > 60 * 60 * 1_000) {
    values.push({ label: "This evening (6:00 PM)", until: evening.toISOString() });
  }
  values.push(
    { label: "Tomorrow (9:00 AM)", until: tomorrow.toISOString() },
    { label: `Next week (${weekdayLabel(monday)} 9:00 AM)`, until: monday.toISOString() },
  );
  return values;
}

function addDays(date: Date, days: number): Date {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function atHour(date: Date, hour: number): Date {
  const value = new Date(date);
  value.setHours(hour, 0, 0, 0);
  return value;
}

function daysUntilMonday(date: Date): number {
  return (1 - date.getDay() + 7) % 7 || 7;
}

function timeLabel(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function weekdayLabel(date: Date): string {
  return date.toLocaleDateString([], { weekday: "short" });
}
