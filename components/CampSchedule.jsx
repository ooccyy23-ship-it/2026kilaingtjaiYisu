const schedule = [
  {
    day: "DAY 1",
    date: "7 / 12",
    weekday: "SUN",
    title: "相遇・預備",
    accent: "from-sky-500 to-blue-700",
    events: [
      { time: "14:00–16:00", icon: "📝", title: "報到", note: "葉加恩傳道師" },
      { time: "16:00–18:30", icon: "🍖", title: "晚餐交誼・烤肉" },
      { time: "18:30–19:30", icon: "👋", title: "相見歡", note: "鄭馨儀部長" },
      { time: "19:30–21:00", icon: "🎵", title: "開會禮拜", note: "杜志華牧師" },
      { time: "21:00–21:30", icon: "🙏", title: "小組時間・晚禱" },
      { time: "21:30–22:30", icon: "🌙", title: "盥洗・就寢" },
    ],
  },
  {
    day: "DAY 2",
    date: "7 / 13",
    weekday: "MON",
    title: "扎根・操練",
    accent: "from-amber-400 to-orange-500",
    events: [
      { time: "07:00–07:30", icon: "☀️", title: "起床" },
      { time: "07:30–08:00", icon: "🍳", title: "早餐" },
      { time: "08:00–09:00", icon: "🌅", title: "晨更", note: "Marian 老師" },
      { time: "09:00–10:00", icon: "📖", title: "腓立門書導讀", note: "邱欣惠傳道師" },
      { time: "10:00–10:20", icon: "☕", title: "休息" },
      { time: "10:20–12:00", icon: "📖", title: "分組查經", note: "四組同行" },
      { time: "12:00–13:30", icon: "🍱", title: "中餐" },
      { time: "13:30–14:00", icon: "🎵", title: "敬拜讚美" },
      { time: "14:00–15:00", icon: "📝", title: "和睦者的操練", note: "營會課程設計" },
      { time: "15:00–15:30", icon: "🍪", title: "點心休息" },
      { time: "15:30–16:30", icon: "📝", title: "悔改的生命", note: "營會課程設計" },
      { time: "16:30–17:30", icon: "🚌", title: "前往新香蘭教會", note: "場地佈置" },
      { time: "17:30–19:30", icon: "🙏", title: "禁食禱告・預備", note: "Marian 老師" },
      {
        time: "19:30–21:00",
        icon: "✨",
        title: "培靈會",
        note: "林鴻信教授・Jordan 弟兄分享",
        highlight: true,
      },
      { time: "21:00–21:30", icon: "🚌", title: "回程民宿" },
      { time: "21:30–22:30", icon: "🌙", title: "盥洗・就寢" },
    ],
  },
  {
    day: "DAY 3",
    date: "7 / 14",
    weekday: "TUE",
    title: "差遣・出發",
    accent: "from-emerald-400 to-teal-600",
    events: [
      { time: "07:00–07:30", icon: "☀️", title: "起床" },
      { time: "07:30–08:00", icon: "🍳", title: "早餐" },
      { time: "08:00–09:00", icon: "🌅", title: "晨更", note: "陳俊凱傳道" },
      { time: "09:30–11:30", icon: "📝", title: "兒童營會備課", note: "鄭馨儀部長" },
      { time: "11:30–12:00", icon: "🙏", title: "差遣禮拜", note: "馬瑩姍傳道師" },
      { time: "12:00–13:30", icon: "🍱", title: "中餐" },
      { time: "13:30–15:00", icon: "🚌", title: "預備回程" },
    ],
  },
];

function TimelineEvent({ event }) {
  return (
    <li className="relative grid grid-cols-[76px_30px_1fr] gap-2.5">
      <time className="pt-1 text-right text-[11px] font-bold leading-5 tracking-tight text-slate-500">
        {event.time}
      </time>

      <div className="relative flex justify-center">
        <span
          className={`relative z-10 grid h-8 w-8 place-items-center rounded-full border text-sm shadow-sm ${
            event.highlight
              ? "border-amber-300 bg-amber-100 shadow-amber-200/80"
              : "border-sky-100 bg-white"
          }`}
          aria-hidden="true"
        >
          {event.icon}
        </span>
      </div>

      <div
        className={`mb-5 rounded-2xl px-3.5 py-2.5 transition-transform duration-200 hover:-translate-y-0.5 ${
          event.highlight
            ? "border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-[0_12px_35px_rgba(245,158,11,0.20)]"
            : "border border-transparent bg-slate-50/80 hover:border-sky-100 hover:bg-white hover:shadow-md"
        }`}
      >
        {event.highlight && (
          <span className="mb-1.5 inline-flex rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black tracking-[0.14em] text-amber-950">
            HIGHLIGHT
          </span>
        )}
        <h4 className="text-sm font-extrabold text-slate-800">{event.title}</h4>
        {event.note && (
          <p className="mt-1 text-[11px] leading-5 text-slate-500">{event.note}</p>
        )}
      </div>
    </li>
  );
}

function DayCard({ item }) {
  return (
    <article className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-[0_20px_60px_rgba(30,95,140,0.12)] backdrop-blur">
      <div className={`h-1.5 bg-gradient-to-r ${item.accent}`} />

      <header className="relative overflow-hidden border-b border-sky-100 px-6 pb-5 pt-6">
        <div className="absolute -right-8 -top-12 h-36 w-36 rounded-full bg-sky-100/70 blur-2xl" />
        <div className="relative flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black tracking-[0.22em] text-sky-600">
              {item.day}
            </p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-slate-800">
              {item.title}
            </h3>
          </div>
          <div className="text-right">
            <strong className="block text-3xl font-black tracking-tighter text-slate-800">
              {item.date}
            </strong>
            <span className="text-[10px] font-black tracking-[0.2em] text-slate-400">
              {item.weekday}
            </span>
          </div>
        </div>
      </header>

      <ol className="relative px-4 py-6 before:absolute before:bottom-10 before:left-[105px] before:top-8 before:w-px before:bg-gradient-to-b before:from-sky-200 before:via-sky-100 before:to-transparent">
        {item.events.map((event) => (
          <TimelineEvent key={`${event.time}-${event.title}`} event={event} />
        ))}
      </ol>
    </article>
  );
}

export default function CampSchedule() {
  return (
    <section
      className="relative isolate overflow-hidden bg-[#f6fbff] px-5 py-20 sm:px-8 lg:px-10 lg:py-28"
      aria-labelledby="camp-schedule-title"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-amber-100/50 blur-3xl" />
        <div className="absolute bottom-[-130px] left-[-5%] h-64 w-[110%] rounded-[50%] border-[38px] border-sky-100/70" />
        <div className="absolute bottom-[-175px] left-[10%] h-64 w-[85%] rounded-[50%] border-[28px] border-emerald-100/60" />
      </div>

      <div className="mx-auto max-w-[1380px]">
        <header className="mx-auto mb-12 max-w-2xl text-center lg:mb-16">
          <p className="text-[11px] font-black tracking-[0.24em] text-sky-600">
            2026 CAMP SCHEDULE
          </p>
          <h2
            id="camp-schedule-title"
            className="mt-3 text-3xl font-black tracking-tight text-slate-800 sm:text-4xl lg:text-5xl"
          >
            三天，一起走過
            <span className="text-sky-600">扎根與差遣</span>
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            從相遇、操練到差遣，讓每一段時間都成為信仰與同行的記號。
          </p>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-3">
          {schedule.map((item) => (
            <DayCard key={item.day} item={item} />
          ))}
        </div>

        <p className="mt-8 text-center text-[11px] leading-5 text-slate-400">
          行程可能依現場狀況彈性調整，請以營會工作人員公告為準。
        </p>
      </div>
    </section>
  );
}
