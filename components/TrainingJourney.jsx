import {
  ArrowRight,
  Bird,
  BookOpen,
  Flag,
  Leaf,
  MessagesSquare,
  Sprout,
} from "lucide-react";

import bibleStudyImage from "../images/training/bible-study.jpg";
import interactiveLearningImage from "../images/training/interactive-learning.jpg";
import teamChallengeImage from "../images/training/team-challenge.jpg";
import faithPracticeImage from "../images/training/faith-practice.jpg";

const journeyItems = [
  {
    number: "01",
    title: "主題查經",
    description: "透過聖經，看見神的心意，重新發現自己的價值與使命。",
    cta: "開啟旅程",
    image: bibleStudyImage,
    imageAlt: "晨光海岸旁擺放一本打開的聖經",
    icon: BookOpen,
    accent: "text-emerald-700",
    badge: "bg-emerald-700",
  },
  {
    number: "02",
    title: "互動學習",
    description: "透過對話與體驗主動思考，讓學習不只停留在聽見。",
    cta: "一起探索",
    image: interactiveLearningImage,
    imageAlt: "青年在山海之間圍坐討論與學習",
    icon: MessagesSquare,
    accent: "text-sky-700",
    badge: "bg-sky-700",
  },
  {
    number: "03",
    title: "團隊挑戰",
    description: "在合作挑戰中練習溝通、承擔，並成為支持夥伴的人。",
    cta: "接受挑戰",
    image: teamChallengeImage,
    imageAlt: "青年在戶外共同擊掌完成團隊挑戰",
    icon: Flag,
    accent: "text-amber-700",
    badge: "bg-amber-500",
  },
  {
    number: "04",
    title: "信仰實踐",
    description: "把所學化為具體行動，將祝福帶回教會、校園與日常。",
    cta: "活出信仰",
    image: faithPracticeImage,
    imageAlt: "青年背著背包眺望晨光與山海",
    icon: Sprout,
    accent: "text-lime-700",
    badge: "bg-lime-700",
  },
];

function JourneyCard({ item }) {
  const Icon = item.icon;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-white/90 bg-[#fffefa] shadow-[0_14px_40px_rgba(24,74,105,0.10)] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_24px_55px_rgba(24,74,105,0.17)]">
      <div className="aspect-video overflow-hidden bg-sky-50">
        <img
          src={item.image}
          alt={item.imageAlt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
        />
      </div>

      <div className="relative flex flex-1 flex-col px-6 pb-6 pt-10">
        <span
          className={`absolute -top-7 left-6 grid h-14 w-14 place-items-center rounded-full border-4 border-[#fffefa] text-white shadow-lg ${item.badge}`}
          aria-hidden="true"
        >
          <Icon size={24} strokeWidth={1.8} />
        </span>

        <span className={`font-serif text-sm font-semibold tracking-[0.16em] ${item.accent}`}>
          {item.number}
        </span>
        <h3 className="mt-2 text-xl font-black tracking-tight text-[#15375b]">
          {item.title}
        </h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          {item.description}
        </p>

        <a
          href="#schedule"
          className={`mt-5 inline-flex items-center gap-2 self-start text-sm font-bold ${item.accent}`}
        >
          {item.cta}
          <ArrowRight
            size={16}
            aria-hidden="true"
            className="transition-transform duration-300 group-hover:translate-x-1.5"
          />
        </a>
      </div>
    </article>
  );
}

export default function TrainingJourney() {
  return (
    <section
      className="relative isolate overflow-hidden bg-[#fbfaf4] px-5 py-20 sm:px-8 lg:py-28"
      aria-labelledby="training-journey-title"
    >
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute -left-28 top-12 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute -right-28 top-1/3 h-80 w-80 rounded-full bg-amber-100/50 blur-3xl" />
        <div className="absolute bottom-[-170px] left-[-5%] h-64 w-[110%] rounded-[50%] border-[34px] border-sky-100/60" />
        <Leaf className="absolute -left-4 top-8 h-28 w-28 -rotate-12 text-emerald-700/[0.08]" strokeWidth={1} />
        <Bird className="absolute right-5 top-8 h-24 w-24 text-sky-700/[0.07]" strokeWidth={1} />
      </div>

      <div className="mx-auto max-w-[1200px]">
        <header className="mx-auto mb-12 max-w-2xl text-center lg:mb-14">
          <div className="flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-emerald-600/40" />
            <p className="text-xs font-bold tracking-[0.22em] text-emerald-700">
              學習的旅程
            </p>
            <span className="h-px w-8 bg-emerald-600/40" />
          </div>
          <h2
            id="training-journey-title"
            className="mt-4 text-3xl font-black tracking-tight text-[#15375b] sm:text-4xl lg:text-5xl"
          >
            在營會中，我們一起成長
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-500 sm:text-base">
            透過學習、體驗與實踐，成為信仰與生命的領袖
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {journeyItems.map((item) => (
            <JourneyCard key={item.number} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
