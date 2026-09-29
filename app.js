const STORAGE_KEY = "miaomiaoRecords";
const INVITE_KEY = "miaomiaoInviteCode";
const JOINED_INVITE_KEY = "miaomiaoJoinedInviteCode";
const ACTIVE_INVITE_KEY = "miaomiaoActiveInviteCode";

const sharePanel = document.querySelector(".share-panel");
const openShareButton = document.querySelector('[data-action="openShare"]');
const closeShareButton = document.querySelector(".share-close");
const inviteCode = document.querySelector(".invite-code");
const inviteStatus = document.querySelector(".invite-status");
const copyInviteButton = document.querySelector('[data-action="copyInvite"]');
const joinShareForm = document.querySelector(".join-share-form");
const joinCodeInput = document.querySelector(".share-input");
const cameraButton = document.querySelector('[data-action="camera"]');
const uploadButton = document.querySelector('[data-action="upload"]');
const imageInput = document.querySelector(".image-input");
const panel = document.querySelector(".capture-panel");
const closeButton = document.querySelector(".panel-close");
const video = document.querySelector(".camera-view");
const canvas = document.querySelector(".photo-canvas");
const preview = document.querySelector(".preview-image");
const panelMessage = document.querySelector(".panel-message");
const noteInput = document.querySelector(".note-input");
const saveStatus = document.querySelector(".save-status");
const captureButton = document.querySelector(".capture-button");
const saveButton = document.querySelector(".save-button");

let cameraStream = null;
let currentImage = "";
let currentSource = "";

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

function migrateLegacyRecords(code) {
  const legacyRecords = localStorage.getItem(STORAGE_KEY);
  const scopedKey = `${STORAGE_KEY}:${code}`;

  if (legacyRecords && !localStorage.getItem(scopedKey)) {
    localStorage.setItem(scopedKey, legacyRecords);
  }
}

function renderInviteCode() {
  inviteCode.textContent = getInviteCode();
}

function openSharePanel() {
  renderInviteCode();
  inviteStatus.textContent = "";
  sharePanel.hidden = false;
}

function closeSharePanel() {
  sharePanel.hidden = true;
}

async function copyInviteCode() {
  const code = getInviteCode();

  try {
    await navigator.clipboard.writeText(code);
    inviteStatus.textContent = "已复制";
  } catch {
    inviteStatus.textContent = "复制失败";
  }
}

function joinShareCode(event) {
  event.preventDefault();
  const code = joinCodeInput.value.trim().toUpperCase();

  if (!code) {
    inviteStatus.textContent = "先输入共享码";
    return;
  }

  localStorage.setItem(JOINED_INVITE_KEY, code);
  localStorage.setItem(ACTIVE_INVITE_KEY, code);
  joinCodeInput.value = "";
  inviteStatus.textContent = `已加入 ${code}，现在可一起上传、点赞、评论`;
}

function getRecords() {
  try {
    return JSON.parse(localStorage.getItem(getRecordsKey())) || [];
  } catch {
    return [];
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener("error", reject, { once: true });
    image.src = src;
  });
}

async function compressImage(src, maxSize = 900) {
  const image = await loadImage(src);
  const ratio = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));

  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

function showStatus(text) {
  saveStatus.textContent = text;
  saveStatus.hidden = false;
}

async function saveRecord() {
  if (!currentImage) return;

  saveButton.disabled = true;
  showStatus("正在保存...");

  try {
    const records = getRecords();
    const compressedImage = await compressImage(currentImage);
    const nextRecord = {
      id: Date.now(),
      image: compressedImage,
      note: noteInput.value.trim(),
      source: currentSource,
      createdAt: new Date().toISOString(),
    };
    records.unshift(nextRecord);

    try {
      localStorage.setItem(getRecordsKey(), JSON.stringify(records.slice(0, 60)));
    } catch {
      localStorage.setItem(getRecordsKey(), JSON.stringify([nextRecord]));
    }

    showStatus("保存好了");
    window.setTimeout(closePanel, 450);
  } catch {
    showStatus("这张图片还是太大，换一张小一点的试试。");
    saveButton.disabled = false;
  }
}

function showPanel() {
  panel.hidden = false;
}

function hideMedia() {
  video.hidden = true;
  canvas.hidden = true;
  preview.hidden = true;
  panelMessage.hidden = true;
  noteInput.hidden = true;
  saveStatus.hidden = true;
  captureButton.hidden = true;
  saveButton.hidden = true;
  saveButton.disabled = false;
  preview.removeAttribute("src");
  panelMessage.textContent = "";
  saveStatus.textContent = "";
  noteInput.value = "";
  currentImage = "";
  currentSource = "";
}

function stopCamera() {
  if (!cameraStream) return;
  cameraStream.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  video.srcObject = null;
}

function closePanel() {
  stopCamera();
  hideMedia();
  panel.hidden = true;
}

function showReadyToSave(image, source) {
  currentImage = image;
  currentSource = source;
  preview.src = image;
  preview.alt = source === "camera" ? "拍照预览" : "上传图片预览";
  preview.hidden = false;
  noteInput.hidden = false;
  saveButton.hidden = false;
}

async function openCamera() {
  showPanel();
  hideMedia();

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = cameraStream;
    video.hidden = false;
    captureButton.hidden = false;
  } catch {
    panelMessage.textContent = location.protocol === "file:"
      ? "摄像头需要用本地预览地址打开才更稳定。请用 http://127.0.0.1:8080/miaomiao-growth/index.html 打开后再试。"
      : "摄像头没有打开，请检查浏览器权限。";
    panelMessage.hidden = false;
  }
}

function takePhoto() {
  if (!cameraStream || video.videoWidth === 0) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  video.hidden = true;
  captureButton.hidden = true;
  stopCamera();
  showReadyToSave(canvas.toDataURL("image/jpeg", 0.88), "camera");
}

function openUpload() {
  stopCamera();
  imageInput.click();
}

function previewUpload() {
  const [file] = imageInput.files;
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    showPanel();
    hideMedia();
    showReadyToSave(reader.result, "upload");
    imageInput.value = "";
  });
  reader.readAsDataURL(file);
}

cameraButton.addEventListener("click", openCamera);
uploadButton.addEventListener("click", openUpload);
imageInput.addEventListener("change", previewUpload);
captureButton.addEventListener("click", takePhoto);
saveButton.addEventListener("click", saveRecord);
closeButton.addEventListener("click", closePanel);
copyInviteButton.addEventListener("click", copyInviteCode);
openShareButton.addEventListener("click", openSharePanel);
closeShareButton.addEventListener("click", closeSharePanel);
joinShareForm.addEventListener("submit", joinShareCode);
