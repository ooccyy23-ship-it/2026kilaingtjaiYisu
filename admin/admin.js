import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { getDownloadURL, ref } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-storage.js";
import { utils, writeFileXLSX } from "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";
import { auth, db, storage } from "../firebase.js";

const registrationRows = document.querySelector("#registrationRows");
const tableMessage = document.querySelector("#tableMessage");
const dataStatus = document.querySelector("#dataStatus");
const tablePagination = document.querySelector("#tablePagination");
const previousPageButton = document.querySelector("#previousPage");
const nextPageButton = document.querySelector("#nextPage");
const pageIndicator = document.querySelector("#pageIndicator");
const registrationSearch = document.querySelector("#registrationSearch");
const ageFilter = document.querySelector("#ageFilter");
const consentFilter = document.querySelector("#consentFilter");
const exportExcelButton = document.querySelector("#exportExcel");
const editDialog = document.querySelector("#editDialog");
const editForm = document.querySelector("#editForm");
const editMessage = document.querySelector("#editMessage");
const saveEditButton = document.querySelector("#saveEdit");
const logoutButton = document.querySelector("#logoutButton");
const dashboardNav = document.querySelector("#dashboardNav");
const registrationNav = document.querySelector("#registrationNav");
const registrationWorkspace = document.querySelector("#registrationWorkspace");
const statisticsDashboard = document.querySelector(".statistics-dashboard");
const statCards = [...document.querySelectorAll(".stat-card")];
const statValues = [...document.querySelectorAll("[data-stat]")];
const analysisPanel = document.querySelector("#analysisPanel");
const analysisPanelTitle = document.querySelector("#analysisPanelTitle");
const analysisContent = document.querySelector("#analysisContent");
const analysisIconUse = document.querySelector("#analysisIconUse");
const closeAnalysisPanelButton = document.querySelector("#closeAnalysisPanel");
const editFields = {
  documentId: document.querySelector("#editDocumentId"),
  camp: document.querySelector("#editCamp"),
  name: document.querySelector("#editName"),
  gender: document.querySelector("#editGender"),
  birthDate: document.querySelector("#editBirthDate"),
  address: document.querySelector("#editAddress"),
  phone: document.querySelector("#editPhone"),
  email: document.querySelector("#editEmail"),
  church: document.querySelector("#editChurch"),
  transport: document.querySelector("#editTransport"),
  diet: document.querySelector("#editDiet"),
  shirtSize: document.querySelector("#editShirtSize"),
};
let totalRegistrations = 0;
let registrationRecords = [];
let dashboardFilter = "all";
let dashboardStatistics = null;
let hasAnimatedDashboardCounts = false;
let currentPage = 1;

const YOUTH_CAMP = "青年領袖營";
const CHILD_CAMP = "暑期兒童營";
const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
const REGISTRATIONS_PER_PAGE = 10;

const campDates = Object.freeze({
  青年領袖營: "2026-07-12",
  暑期兒童營: "2026-07-27",
});

function calculateAge(birthDate, targetDate = new Date()) {
  if (!birthDate) return "—";

  const birth = new Date(`${birthDate}T00:00:00`);
  const target = typeof targetDate === "string"
    ? new Date(`${targetDate}T00:00:00`)
    : targetDate;
  if (Number.isNaN(birth.getTime()) || Number.isNaN(target.getTime())) return "—";

  let age = target.getFullYear() - birth.getFullYear();
  const beforeBirthday = target.getMonth() < birth.getMonth() ||
    (target.getMonth() === birth.getMonth() && target.getDate() < birth.getDate());

  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : "—";
}

function normalizeOtherValue(value, standardValues) {
  const normalizedValue = value.trim();
  return standardValues.includes(normalizedValue)
    ? { value: normalizedValue, other: "" }
    : { value: "其他", other: normalizedValue };
}

function formatRegistrationDate(value) {
  if (!value) return "—";

  const date = typeof value.toDate === "function"
    ? value.toDate()
    : new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getRegistrationTimestamp(data) {
  const value = data.createdAt ?? data.registrationDate ?? data.submittedAt;
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function addCell(row, value, className = "") {
  const cell = document.createElement("td");
  cell.textContent = value || "—";
  if (className) cell.className = className;
  row.append(cell);
}

function getConsentFileReference(data) {
  return data.guardianConsentPath ??
    data.consentFilePath ??
    data.parentConsentPath ??
    data.guardianConsentUrl ??
    data.consentFileUrl ??
    data.parentConsentUrl ??
    "";
}

function addConsentCell(row, fileReference) {
  const cell = document.createElement("td");

  if (!fileReference) {
    cell.textContent = "—";
    row.append(cell);
    return;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "download-button";
  button.textContent = "下載";
  button.dataset.fileReference = fileReference;
  cell.append(button);
  row.append(cell);
}

function addActionCell(row, documentId) {
  const cell = document.createElement("td");
  cell.className = "action-cell";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "row-action edit-action";
  editButton.dataset.documentId = documentId;
  editButton.textContent = "編輯";

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "row-action delete-action";
  deleteButton.dataset.documentId = documentId;
  deleteButton.textContent = "刪除";

  cell.append(editButton, deleteButton);
  row.append(cell);
}

function normalizeSearchValue(value) {
  return String(value ?? "")
    .toLocaleLowerCase("zh-TW")
    .replace(/[\s-]/g, "");
}

function getRecordCamp(data) {
  return String(data.camp ?? "").trim();
}

function getCampRecords(campName) {
  return registrationRecords.filter(({ data }) => getRecordCamp(data) === campName);
}

function requiresTransport(data) {
  return String(data.transport ?? "").trim() === "需接送";
}

function countByField(records, field) {
  return records.reduce((counts, { data }) => {
    const value = String(data[field] ?? "").trim() || "未填寫";
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function getGenderDistribution(records) {
  const distribution = { 男: 0, 女: 0, "其他 / 保留": 0 };
  records.forEach(({ data }) => {
    if (data.gender === "男") distribution.男 += 1;
    else if (data.gender === "女") distribution.女 += 1;
    else distribution["其他 / 保留"] += 1;
  });
  return distribution;
}

function getDietDistribution(records) {
  const distribution = { 葷食: 0, 素食: 0, 其他: 0 };
  const otherDetails = {};
  records.forEach(({ data }) => {
    const diet = String(data.diet ?? "").trim();
    if (diet === "葷食") distribution.葷食 += 1;
    else if (diet === "素食") distribution.素食 += 1;
    else {
      distribution.其他 += 1;
      const detail = String(data.dietOther || diet || "未填寫").trim();
      otherDetails[detail] = (otherDetails[detail] ?? 0) + 1;
    }
  });
  return { distribution, otherDetails };
}

function getShirtSizeDistribution(records) {
  const distribution = Object.fromEntries(SHIRT_SIZES.map(size => [size, 0]));
  records.forEach(({ data }) => {
    const size = String(data.shirtSize ?? "").toUpperCase().trim();
    if (Object.hasOwn(distribution, size)) distribution[size] += 1;
  });
  return distribution;
}

function getAgeDistribution(records, campType) {
  const labels = campType === "youth"
    ? ["15–17 歲", "18–20 歲", "21–23 歲", "24 歲以上"]
    : ["8 歲以下", "9–10 歲", "11–12 歲", "13 歲以上"];
  const distribution = Object.fromEntries(labels.map(label => [label, 0]));

  records.forEach(({ data }) => {
    const calculatedAge = data.age ?? calculateAge(data.birthDate);
    if (calculatedAge === "" || calculatedAge === "—") return;
    const age = Number(calculatedAge);
    if (!Number.isFinite(age)) return;
    if (campType === "youth") {
      if (age >= 15 && age <= 17) distribution["15–17 歲"] += 1;
      else if (age >= 18 && age <= 20) distribution["18–20 歲"] += 1;
      else if (age >= 21 && age <= 23) distribution["21–23 歲"] += 1;
      else if (age >= 24) distribution["24 歲以上"] += 1;
    } else {
      if (age <= 8) distribution["8 歲以下"] += 1;
      else if (age <= 10) distribution["9–10 歲"] += 1;
      else if (age <= 12) distribution["11–12 歲"] += 1;
      else distribution["13 歲以上"] += 1;
    }
  });
  return distribution;
}

function getMostPopularSize(records) {
  const distribution = getShirtSizeDistribution(records);
  const [size, count] = Object.entries(distribution)
    .reduce((top, item) => item[1] > top[1] ? item : top, ["—", 0]);
  return count ? `${size}（${count}人）` : "尚無資料";
}

function getTopDistributionItems(distribution, limit = 4) {
  return Object.entries(distribution)
    .filter(([, count]) => count > 0)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, limit);
}

function calculateDashboardStatistics() {
  const youthRecords = getCampRecords(YOUTH_CAMP);
  const childRecords = getCampRecords(CHILD_CAMP);
  const youthDiet = getDietDistribution(youthRecords).distribution;
  const childDiet = getDietDistribution(childRecords).distribution;

  return {
    youthCount: youthRecords.length,
    childCount: childRecords.length,
    youthTransport: youthRecords.filter(({ data }) => requiresTransport(data)).length,
    childTransport: childRecords.filter(({ data }) => requiresTransport(data)).length,
    youthDietTotal: youthRecords.length,
    childDietTotal: childRecords.length,
    youthShirtTotal: youthRecords.length,
    childShirtTotal: childRecords.length,
    youthDietDistribution: youthDiet,
    childDietDistribution: childDiet,
    youthShirtDistribution: getShirtSizeDistribution(youthRecords),
    childShirtDistribution: getShirtSizeDistribution(childRecords),
    youthTopShirt: getMostPopularSize(youthRecords),
    childTopShirt: getMostPopularSize(childRecords),
  };
}

function animateNumber(element, end, duration = 800) {
  const start = 0;
  const startTime = performance.now();

  function update(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(start + (end - start) * easedProgress);
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

function renderDashboardStatistics() {
  dashboardStatistics = calculateDashboardStatistics();
  statValues.forEach(element => {
    const key = element.dataset.stat;
    const value = dashboardStatistics[key];
    if (typeof value === "number") {
      element.dataset.count = value;
      if (hasAnimatedDashboardCounts) element.textContent = value;
      else animateNumber(element, value);
    } else {
      element.textContent = value;
    }
  });
  hasAnimatedDashboardCounts = true;
  renderMiniAnalytics();
  statCards.forEach(card => card.classList.remove("is-loading"));
  if (!analysisPanel.hidden && analysisPanel.dataset.analysis && analysisPanel.dataset.camp) {
    renderAnalysisPanel(analysisPanel.dataset.analysis, analysisPanel.dataset.camp);
  }
}

function renderMiniAnalytics() {
  document.querySelectorAll("[data-mini-diet]").forEach(container => {
    const isYouth = container.dataset.miniDiet === "youth";
    const distribution = isYouth
      ? dashboardStatistics.youthDietDistribution
      : dashboardStatistics.childDietDistribution;
    const maximum = Math.max(...Object.values(distribution), 1);
    container.replaceChildren();
    Object.entries(distribution).forEach(([rawLabel, count]) => {
      const row = document.createElement("span");
      row.className = "mini-bar-row mini-bar-row--diet";
      row.innerHTML = `<b></b><i><em style="--mini-width:0%"></em></i><small>${count}</small>`;
      row.querySelector("b").textContent = rawLabel === "其他" ? "特殊" : rawLabel;
      row.querySelector("em").dataset.targetWidth = `${(count / maximum) * 100}%`;
      container.append(row);
    });
  });

  document.querySelectorAll("[data-mini-shirt]").forEach(container => {
    const isYouth = container.dataset.miniShirt === "youth";
    const distribution = isYouth
      ? dashboardStatistics.youthShirtDistribution
      : dashboardStatistics.childShirtDistribution;
    const topItems = getTopDistributionItems(distribution, 3);
    container.replaceChildren();

    if (topItems.length === 0) {
      const empty = document.createElement("span");
      empty.className = "mini-empty";
      empty.textContent = "尚無尺寸資料";
      container.append(empty);
      return;
    }

    topItems.forEach(([size, count]) => {
      const sizeCard = document.createElement("span");
      sizeCard.className = "mini-size-card";
      sizeCard.innerHTML = `<b>${size}</b><strong>${count}</strong>`;
      sizeCard.title = `${size}：${count} 人`;
      container.append(sizeCard);
    });
  });

  requestAnimationFrame(() => {
    document.querySelectorAll(".mini-bar-row em").forEach(bar => {
      bar.style.setProperty("--mini-width", bar.dataset.targetWidth);
    });
  });
}

function createDistributionChart(title, distribution, total, colorClass = "") {
  const section = document.createElement("section");
  section.className = "analysis-chart";
  const heading = document.createElement("h4");
  heading.textContent = title;
  const bars = document.createElement("div");
  bars.className = "analysis-bars";

  Object.entries(distribution).forEach(([label, count]) => {
    const percentage = total ? Math.round((count / total) * 100) : 0;
    const row = document.createElement("div");
    row.className = "analysis-bar-row";
    row.innerHTML = `
      <span class="analysis-bar-label"></span>
      <span class="analysis-bar-track"><span class="analysis-bar-fill ${colorClass}" style="--bar-width: ${percentage}%"></span></span>
      <strong>${count} 人 <small>${percentage}%</small></strong>
    `;
    row.querySelector(".analysis-bar-label").textContent = label;
    bars.append(row);
  });
  section.append(heading, bars);
  return section;
}

function renderAnalysisPanel(type, camp) {
  const records = getCampRecords(camp);
  const isYouth = camp === YOUTH_CAMP;
  const campLabel = isYouth ? "青年營" : "兒童營";
  const targetGroup = document.querySelector(
    isYouth ? "#youthManagementTitle" : "#childManagementTitle"
  ).closest(".statistics-group");
  targetGroup.append(analysisPanel);
  analysisPanel.dataset.analysis = type;
  analysisPanel.dataset.camp = camp;
  analysisContent.replaceChildren();

  if (type === "population") {
    analysisPanelTitle.textContent = `${campLabel}人數統計`;
    analysisIconUse.setAttribute("href", isYouth ? "#icon-cap" : "#icon-heart");
    analysisContent.append(
      createDistributionChart("性別統計", getGenderDistribution(records), records.length, "bar-fill--teal"),
      createDistributionChart("年齡區間統計", getAgeDistribution(records, isYouth ? "youth" : "child"), records.length, "bar-fill--purple")
    );
  } else if (type === "diet") {
    const { distribution, otherDetails } = getDietDistribution(records);
    analysisPanelTitle.textContent = `${campLabel}飲食需求統計`;
    analysisIconUse.setAttribute("href", "#icon-utensils");
    analysisContent.append(
      createDistributionChart("飲食分類", distribution, records.length, "bar-fill--amber")
    );
    const details = Object.entries(otherDetails);
    if (details.length) {
      const detailBox = document.createElement("div");
      detailBox.className = "analysis-details";
      const detailTitle = document.createElement("h4");
      detailTitle.textContent = "其他飲食明細";
      const detailText = document.createElement("p");
      detailText.textContent = details.map(([label, count]) => `${label}（${count}人）`).join("、");
      detailBox.append(detailTitle, detailText);
      analysisContent.append(detailBox);
    }
  } else {
    analysisPanelTitle.textContent = `${campLabel}衣服尺寸統計`;
    analysisIconUse.setAttribute("href", "#icon-shirt");
    analysisContent.append(
      createDistributionChart("尺寸分布", getShirtSizeDistribution(records), records.length, "bar-fill--blue")
    );
  }

  analysisPanel.hidden = false;
  requestAnimationFrame(() => analysisPanel.classList.add("is-open"));
}

function closeAnalysisPanel() {
  analysisPanel.classList.remove("is-open");
  analysisPanel.hidden = true;
}

function setActiveStatCard(activeCard) {
  statCards.forEach(item => {
    const active = item === activeCard;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-pressed", String(active));
  });
}

function matchesDashboardFilter(data) {
  if (dashboardFilter === "youth") {
    return getRecordCamp(data) === YOUTH_CAMP;
  }
  if (dashboardFilter === "child") {
    return getRecordCamp(data) === CHILD_CAMP;
  }
  if (dashboardFilter === "youthTransport") {
    return getRecordCamp(data) === YOUTH_CAMP && requiresTransport(data);
  }
  if (dashboardFilter === "childTransport") {
    return getRecordCamp(data) === CHILD_CAMP && requiresTransport(data);
  }
  return true;
}

function handleStatCardClick(card) {
  const isAlreadyActive = card.classList.contains("is-active");

  if (card.dataset.action === "transport") {
    closeAnalysisPanel();
    dashboardFilter = isAlreadyActive ? "all" : card.dataset.dashboardFilter;
    setActiveStatCard(isAlreadyActive ? null : card);
    filterRegistrations();
    registrationWorkspace.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (card.dataset.action === "campFilter") {
    closeAnalysisPanel();
    dashboardFilter = isAlreadyActive
      ? "all"
      : (card.dataset.camp === YOUTH_CAMP ? "youth" : "child");
    setActiveStatCard(isAlreadyActive ? null : card);
    filterRegistrations();
    registrationWorkspace.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (isAlreadyActive && !analysisPanel.hidden) {
    dashboardFilter = "all";
    filterRegistrations();
    closeAnalysisPanel();
    setActiveStatCard(null);
    return;
  }

  dashboardFilter = card.dataset.camp === YOUTH_CAMP ? "youth" : "child";
  filterRegistrations();
  setActiveStatCard(card);
  renderAnalysisPanel(card.dataset.analysis, card.dataset.camp);
  analysisPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderRegistration(record) {
  const { id, data } = record;
  const row = document.createElement("tr");
  const age = data.age ?? calculateAge(data.birthDate);
  const registrationDate =
    data.createdAt ?? data.registrationDate ?? data.submittedAt;
  const consentFileReference = getConsentFileReference(data);
  const numericAge = Number(age);
  let ageGroup = "unknown";
  if (typeof data.isMinor === "boolean") {
    ageGroup = data.isMinor ? "minor" : "adult";
  } else if (Number.isFinite(numericAge)) {
    ageGroup = numericAge < 18 ? "minor" : "adult";
  }
  const hasConsent = Boolean(data.hasGuardianConsent ?? consentFileReference);

  row.dataset.search = normalizeSearchValue(
    `${data.name ?? ""} ${data.phone ?? ""} ${data.church ?? ""} ${data.camp ?? ""}`
  );
  row.dataset.documentId = id;
  row.dataset.camp = data.camp ?? "";
  row.dataset.transport = data.transport ?? "";
  row.dataset.diet = data.diet ?? "";
  row.dataset.ageGroup = ageGroup;
  row.dataset.consentStatus = hasConsent ? "uploaded" : "missing";
  addCell(row, "0", "sequence-cell");
  addCell(row, data.name);
  addCell(row, data.camp || "未指定營隊", "camp-cell");
  addCell(row, data.gender);
  addCell(row, data.church);
  addCell(row, String(age));
  addCell(row, formatRegistrationDate(registrationDate));
  addConsentCell(row, consentFileReference);
  addActionCell(row, id);
  registrationRows.append(row);
}

function renderAllRegistrations() {
  registrationRows.replaceChildren();
  totalRegistrations = registrationRecords.length;
  registrationRecords.forEach(renderRegistration);
  renderDashboardStatistics();
  filterRegistrations();
}

async function downloadConsentFile(button) {
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "準備中…";

  try {
    const fileReference = button.dataset.fileReference;
    const downloadUrl = /^https?:\/\//.test(fileReference)
      ? fileReference
      : await getDownloadURL(ref(storage, fileReference));
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.target = "_blank";
    link.rel = "noopener";
    link.download = "";
    document.body.append(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error("家長同意書下載失敗：", error);
    button.textContent = "下載失敗";
    window.setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
  } finally {
    button.disabled = false;
    if (button.textContent === "準備中…") button.textContent = originalText;
  }
}

function filterRegistrations(options = {}) {
  const resetPage = options.resetPage !== false;
  const keyword = normalizeSearchValue(registrationSearch.value);
  const selectedAge = ageFilter.value;
  const selectedConsent = consentFilter.value;
  const rows = registrationRows.querySelectorAll("tr");
  const matchedRows = [];

  if (resetPage) currentPage = 1;

  if (totalRegistrations === 0) {
    tableMessage.textContent = "目前尚無報名資料。";
    dataStatus.textContent = "0 筆資料";
    tablePagination.hidden = true;
    exportExcelButton.disabled = true;
    return;
  }

  rows.forEach(row => {
    const record = registrationRecords.find(item => item.id === row.dataset.documentId);
    const matchesSearch = !keyword || row.dataset.search.includes(keyword);
    const matchesAge = selectedAge === "all" ||
      row.dataset.ageGroup === selectedAge;
    const matchesConsent = selectedConsent === "all" ||
      row.dataset.consentStatus === selectedConsent;
    const matchesDashboard = record ? matchesDashboardFilter(record.data) : false;
    const matches = matchesSearch && matchesAge && matchesConsent && matchesDashboard;
    row.hidden = true;
    if (matches) matchedRows.push(row);
  });

  const totalPages = Math.max(1, Math.ceil(matchedRows.length / REGISTRATIONS_PER_PAGE));
  currentPage = Math.min(currentPage, totalPages);
  const pageStart = (currentPage - 1) * REGISTRATIONS_PER_PAGE;
  matchedRows
    .slice(pageStart, pageStart + REGISTRATIONS_PER_PAGE)
    .forEach((row, index) => {
      row.hidden = false;
      row.querySelector(".sequence-cell").textContent = pageStart + index + 1;
    });

  tablePagination.hidden = matchedRows.length <= REGISTRATIONS_PER_PAGE;
  pageIndicator.textContent = `${currentPage} / ${totalPages}`;
  previousPageButton.disabled = currentPage === 1;
  nextPageButton.disabled = currentPage === totalPages;

  tableMessage.textContent = matchedRows.length === 0 && totalRegistrations > 0
    ? "找不到符合搜尋條件的報名資料。"
    : "";
  const hasActiveFilter = keyword ||
    selectedAge !== "all" ||
    selectedConsent !== "all" ||
    dashboardFilter !== "all";
  dataStatus.textContent = hasActiveFilter
    ? `${matchedRows.length} / ${totalRegistrations} 筆`
    : `${totalRegistrations} 筆資料`;
  exportExcelButton.disabled = totalRegistrations === 0;
}

function serializeExcelValue(value) {
  if (value == null) return "";
  if (typeof value.toDate === "function") return value.toDate();
  if (Array.isArray(value)) return value.map(serializeExcelValue).join("、");
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

function exportCompleteRegistrations() {
  if (registrationRecords.length === 0) return;

  const exportData = registrationRecords.map(({ data }) => ({
    建立時間: serializeExcelValue(
      data.createdAt ?? data.registrationDate ?? data.submittedAt
    ),
    報名營隊: serializeExcelValue(data.camp),
    姓名: serializeExcelValue(data.name),
    性別: serializeExcelValue(data.gender),
    身分證字號: serializeExcelValue(
      data.nationalId ?? data.idNumber ?? data.identityNumber
    ),
    出生年月日: serializeExcelValue(data.birthDate),
    系統計算年齡: serializeExcelValue(
      data.age ?? calculateAge(data.birthDate)
    ),
    住址: serializeExcelValue(data.address),
    電話: serializeExcelValue(data.phone),
    電子信箱: serializeExcelValue(data.email),
    教會名稱: serializeExcelValue(data.church),
    接送需求: serializeExcelValue(data.transport),
    其他接送需求: serializeExcelValue(data.transportOther),
    飲食需求: serializeExcelValue(data.diet),
    其他飲食需求: serializeExcelValue(data.dietOther),
    衣服尺寸: serializeExcelValue(data.shirtSize),
  }));

  const worksheet = utils.json_to_sheet(exportData);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, "報名資料");

  const date = new Intl.DateTimeFormat("sv-SE").format(new Date());
  writeFileXLSX(workbook, `Kilaing_tjai_Yisu_系列活動報名資料_${date}.xlsx`);
}

function openEditDialog(documentId) {
  const record = registrationRecords.find(item => item.id === documentId);
  if (!record) return;

  const { data } = record;
  editFields.documentId.value = documentId;
  editFields.camp.value = data.camp ?? "青年領袖營";
  editFields.name.value = data.name ?? "";
  editFields.gender.value = data.gender ?? "保留";
  editFields.birthDate.value = data.birthDate ?? "";
  editFields.address.value = data.address ?? "";
  editFields.phone.value = data.phone ?? "";
  editFields.email.value = data.email ?? "";
  editFields.church.value = data.church ?? "";
  editFields.transport.value = data.transportOther || data.transport || "";
  editFields.diet.value = data.dietOther || data.diet || "";
  editFields.shirtSize.value = data.shirtSize ?? "M";
  editMessage.textContent = "";
  editDialog.showModal();
}

function closeEditDialog() {
  editDialog.close();
  editForm.reset();
  editMessage.textContent = "";
}

async function saveRegistration(event) {
  event.preventDefault();
  if (!editForm.reportValidity()) return;

  const documentId = editFields.documentId.value;
  const camp = editFields.camp.value;
  const birthDate = editFields.birthDate.value;
  const age = calculateAge(birthDate, campDates[camp]);
  const transport = normalizeOtherValue(
    editFields.transport.value,
    ["需接送", "自行前往"]
  );
  const diet = normalizeOtherValue(
    editFields.diet.value,
    ["葷食", "素食"]
  );
  const updates = {
    camp,
    name: editFields.name.value.trim(),
    gender: editFields.gender.value,
    birthDate,
    age,
    isMinor: age !== "—" && age < 18,
    address: editFields.address.value.trim(),
    phone: editFields.phone.value.trim(),
    email: editFields.email.value.trim(),
    church: editFields.church.value.trim(),
    transport: transport.value,
    transportOther: transport.other,
    diet: diet.value,
    dietOther: diet.other,
    shirtSize: editFields.shirtSize.value,
  };

  saveEditButton.disabled = true;
  saveEditButton.textContent = "儲存中…";
  editMessage.textContent = "";

  try {
    await updateDoc(doc(db, "registrations", documentId), updates);
    const record = registrationRecords.find(item => item.id === documentId);
    if (record) Object.assign(record.data, updates);
    renderAllRegistrations();
    closeEditDialog();
  } catch (error) {
    console.error("更新報名資料失敗：", error);
    editMessage.textContent = "資料儲存失敗，請稍後再試。";
  } finally {
    saveEditButton.disabled = false;
    saveEditButton.textContent = "儲存變更";
  }
}

async function deleteRegistration(documentId) {
  const record = registrationRecords.find(item => item.id === documentId);
  if (!record) return;

  const confirmed = window.confirm(
    `確定要刪除「${record.data.name || "此筆"}」的報名資料嗎？此操作無法復原。`
  );
  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "registrations", documentId));
    registrationRecords = registrationRecords.filter(item => item.id !== documentId);
    renderAllRegistrations();
  } catch (error) {
    console.error("刪除報名資料失敗：", error);
    window.alert("刪除失敗，請稍後再試。");
  }
}

async function loadRegistrations() {
  try {
    const snapshot = await getDocs(collection(db, "registrations"));

    if (snapshot.empty) {
      registrationRecords = [];
      renderAllRegistrations();
      tableMessage.textContent = "目前尚無報名資料。";
      dataStatus.textContent = "0 筆資料";
      return;
    }

    registrationRecords = snapshot.docs.map(documentSnapshot => ({
      id: documentSnapshot.id,
      data: documentSnapshot.data(),
    })).sort((recordA, recordB) =>
      getRegistrationTimestamp(recordB.data) - getRegistrationTimestamp(recordA.data)
    );
    renderAllRegistrations();
  } catch (error) {
    console.error("讀取報名資料失敗：", error);
    statCards.forEach(card => card.classList.remove("is-loading"));
    statValues.forEach(element => {
      element.textContent = "—";
    });
    tableMessage.textContent = "報名資料讀取失敗，請稍後再試。";
    dataStatus.textContent = "讀取失敗";
    dataStatus.classList.add("error");
  }
}

registrationSearch.addEventListener("input", filterRegistrations);
ageFilter.addEventListener("change", filterRegistrations);
consentFilter.addEventListener("change", filterRegistrations);
previousPageButton.addEventListener("click", () => {
  if (currentPage <= 1) return;
  currentPage -= 1;
  filterRegistrations({ resetPage: false });
  document.querySelector(".table-wrap").scrollIntoView({ behavior: "smooth", block: "start" });
});
nextPageButton.addEventListener("click", () => {
  currentPage += 1;
  filterRegistrations({ resetPage: false });
  document.querySelector(".table-wrap").scrollIntoView({ behavior: "smooth", block: "start" });
});
statisticsDashboard.addEventListener("click", event => {
  const card = event.target.closest(".stat-card");
  if (card && !card.classList.contains("is-loading")) handleStatCardClick(card);
});
closeAnalysisPanelButton.addEventListener("click", () => {
  closeAnalysisPanel();
  setActiveStatCard(null);
  dashboardFilter = "all";
  filterRegistrations();
});
registrationNav.addEventListener("click", () => {
  dashboardNav.classList.remove("active");
  dashboardNav.removeAttribute("aria-current");
  registrationNav.classList.add("active");
  registrationNav.setAttribute("aria-current", "page");
  registrationWorkspace.scrollIntoView({ behavior: "smooth", block: "start" });
});
exportExcelButton.addEventListener("click", exportCompleteRegistrations);
registrationRows.addEventListener("click", event => {
  const downloadButton = event.target.closest(".download-button");
  if (downloadButton) {
    downloadConsentFile(downloadButton);
    return;
  }

  const editButton = event.target.closest(".edit-action");
  if (editButton) {
    openEditDialog(editButton.dataset.documentId);
    return;
  }

  const deleteButton = event.target.closest(".delete-action");
  if (deleteButton) deleteRegistration(deleteButton.dataset.documentId);
});
editForm.addEventListener("submit", saveRegistration);
document.querySelector("#closeEditDialog").addEventListener("click", closeEditDialog);
document.querySelector("#cancelEdit").addEventListener("click", closeEditDialog);
editDialog.addEventListener("click", event => {
  if (event.target === editDialog) closeEditDialog();
});
logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  try {
    await signOut(auth);
    window.location.replace("./login.html");
  } catch (error) {
    console.error("登出失敗：", error);
    window.alert("登出失敗，請稍後再試。");
    logoutButton.disabled = false;
  }
});

onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.replace("./login.html");
    return;
  }

  document.body.hidden = false;
  await loadRegistrations();
});
