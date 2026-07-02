import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import {
  deleteObject,
  ref,
  uploadBytes,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-storage.js";
import { db, storage } from "./firebase.js";

const form = document.querySelector("#registrationForm");
const modal = document.querySelector("#successModal");
const closeModalButton = document.querySelector("#closeModal");
const submitButton = form.querySelector(".submit-button");
const saveStatus = document.querySelector("#saveStatus");
const birthDate = document.querySelector("#birthDate");
const guardianPanel = document.querySelector("#guardianPanel");
const consentFile = document.querySelector("#consentFile");
const ageHint = document.querySelector("#ageHint");
const email = document.querySelector("#email");
const emailHint = document.querySelector("#emailHint");
const nationalId = document.querySelector("#nationalId");
const idHint = document.querySelector("#idHint");
const transport = document.querySelector("#transport");
const transportOther = document.querySelector("#transportOther");
const transportOtherField = document.querySelector("#transportOtherField");
const diet = document.querySelector("#diet");
const dietOther = document.querySelector("#dietOther");
const dietOtherField = document.querySelector("#dietOtherField");
const scheduleDialog = document.querySelector("#scheduleDialog");
const scheduleDialogTitle = document.querySelector("#scheduleDialogTitle");
const scheduleDialogDay = document.querySelector("#scheduleDialogDay");
const scheduleDialogContent = document.querySelector("#scheduleDialogContent");
const storageKey = "youth-leadership-camp-draft";
let scheduleTrigger = null;

document.addEventListener("scroll", () => {
  document.querySelector(".site-header").classList.toggle("scrolled", window.scrollY > 10);
}, { passive: true });

function getAgeOnDate(birth, target) {
  let age = target.getFullYear() - birth.getFullYear();
  const beforeBirthday = target.getMonth() < birth.getMonth() ||
    (target.getMonth() === birth.getMonth() && target.getDate() < birth.getDate());
  return beforeBirthday ? age - 1 : age;
}

function updateGuardianRequirement() {
  if (!birthDate.value) {
    guardianPanel.hidden = true;
    consentFile.required = false;
    clearConsentFile();
    ageHint.textContent = "填寫後會判斷是否需要家長同意書";
    ageHint.classList.remove("minor");
    return;
  }

  const selectedCamp = form.querySelector('input[name="camp"]:checked')?.value;
  if (!selectedCamp) {
    guardianPanel.hidden = true;
    consentFile.required = false;
    clearConsentFile();
    ageHint.textContent = "請先選擇營隊，系統會依活動開始日判斷";
    ageHint.classList.remove("minor");
    return;
  }
  const eventDate = selectedCamp === "暑期兒童營"
    ? form.dataset.childDate
    : form.dataset.youthDate;
  const targetDate = new Date(`${eventDate}T00:00:00`);
  const age = getAgeOnDate(new Date(`${birthDate.value}T00:00:00`), targetDate);
  const isMinor = age < 18;

  guardianPanel.hidden = !isMinor;
  consentFile.required = isMinor;
  if (!isMinor) clearConsentFile();
  ageHint.textContent = isMinor
    ? "未滿 18 歲，需要家長／監護人同意書"
    : "已滿 18 歲，不需要家長同意書";
  ageHint.classList.toggle("minor", isMinor);
}

function clearConsentFile() {
  consentFile.value = "";
  consentFile.classList.remove("invalid");
  document.querySelector("#fileStatus").textContent =
    "支援 PDF、JPG、PNG，檔案須小於 10 MB";
}

function toggleOtherField(select, field, input) {
  const shouldShow = select.value === "其他";
  field.hidden = !shouldShow;
  input.required = shouldShow;
  if (!shouldShow) {
    input.value = "";
    input.classList.remove("invalid");
  }
}

function validateEmail(showEmpty = false) {
  const value = email.value.trim();
  const valid = email.validity.typeMismatch === false &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  email.setCustomValidity(value && !valid ? "請輸入有效的電子信箱，例如 name@example.com" : "");
  emailHint.className = "field-hint";
  if (!value) {
    emailHint.textContent = showEmpty ? "電子信箱為必填欄位" : "請輸入有效的電子信箱";
    if (showEmpty) emailHint.classList.add("error");
  } else if (valid) {
    emailHint.textContent = "格式正確 ✓";
    emailHint.classList.add("valid");
  } else {
    emailHint.textContent = "格式不正確，請確認 @ 與網域名稱";
    emailHint.classList.add("error");
  }
  email.classList.toggle("invalid", Boolean(value) && !valid);
  return valid;
}

function validateNationalId(showEmpty = false) {
  const value = nationalId.value.trim().toUpperCase();
  nationalId.value = value;
  const letters = "ABCDEFGHJKLMNPQRSTUVXYWZIO";
  let valid = /^[A-Z][12]\d{8}$/.test(value);
  if (valid) {
    const code = letters.indexOf(value[0]) + 10;
    const digits = `${Math.floor(code / 10)}${code % 10}${value.slice(1)}`.split("").map(Number);
    const weights = [1, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1];
    valid = digits.reduce((sum, digit, index) => sum + digit * weights[index], 0) % 10 === 0;
  }
  nationalId.setCustomValidity(value && !valid ? "請輸入有效的身分證字號，例如 A123456789" : "");
  idHint.className = "field-hint";
  if (!value) {
    idHint.textContent = showEmpty ? "身分證字號為必填欄位" : "僅用於身分與保險資料核對";
    if (showEmpty) idHint.classList.add("error");
  } else if (valid) {
    idHint.textContent = "格式正確 ✓";
    idHint.classList.add("valid");
  } else {
    idHint.textContent = "請輸入有效的台灣身分證字號";
    idHint.classList.add("error");
  }
  nationalId.classList.toggle("invalid", Boolean(value) && !valid);
  return valid;
}

function saveDraft() {
  const data = Object.fromEntries(new FormData(form).entries());
  delete data.consent;
  delete data.consentFile;
  localStorage.setItem(storageKey, JSON.stringify(data));
  saveStatus.textContent = "已自動暫存";
  clearTimeout(saveDraft.timer);
  saveDraft.timer = setTimeout(() => saveStatus.textContent = "尚未送出", 1600);
}

function restoreDraft() {
  const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
  Object.entries(saved).forEach(([name, value]) => {
    const control = form.elements[name];
    if (!control) return;
    if (control instanceof RadioNodeList) control.value = value;
    else if (typeof control.value === "string") control.value = value;
  });
  toggleOtherField(transport, transportOtherField, transportOther);
  toggleOtherField(diet, dietOtherField, dietOther);
  if (email.value) validateEmail();
  if (nationalId.value) validateNationalId();
  updateGuardianRequirement();
}

function isPhoneValid(value) {
  return /^(09\d{2}-?\d{3}-?\d{3}|0\d{1,2}-?\d{6,8})$/.test(value.replace(/\s/g, ""));
}

function validateForm() {
  let valid = true;
  ["camp", "gender"].forEach(name => {
    const selected = form.querySelector(`input[name="${name}"]:checked`);
    const group = form.querySelector(`input[name="${name}"]`).closest(".option-chips");
    group.classList.toggle("invalid-group", !selected);
    group.setAttribute("aria-invalid", String(!selected));
    if (!selected) valid = false;
  });

  form.querySelectorAll("[required]").forEach(field => {
    if (field.closest("[hidden]")) return;
    if (field.type === "radio") return;
    const empty = field.type === "checkbox" ? !field.checked :
      field.type === "file" ? field.files.length === 0 : !field.value.trim();
    const badPhone = field.type === "tel" && field.value && !isPhoneValid(field.value);
    const invalid = empty || badPhone;
    field.classList.toggle("invalid", invalid);
    field.setAttribute("aria-invalid", String(invalid));
    if (field.type === "tel") {
      field.setCustomValidity(badPhone ? "請輸入有效的手機或市話號碼" : "");
    }
    if (invalid) valid = false;
  });
  if (!validateEmail(true)) valid = false;
  if (!validateNationalId(true)) valid = false;
  if (!validateConsentFile()) valid = false;
  form.querySelector('[data-error-for="form"]').textContent =
    valid ? "" : "還有欄位需要確認，已為你標示出來。";
  if (!valid) form.reportValidity();
  return valid;
}

function getRegistrationAge(camp, birthDateValue) {
  const eventDate = camp === "暑期兒童營"
    ? form.dataset.childDate
    : form.dataset.youthDate;
  return getAgeOnDate(
    new Date(`${birthDateValue}T00:00:00`),
    new Date(`${eventDate}T00:00:00`)
  );
}

function sanitizeFileName(fileName) {
  return fileName
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-100);
}

function getConsentContentType(file) {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  return {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
  }[extension] || "";
}

function validateConsentFile() {
  const file = consentFile.files[0];
  if (!file) {
    consentFile.setCustomValidity("");
    return true;
  }

  const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
  let message = "";
  if (!allowedTypes.includes(getConsentContentType(file))) {
    message = "檔案格式不支援，請上傳 PDF、JPG 或 PNG；iPhone HEIC 照片請先轉成 JPG。";
  } else if (file.size >= 10 * 1024 * 1024) {
    message = "檔案超過 10 MB，請壓縮後重新上傳。";
  }

  consentFile.setCustomValidity(message);
  consentFile.classList.toggle("invalid", Boolean(message));
  document.querySelector("#fileStatus").textContent = message || `已選擇：${file.name}`;
  return !message;
}

function getSubmitErrorMessage(error) {
  const code = error?.code || "";
  if (code.includes("unauthorized") || code.includes("permission-denied")) {
    return "資料送出失敗：系統權限設定尚未開放，請聯絡主辦單位。";
  }
  if (code.includes("quota-exceeded")) {
    return "資料送出失敗：系統儲存空間已達上限，請聯絡主辦單位。";
  }
  if (code.includes("retry-limit-exceeded") || code.includes("unavailable")) {
    return "資料送出失敗：連線暫時不穩定，請稍後再試。";
  }
  if (code.includes("network-request-failed")) {
    return "資料送出失敗：請確認手機網路連線後再試一次。";
  }
  return "資料送出失敗，請稍後再試；若持續發生，請聯絡主辦單位。";
}

function setSubmitting(isSubmitting) {
  submitButton.disabled = isSubmitting;
  submitButton.firstChild.textContent = isSubmitting ? "資料送出中 " : "送出報名資料 ";
}

function getRegistrationData() {
  const data = Object.fromEntries(new FormData(form).entries());
  const age = getRegistrationAge(data.camp, data.birthDate);

  delete data.consent;
  delete data.consentFile;

  return {
    ...data,
    nationalId: data.nationalId.toUpperCase(),
    age,
    isMinor: age < 18,
    hasGuardianConsent: false,
    guardianConsentPath: "",
    guardianConsentUrl: "",
    termsAccepted: true,
    createdAt: serverTimestamp(),
  };
}

birthDate.addEventListener("change", updateGuardianRequirement);
form.querySelectorAll('input[name="camp"]').forEach(option => {
  option.addEventListener("change", updateGuardianRequirement);
});
transport.addEventListener("change", () => toggleOtherField(transport, transportOtherField, transportOther));
diet.addEventListener("change", () => toggleOtherField(diet, dietOtherField, dietOther));
email.addEventListener("input", () => validateEmail());
email.addEventListener("blur", () => validateEmail(true));
nationalId.addEventListener("input", () => {
  nationalId.value = nationalId.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  if (nationalId.value.length === 10) validateNationalId();
});
nationalId.addEventListener("blur", () => validateNationalId(true));
form.addEventListener("input", event => {
  event.target.classList.remove("invalid");
  event.target.removeAttribute("aria-invalid");
  if (event.target.type === "radio") {
    event.target.closest(".option-chips").classList.remove("invalid-group");
  }
  form.querySelector('[data-error-for="form"]').textContent = "";
  saveDraft();
});

consentFile.addEventListener("change", () => {
  if (!consentFile.files[0]) {
    consentFile.setCustomValidity("");
    consentFile.classList.remove("invalid");
    document.querySelector("#fileStatus").textContent =
      "支援 PDF、JPG、PNG，檔案須小於 10 MB";
    return;
  }
  validateConsentFile();
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!validateForm()) {
    const firstError = form.querySelector(".invalid, .invalid-group");
    firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (firstError?.matches("input, select, textarea")) firstError.focus();
    return;
  }

  const participantName = form.elements.name.value.trim();
  const registrationRef = doc(collection(db, "registrations"));
  const file = consentFile.files[0];
  let uploadedFileRef = null;
  setSubmitting(true);
  form.querySelector('[data-error-for="form"]').textContent = "";

  try {
    const registrationData = getRegistrationData();

    if (registrationData.isMinor && file) {
      const fileName = sanitizeFileName(file.name);
      const storagePath =
        `guardian-consents/${registrationRef.id}/${Date.now()}-${fileName}`;
      uploadedFileRef = ref(storage, storagePath);
      await uploadBytes(uploadedFileRef, file, {
        contentType: getConsentContentType(file),
      });
      registrationData.hasGuardianConsent = true;
      registrationData.guardianConsentPath = storagePath;
    }

    await setDoc(registrationRef, registrationData);
    localStorage.removeItem(storageKey);
    form.reset();
    toggleOtherField(transport, transportOtherField, transportOther);
    toggleOtherField(diet, dietOtherField, dietOther);
    updateGuardianRequirement();

    document.querySelector("#successMessage").textContent =
      `嗨，${participantName}！報名資料已成功送出，我們會依資料與你聯繫。`;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    closeModalButton.focus();
  } catch (error) {
    console.error("報名資料送出失敗：", error);
    if (uploadedFileRef) {
      try {
        await deleteObject(uploadedFileRef);
      } catch (cleanupError) {
        console.error("清除未完成上傳檔案失敗：", cleanupError);
      }
    }
    form.querySelector('[data-error-for="form"]').textContent =
      getSubmitErrorMessage(error);
  } finally {
    setSubmitting(false);
  }
});

function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = "";
}
closeModalButton.addEventListener("click", closeModal);
modal.addEventListener("click", event => { if (event.target === modal) closeModal(); });
document.addEventListener("keydown", event => { if (event.key === "Escape" && !modal.hidden) closeModal(); });

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

document.querySelectorAll(".schedule-more").forEach(button => {
  button.addEventListener("click", () => {
    const isChildSchedule = Boolean(button.dataset.childScheduleDay);
    const day = isChildSchedule
      ? button.dataset.childScheduleDay
      : button.dataset.scheduleDay;
    const template = document.querySelector(
      isChildSchedule
        ? `#childFullScheduleDay${day}`
        : `#fullScheduleDay${day}`
    );
    if (!template) return;

    scheduleTrigger = button;
    const titles = isChildSchedule ? childScheduleTitles : scheduleTitles;
    scheduleDialogDay.textContent = titles[day].label;
    scheduleDialogTitle.textContent = titles[day].title;
    scheduleDialogContent.replaceChildren(template.content.cloneNode(true));
    scheduleDialog.showModal();
  });
});

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
    if (!config) return;

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
  scheduleDialog.close();
  scheduleTrigger?.focus();
}

document.querySelector("#closeScheduleDialog").addEventListener("click", closeScheduleDialog);
scheduleDialog.addEventListener("click", event => {
  if (event.target === scheduleDialog) closeScheduleDialog();
});

document.querySelectorAll(".faq-list details").forEach(item => {
  item.addEventListener("toggle", () => {
    if (item.open) document.querySelectorAll(".faq-list details").forEach(other => {
      if (other !== item) other.open = false;
    });
  });
});

restoreDraft();
