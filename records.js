const STORAGE_KEY = "miaomiaoRecords";
const INVITE_KEY = "miaomiaoInviteCode";
const ACTIVE_INVITE_KEY = "miaomiaoActiveInviteCode";
const cardsArea = document.querySelector(".cards-area");
const activeShareLabel = document.querySelector(".active-share-label");

function createInviteCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "MIAO-";

  for (let i = 0; i < 6; i += 1) {
    code += letters[Math.floor(Math.random() * letters.length)];
  }

  return code;
}

function getInviteCode() {
  let code = localStorage.getItem(INVITE_KEY);

  if (!code) {
    code = createInviteCode();
    localStorage.setItem(INVITE_KEY, code);
  }

  return code;
}

function migrateLegacyRecords(code) {
  const legacyRecords = localStorage.getItem(STORAGE_KEY);
  const scopedKey = `${STORAGE_KEY}:${code}`;

  if (legacyRecords && !localStorage.getItem(scopedKey)) {
    localStorage.setItem(scopedKey, legacyRecords);
  }
}

function getActiveInviteCode() {
  const activeCode = localStorage.getItem(ACTIVE_INVITE_KEY);

  if (activeCode) return activeCode;

  const ownCode = getInviteCode();
  localStorage.setItem(ACTIVE_INVITE_KEY, ownCode);
  migrateLegacyRecords(ownCode);
  return ownCode;
}

function getRecordsKey() {
  return `${STORAGE_KEY}:${getActiveInviteCode()}`;
}

function getRecords() {
  try {
    return JSON.parse(localStorage.getItem(getRecordsKey())) || [];
  } catch {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(getRecordsKey(), JSON.stringify(records));
}

function updateRecord(id, updater) {
  const records = getRecords();
  const nextRecords = records.map((record) => {
    if (String(record.id) !== String(id)) return record;
    return updater({
      ...record,
      likes: record.likes || 0,
      comments: record.comments || [],
    });
  });

  saveRecords(nextRecords);
  renderRecords();
}

function formatDate(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function createCard(record) {
  const normalizedRecord = {
    ...record,
    likes: record.likes || 0,
    comments: record.comments || [],
  };
  const card = document.createElement("article");
  const image = document.createElement("img");
  const note = document.createElement("p");
  const date = document.createElement("time");
  const actions = document.createElement("div");
  const likeButton = document.createElement("button");
  const comments = document.createElement("div");
  const form = document.createElement("form");
  const input = document.createElement("input");
  const submit = document.createElement("button");

  card.className = "record-card";
  image.src = normalizedRecord.image;
  image.alt = normalizedRecord.note || "喵喵成长记录";
  note.className = "record-note";
  note.textContent = normalizedRecord.note || "今天也有好好长大。";
  date.className = "record-date";
  date.dateTime = normalizedRecord.createdAt;
  date.textContent = formatDate(normalizedRecord.createdAt);

  actions.className = "card-actions";
  likeButton.className = "like-button";
  likeButton.type = "button";
  likeButton.textContent = `点赞 ${normalizedRecord.likes}`;
  likeButton.addEventListener("click", () => {
    updateRecord(normalizedRecord.id, (nextRecord) => ({
      ...nextRecord,
      likes: (nextRecord.likes || 0) + 1,
    }));
  });

  comments.className = "comments-list";
  normalizedRecord.comments.forEach((comment) => {
    const item = document.createElement("p");
    item.className = "comment-item";
    item.textContent = comment;
    comments.append(item);
  });

  form.className = "comment-form";
  input.className = "comment-input";
  input.type = "text";
  input.placeholder = "写评论...";
  submit.className = "comment-submit";
  submit.type = "submit";
  submit.textContent = "发送";
  form.append(input, submit);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const comment = input.value.trim();
    if (!comment) return;

    updateRecord(normalizedRecord.id, (nextRecord) => ({
      ...nextRecord,
      comments: [...(nextRecord.comments || []), comment],
    }));
  });

  actions.append(likeButton);
  card.append(image, note, date, actions, comments, form);
  return card;
}

function renderRecords() {
  const records = getRecords();
  activeShareLabel.textContent = `当前共享码：${getActiveInviteCode()}`;

  if (records.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-card";
    empty.textContent = "还没有记录，先回首页拍照或上传一张喵喵吧。";
    cardsArea.replaceChildren(empty);
    return;
  }

  cardsArea.replaceChildren(...records.map(createCard));
}

renderRecords();
