const BODY_PARTICIPANT_STORAGE_KEYS = [
  "emomirror.participant",
  "emotype_participant_code",
  "participant_code",
  "participantCode",
  "currentParticipantCode",
];

const BODY_STRUCTURE = [
  { id: "head", label: SharedI18N.pick("头部", "Head"), symptoms: [
    { id: "headache", label: SharedI18N.pick("头疼", "Headache") },
    { id: "dizziness", label: SharedI18N.pick("头晕", "Dizziness") },
    { id: "brain_fog", label: SharedI18N.pick("脑雾/注意力涣散", "Brain fog / difficulty focusing") },
    { id: "clear_head", label: SharedI18N.pick("头脑清晰", "Clear-headed"), positive: true },
    { id: "focused", label: SharedI18N.pick("专注有力", "Focused"), positive: true },
  ]},
  { id: "eyes", label: SharedI18N.pick("眼部", "Eyes"), symptoms: [
    { id: "eye_strain", label: SharedI18N.pick("眼疲劳", "Eye strain") },
    { id: "dry_eyes", label: SharedI18N.pick("眼干", "Dry eyes") },
    { id: "blurred_vision", label: SharedI18N.pick("视物模糊", "Blurred vision") },
    { id: "bright_eyes", label: SharedI18N.pick("眼神明亮", "Bright eyes"), positive: true },
  ]},
  { id: "throat_mouth", label: SharedI18N.pick("口咽", "Throat / mouth"), symptoms: [
    { id: "throat_tightness", label: SharedI18N.pick("喉咙紧/异物感", "Throat tightness") },
    { id: "dry_throat", label: SharedI18N.pick("嗓子干", "Dry throat") },
    { id: "jaw_tension", label: SharedI18N.pick("下颌/牙关紧绷", "Jaw tension") },
    { id: "voice_clear", label: SharedI18N.pick("声音通畅", "Clear voice"), positive: true },
  ]},
  { id: "chest", label: SharedI18N.pick("胸口", "Chest"), symptoms: [
    { id: "chest_tightness", label: SharedI18N.pick("胸闷/压迫感", "Chest tightness") },
    { id: "palpitation", label: SharedI18N.pick("心跳过快/心慌", "Racing heartbeat") },
    { id: "short_breath", label: SharedI18N.pick("呼吸困难/气短", "Shortness of breath") },
    { id: "chest_open", label: SharedI18N.pick("呼吸顺畅", "Easy breathing"), positive: true },
    { id: "heart_warm", label: SharedI18N.pick("心里温暖", "Warm-hearted"), positive: true },
  ]},
  { id: "shoulder_neck", label: SharedI18N.pick("肩颈", "Shoulders / neck"), symptoms: [
    { id: "neck_stiff", label: SharedI18N.pick("颈部僵硬", "Stiff neck") },
    { id: "shoulder_pain", label: SharedI18N.pick("肩膀酸痛", "Shoulder ache") },
    { id: "muscle_tight", label: SharedI18N.pick("肌肉紧绷", "Muscle tension") },
    { id: "shoulder_relax", label: SharedI18N.pick("肩颈放松", "Relaxed shoulders"), positive: true },
  ]},
  { id: "stomach", label: SharedI18N.pick("胃部", "Stomach"), symptoms: [
    { id: "stomach_pain", label: SharedI18N.pick("胃痛/痉挛", "Stomach pain / cramps") },
    { id: "nausea", label: SharedI18N.pick("恶心/反胃", "Nausea") },
    { id: "appetite_loss", label: SharedI18N.pick("食欲下降", "Reduced appetite") },
    { id: "bloating", label: SharedI18N.pick("腹胀/胀气", "Bloating") },
    { id: "appetite_good", label: SharedI18N.pick("食欲好", "Good appetite"), positive: true },
    { id: "stomach_comfy", label: SharedI18N.pick("胃部舒适", "Comfortable stomach"), positive: true },
  ]},
  { id: "back", label: SharedI18N.pick("腰背", "Lower back"), symptoms: [
    { id: "lower_back", label: SharedI18N.pick("腰酸背痛", "Back ache") },
    { id: "back_stiff", label: SharedI18N.pick("背部僵硬", "Stiff back") },
    { id: "back_relax", label: SharedI18N.pick("腰背舒展", "Relaxed back"), positive: true },
  ]},
  { id: "hands", label: SharedI18N.pick("手部", "Hands"), symptoms: [
    { id: "hand_shaking", label: SharedI18N.pick("手抖", "Shaking hands") },
    { id: "cold_hands", label: SharedI18N.pick("手冰凉", "Cold hands") },
    { id: "sweaty_hands", label: SharedI18N.pick("手心出汗", "Sweaty palms") },
    { id: "hands_warm", label: SharedI18N.pick("双手温暖", "Warm hands"), positive: true },
  ]},
  { id: "legs", label: SharedI18N.pick("腿部", "Legs"), symptoms: [
    { id: "leg_heavy", label: SharedI18N.pick("腿沉/无力", "Heavy legs") },
    { id: "cold_feet", label: SharedI18N.pick("脚冰凉", "Cold feet") },
    { id: "restless_legs", label: SharedI18N.pick("腿部躁动不安", "Restless legs") },
    { id: "legs_light", label: SharedI18N.pick("步伐轻盈", "Light steps"), positive: true },
  ]},
  { id: "whole_body", label: SharedI18N.pick("全身", "Whole body"), symptoms: [
    { id: "fatigue", label: SharedI18N.pick("疲惫/乏力", "Fatigue") },
    { id: "insomnia", label: SharedI18N.pick("失眠/睡眠差", "Difficulty sleeping") },
    { id: "sweating", label: SharedI18N.pick("出汗/冷汗", "Sweating / cold sweats") },
    { id: "restless", label: SharedI18N.pick("坐立不安", "Restless") },
    { id: "energized", label: SharedI18N.pick("精力充沛", "Energized"), positive: true },
    { id: "calm_body", label: SharedI18N.pick("全身放松", "Relaxed body"), positive: true },
    { id: "grounded", label: SharedI18N.pick("踏实稳定", "Grounded"), positive: true },
  ]},
];

const els = {
  refreshContextBtn: document.getElementById("bodyRefreshContextBtn"),
  contextState: document.getElementById("bodyContextState"),
  journalText: document.getElementById("bodyJournalText"),
  recentContext: document.getElementById("bodyRecentContext"),
  regionChips: document.getElementById("bodyRegionChips"),
  symptomChips: document.getElementById("bodySymptomChips"),
  severity: document.getElementById("bodySeverity"),
  severityLabel: document.getElementById("bodySeverityLabel"),
  duration: document.getElementById("bodyDuration"),
  freeText: document.getElementById("bodyFreeText"),
  addPairBtn: document.getElementById("bodyAddPairBtn"),
  clearPairsBtn: document.getElementById("bodyClearPairsBtn"),
  submitBtn: document.getElementById("bodySubmitBtn"),
  submitStatus: document.getElementById("bodySubmitStatus"),
  pairCount: document.getElementById("bodyPairCount"),
  selectedPairs: document.getElementById("bodySelectedPairs"),
  adviceState: document.getElementById("bodyAdviceState"),
  adviceEmpty: document.getElementById("bodyAdviceEmpty"),
  adviceContent: document.getElementById("bodyAdviceContent"),
};

const state = {
  selectedRegion: BODY_STRUCTURE[0],
  selectedSymptom: BODY_STRUCTURE[0].symptoms[0],
  pairs: [],
  contextRecords: [],
  loadingContext: false,
  submitting: false,
};

function normalizeCode(value) {
  return String(value || "").trim();
}

function readParticipantFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return normalizeCode(
    params.get("participant_code") ||
    params.get("participantCode") ||
    params.get("code") ||
    params.get("participant"),
  );
}

function readParticipantFromStorage() {
  for (const key of BODY_PARTICIPANT_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      if (key === "emomirror.participant") {
        const parsed = JSON.parse(raw);
        const code = normalizeCode(parsed?.participant_code);
        if (code) return code;
      } else {
        const code = normalizeCode(raw);
        if (code) return code;
      }
    } catch (error) {}
  }
  return "";
}

function currentParticipantCode() {
  // Prefer logged-in user's username
  if (typeof Auth !== "undefined" && Auth.isLoggedIn()) {
    var user = Auth.getUser();
    if (user && user.username) return user.username;
  }
  return readParticipantFromUrl() || readParticipantFromStorage() || "local";
}

function rememberParticipantCode(code) {
  const clean = normalizeCode(code);
  if (!clean) return;
  try {
    localStorage.setItem("emotype_participant_code", clean);
    localStorage.setItem("participant_code", clean);
    localStorage.setItem("participantCode", clean);
  } catch (error) {}
}

async function apiJson(url, options = {}) {
  // Use Auth.apiJson when available (adds JWT Bearer token)
  if (typeof Auth !== "undefined" && Auth.apiJson) {
    return Auth.apiJson(url, options);
  }
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(options.headers || {}),
    },
  });
  let data = null;
  try {
    data = await response.json();
  } catch (error) {}
  if (!response.ok) {
    throw new Error(data?.detail || data?.message || response.statusText || "request failed");
  }
  return data;
}

function setContextState(text) {
  els.contextState.textContent = text;
}

function setAdviceState(text) {
  els.adviceState.textContent = text;
}

function setSubmitStatus(text) {
  els.submitStatus.textContent = text;
}

function chipButton(label, options = {}) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `body-chip-v2${options.active ? " is-active" : ""}${options.positive ? " is-positive" : ""}`;
  btn.textContent = label;
  btn.addEventListener("click", options.onClick);
  return btn;
}

function renderRegionChips() {
  els.regionChips.textContent = "";
  BODY_STRUCTURE.forEach((region) => {
    els.regionChips.appendChild(chipButton(region.label, {
      active: state.selectedRegion.id === region.id,
      onClick: () => {
        state.selectedRegion = region;
        state.selectedSymptom = region.symptoms[0];
        renderRegionChips();
        renderSymptomChips();
      },
    }));
  });
}

function renderSymptomChips() {
  els.symptomChips.textContent = "";
  state.selectedRegion.symptoms.forEach((symptom) => {
    els.symptomChips.appendChild(chipButton(symptom.label, {
      active: state.selectedSymptom.id === symptom.id,
      positive: Boolean(symptom.positive),
      onClick: () => {
        state.selectedSymptom = symptom;
        renderSymptomChips();
      },
    }));
  });
}

function renderPairs() {
  els.pairCount.textContent = SharedI18N.pick(`${state.pairs.length} 组`, `${state.pairs.length} pairs`);
  els.selectedPairs.textContent = "";
  if (!state.pairs.length) {
    els.selectedPairs.textContent = SharedI18N.pick("暂无", "None yet");
    return;
  }

  state.pairs.forEach((pair, index) => {
    const row = document.createElement("article");
    row.className = "body-pair-card-v2";
    const body = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = `${pair.region.label} → ${pair.symptom.label}`;
    const meta = document.createElement("span");
    meta.textContent = SharedI18N.pick(`程度 ${pair.severity} / 5 · ${pair.duration || "未填写持续时间"}`, `Severity ${pair.severity} / 5 · ${pair.duration || "Duration not provided"}`);
    body.append(title, meta);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = SharedI18N.pick("删除", "Remove");
    remove.addEventListener("click", () => {
      state.pairs.splice(index, 1);
      renderPairs();
    });
    row.append(body, remove);
    els.selectedPairs.appendChild(row);
  });
}

function addPair() {
  state.pairs.push({
    region: state.selectedRegion,
    symptom: state.selectedSymptom,
    severity: Number(els.severity.value || 3),
    duration: normalizeCode(els.duration.value),
  });
  renderPairs();
}

function clearPairs() {
  state.pairs = [];
  renderPairs();
}

function uniqueRegionsFromPairs() {
  return Array.from(
    new Map(state.pairs.map((pair) => [pair.region.id, { id: pair.region.id, label: pair.region.label }])).values(),
  );
}

function symptomsFromPairs() {
  return state.pairs.map((pair) => ({
    id: pair.symptom.id,
    region_id: pair.region.id,
    label: pair.symptom.label,
    severity: pair.severity,
    duration: pair.duration,
  }));
}

function contextText(record) {
  return record.raw_text || record.transcript_text || record.content || record.text || record.summary || "";
}

function contextLabel(record, index) {
  const label = record.final_label || record.primary_emotion || record.original_label || record.label || SharedI18N.pick("记录", "Record");
  const preview = contextText(record).replace(/\s+/g, " ").slice(0, 26);
  return `${index + 1}. ${SharedI18N.label(label)}${preview ? ` · ${preview}` : ""}`;
}

async function ensureParticipantSession(code) {
  if (!code || code === "local") return;
  try {
    await apiJson("/participants/session", {
      method: "POST",
      body: JSON.stringify({
        participant_code: code,
        consent_version: "research-v1",
      }),
    });
  } catch (error) {}
}

function renderRecentContext() {
  els.recentContext.textContent = "";
  if (!state.contextRecords.length) {
    const empty = document.createElement("p");
    empty.className = "body-context-empty";
    empty.textContent = SharedI18N.pick("没有读取到最近随手记。仍然可以只根据本次身体感受生成建议。", "No recent journals were found. Advice can still use the current body sensations.");
    els.recentContext.appendChild(empty);
    return;
  }

  state.contextRecords.slice(0, 6).forEach((record, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "body-context-item";
    btn.textContent = contextLabel(record, index);
    btn.addEventListener("click", () => {
      const text = contextText(record);
      if (!text) return;
      const prefix = els.journalText.value.trim() ? "\n\n" : "";
      els.journalText.value += `${prefix}${text}`;
      els.journalText.focus();
    });
    els.recentContext.appendChild(btn);
  });
}

async function loadRecentContext() {
  const code = currentParticipantCode();
  rememberParticipantCode(code);
  state.loadingContext = true;
  els.refreshContextBtn.disabled = true;
  setContextState(SharedI18N.pick("读取中", "Loading"));
  try {
    await ensureParticipantSession(code);
    const data = await apiJson(`/participants/${encodeURIComponent(code)}/diaries`);
    state.contextRecords = data.diary_entries || data.diaries || data.entries || [];
    setContextState(SharedI18N.pick(`已读取 ${state.contextRecords.length} 条`, `Loaded ${state.contextRecords.length} records`));
  } catch (error) {
    state.contextRecords = [];
    setContextState(SharedI18N.pick("读取失败", "Could not load"));
  } finally {
    state.loadingContext = false;
    els.refreshContextBtn.disabled = false;
    renderRecentContext();
  }
}

function renderAdvice(data) {
  const advice = data?.advice || {};
  const links = data?.possible_links || advice.possible_links || [];
  const safety = data?.safety || {};
  const context = data?.emotion_context || {};
  els.adviceEmpty.style.display = "none";
  els.adviceContent.textContent = "";
  document.querySelector(".body-advice-column")?.classList.add("is-visible");

  const summary = document.createElement("p");
  summary.className = "body-advice-summary-v2";
  summary.textContent = advice.summary || SharedI18N.pick("建议已生成。", "Advice is ready.");
  els.adviceContent.append(summary);

  if (advice.state_reading) {
    const stateBox = document.createElement("p");
    stateBox.className = "body-state-reading";
    stateBox.textContent = advice.state_reading;
    els.adviceContent.appendChild(stateBox);
  }

  const meta = document.createElement("div");
  meta.className = "body-advice-meta-v2";
  meta.textContent = SharedI18N.pick(`情绪线索：${context.primary_label || "-"} · 来源：${advice.source || "-"}`, `Emotion clues: ${context.primary_label || "-"} · Source: ${advice.source || "-"}`);
  els.adviceContent.appendChild(meta);

  appendAdviceList(SharedI18N.pick("身体-情绪线索", "Body–emotion clues"), links.map((item) => `${item.label || item.type || SharedI18N.pick("线索", "Clue")}: ${item.explanation || item.description || ""}`));
  appendAdviceList(SharedI18N.pick("可尝试步骤", "Steps to try"), advice.steps || [], true);

  if (advice.reflection_prompt) {
    appendAdviceParagraph(SharedI18N.pick("继续记录提示", "Reflection prompt"), advice.reflection_prompt);
  }

  if (safety.risk_level === "high" && Array.isArray(safety.red_flags) && safety.red_flags.length) {
    appendAdviceList(SharedI18N.pick("风险提示", "Safety reminders"), safety.red_flags);
  }

  appendAdviceList(SharedI18N.pick("何时求助", "When to seek help"), advice.when_to_seek_help || []);
  appendAdviceParagraph(SharedI18N.pick("说明", "Note"), SharedI18N.pick("这些建议不构成医疗诊断；如果症状明显、持续或让你担心，请优先寻求专业帮助。", "This is not a medical diagnosis. Seek professional help for significant, persistent or worrying symptoms."));
}

function appendAdviceParagraph(label, text) {
  const section = document.createElement("section");
  section.className = "body-advice-section-v2";
  const heading = document.createElement("span");
  heading.textContent = label;
  const p = document.createElement("p");
  p.textContent = text || "-";
  section.append(heading, p);
  els.adviceContent.appendChild(section);
}

function appendAdviceList(label, items, ordered = false) {
  if (!Array.isArray(items) || !items.length) return;
  const section = document.createElement("section");
  section.className = "body-advice-section-v2";
  const heading = document.createElement("span");
  heading.textContent = label;
  const list = document.createElement(ordered ? "ol" : "ul");
  items.slice(0, 8).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = typeof item === "string" ? item : JSON.stringify(item);
    list.appendChild(li);
  });
  section.append(heading, list);
  els.adviceContent.appendChild(section);
}

async function submitAdvice() {
  if (state.submitting) return;
  const code = currentParticipantCode();
  rememberParticipantCode(code);
  if (!state.pairs.length) addPair();

  const payload = {
    participant_code: code,
    journal_text: els.journalText.value.trim(),
    selected_regions: uniqueRegionsFromPairs(),
    symptoms: symptomsFromPairs(),
    free_text: els.freeText.value.trim(),
    include_recent_diaries: true,
    recent_diary_limit: 5,
  };

  state.submitting = true;
  els.submitBtn.disabled = true;
  setAdviceState(SharedI18N.pick("生成中", "Generating"));
  setSubmitStatus(SharedI18N.pick("正在生成建议，可能需要几秒。", "Generating advice. This may take a few seconds."));
  try {
    const data = await apiJson("/body-sensation/advice", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    renderAdvice(data);
    setAdviceState(SharedI18N.pick("已生成", "Ready"));
    setSubmitStatus(SharedI18N.pick(`建议已生成。来源：${data?.advice?.source || "-"}`, `Advice ready. Source: ${data?.advice?.source || "-"}`));
  } catch (error) {
    setAdviceState(SharedI18N.pick("生成失败", "Generation failed"));
    setSubmitStatus(SharedI18N.pick(`请求失败：${error.message}`, `Request failed: ${error.message}`));
  } finally {
    state.submitting = false;
    els.submitBtn.disabled = false;
  }
}

function bindEvents() {
  els.refreshContextBtn.addEventListener("click", loadRecentContext);
  els.addPairBtn.addEventListener("click", addPair);
  els.clearPairsBtn.addEventListener("click", clearPairs);
  els.submitBtn.addEventListener("click", submitAdvice);
  els.severity.addEventListener("input", () => {
    els.severityLabel.textContent = `${els.severity.value} / 5`;
  });
}

function boot() {
  const code = currentParticipantCode();
  rememberParticipantCode(code);
  renderRegionChips();
  renderSymptomChips();
  renderPairs();
  renderRecentContext();
  bindEvents();
  loadRecentContext();
}

document.addEventListener("DOMContentLoaded", boot);
