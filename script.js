// ===== グローバル状態 =====
let lastCopyText = "";      // 直近のコピー用テキスト
let currentDiffDays = null; // 直近の差分日数
let currentTheme = "cool";  // "cool" | "warm"

// 曜日配列（英略＋ピリオド）
const WEEKDAYS_EN = ["Sun.", "Mon.", "Tue.", "Wed.", "Thu.", "Fri.", "Sat."];

// ===== DOM 取得（scriptタグがbody末尾なのでここで取得してOK） =====
const eventTitleInput = document.getElementById("eventTitle");
const eventDateInput = document.getElementById("eventDate");
const calculateButton = document.getElementById("calculateButton");
const copyButton = document.getElementById("copyButton");
const shareButton = document.getElementById("shareButton");
const errorMessage = document.getElementById("errorMessage");

const resultCard = document.getElementById("resultCard");
const mainCountText = document.getElementById("mainCountText");
const eventTitleDisplay = document.getElementById("eventTitleDisplay");
const eventDateDisplay = document.getElementById("eventDateDisplay");
const todayDateDisplay = document.getElementById("todayDateDisplay");

const themeButtons = document.querySelectorAll(".theme-btn");

// ===== 初期化：URLパラメータから値を復元＋今日の日付をヘッダーに表示 =====
initFromUrlParams();
applyTheme(currentTheme);
setTodayHeader();

// 日付が既に入っていれば自動計算（ブックマーク／再訪用）
if (eventDateInput.value) {
  handleCalculate();
}

// ===== イベント登録 =====
calculateButton.addEventListener("click", handleCalculate);
copyButton.addEventListener("click", handleCopy);
shareButton.addEventListener("click", handleShareImage);

themeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const theme = btn.getAttribute("data-theme");
    applyTheme(theme);
    updateUrlParams(
      eventTitleInput.value.trim(),
      eventDateInput.value,
      currentTheme
    );
  });
});

// ===== 関数群（前半） =====

// URLパラメータから title/date/theme を復元
function initFromUrlParams() {
  try {
    const params = new URLSearchParams(window.location.search);
    const title = params.get("title");
    const date = params.get("date");
    const theme = params.get("theme");

    if (title) {
      eventTitleInput.value = title;
    }
    if (date) {
      eventDateInput.value = date;
    }

    if (theme === "warm" || theme === "cool") {
      currentTheme = theme;
    } else {
      currentTheme = "cool";
    }
  } catch (e) {
    currentTheme = "cool";
  }
}

// ヘッダー（TODAY yyyy/m/d Ddd.）を表示
function setTodayHeader() {
  if (!todayDateDisplay) return;
  const today = getTodayAtMidnight();
  todayDateDisplay.textContent = formatDateEnWithWeekday(today);
}

// テーマ適用
function applyTheme(theme) {
  currentTheme = theme === "warm" ? "warm" : "cool";

  if (currentTheme === "warm") {
    document.body.classList.add("theme-warm");
  } else {
    document.body.classList.remove("theme-warm");
  }

  themeButtons.forEach((btn) => {
    const btnTheme = btn.getAttribute("data-theme");
    btn.classList.toggle("active", btnTheme === currentTheme);
  });
}

// メイン処理：カウント計算
function handleCalculate() {
  errorMessage.textContent = "";

  const rawDate = eventDateInput.value;
  const title = eventTitleInput.value.trim();

  if (!rawDate) {
    errorMessage.textContent = "日付を入力してください。";
    return;
  }

  const targetDate = parseDateFromInput(rawDate);
  if (!targetDate) {
    errorMessage.textContent = "日付の形式が正しくありません。";
    return;
  }

  const today = getTodayAtMidnight();
  const diffDays = calcDiffInDays(today, targetDate);
  currentDiffDays = diffDays;

  // 表示テキスト生成
  const mainText = buildMainText(diffDays);
  const formattedEventDate = formatDateEnWithWeekday(targetDate);
  const titleForDisplay = title || "";

  // 結果カードに反映
  mainCountText.textContent = mainText;
  eventTitleDisplay.textContent = titleForDisplay;
  eventTitleDisplay.style.display = titleForDisplay ? "block" : "none";
  eventDateDisplay.textContent = formattedEventDate;

  // コピー用テキストを保存
  lastCopyText = buildCopyText(title, diffDays, formattedEventDate);

  // URLパラメータを更新（ブックマーク用）
  updateUrlParams(title, rawDate, currentTheme);

  // 念のため可視化
  resultCard.style.visibility = "visible";
  resultCard.style.opacity = "1";
}

// URLパラメータに title / date / theme を反映
function updateUrlParams(title, rawDate, theme) {
  try {
    const params = new URLSearchParams(window.location.search);

    if (title) {
      params.set("title", title);
    } else {
      params.delete("title");
    }

    if (rawDate) {
      params.set("date", rawDate);
    } else {
      params.delete("date");
    }

    if (theme === "warm" || theme === "cool") {
      params.set("theme", theme);
    } else {
      params.delete("theme");
    }

    const newQuery = params.toString();
    const newUrl =
      window.location.pathname + (newQuery ? "?" + newQuery : "");

    window.history.replaceState(null, "", newUrl);
  } catch (e) {
    // 非対応なら何もしない
  }
  }
// ===== 関数群（後半） =====

// テキストコピー処理
function handleCopy() {
  if (!lastCopyText) {
    alert("まだカウント結果がありません。「カウントする」を押してください。");
    return;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(lastCopyText)
      .then(() => {
        alert("カウント結果をコピーしました。");
      })
      .catch(() => {
        fallbackCopy(lastCopyText);
      });
  } else {
    fallbackCopy(lastCopyText);
  }
}

// 画像共有処理（Instagram向けスクエア 1080×1080）
async function handleShareImage() {
  if (!resultCard || (!currentDiffDays && currentDiffDays !== 0)) {
    alert("まだカウント結果がありません。「カウントする」を押してください。");
    return;
  }

  if (typeof html2canvas === "undefined") {
    alert("画像生成用スクリプト読み込みに失敗しました。");
    return;
  }

  try {
    const cardCanvas = await html2canvas(resultCard, {
      backgroundColor: null,
      scale: 2
    });

    const out = document.createElement("canvas");
    const size = 1080;
    out.width = size;
    out.height = size;
    const ctx = out.getContext("2d");

    const bgColor =
      getComputedStyle(document.body).getPropertyValue("--bg-main") || "#ffffff";
    ctx.fillStyle = bgColor.trim();
    ctx.fillRect(0, 0, size, size);

    const scale = Math.min(
      (size * 0.9) / cardCanvas.width,
      (size * 0.9) / cardCanvas.height
    );
    const dw = cardCanvas.width * scale;
    const dh = cardCanvas.height * scale;
    const dx = (size - dw) / 2;
    const dy = (size - dh) / 2;

    ctx.drawImage(cardCanvas, dx, dy, dw, dh);

    out.toBlob(async (blob) => {
      if (!blob) {
        alert("画像生成に失敗しました。");
        return;
      }

      const file = new File([blob], "countdown.png", { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: document.title,
            text: lastCopyText || ""
          });
          return;
        } catch (e) {}
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "countdown.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, "image/png");
  } catch (e) {
    alert("画像生成中にエラーが発生しました。");
  }
}

// ===== DOMに依存しないユーティリティ =====

// 日付入力（YYYY-MM-DD）からDate生成
function parseDateFromInput(value) {
  const p = value.split("-");
  if (p.length !== 3) return null;

  const y = Number(p[0]);
  const m = Number(p[1]);
  const d = Number(p[2]);

  if (!y || !m || !d) return null;

  const date = new Date(y, m - 1, d);
  date.setHours(0, 0, 0, 0);

  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }

  return date;
}

// 今日（0:00）
function getTodayAtMidnight() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setHours(0, 0, 0, 0);
  return d;
}

// 日数差
function calcDiffInDays(fromDate, toDate) {
  const ms = 1000 * 60 * 60 * 24;
  return Math.round((toDate - fromDate) / ms);
}

// メイン表示テキスト（本日採用）
function buildMainText(diffDays) {
  if (diffDays > 0) return `あと ${diffDays} 日`;
  if (diffDays === 0) return "本日";
  return `${Math.abs(diffDays)} 日経過`;
}

// 欧文日付＋英略曜日（例：2025/12/4 Thu.）
function formatDateEnWithWeekday(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const w = WEEKDAYS_EN[date.getDay()];
  return `${y}/${m}/${d} ${w}`;
}

// コピー用テキスト
function buildCopyText(title, diffDays, formattedDate) {
  const t = title || "このイベント";
  if (diffDays > 0) return `${t}まで あと${diffDays}日（${formattedDate}）`;
  if (diffDays === 0) return `本日「${t}」当日（${formattedDate}）`;
  return `${t}から ${Math.abs(diffDays)}日経過（${formattedDate}）`;
}

// クリップボードAPI非対応フォールバック
function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();

  try {
    document.execCommand("copy");
    alert("コピーしました。");
  } catch (e) {
    alert("コピーできませんでした。");
  } finally {
    document.body.removeChild(ta);
  }
}

// 共通フッター読み込み
(function loadCommonFooter() {
  const footerEl = document.getElementById("commonFooter");
  if (!footerEl) return;

  fetch("https://cleverkitjp.github.io/footer.html")
    .then((res) => res.text())
    .then((html) => {
      footerEl.innerHTML = html;
    })
    .catch(() => {});
})();
