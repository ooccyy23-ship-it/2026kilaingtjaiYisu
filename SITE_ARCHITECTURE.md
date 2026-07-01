# 2026 Kilaing tjai Yisu 活動網站架構

## 1. 系統架構圖

```mermaid
flowchart TD
    Visitor["一般訪客"] --> Frontend["前台網站<br/>index.html + styles.css + app.js"]
    Admin["管理員"] --> Login["後台登入<br/>admin/login.html + login.js"]
    Login --> Auth["Firebase Authentication"]
    Auth --> Console["管理平台<br/>admin/index.html + admin.js"]

    Frontend --> LocalStorage["瀏覽器 LocalStorage<br/>未送出表單暫存"]
    Frontend --> Firestore["Cloud Firestore<br/>registrations 報名資料"]
    Frontend --> Storage["Firebase Storage<br/>guardian-consents 家長同意書"]

    Console --> Auth
    Console --> Firestore
    Console --> Storage
    Console --> Excel["SheetJS<br/>匯出 Excel"]

    Rules["firestore.rules<br/>storage.rules"] --> Firestore
    Rules --> Storage
```

## 2. 前台頁面結構

```mermaid
flowchart TD
    Header["頂部導覽<br/>KTY / Kilaing tjai Yisu / 我要報名"]
    Hero["Hero 主視覺<br/>活動網站主標、第五屆、作和平的使者"]
    Series["2026 系列活動<br/>青年營卡片 + 兒童營卡片"]
    Info["活動資訊<br/>#youth-camp / #child-camp"]
    ChildSchedule["兒童營三日行程<br/>#child-schedule，目前 hidden"]
    Journey["培訓內容<br/>#about"]
    YouthSchedule["青年營三日行程<br/>#schedule"]
    Registration["系列活動報名表<br/>#register"]
    FAQ["常見問題"]
    Footer["Footer"]

    Header --> Hero --> Series --> Info --> ChildSchedule --> Journey --> YouthSchedule --> Registration --> FAQ --> Footer
```

### 主要互動

- 活動卡片使用錨點連至 `#youth-camp` 與 `#child-camp`。
- 網站使用 CSS `scroll-behavior: smooth` 平滑捲動。
- 青年營日程卡顯示重點，完整內容使用共用 `<dialog>` 彈窗。
- 兒童營日程與完整內容已建置，但整區目前使用 `hidden` 隱藏。
- 未滿 18 歲者必須下載、簽署並上傳家長同意書。
- 表單填寫內容會暫存於使用者瀏覽器，成功送出後清除。

## 3. 報名資料流程

```mermaid
sequenceDiagram
    participant U as 報名者
    participant W as 前台表單
    participant L as LocalStorage
    participant S as Firebase Storage
    participant F as Firestore

    U->>W: 填寫報名資料
    W->>L: 自動暫存文字欄位
    U->>W: 送出表單
    W->>W: 驗證必填、Email、電話、身分證與年齡
    alt 未滿 18 歲
        W->>S: 上傳家長同意書
        S-->>W: 回傳檔案路徑
    end
    W->>F: 建立 registrations 文件
    F-->>W: 寫入成功
    W->>L: 清除暫存
    W-->>U: 顯示報名成功
```

## 4. 後台管理流程

```mermaid
flowchart LR
    LoginForm["管理員 ID + 密碼"] --> Email["組成管理員 Email<br/>ID@admin.kilaingtjaiyisu2026.com"]
    Email --> FirebaseAuth["Firebase Authentication"]
    FirebaseAuth --> Claim{"Custom Claim<br/>admin == true?"}
    Claim -- 否 --> Denied["安全規則拒絕資料存取"]
    Claim -- 是 --> Dashboard["管理平台"]
    Dashboard --> Read["讀取報名資料"]
    Dashboard --> Edit["編輯資料"]
    Dashboard --> Delete["刪除資料"]
    Dashboard --> Download["下載家長同意書"]
    Dashboard --> Export["匯出 Excel"]
    Dashboard --> Logout["Firebase 登出"]
```

## 5. Firebase 資料結構

### Firestore

```text
registrations/{registrationId}
├─ camp
├─ name
├─ gender
├─ nationalId
├─ birthDate
├─ age
├─ isMinor
├─ address
├─ phone
├─ email
├─ church
├─ transport / transportOther
├─ diet / dietOther
├─ shirtSize
├─ hasGuardianConsent
├─ guardianConsentPath
├─ guardianConsentUrl
├─ termsAccepted
└─ createdAt
```

### Storage

```text
guardian-consents/
└─ {registrationId}/
   └─ {timestamp}-{sanitizedFileName}
```

### 權限

- 公開使用者可以建立符合欄位規則的報名資料。
- 公開使用者可以上傳符合格式與大小限制的同意書。
- 只有 Firebase Token 含有 `admin: true` 的管理員可以讀取、修改或刪除資料。

## 6. 專案檔案

```text
/
├─ index.html                 前台頁面與所有活動區塊
├─ styles.css                前台與響應式樣式
├─ app.js                    前台表單、驗證、日程彈窗與 Firebase 寫入
├─ firebase.js               Firebase 初始化
├─ firestore.rules           Firestore 安全規則
├─ storage.rules             Storage 安全規則
├─ firebase.json             Firebase 規則設定
├─ images/                   Hero、海報與培訓圖片
├─ downloads/
│  └─ guardian-consent-form.png
├─ admin/
│  ├─ login.html             後台登入頁
│  ├─ login.css
│  ├─ login.js               Firebase 帳密登入
│  ├─ index.html             後台管理頁
│  ├─ admin.css
│  └─ admin.js               查詢、編輯、刪除、下載、匯出與登出
└─ components/
   ├─ CampSchedule.jsx
   └─ TrainingJourney.jsx
```

> `components/*.jsx` 目前沒有被 `index.html` 或 JavaScript 載入；正式網站主要由原生 HTML、CSS 與 JavaScript 組成。

