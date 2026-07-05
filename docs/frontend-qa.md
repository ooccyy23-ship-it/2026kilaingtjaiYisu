# Frontend QA｜手機版水平溢位除錯紀錄

## Q1. 這次遇到什麼問題？

手機瀏覽網站時，頁面可以往右滑，右側出現一大片空白。

這類問題稱為：

Horizontal Overflow（水平溢位）

---

## Q2. 一開始怎麼判斷？

在 Chrome DevTools 手機模式 Console 輸入：

document.documentElement.scrollWidth
document.documentElement.clientWidth

如果 scrollWidth 大於 clientWidth，代表頁面有元素超出手機螢幕。

本次曾出現：

scrollWidth: 686
clientWidth: 414

代表頁面實際寬度被撐到 686px。

---

## Q3. 常見原因有哪些？

1. width: 100vw
2. position:absolute 並使用 left:-xxx 或 right:-xxx
3. ::before / ::after 裝飾元素超出畫面
4. filter: blur() 的光暈效果
5. Grid / Flex 子元素沒有 min-width:0
6. 固定欄寬造成手機版超出
7. 長文字、網址或按鈕不換行
8. Safari / LINE WebView 對 overflow 計算不同

---

## Q4. 這次真正可能的原因是什麼？

手機版的裝飾性元素可能被 Safari / LINE WebView 算進頁面寬度。

特別是：

.story-section::before
.story-section::after
.schedule-glow
.schedule-glow-blue
.schedule-glow-gold

這些元素有 position:absolute、left/right 負值、filter:blur()，在桌機版好看，但手機版容易造成右側空白。

---

## Q5. 為什麼 Console 有時候找不到？

因為 querySelectorAll("*") 只能抓真實 DOM。

但是：

::before
::after

不是 DOM 元素，所以一般 JavaScript 不會列出來。

因此水平溢位不一定能靠 Console 直接抓到。

---

## Q6. 這次如何修正？

手機版直接關閉裝飾性光暈與 pseudo-elements：

@media (max-width:768px) {
  .story-section::before,
  .story-section::after {
    display: none !important;
  }

  .schedule-glow,
  .schedule-glow-blue,
  .schedule-glow-gold {
    display: none !important;
  }

  html,
  body,
  main {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }
}

---

## Q7. 為什麼手機版可以隱藏裝飾元素？

因為這些光暈只是視覺裝飾，不影響內容理解。

手機版畫面空間較小，保留裝飾元素反而可能造成：

- 水平溢位
- 效能下降
- Safari 顯示異常
- 使用者誤滑到空白區域

所以手機版隱藏是合理的 RWD 決策。

---

## Q8. 以後遇到手機右側空白，要先檢查什麼？

優先檢查：

1. document.documentElement.scrollWidth
2. document.documentElement.clientWidth
3. width:100vw
4. position:absolute
5. left:-xxx / right:-xxx
6. transform:translateX()
7. filter:blur()
8. ::before / ::after
9. Grid / Flex 的 min-width
10. 固定 width / min-width

---

## Q9. Console 檢查指令

(() => {
  let max = 0;
  let culprit = null;

  document.querySelectorAll("*").forEach(el => {
    const r = el.getBoundingClientRect();

    if (r.right > max) {
      max = r.right;
      culprit = el;
    }
  });

  console.log("viewport =", window.innerWidth);
  console.log("max right =", max);
  console.log("culprit =", culprit);
})();

---

## Q10. 修正後如何驗證？

在手機版尺寸測試：

- 320px
- 375px
- 390px
- 414px

Console 輸入：

document.documentElement.scrollWidth === document.documentElement.clientWidth

如果回傳 true，代表沒有水平溢位。

---

## Q11. 實體手機也要測嗎？

要。

因為 Chrome Device Mode 不等於真實 iPhone Safari。

正式交付前至少測：

- Chrome Device Mode
- iPhone Safari
- LINE 內建瀏覽器

---

## Q12. 這次學到什麼？

手機版水平溢位不一定是內容卡片造成的，也可能是裝飾元素造成的。

特別是：

- glow
- blur
- absolute decoration
- pseudo-elements

這類元素在桌機好看，但手機版要特別小心。

以後設計 RWD 時，手機版應優先確保內容穩定、不可左右滑，再決定是否保留裝飾效果。
