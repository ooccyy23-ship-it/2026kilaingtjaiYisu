import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
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

function calculateAge(birthDate) {
  if (!birthDate) return "—";

  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return "—";

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday = today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());

  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : "—";
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

function addCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value || "—";
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
    `${data.name ?? ""} ${data.phone ?? ""} ${data.church ?? ""}`
  );
  row.dataset.documentId = id;
  row.dataset.ageGroup = ageGroup;
  row.dataset.consentStatus = hasConsent ? "uploaded" : "missing";
  addCell(row, data.name);
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
    const matchesSearch = !keyword || row.dataset.search.includes(keyword);
    const matchesAge = selectedAge === "all" ||
      row.dataset.ageGroup === selectedAge;
    const matchesConsent = selectedConsent === "all" ||
      row.dataset.consentStatus === selectedConsent;
    const matches = matchesSearch && matchesAge && matchesConsent;
    row.hidden = !matches;
    if (matches) visibleCount += 1;
  });

  tableMessage.textContent = visibleCount === 0 && totalRegistrations > 0
    ? "找不到符合搜尋條件的報名資料。"
    : "";
  const hasActiveFilter = keyword ||
    selectedAge !== "all" ||
    selectedConsent !== "all";
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

  const exportData = registrationRecords.map(({ id, data }) => {
    const {
      nationalId,
      idNumber,
      identityNumber,
      ...remainingData
    } = data;
    const completeData = Object.fromEntries(
      Object.entries(remainingData).map(([key, value]) => [
        key,
        serializeExcelValue(value),
      ])
    );

    return {
      文件ID: id,
      身分證字號: nationalId ?? idNumber ?? identityNumber ?? "",
      ...completeData,
    };
  });

  const worksheet = utils.json_to_sheet(exportData);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, "報名資料");

  const date = new Intl.DateTimeFormat("sv-SE").format(new Date());
  writeFileXLSX(workbook, `青年領袖營報名資料_${date}.xlsx`);
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
  const updates = {
    camp: editFields.camp.value,
    name: editFields.name.value.trim(),
    gender: editFields.gender.value,
    birthDate: editFields.birthDate.value,
    address: editFields.address.value.trim(),
    phone: editFields.phone.value.trim(),
    email: editFields.email.value.trim(),
    church: editFields.church.value.trim(),
    transport: editFields.transport.value.trim(),
    diet: editFields.diet.value.trim(),
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
    tableMessage.textContent = "報名資料讀取失敗，請稍後再試。";
    dataStatus.textContent = "讀取失敗";
    dataStatus.classList.add("error");
  }
}

registrationSearch.addEventListener("input", filterRegistrations);
ageFilter.addEventListener("change", filterRegistrations);
consentFilter.addEventListener("change", filterRegistrations);
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

onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.replace("./login.html");
    return;
  }

  document.body.hidden = false;
  await loadRegistrations();
});
