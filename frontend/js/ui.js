export class AppUI {
  constructor({ lessons, trainerItems }) {
    this.elements = {
      scrambleBtn: document.getElementById("scramble-btn"),
      resetBtn: document.getElementById("reset-btn"),
      speedToggleBtn: document.getElementById("speed-toggle-btn"),
      scrambleText: document.getElementById("scramble-text"),
      timerValue: document.getElementById("timer-value"),
      lessonList: document.getElementById("lesson-list"),
      lessonContent: document.getElementById("lesson-content"),
      practiceLessonBtn: document.getElementById("practice-lesson-btn"),
      trainerSelect: document.getElementById("trainer-select"),
      startTrainerBtn: document.getElementById("start-trainer-btn"),
      trainerContent: document.getElementById("trainer-content"),
      statsContent: document.getElementById("stats-content"),
      toast: document.getElementById("toast"),
    };

    this.lessons = lessons;
    this.trainerItems = trainerItems;
    this.currentLessonIndex = 0;

    this.renderLessonList();
    this.renderLessonContent(0);
    this.renderTrainerSelect();
    this.renderTrainerMessage("Pick an algorithm and start a drill.");
  }

  onScramble(handler) {
    this.elements.scrambleBtn.addEventListener("click", handler);
  }

  onReset(handler) {
    this.elements.resetBtn.addEventListener("click", handler);
  }

  onSpeedToggle(handler) {
    this.elements.speedToggleBtn.addEventListener("click", handler);
  }

  onPracticeLesson(handler) {
    this.elements.practiceLessonBtn.addEventListener("click", handler);
  }

  onStartTrainer(handler) {
    this.elements.startTrainerBtn.addEventListener("click", handler);
  }

  renderLessonList() {
    this.elements.lessonList.innerHTML = "";

    this.lessons.forEach((lesson, index) => {
      const button = document.createElement("button");
      button.className = `lesson-button${index === this.currentLessonIndex ? " active" : ""}`;
      button.textContent = lesson.title;
      button.addEventListener("click", () => this.renderLessonContent(index));
      this.elements.lessonList.appendChild(button);
    });
  }

  renderLessonContent(index) {
    this.currentLessonIndex = index;
    this.renderLessonList();

    const lesson = this.lessons[index];
    this.elements.lessonContent.innerHTML = `
      <p><strong>Objective:</strong> ${lesson.objective}</p>
      <p>${lesson.explanation}</p>
      <p><strong>Algorithm:</strong></p>
      <p class="code-line">${lesson.algorithm}</p>
      <p><strong>Practice Tips:</strong></p>
      <ul class="plain-list">
        ${lesson.tips.map((tip) => `<li>${tip}</li>`).join("")}
      </ul>
    `;
  }

  getCurrentLesson() {
    return this.lessons[this.currentLessonIndex];
  }

  renderTrainerSelect() {
    this.elements.trainerSelect.innerHTML = this.trainerItems
      .map((item) => `<option value="${item.id}">${item.name}</option>`)
      .join("");
  }

  getSelectedTrainerId() {
    return this.elements.trainerSelect.value;
  }

  renderTrainerMessage(message, algorithm = "") {
    this.elements.trainerContent.innerHTML = `
      <p>${message}</p>
      ${algorithm ? `<p class="code-line">${algorithm}</p>` : ""}
    `;
  }

  renderStats(stats) {
    const recent = stats.formatted.recent.length ? stats.formatted.recent.join(" | ") : "-";
    this.elements.statsContent.innerHTML = `
      <p><strong>Best:</strong> ${stats.formatted.best}s</p>
      <p><strong>Average:</strong> ${stats.formatted.average}s</p>
      <p><strong>Recent:</strong> ${recent}</p>
    `;
  }

  setTimer(value) {
    this.elements.timerValue.textContent = value;
  }

  setScramble(text) {
    this.elements.scrambleText.textContent = text;
  }

  setSpeedMode(active) {
    this.elements.speedToggleBtn.textContent = `Speed Mode: ${active ? "On" : "Off"}`;
  }

  toast(message) {
    const el = this.elements.toast;
    el.textContent = message;
    el.classList.add("visible");

    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      el.classList.remove("visible");
    }, 1800);
  }
}
