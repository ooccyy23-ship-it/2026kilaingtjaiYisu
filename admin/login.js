import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { auth } from "../firebase.js";

const loginForm = document.querySelector("#loginForm");
const adminIdInput = document.querySelector("#adminId");
const passwordInput = document.querySelector("#password");
const loginButton = document.querySelector("#loginButton");
const errorMessage = document.querySelector("#errorMessage");
const adminEmailDomain = "admin.kilaingtjaiyisu2026.com";

const authMessages = {
  "auth/invalid-credential": "管理員 ID 或密碼不正確，請重新確認。",
  "auth/invalid-email": "管理員 ID 格式不正確。",
  "auth/missing-password": "請輸入密碼。",
  "auth/too-many-requests": "登入嘗試次數過多，請稍後再試。",
  "auth/network-request-failed": "網路連線失敗，請確認連線後再試。",
};

function showError(message) {
  errorMessage.textContent = message;
}

function setLoading(isLoading) {
  loginButton.disabled = isLoading;
  loginButton.querySelector("span").textContent = isLoading ? "登入中…" : "登入後台";
}

loginForm.addEventListener("input", event => {
  event.target.classList.remove("invalid");
  showError("");
});

loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!loginForm.checkValidity()) {
    [adminIdInput, passwordInput].forEach(input => {
      input.classList.toggle("invalid", !input.validity.valid);
    });
    showError("請輸入有效的管理員 ID 與密碼。");
    loginForm.reportValidity();
    return;
  }

  setLoading(true);
  showError("");

  try {
    const adminEmail =
      `${adminIdInput.value.trim().toLowerCase()}@${adminEmailDomain}`;
    await signInWithEmailAndPassword(
      auth,
      adminEmail,
      passwordInput.value
    );
    window.location.replace("./index.html");
  } catch (error) {
    showError(authMessages[error.code] || "登入失敗，請稍後再試。");
    passwordInput.value = "";
    passwordInput.focus();
  } finally {
    setLoading(false);
  }
});
