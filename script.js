// DOM 要素取得
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

const themeButtons = document.querySelectorAll(".theme-btn");

let lastCopyText = ""; // 直近の計算結果から生成したコピー用テキスト
let currentDiffDays = null; // 直近の差分日数
let currentTheme = "cool";  // "cool" | "warm"

// 曜日配列（日本語）
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// イベント登録
calculateButton.addEventListener("click", handleCalculate);
copyButton.addEventListener("click", handleCopy);
shareButton.addEventListener("click", handleShareImage);
themeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const theme = btn.getAttribute("data-theme");
    applyTheme(theme);
    updateUrlParams(eventTitleInput.value.trim(), eventDateInput.value, theme);
  });
});

// ページ読み込み時：URLパラメータから初期値をセット
window.addEventListener("DOMContentLoaded", () => {
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
      applyTheme(theme);
    } else {
      applyTheme("cool"); // デフォルト
    }
  } catch (e) {
    applyTheme("cool");
  }

  // 日付があれば自動計算（ブックマークから開いたとき用）
  if (eventDateInput.value) {
    handleCalculate();
  }
});

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
  const formattedDate = formatDateWithWeekday(targetDate);
  const titleForDisplay = title || "";

  // 結果カードに反映
  mainCountText.textContent = mainText;
  eventTitleDisplay.textContent = titleForDisplay;
  eventTitleDisplay.style.display = titleForDisplay ? "block" : "none";

  eventDateDisplay.textContent = formattedDate;

  // コピー用テキストを保存
  lastCopyText = buildCopyText(title, diffDays, formattedDate);

  // URLパラメータを更新（ブックマーク用）
  updateUrlParams(title, rawDate, currentTheme);

  // 結果カード表示（念のため）
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
      params.set("date", rawDate); // YYYY-MM-DD
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

    // 履歴を上書き（戻るボタンの履歴は汚さない）
    window.history.replaceState(null, "", newUrl);
  } catch (e) {
    // 非対応なら何もしない
  }
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

  // 簡易バリデーション
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
    return `${passed} 日経過`;
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

// 画像共有処理：結果カードをInstagram向けスクエア画像にして共有/ダウンロード
async function handleShareImage() {
  if (!currentDiffDays && currentDiffDays !== 0) {
    alert("まだカウント結果がありません。「カウントする」を押してください。");
    return;
  }

  if (typeof html2canvas === "undefined") {
    alert("画像生成用スクリプトの読み込みに失敗しました。");
    return;
  }

  try {
    // まず結果カードをキャプチャ
    const cardElement = resultCard;
    const cardCanvas = await html2canvas(cardElement, {
      backgroundColor: null,
      scale: 2
    });

    // Instagramに使いやすい正方形 1080x1080 のキャンバスを用意
    const targetSize = 1080;
    const outCanvas = document.createElement("canvas");
    outCanvas.width = targetSize;
    outCanvas.height = targetSize;
    const ctx = outCanvas.getContext("2d");

    // 背景色（テーマに合わせたメイン背景色）
    const bgColor = getComputedStyle(document.body).getPropertyValue("--bg-main") || "#ffffff";
    ctx.fillStyle = bgColor.trim() || "#ffffff";
    ctx.fillRect(0, 0, targetSize, targetSize);

    // カード画像を中央に配置（比率維持で最大化）
    const cardWidth = cardCanvas.width;
    const cardHeight = cardCanvas.height;
    const scale = Math.min(
      (targetSize * 0.9) / cardWidth,
      (targetSize * 0.9) / cardHeight
    );
    const drawWidth = cardWidth * scale;
    const drawHeight = cardHeight * scale;
    const dx = (targetSize - drawWidth) / 2;
    const dy = (targetSize - drawHeight) / 2;

    ctx.drawImage(cardCanvas, dx, dy, drawWidth, drawHeight);

    // 画像として出力
    outCanvas.toBlob(async (blob) => {
      if (!blob) {
        alert("画像の生成に失敗しました。");
        return;
      }

      const fileName = "countdown.png";

      // Web Share API Level 2 が使える場合はそのまま共有
      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        try {
          await navigator.share({
            files: [file],
            title: document.title,
            text: lastCopyText || ""
          });
          return;
        } catch (e) {
          // ユーザーキャンセルなどは無視してダウンロードにフォールバック
        }
      }

      // 共有できない環境ではダウンロード
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert("画像ファイルをダウンロードしました。Instagramなどにアップロードしてお使いください。");
    }, "image/png");
  } catch (e) {
    console.error(e);
    alert("画像の作成中にエラーが発生しました。再度お試しください。");
  }
}

// 共通フッター読み込み
(function loadCommonFooter() {
  const footerEl = document.getElementById("commonFooter");
  if (!footerEl) return;

  fetch("https://cleverkitjp.github.io/footer.html")
    .then((res) => {
      if (!res.ok) throw new Error("Footer load failed");
      return res.text();
    })
    .then((html) => {
      footerEl.innerHTML = html;
    })
    .catch(() => {
      // 読み込み失敗時はプレースホルダのまま
    });
})();
