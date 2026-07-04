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
const registrationSearch = document.querySelector("#registrationSearch");
const ageFilter = document.querySelector("#ageFilter");
const consentFilter = document.querySelector("#consentFilter");
const exportExcelButton = document.querySelector("#exportExcel");
const editDialog = document.querySelector("#editDialog");
const editForm = document.querySelector("#editForm");
const editMessage = document.querySelector("#editMessage");
const saveEditButton = document.querySelector("#saveEdit");
const logoutButton = document.querySelector("#logoutButton");
const statisticsDashboard = document.querySelector(".statistics-dashboard");
const statCards = [...document.querySelectorAll(".stat-card")];
const statValues = [...document.querySelectorAll("[data-stat]")];
const shirtChart = document.querySelector("#shirtChart");
const shirtChartTitle = document.querySelector("#shirtChartTitle");
const shirtBars = document.querySelector("#shirtBars");
const closeShirtChartButton = document.querySelector("#closeShirtChart");
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

const YOUTH_CAMP = "青年領袖營";
const CHILD_CAMP = "暑期兒童營";
const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];

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
  return data.camp ?? "";
}

function isSpecialDiet(data) {
  const diet = String(data.diet ?? "").trim();
  return Boolean(diet) && diet !== "葷食";
}

function createShirtDistribution(records) {
  const distribution = Object.fromEntries(SHIRT_SIZES.map(size => [size, 0]));
  records.forEach(({ data }) => {
    const size = String(data.shirtSize ?? "").toUpperCase().trim();
    if (Object.hasOwn(distribution, size)) distribution[size] += 1;
  });
  return distribution;
}

function getTopShirt(distribution) {
  const [size, count] = Object.entries(distribution)
    .reduce((top, item) => item[1] > top[1] ? item : top, ["—", 0]);
  return count ? `${size}（${count}人）` : "尚無資料";
}

function calculateDashboardStatistics() {
  const youthRecords = registrationRecords.filter(({ data }) => getRecordCamp(data) === YOUTH_CAMP);
  const childRecords = registrationRecords.filter(({ data }) => getRecordCamp(data) === CHILD_CAMP);
  const youthShirtDistribution = createShirtDistribution(youthRecords);
  const childShirtDistribution = createShirtDistribution(childRecords);

  return {
    totalCount: registrationRecords.length,
    youthCount: youthRecords.length,
    childCount: childRecords.length,
    youthTransport: youthRecords.filter(({ data }) => data.transport === "需接送").length,
    childTransport: childRecords.filter(({ data }) => data.transport === "需接送").length,
    youthDiet: youthRecords.filter(({ data }) => isSpecialDiet(data)).length,
    childDiet: childRecords.filter(({ data }) => isSpecialDiet(data)).length,
    youthShirtDistribution,
    childShirtDistribution,
    youthTopShirt: getTopShirt(youthShirtDistribution),
    childTopShirt: getTopShirt(childShirtDistribution),
  };
}

function animateCount(element, target) {
  const duration = 800;
  const startTime = performance.now();
  const startValue = Number(element.textContent) || 0;

  function update(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(startValue + (target - startValue) * easedProgress);
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

function renderDashboardStatistics() {
  dashboardStatistics = calculateDashboardStatistics();
  statValues.forEach(element => {
    const key = element.dataset.stat;
    const value = dashboardStatistics[key];
    if (typeof value === "number") animateCount(element, value);
    else element.textContent = value;
  });
  statCards.forEach(card => card.classList.remove("is-loading"));
  if (!shirtChart.hidden) renderShirtChart(shirtChart.dataset.camp);
}

function renderShirtChart(camp) {
  const isYouth = camp === YOUTH_CAMP;
  const distribution = isYouth
    ? dashboardStatistics.youthShirtDistribution
    : dashboardStatistics.childShirtDistribution;
  const maximum = Math.max(...Object.values(distribution), 1);
  shirtChart.dataset.camp = camp;
  shirtChartTitle.textContent = `${isYouth ? "青年營" : "兒童營"}衣服尺寸`;
  shirtBars.replaceChildren();

  SHIRT_SIZES.forEach(size => {
    const count = distribution[size];
    const row = document.createElement("div");
    row.className = "shirt-bar-row";
    row.innerHTML = `
      <span class="shirt-size">${size}</span>
      <span class="shirt-bar-track"><span class="shirt-bar-fill" style="--bar-width: ${(count / maximum) * 100}%"></span></span>
      <strong>${count} 人</strong>
    `;
    shirtBars.append(row);
  });
  shirtChart.hidden = false;
  requestAnimationFrame(() => shirtChart.classList.add("is-open"));
}

function closeShirtChart() {
  shirtChart.classList.remove("is-open");
  shirtChart.hidden = true;
}

function matchesDashboardFilter(data) {
  const camp = getRecordCamp(data);
  switch (dashboardFilter) {
    case "youth":
    case "youthShirt":
      return camp === YOUTH_CAMP;
    case "child":
    case "childShirt":
      return camp === CHILD_CAMP;
    case "youthTransport":
      return camp === YOUTH_CAMP && data.transport === "需接送";
    case "childTransport":
      return camp === CHILD_CAMP && data.transport === "需接送";
    case "youthDiet":
      return camp === YOUTH_CAMP && isSpecialDiet(data);
    case "childDiet":
      return camp === CHILD_CAMP && isSpecialDiet(data);
    default:
      return true;
  }
}

function applyDashboardFilter(card) {
  dashboardFilter = card.dataset.dashboardFilter;
  statCards.forEach(item => {
    const active = item === card;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-pressed", String(active));
  });

  const showsShirtChart = Boolean(card.dataset.shirtCamp);
  if (showsShirtChart) renderShirtChart(card.dataset.shirtCamp);
  else closeShirtChart();

  filterRegistrations();
  (showsShirtChart ? shirtChart : document.querySelector(".workspace"))
    .scrollIntoView({ behavior: "smooth", block: "start" });
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

function filterRegistrations() {
  const keyword = normalizeSearchValue(registrationSearch.value);
  const selectedAge = ageFilter.value;
  const selectedConsent = consentFilter.value;
  const rows = registrationRows.querySelectorAll("tr");
  let visibleCount = 0;

  if (totalRegistrations === 0) {
    tableMessage.textContent = "目前尚無報名資料。";
    dataStatus.textContent = "0 筆資料";
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
    row.hidden = !matches;
    if (matches) visibleCount += 1;
  });

  tableMessage.textContent = visibleCount === 0 && totalRegistrations > 0
    ? "找不到符合搜尋條件的報名資料。"
    : "";
  const hasActiveFilter = keyword ||
    selectedAge !== "all" ||
    selectedConsent !== "all" ||
    dashboardFilter !== "all";
  dataStatus.textContent = hasActiveFilter
    ? `${visibleCount} / ${totalRegistrations} 筆`
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
    }));
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
statisticsDashboard.addEventListener("click", event => {
  const card = event.target.closest(".stat-card");
  if (card && !card.classList.contains("is-loading")) applyDashboardFilter(card);
});
closeShirtChartButton.addEventListener("click", closeShirtChart);
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
