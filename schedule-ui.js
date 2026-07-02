const scheduleDialog = document.querySelector("#scheduleDialog");
const scheduleDialogTitle = document.querySelector("#scheduleDialogTitle");
const scheduleDialogDay = document.querySelector("#scheduleDialogDay");
const scheduleDialogContent = document.querySelector("#scheduleDialogContent");
let scheduleTrigger = null;

const scheduleTitles = {
  1: { label: "DAY 1・7 / 12", title: "相遇・預備｜完整日程" },
  2: { label: "DAY 2・7 / 13", title: "扎根・操練｜完整日程" },
  3: { label: "DAY 3・7 / 14", title: "差遣・出發｜完整日程" },
};

const childScheduleTitles = {
  1: { label: "DAY 1・7 / 27", title: "相遇・認識｜完整日程" },
  2: { label: "DAY 2・7 / 28", title: "學習・同行｜完整日程" },
  3: { label: "DAY 3・7 / 29", title: "分享・差遣｜完整日程" },
};

const campScheduleConfig = {
  youth: {
    title: "青年領袖輔導培訓營｜完整三日行程",
    templatePrefix: "fullScheduleDay",
    days: scheduleTitles,
  },
  child: {
    title: "日光暑期兒童營｜完整三日行程",
    templatePrefix: "childFullScheduleDay",
    days: childScheduleTitles,
  },
};

document.querySelectorAll(".schedule-camp-link").forEach(button => {
  button.addEventListener("click", () => {
    const config = campScheduleConfig[button.dataset.campSchedule];
    if (!config || !scheduleDialog) return;

    const content = document.createDocumentFragment();
    [1, 2, 3].forEach(day => {
      const template = document.querySelector(`#${config.templatePrefix}${day}`);
      if (!template) return;

      const daySection = document.createElement("section");
      daySection.className = "camp-full-day";
      const heading = document.createElement("h3");
      const dayTitle = config.days[day].title.replace("｜完整日程", "");
      heading.textContent = `${config.days[day].label}｜${dayTitle}`;
      daySection.append(heading, template.content.cloneNode(true));
      content.append(daySection);
    });

    scheduleTrigger = button;
    scheduleDialogDay.textContent = "2026 CAMP SCHEDULE";
    scheduleDialogTitle.textContent = config.title;
    scheduleDialogContent.replaceChildren(content);
    scheduleDialog.showModal();
  });
});

function closeScheduleDialog() {
  if (!scheduleDialog?.open) return;
  scheduleDialog.close();
  scheduleTrigger?.focus();
}

document.querySelector("#closeScheduleDialog")?.addEventListener("click", closeScheduleDialog);
scheduleDialog?.addEventListener("click", event => {
  if (event.target === scheduleDialog) closeScheduleDialog();
});
