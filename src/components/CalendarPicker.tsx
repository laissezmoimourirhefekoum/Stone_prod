import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Date helpers                                                        */
/* ------------------------------------------------------------------ */

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isBeforeDay(a: Date, b: Date) {
  return startOfDay(a).getTime() < startOfDay(b).getTime();
}

function isAfterDay(a: Date, b: Date) {
  return startOfDay(a).getTime() > startOfDay(b).getTime();
}

type GridDay = {
  date: Date;
  inMonth: boolean;
};

function buildMonthGrid(monthDate: Date): GridDay[] {
  const first = startOfMonth(monthDate);

  // Lundi = 0, Mardi = 1... Dimanche = 6
  const firstWeekday = (first.getDay() + 6) % 7;

  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - firstWeekday);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);

    return {
      date: d,
      inMonth: d.getMonth() === monthDate.getMonth(),
    };
  });
}

/* ------------------------------------------------------------------ */
/* CalendarPicker                                                      */
/* ------------------------------------------------------------------ */

export function CalendarPicker({
  value,
  onChange,
  isDark = false,
  onClose,
  /**
   * Bornes optionnelles de sélection.
   * `min` : première date sélectionnable (incluse).
   * `max` : dernière date sélectionnable (incluse).
   * Ex. Insights : `disablePast={false} max={aujourd'hui}` pour remonter
   * dans l'historique sans sélectionner le futur.
   */
  min,
  max,
  /** true (défaut) : désactive les dates avant aujourd'hui (comportement NewPostModal). */
  disablePast = true,
}: {
  value: Date;
  onChange: (date: Date) => void;
  isDark?: boolean;
  onClose?: () => void;
  min?: Date;
  max?: Date;
  disablePast?: boolean;
}) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(value));

  // Aujourd'hui
  const today = useMemo(() => startOfDay(new Date()), []);

  // Une date est désactivée si :
  //  - disablePast et avant aujourd'hui, ou
  //  - avant `min`, ou
  //  - après `max`.
  const isDisabled = (date: Date) =>
    (disablePast && isBeforeDay(date, today)) ||
    (min !== undefined && isBeforeDay(date, min)) ||
    (max !== undefined && isAfterDay(date, max));

  const weeks = useMemo(() => {
    const days = buildMonthGrid(viewMonth);
    const rows: GridDay[][] = [];

    for (let i = 0; i < days.length; i += 7) {
      rows.push(days.slice(i, i + 7));
    }

    return rows;
  }, [viewMonth]);

  const monthLabel = viewMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className={[
        "w-full rounded-[16px] border p-3 shadow-lg",
        isDark
          ? "border-white/10 bg-[#1c1c1e]"
          : "border-black/[0.06] bg-white",
      ].join(" ")}
    >
      {/* Header : mois + navigation */}
      <div className="mb-2 flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
          aria-label="Mois précédent"
          className={[
            "flex h-7 w-7 items-center justify-center rounded-full transition",
            isDark
              ? "text-neutral-400 hover:bg-white/10"
              : "text-neutral-500 hover:bg-black/5",
          ].join(" ")}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <span
          className={[
            "text-[13px] font-semibold",
            isDark ? "text-white" : "text-neutral-900",
          ].join(" ")}
        >
          {monthLabel}
        </span>

        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          aria-label="Mois suivant"
          className={[
            "flex h-7 w-7 items-center justify-center rounded-full transition",
            isDark
              ? "text-neutral-400 hover:bg-white/10"
              : "text-neutral-500 hover:bg-black/5",
          ].join(" ")}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* En-tête des jours */}
      <div className="mb-1 grid grid-cols-7">
        {WEEKDAY_LABELS.map((w) => (
          <div
            key={w}
            className={[
              "py-1 text-center text-[11px] font-medium",
              isDark ? "text-neutral-500" : "text-neutral-400",
            ].join(" ")}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Grille des jours */}
      <div className="flex flex-col gap-0.5">
        {weeks.map((week, wi) => {
          const rowHasSelected = week.some((d) => isSameDay(d.date, value));

          return (
            <div
              key={wi}
              className={[
                "grid grid-cols-7 rounded-full",
                rowHasSelected
                  ? isDark
                    ? "bg-white/5"
                    : "bg-black/[0.025]"
                  : "",
              ].join(" ")}
            >
              {week.map(({ date }) => {
                const selected = isSameDay(date, value);
                const disabled = isDisabled(date);

                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) return;

                      onChange(date);
                      onClose?.();
                    }}
                    className={[
                      "flex h-8 w-8 items-center justify-center justify-self-center rounded-full text-[12.5px] transition",

                      /* Dates hors plage = GRIS */
                      disabled
                        ? isDark
                          ? "cursor-not-allowed text-neutral-600"
                          : "cursor-not-allowed text-neutral-300"

                        /* Dates sélectionnables */
                        : isDark
                          ? "text-neutral-200"
                          : "text-neutral-900",

                      /* Date sélectionnée */
                      selected && !disabled
                        ? isDark
                          ? "bg-white font-semibold text-neutral-900"
                          : "bg-neutral-900 font-semibold text-white"
                        : "",

                      /* Hover sur les dates sélectionnables */
                      !disabled
                        ? isDark
                          ? "hover:bg-white/10"
                          : "hover:bg-black/5"
                        : "",
                    ].join(" ")}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}