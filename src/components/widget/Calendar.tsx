import { cn } from '@lib/utils';
import { useState } from 'react';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: { day: number; type: 'prev' | 'current' | 'next' }[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: daysInPrevMonth - i, type: 'prev' });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, type: 'current' });
  }

  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, type: 'next' });
  }

  return days;
}

export default function Calendar() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const days = getMonthDays(viewYear, viewMonth);
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  return (
    <div className="sticky top-20 ml-8 hidden w-64 shrink-0 xl:block">
      <div className="rounded-lg border border-border/50 bg-card/50 p-4 shadow-sm backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={goToPrevMonth}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label="上一月"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <title>上一月</title>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="font-medium text-sm">
            {viewYear}年{viewMonth + 1}月
          </span>
          <button
            type="button"
            onClick={goToNextMonth}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label="下一月"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <title>下一月</title>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        <div className="mb-2 grid grid-cols-7 text-center">
          {WEEKDAYS.map((w) => (
            <span key={w} className="text-muted-foreground text-xs">
              {w}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 text-center">
          {days.map((d) => {
            const isToday = isCurrentMonth && d.day === today.getDate() && d.type === 'current';
            return (
              <span
                key={`${d.type}-${d.day}`}
                className={cn(
                  'rounded py-1 text-xs',
                  d.type === 'current' ? 'text-foreground' : 'text-muted-foreground/40',
                  isToday && 'bg-primary font-bold text-primary-foreground',
                )}
              >
                {d.day}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
