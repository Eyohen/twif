import { useState } from 'react';

const TIME_SLOTS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
];

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

// Returns the Monday of the week containing `date`
const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const fmt = (date) =>
  date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

const fmtFull = (date) =>
  date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// Seed-based deterministic "random" so mock data is consistent per date key
const seededAvailability = (dateKey, time) => {
  const str = dateKey + time;
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  return Math.abs(hash) % 10;
};

// Returns 'available' | 'booked' | 'unavailable' for a given date + time
const getSlotStatus = (date, time, overrides) => {
  const key = date.toISOString().slice(0, 10) + '|' + time;
  if (overrides[key] !== undefined) return overrides[key];
  const v = seededAvailability(date.toISOString().slice(0, 10), time);
  if (v < 4) return 'available';   // ~40% available
  if (v < 5) return 'booked';      // ~10% already booked
  return 'unavailable';            // ~50% unavailable
};

const AvailabilityCalendar = ({ mode = 'view', onBook }) => {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  // overrides: { 'YYYY-MM-DD|HH:MM XM': 'available' | 'unavailable' | 'booked' }
  const [overrides, setOverrides] = useState({});

  const weekDays = DAY_NAMES.map((_, i) => addDays(weekStart, i));

  const prevWeek = () => setWeekStart((d) => addDays(d, -7));
  const nextWeek = () => setWeekStart((d) => addDays(d, 7));

  const weekLabel = `${fmt(weekStart)} – ${fmt(addDays(weekStart, 4))}`;

  const handleSlotClick = (date, time, status) => {
    const key = date.toISOString().slice(0, 10) + '|' + time;
    if (mode === 'edit') {
      // Toggle between available and unavailable (can't untoggle a booked slot)
      if (status === 'booked') return;
      setOverrides((prev) => ({
        ...prev,
        [key]: status === 'available' ? 'unavailable' : 'available',
      }));
    } else if (mode === 'view') {
      if (status !== 'available') return;
      onBook?.({
        date: fmt(date),
        day: fmtFull(date).split(',')[0],
        time,
        dateObj: date,
      });
    }
  };

  const slotClass = (status) => {
    const base = 'flex items-center justify-center rounded-md text-xs font-medium transition-all duration-150 h-10 w-full';
    if (status === 'available') {
      return mode === 'view'
        ? `${base} bg-accent/10 text-accent border border-accent/20 hover:bg-accent hover:text-white cursor-pointer`
        : `${base} bg-accent/10 text-accent border border-accent/20 hover:bg-red-50 hover:text-red-500 hover:border-red-200 cursor-pointer`;
    }
    if (status === 'booked') {
      return `${base} bg-gray-100 text-gray-400 cursor-not-allowed line-through`;
    }
    // unavailable
    return mode === 'edit'
      ? `${base} bg-gray-50 text-gray-300 border border-dashed border-gray-200 hover:bg-accent/5 hover:text-accent hover:border-accent/20 cursor-pointer`
      : `${base} bg-gray-50 text-gray-200 cursor-not-allowed`;
  };

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Week of {weekLabel}
          </p>
          {mode === 'edit' && (
            <p className="text-xs text-gray-400 mt-0.5">Click a slot to toggle your availability</p>
          )}
          {mode === 'view' && (
            <p className="text-xs text-gray-400 mt-0.5">Click an available slot to book a 30-min meeting</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevWeek}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            aria-label="Previous week"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={nextWeek}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            aria-label="Next week"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto -mx-1">
        <div className="min-w-[560px] px-1">
          {/* Day headers */}
          <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: '52px repeat(5, 1fr)' }}>
            <div />
            {weekDays.map((day, i) => (
              <div key={i} className="text-center pb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{DAY_NAMES[i]}</p>
                <p className="text-xs text-gray-400 mt-0.5">{fmt(day)}</p>
              </div>
            ))}
          </div>

          {/* Time rows */}
          <div className="space-y-1">
            {TIME_SLOTS.map((time) => (
              <div key={time} className="grid gap-1 items-center" style={{ gridTemplateColumns: '52px repeat(5, 1fr)' }}>
                <span className="text-xs text-gray-400 text-right pr-2 leading-tight">{time}</span>
                {weekDays.map((day, i) => {
                  const status = getSlotStatus(day, time, overrides);
                  return (
                    <button
                      key={i}
                      onClick={() => handleSlotClick(day, time, status)}
                      className={slotClass(status)}
                      title={
                        status === 'available'
                          ? mode === 'view' ? `Book ${time}` : `Available — click to block`
                          : status === 'booked'
                          ? 'Already booked'
                          : mode === 'edit' ? 'Blocked — click to open' : ''
                      }
                    >
                      {status === 'booked' ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      ) : status === 'available' && mode === 'view' ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-5 pt-4 border-t border-gray-100">
        {mode === 'view' ? (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-accent/20 border border-accent/30" />
              <span className="text-xs text-gray-500">Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-gray-100" />
              <span className="text-xs text-gray-500">Booked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-gray-50 border border-dashed border-gray-200" />
              <span className="text-xs text-gray-500">Unavailable</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-accent/20 border border-accent/30" />
              <span className="text-xs text-gray-500">Open</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-gray-100" />
              <span className="text-xs text-gray-500">Booked by someone</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-gray-50 border border-dashed border-gray-200" />
              <span className="text-xs text-gray-500">Blocked</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AvailabilityCalendar;
