// DOM 要素取得
const eventTitleInput = document.getElementById("eventTitle");
const eventDateInput = document.getElementById("eventDate");
const useDDayCheckbox = document.getElementById("useDDay");
const calculateButton = document.getElementById("calculateButton");
const copyButton = document.getElementById("copyButton");
const errorMessage = document.getElementById("errorMessage");

const resultCard = document.getElementById("resultCard");
const mainCountText = document.getElementById("mainCountText");
const eventTitleDisplay = document.getElementById("eventTitleDisplay");
const eventDateDisplay = document.getElementById("eventDateDisplay");
const ddayDisplay = document.getElementById("ddayDisplay");

let lastCopyText = ""; // 直近の計算結果から生成したコピー用テキスト

// 曜日配列（日本語）
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// イベント：ボタンクリック
calculateButton.addEventListener("click", handleCalculate);
copyButton.addEventListener("click", handleCopy);

// ページ読み込み時：URLパラメータから初期値をセット（余力機能）
window.addEventListener("DOMContentLoaded", () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const title = params.get("title");
    const date = params.get("date");

    if (title) {
      eventTitleInput.value = decodeURIComponent(title);
    }
    if (date) {
      // date=YYYY-MM-DD 形式を期待
      eventDateInput.value = date;
    }
  } catch (e) {
    // 何もしない（古いブラウザ等）
  }

  // 可能なら、日付が入っていれば自動計算（任意）
  if (eventDateInput.value) {
    handleCalculate();
  }
});

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

  // 表示テキスト生成
  const mainText = buildMainText(diffDays);
  const ddayText = useDDayCheckbox.checked ? buildDDayText(diffDays) : "";
  const formattedDate = formatDateWithWeekday(targetDate);
  const titleForDisplay = title || "";

  // 結果カードに反映
  mainCountText.textContent = mainText;
  eventTitleDisplay.textContent = titleForDisplay;
  eventTitleDisplay.style.display = titleForDisplay ? "block" : "none";

  eventDateDisplay.textContent = formattedDate;
  ddayDisplay.textContent = ddayText;
  ddayDisplay.style.display = ddayText ? "block" : "none";

  // コピー用テキストを保存
  lastCopyText = buildCopyText(title, diffDays, formattedDate);

  // 結果カードが非表示状態の場合も念のため表示
  resultCard.style.visibility = "visible";
  resultCard.style.opacity = "1";
}

// 日付入力（YYYY-MM-DD）から Date を生成
function parseDateFromInput(value) {
  const parts = value.split("-");
  if (parts.length !== 3) return null;

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (!year || !month || !day) return null;

  const d = new Date(year, month - 1, day);
  d.setHours(0, 0, 0, 0);

  // 簡易バリデーション（例：2月30日等を除外）
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }

  return d;
}

// 今日の日付（0:00）を取得
function getTodayAtMidnight() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setHours(0, 0, 0, 0);
  return d;
}

// 日数差分を計算
function calcDiffInDays(fromDate, toDate) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffMs = toDate.getTime() - fromDate.getTime();
  // 0:00同士で比較しているので丸めても問題になりにくい
  return Math.round(diffMs / msPerDay);
}

// メイン表示用テキスト
function buildMainText(diffDays) {
  if (diffDays > 0) {
    return `あと ${diffDays} 日`;
  } else if (diffDays === 0) {
    return "今日！";
  } else {
    const passed = Math.abs(diffDays);
    // 「◯日前」ではなく「◯日経過」の方がポジティブ
    return `${passed} 日経過`;
  }
}

// D-Day 表記テキスト
function buildDDayText(diffDays) {
  if (diffDays > 0) {
    return `D-${diffDays}`;
  } else if (diffDays === 0) {
    return "D-Day";
  } else {
    const passed = Math.abs(diffDays);
    return `D+${passed}`;
  }
}

// 日付＋曜日フォーマット（例：2025年3月10日（月））
function formatDateWithWeekday(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const w = WEEKDAYS[date.getDay()];
  return `${y}年${m}月${d}日（${w}）`;
}

// コピー用テキスト生成
function buildCopyText(title, diffDays, formattedDate) {
  const safeTitle = title || "このイベント";

  if (diffDays > 0) {
    const days = diffDays;
    return `${safeTitle}まで あと${days}日（${formattedDate}）`;
  } else if (diffDays === 0) {
    return `きょうは「${safeTitle}」当日です！（${formattedDate}）`;
  } else {
    const passed = Math.abs(diffDays);
    return `${safeTitle}から ${passed}日経過（${formattedDate}）`;
  }
}

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
        alert("カウント結果をコピーしました。お好きなアプリに貼り付けて使ってください。");
      })
      .catch(() => {
        fallbackCopy(lastCopyText);
      });
  } else {
    fallbackCopy(lastCopyText);
  }
}

// クリップボードAPI非対応時のフォールバック
function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    document.execCommand("copy");
    alert("カウント結果をコピーしました。お好きなアプリに貼り付けて使ってください。");
  } catch (e) {
    alert("コピーに失敗しました。手動で選択してコピーしてください。");
  } finally {
    document.body.removeChild(textarea);
  }
}

// 共通フッター読み込み
(function loadCommonFooter() {
  const footerEl = document.getElementById("commonFooter");
  if (!footerEl) return;

  // cleverkitjp の footer.html を絶対URLで読み込み
  fetch("https://cleverkitjp.github.io/footer.html")
    .then((res) => {
      if (!res.ok) throw new Error("Footer load failed");
      return res.text();
    })
    .then((html) => {
      footerEl.innerHTML = html;
    })
    .catch(() => {
      // 読み込み失敗時はプレースホルダのまま（エラー表示はしない）
    });
})();
