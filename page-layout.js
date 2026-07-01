const youthScheduleSection = document.querySelector("#schedule");
const childScheduleSection = document.querySelector("#child-schedule");

if (youthScheduleSection && childScheduleSection) {
  youthScheduleSection.insertAdjacentElement("afterend", childScheduleSection);
}
