const STORAGE_KEY = "rep-count-coach-v3";
const app = document.getElementById("app");

let activeView = "home";
let activeWorkoutId = null;
let session = null;
let restTimer = null;
let audioContext = null;
let pendingRestoreState = null;

function dateKey(date = new Date()) {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function addDays(key, amount) {
    const date = new Date(`${key}T12:00:00`);
    date.setDate(date.getDate() + amount);
    return dateKey(date);
}

function defaultState() {
    return {
        programStart: dateKey(),
        weekendSwapped: false,
        substitutions: {},
        workouts: [],
        weighIns: [],
        nutrition: {},
        measurements: [],
        lastBackupAt: null
    };
}

function loadState() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return saved ? { ...defaultState(), ...saved } : defaultState();
    } catch (error) {
        return defaultState();
    }
}

let state = loadState();

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function programWeek() {
    const start = new Date(`${state.programStart}T12:00:00`);
    const today = new Date(`${dateKey()}T12:00:00`);
    return Math.max(1, Math.floor((today - start) / 604800000) + 1);
}

function getSchedule() {
    const schedule = BASE_SCHEDULE.map(item => ({ ...item }));
    if (state.weekendSwapped) {
        schedule[5] = { day: "Sat", long: "Saturday", type: "workout", title: "Full Body", workout: "fullBody" };
        schedule[6] = { day: "Sun", long: "Sunday", type: "climb", title: "Rock climbing" };
    }
    return schedule;
}

function todaySchedule() {
    const dayIndex = (new Date().getDay() + 6) % 7;
    return getSchedule()[dayIndex];
}

function exerciseName(id) {
    const exercise = EXERCISES[id];
    return state.substitutions[id] && exercise.alternate ? exercise.alternate : exercise.name;
}

function exerciseReps(id) {
    const exercise = EXERCISES[id];
    return state.substitutions[id] && exercise.alternateReps ? exercise.alternateReps : exercise.reps;
}

function prescribedSets(workoutId, exerciseId) {
    const workout = WORKOUTS[workoutId];
    const normal = workout.setOverrides?.[exerciseId] ?? EXERCISES[exerciseId].sets;
    return programWeek() === 1 ? Math.min(2, normal) : normal;
}

function previousExerciseSafe(exerciseId) {
    const selectedName = exerciseName(exerciseId);
    for (let i = state.workouts.length - 1; i >= 0; i--) {
        const found = state.workouts[i].exercises?.find(item => item.exerciseId === exerciseId && item.name === selectedName);
        if (found?.sets?.length) {
            const priorWorkout = WORKOUTS[state.workouts[i].workoutId];
            const targetSets = Number(found.targetSets) || priorWorkout?.setOverrides?.[exerciseId] || EXERCISES[exerciseId].sets;
            return { ...found, targetSets };
        }
    }
    return null;
}

function setSummary(sets) {
    if (!sets?.length) return "No previous sets yet";
    const weights = [...new Set(sets.map(set => Number(set.weight || 0)))];
    const weight = weights.length === 1 ? `${weights[0]} lb · ` : "";
    return `${weight}${sets.map(set => set.reps).join(", ")} reps`;
}

function progressionAdvice(exerciseId) {
    const previous = previousExerciseSafe(exerciseId);
    if (!previous) return "Use a light starting weight.";
    if (programWeek() < 3) return "Repeat the weight with controlled reps.";
    const [, top] = exerciseReps(exerciseId);
    const goodSets = previous.sets.filter(set => Number(set.reps) >= top && (set.rir === "" || Number(set.rir) >= 1));
    if (goodSets.length === previous.sets.length) {
        if (EXERCISES[exerciseId].bodyweight && !state.substitutions[exerciseId]) {
            return "Top reps reached. Add reps before using added weight.";
        }
        return "Top reps reached on every set. Use the smallest weight increase.";
    }
    const targetSet = previous.sets.find(set => Number(set.reps) < top);
    return `Repeat the weight and try for ${Math.min(top, Number(targetSet?.reps || 0) + 1)} clean reps on one set.`;
}

function weightStep(exerciseId) {
    return WEIGHT_GUIDE[exerciseId]?.step || 5;
}

function formatWeight(value) {
    return Number(value).toFixed(Number(value) % 1 === 0 ? 0 : 1);
}

function suggestedWeight(exerciseId) {
    const exercise = EXERCISES[exerciseId];
    const guide = WEIGHT_GUIDE[exerciseId] || { start: 0, step: 5 };
    const usingAlternate = Boolean(state.substitutions[exerciseId] && exercise.alternate);
    const previous = previousExerciseSafe(exerciseId);
    const step = guide.step || 5;

    if (!previous?.sets?.length) {
        const value = Number(usingAlternate && guide.alternateStart !== undefined ? guide.alternateStart : guide.start || 0);
        if (exercise.bodyweight && !usingAlternate) return { value: 0, label: "Bodyweight", reason: "No added weight." };
        return { value, label: `${formatWeight(value)} lb`, reason: value === 0 ? "Start with no added plates." : "First-session trial. Adjust for 2–3 RIR." };
    }

    const [minimum, maximum] = exerciseReps(exerciseId);
    const sets = previous.sets;
    const baseWeight = Number(sets[0].weight || 0);
    if (exercise.bodyweight && !usingAlternate && baseWeight === 0) {
        return { value: 0, label: "Bodyweight", reason: "Add reps before added weight." };
    }

    const sameWeight = sets.every(set => Number(set.weight || 0) === baseWeight);
    const allAtTop = sets.length >= previous.targetSets && sameWeight && sets.every(set => Number(set.reps) >= maximum && (set.rir === "" || Number(set.rir) >= 1));
    const hardSets = sets.filter(set => Number(set.reps) < minimum || (String(set.rir) === "0" && Number(set.reps) <= minimum)).length;

    if (allAtTop && programWeek() >= 3) {
        const value = baseWeight + step;
        return { value, label: `${formatWeight(value)} lb`, reason: `Last time: ${setSummary(sets)}. Increase one step.` };
    }
    if (hardSets >= Math.ceil(sets.length / 2) && baseWeight > 0) {
        const value = Math.max(0, baseWeight - step);
        return { value, label: `${formatWeight(value)} lb`, reason: `Last time: ${setSummary(sets)}. Reduce one step.` };
    }
    return { value: baseWeight, label: `${formatWeight(baseWeight)} lb`, reason: `Last time: ${setSummary(sets)}. Repeat the weight.` };
}

function icon(name) {
    const paths = {
        home: '<path d="M3 11.5 12 4l9 7.5V21h-6v-6H9v6H3z"/>',
        train: '<path d="M6 8v8M3 10v4m15-6v8m3-6v4M6 12h12"/>',
        nutrition: '<path d="M12 21c5-3 7-7 7-11-4 0-7 1-9 4m2 7C7 19 5 15 5 10c3 0 5 .5 7 2"/>',
        chevron: '<path d="m9 18 6-6-6-6"/>',
        swap: '<path d="m7 7-3 3 3 3m-3-3h13M17 17l3-3-3-3m3 3H7"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        check: '<path d="m5 12 4 4L19 6"/>',
        play: '<path d="m8 5 11 7-11 7z"/>'
    };
    return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}

function layout(content, view = activeView) {
    return `<main class="app-shell">${content}</main>${session ? "" : `
        <nav class="bottom-nav" aria-label="Main navigation">
            ${navButton("home", "Today", "home", view)}
            ${navButton("plan", "Workouts", "train", view)}
            ${navButton("nutrition", "Food", "nutrition", view)}
        </nav>`}`;
}

function navButton(target, label, iconName, current) {
    return `<button class="nav-item ${current === target ? "active" : ""}" onclick="navigate('${target}')">${icon(iconName)}<span>${label}</span></button>`;
}

window.navigate = function(view) {
    activeView = view;
    if (view === "home") renderHome();
    if (view === "plan") renderPlan();
    if (view === "nutrition") renderNutrition();
};

function renderHome() {
    activeView = "home";
    const today = todaySchedule();
    const schedule = getSchedule();
    app.innerHTML = layout(`
        <section class="screen home-screen">
            <header class="topbar">
                <div><p class="app-name">REP COUNT</p><h1>Today</h1></div>
                <button class="week-chip" onclick="showProgramSettings()">Week ${programWeek()}</button>
            </header>

            ${homeTodayCard(today)}

            <div class="section-heading"><h2>This week</h2><button onclick="toggleWeekendSwap()">${icon("swap")} Swap weekend</button></div>
            <div class="week-strip">
                ${schedule.map((item, index) => `<button class="day-pill ${isTodayIndex(index) ? "today" : ""} ${item.type}" onclick="openScheduleDay(${index})"><span>${item.day}</span><i></i><small>${item.type === "workout" ? "Lift" : item.type === "climb" ? "Climb" : "Rest"}</small></button>`).join("")}
            </div>

        </section>
    `, "home");
}

function homeTodayCard(today) {
    if (today.type === "workout") {
        const workout = WORKOUTS[today.workout];
        const sets = workout.exercises.reduce((sum, id) => sum + prescribedSets(today.workout, id), 0);
        const completed = state.workouts.some(item => item.date === dateKey() && item.workoutId === today.workout);
        return `<section class="today-workout-card">
            <div class="today-card-label"><span>${today.long}</span><strong>${completed ? "Completed" : "Workout"}</strong></div>
            <h2>${workout.name}</h2>
            <p>${workout.focus}</p>
            <div class="today-workout-meta"><span>${workout.exercises.length} exercises</span><span>${sets} working sets</span></div>
            <div class="home-exercise-preview">${workout.exercises.slice(0, 3).map((id, index) => `<span><i>${index + 1}</i>${exerciseName(id)}</span>`).join("")}<span><i>+</i>${workout.exercises.length - 3} more</span></div>
            <button class="button primary full home-start" onclick="startWorkout('${today.workout}')">${icon("play")} ${completed ? "Start again" : "Start workout"}</button>
            <button class="home-details" onclick="openWorkout('${today.workout}')">View exercises</button>
        </section>`;
    }
    if (today.type === "climb") {
        return `<section class="today-workout-card climb"><div class="today-card-label"><span>${today.long}</span><strong>Climbing</strong></div><h2>Rock climbing</h2><p>Counts as pulling and grip work.</p><button class="button primary full home-start" onclick="markClimbing()">Mark complete ${icon("check")}</button></section>`;
    }
    return `<section class="today-workout-card rest"><div class="today-card-label"><span>${today.long}</span><strong>Rest</strong></div><h2>Rest day</h2><p>No workout scheduled.</p><button class="button soft full home-start" onclick="navigate('plan')">View workouts ${icon("chevron")}</button></section>`;
}

function isTodayIndex(index) {
    return index === (new Date().getDay() + 6) % 7;
}

window.toggleWeekendSwap = function() {
    state.weekendSwapped = !state.weekendSwapped;
    saveState();
    activeView === "plan" ? renderPlan() : renderHome();
    toast(state.weekendSwapped ? "Full Body moved to Saturday" : "Climbing moved back to Saturday");
};

window.openScheduleDay = function(index) {
    const day = getSchedule()[index];
    if (day.type === "workout") openWorkout(day.workout);
    else {
        activeView = "plan";
        renderPlan(index);
    }
};

window.markClimbing = function() {
    const today = dateKey();
    const existing = state.workouts.find(item => item.date === today && item.type === "climb");
    if (!existing) state.workouts.push({ id: crypto.randomUUID?.() || String(Date.now()), date: today, type: "climb", name: "Rock climbing", exercises: [], duration: 0 });
    saveState();
    toast("Climbing logged");
    renderHome();
};

function renderPlan(selectedDay = null) {
    activeView = "plan";
    const schedule = getSchedule();
    app.innerHTML = layout(`
        <section class="screen">
            <header class="page-header"><div><h1>Workouts</h1></div><button class="week-chip" onclick="showProgramSettings()">Week ${programWeek()}</button></header>
            ${programWeek() === 1 ? `<div class="ramp-banner"><strong>Week 1</strong><span>2 working sets per exercise.</span></div>` : ""}
            <div class="weight-method"><strong>Suggested weights</strong><span>Based on saved reps and RIR. New exercises use a light trial weight.</span></div>
            <div class="home-workout-list workout-page-list">
                ${Object.entries(WORKOUTS).map(([id, workout]) => workoutPageRow(id, workout)).join("")}
            </div>
            <div class="section-heading schedule-heading"><h2>Schedule</h2></div>
            <div class="schedule-list">
                ${schedule.map((item, index) => scheduleRow(item, index, selectedDay)).join("")}
            </div>
            <button class="button soft full swap-button" onclick="toggleWeekendSwap()">${icon("swap")} ${state.weekendSwapped ? "Climb Saturday instead" : "Climb Sunday instead"}</button>
            <div class="safety-inline"><strong>Stop for unusual pain.</strong><p>Stop for sharp or joint pain, numbness, dizziness, chest pain, or feeling faint. Seek medical attention when needed.</p></div>
            <section class="history-section">
                <div class="section-heading"><h2>Recent activity</h2></div>
                ${state.workouts.length ? state.workouts.slice().reverse().slice(0, 5).map(historyRow).join("") : `<div class="empty-state">Completed workouts appear here.</div>`}
            </section>
            <section class="backup-section">
                <div><h2>Backup</h2><p>${state.lastBackupAt ? `Last saved ${formatBackupDate(state.lastBackupAt)}` : "Save your data to Files or iCloud Drive."}</p></div>
                <div class="backup-actions"><button class="button soft" onclick="backupData()">Back up</button><button class="button outline" onclick="chooseRestoreFile()">Restore</button></div>
                <input id="restore-file" type="file" accept="application/json,.json" hidden onchange="restoreData(event)">
            </section>
        </section>
    `, "plan");
}

function workoutPageRow(id, workout) {
    const sets = workout.exercises.reduce((sum, exerciseId) => sum + prescribedSets(id, exerciseId), 0);
    return `<article class="home-workout-row"><button class="home-workout-copy" onclick="openWorkout('${id}')"><strong>${workout.name}</strong><span>${workout.focus} · ${workout.exercises.length} exercises · ${sets} sets</span></button><button class="play-button" onclick="startWorkout('${id}')" aria-label="Start ${workout.name}">${icon("play")}<span>Start</span></button></article>`;
}

function scheduleRow(item, index, selectedDay) {
    const description = item.type === "workout" ? `${WORKOUTS[item.workout].focus} · ${WORKOUTS[item.workout].exercises.length} exercises` : item.type === "climb" ? "Grip, forearms, biceps, lats + upper back" : "Recovery, food + sleep";
    return `<button class="schedule-row ${item.type} ${isTodayIndex(index) ? "today" : ""} ${selectedDay === index ? "selected" : ""}" onclick="openScheduleDay(${index})">
        <span class="schedule-day">${item.day}</span><span class="schedule-icon">${item.type === "workout" ? "↗" : item.type === "climb" ? "◇" : "○"}</span>
        <span class="schedule-copy"><strong>${item.title}</strong><small>${description}</small></span>${item.type === "workout" ? icon("chevron") : ""}
    </button>`;
}

function historyRow(item) {
    const date = new Date(`${item.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const sets = item.exercises?.reduce((sum, exercise) => sum + exercise.sets.length, 0) || 0;
    return `<div class="history-row"><span><strong>${escapeHtml(item.name)}</strong><small>${date}</small></span><span>${item.type === "climb" ? "Completed" : `${sets} sets · ${item.duration || 0} min`}</span></div>`;
}

window.openWorkout = function(workoutId) {
    activeWorkoutId = workoutId;
    activeView = "workout";
    renderWorkoutOverview();
};

function renderWorkoutOverview() {
    const workout = WORKOUTS[activeWorkoutId];
    const totalSets = workout.exercises.reduce((sum, id) => sum + prescribedSets(activeWorkoutId, id), 0);
    app.innerHTML = layout(`
        <section class="screen workout-overview">
            <button class="text-back" onclick="navigate('plan')">← Workouts</button>
            <header class="workout-title"><p class="eyebrow">WEEK ${programWeek()}</p><h1>${workout.name}</h1><p>${workout.focus} · ${totalSets} working sets</p></header>
            <div class="coach-banner"><span>NOTE</span><p>${workout.note}</p></div>
            <ol class="exercise-list">
                ${workout.exercises.map((id, index) => overviewExercise(id, index)).join("")}
            </ol>
            <div class="sticky-action"><button class="button primary full" onclick="startWorkout('${activeWorkoutId}')">${icon("play")} Start workout</button></div>
        </section>
    `, "workout");
}

function overviewExercise(id, index) {
    const exercise = EXERCISES[id];
    const reps = exerciseReps(id);
    const previous = previousExerciseSafe(id);
    const suggestion = suggestedWeight(id);
    return `<li class="exercise-row">
        <span class="exercise-number">${String(index + 1).padStart(2, "0")}</span>
        <button class="exercise-copy" onclick="showExerciseInfo('${id}')"><strong>${exerciseName(id)}</strong><small>${prescribedSets(activeWorkoutId, id)} × ${reps[0]}–${reps[1]} · ${exercise.rest === "long" ? "2–3 min" : "1–2 min"}</small><em>Suggested · ${suggestion.label}</em>${previous ? `<em class="previous-result">Last · ${setSummary(previous.sets)}</em>` : ""}</button>
        ${exercise.alternate ? `<button class="sub-button" onclick="toggleSubstitution('${id}')">Swap</button>` : ""}
    </li>`;
}

window.toggleSubstitution = function(id) {
    state.substitutions[id] = !state.substitutions[id];
    saveState();
    if (session) renderActiveExercise(); else renderWorkoutOverview();
};

window.showExerciseInfo = function(id) {
    const exercise = EXERCISES[id];
    showModal(`<p class="eyebrow">${escapeHtml(exercise.muscles)}</p><h2>${escapeHtml(exerciseName(id))}</h2><p>${escapeHtml(exercise.cue)}</p><div class="coach-note"><span>Effort</span>${exercise.preserveRir ? "Keep about 2 reps in reserve before climbing." : programWeek() <= 2 ? "Stop with about 2–3 clean reps left." : "Most sets should finish with 1–2 clean reps left."}</div>`);
};

window.startWorkout = function(workoutId) {
    session = {
        id: crypto.randomUUID?.() || String(Date.now()),
        workoutId,
        startedAt: Date.now(),
        exerciseIndex: 0,
        setIndex: 0,
        drafts: {},
        exercises: WORKOUTS[workoutId].exercises.map(id => ({ exerciseId: id, name: exerciseName(id), targetSets: prescribedSets(workoutId, id), sets: [], warmups: [] }))
    };
    renderActiveExercise();
};

function currentSessionExercise() {
    return session.exercises[session.exerciseIndex];
}

function currentDraftKey() {
    return `${session.exerciseIndex}:${session.setIndex}`;
}

function currentSetDraft() {
    const key = currentDraftKey();
    if (!session.drafts[key]) {
        const log = currentSessionExercise();
        const id = log.exerciseId;
        const [minimum, maximum] = exerciseReps(id);
        const previousSet = previousExerciseSafe(id)?.sets?.[session.setIndex];
        const lastSet = log.sets.at(-1);
        const suggestion = suggestedWeight(id);
        const weight = lastSet ? Number(lastSet.weight) : suggestion.value;
        const priorWeight = Number(previousSet?.weight || 0);
        const reps = previousSet && weight === priorWeight
            ? Math.min(maximum, Math.max(minimum, Number(previousSet.reps) + 1))
            : minimum;
        session.drafts[key] = { weight, reps, rir: EXERCISES[id].preserveRir || programWeek() <= 2 ? "2" : "1" };
    }
    return session.drafts[key];
}

function renderActiveExercise() {
    const workout = WORKOUTS[session.workoutId];
    const log = currentSessionExercise();
    const id = log.exerciseId;
    const exercise = EXERCISES[id];
    const reps = exerciseReps(id);
    const setCount = prescribedSets(session.workoutId, id);
    const previous = previousExerciseSafe(id);
    const previousSet = previous?.sets?.[session.setIndex];
    const suggestion = suggestedWeight(id);
    const draft = currentSetDraft();
    const completed = session.exercises.reduce((sum, item) => sum + item.sets.length, 0);
    const total = workout.exercises.reduce((sum, exerciseId) => sum + prescribedSets(session.workoutId, exerciseId), 0);
    const exerciseProgress = session.exerciseIndex + Math.min(1, log.sets.length / setCount);
    const progressPercent = Math.min(100, exerciseProgress / workout.exercises.length * 100);
    const step = weightStep(id);
    const addedWeight = exercise.bodyweight && !state.substitutions[id];
    app.innerHTML = layout(`
        <section class="screen active-session">
            <header class="session-header">
                <button class="icon-button" onclick="confirmExitWorkout()" aria-label="Exit workout">×</button>
                <span>${workout.name}</span><strong>${completed}/${total} sets</strong>
            </header>
            <div class="session-progress" role="progressbar" aria-label="Workout progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progressPercent)}"><i style="width:${progressPercent}%"></i></div>
            <div class="exercise-position">EXERCISE ${session.exerciseIndex + 1} OF ${workout.exercises.length}</div>
            <div class="active-title-row"><div><h1>${escapeHtml(log.name)}</h1><p>${exercise.muscles}</p></div><div class="active-title-actions"><button class="sub-button" onclick="showExerciseInfo('${id}')">Form</button>${exercise.alternate ? `<button class="sub-button" onclick="swapDuringSession('${id}')">Swap</button>` : ""}</div></div>
            <div class="prescription-row"><span><strong>${setCount}</strong> sets</span><span><strong>${reps[0]}–${reps[1]}</strong> reps</span><span>${icon("clock")}<strong>${exercise.rest === "long" ? "2:30" : "1:30"}</strong> rest</span></div>
            <div class="set-tabs">${Array.from({ length: setCount }, (_, i) => `<span class="${i < log.sets.length ? "done" : i === session.setIndex ? "current" : ""}">${i < log.sets.length ? icon("check") : i + 1}</span>`).join("")}</div>
            <section class="set-card">
                <div class="set-card-head"><div><span>CURRENT SET</span><strong>Set ${Math.min(session.setIndex + 1, setCount)} of ${setCount}</strong></div><div><span>LAST TIME</span><strong>${previousSet ? `${previousSet.weight || 0} lb × ${previousSet.reps}` : "—"}</strong></div></div>
                <div class="suggested-weight">
                    <div><span>SUGGESTED WEIGHT</span><strong>${suggestion.label}</strong></div>
                    <p>${escapeHtml(suggestion.reason)}</p>
                </div>
                <div class="tap-controls">
                    <div class="tap-control">
                        <span>${addedWeight ? "ADDED WEIGHT" : "WEIGHT"}</span>
                        <div class="stepper"><button class="stepper-button" onclick="adjustDraftValue('weight', -1)" aria-label="Decrease weight by ${step} pounds">−</button><div class="stepper-value" aria-live="polite"><strong id="weight-display">${formatWeight(draft.weight)}</strong><small>lb</small></div><button class="stepper-button" onclick="adjustDraftValue('weight', 1)" aria-label="Increase weight by ${step} pounds">+</button></div>
                        <small>${formatWeight(step)} lb steps</small>
                    </div>
                    <div class="tap-control">
                        <span>REPS</span>
                        <div class="stepper"><button class="stepper-button" onclick="adjustDraftValue('reps', -1)" aria-label="Decrease reps">−</button><div class="stepper-value" aria-live="polite"><strong id="reps-display">${draft.reps}</strong><small>reps</small></div><button class="stepper-button" onclick="adjustDraftValue('reps', 1)" aria-label="Increase reps">+</button></div>
                        <small>Target ${reps[0]}–${reps[1]}</small>
                    </div>
                </div>
                <div class="rir-picker"><div><span>REPS IN RESERVE</span><small>Optional</small></div><div class="rir-buttons">${[["", "Skip"], ["3", "3+"], ["2", "2"], ["1", "1"], ["0", "0"]].map(([value, label]) => `<button class="${draft.rir === value ? "selected" : ""}" data-rir="${value}" onclick="selectDraftRir('${value}')">${label}</button>`).join("")}</div></div>
                <button class="button primary full complete-set-button" onclick="completeSet()">Complete set ${icon("check")}</button>
                <button class="button text full warmup-button" onclick="logWarmup()">Log warm-up</button>
            </section>
            <div class="session-bottom"><button onclick="skipExercise()">Skip exercise</button><button onclick="finishWorkoutEarly()">Finish workout</button></div>
        </section>
    `, "workout");
}

window.swapDuringSession = function(id) {
    if (currentSessionExercise().sets.length) return toast("Finish this exercise before swapping");
    delete session.drafts[currentDraftKey()];
    state.substitutions[id] = !state.substitutions[id];
    currentSessionExercise().name = exerciseName(id);
    saveState();
    renderActiveExercise();
};

window.adjustDraftValue = function(field, direction) {
    const draft = currentSetDraft();
    if (field === "weight") {
        draft.weight = Math.max(0, Math.round((draft.weight + weightStep(currentSessionExercise().exerciseId) * direction) * 10) / 10);
        const display = document.getElementById("weight-display");
        if (display) display.textContent = formatWeight(draft.weight);
    } else {
        draft.reps = Math.max(0, Math.min(99, draft.reps + direction));
        const display = document.getElementById("reps-display");
        if (display) display.textContent = draft.reps;
    }
};

window.selectDraftRir = function(value) {
    currentSetDraft().rir = value;
    document.querySelectorAll(".rir-buttons button").forEach(button => button.classList.toggle("selected", button.dataset.rir === value));
};

window.logWarmup = function() {
    currentSessionExercise().warmups.push({ ...currentSetDraft() });
    toast(`Warm-up ${currentSessionExercise().warmups.length} logged`);
};

window.completeSet = function() {
    const values = { ...currentSetDraft() };
    const log = currentSessionExercise();
    const exercise = EXERCISES[log.exerciseId];
    log.sets.push(values);
    session.setIndex++;
    const exerciseDone = session.setIndex >= prescribedSets(session.workoutId, log.exerciseId);
    const workoutDone = exerciseDone && session.exerciseIndex === session.exercises.length - 1;
    if (workoutDone) return finishWorkout();
    if (exerciseDone) {
        const completedName = log.name;
        const completedId = log.exerciseId;
        advanceExercise();
        const nextName = currentSessionExercise().name;
        const nextId = currentSessionExercise().exerciseId;
        renderActiveExercise();
        showRestTimer({
            seconds: Math.max(exerciseRestSeconds(completedId), exerciseRestSeconds(nextId)),
            timerType: "exercise",
            completedName,
            nextName
        });
    } else {
        renderActiveExercise();
        showRestTimer({
            seconds: exerciseRestSeconds(log.exerciseId),
            timerType: "set",
            nextSet: session.setIndex + 1,
            exerciseName: log.name
        });
    }
};

function advanceExercise() {
    session.exerciseIndex++;
    session.setIndex = 0;
}

window.skipExercise = function() {
    if (session.exerciseIndex >= session.exercises.length - 1) finishWorkout();
    else {
        advanceExercise();
        renderActiveExercise();
        toast("Exercise skipped");
    }
};

window.finishWorkoutEarly = function() {
    const completed = session.exercises.reduce((sum, item) => sum + item.sets.length, 0);
    if (!completed) return confirmExitWorkout();
    finishWorkout();
};

window.confirmExitWorkout = function() {
    showModal(`<h2>Leave this workout?</h2><p>Sets from an unfinished session are not saved.</p><div class="modal-actions"><button class="button soft" onclick="closeModal()">Keep training</button><button class="button danger" onclick="discardWorkout()">Leave</button></div>`);
};

window.discardWorkout = function() {
    session = null;
    closeModal();
    renderHome();
};

function finishWorkout() {
    const workout = WORKOUTS[session.workoutId];
    const completedExercises = session.exercises.filter(item => item.sets.length);
    const duration = Math.max(1, Math.round((Date.now() - session.startedAt) / 60000));
    const record = { id: session.id, date: dateKey(), type: "workout", name: workout.name, workoutId: session.workoutId, duration, exercises: completedExercises };
    const personalBests = completedExercises.filter(isPersonalBest).map(item => item.name);
    const increase = completedExercises.filter(item => shouldIncrease(item)).map(item => item.name);
    const repeat = completedExercises.filter(item => !increase.includes(item.name)).map(item => item.name);
    state.workouts.push(record);
    saveState();
    const allSets = completedExercises.flatMap(item => item.sets);
    const totalReps = allSets.reduce((sum, set) => sum + Number(set.reps), 0);
    const volume = allSets.reduce((sum, set) => sum + Number(set.reps) * Number(set.weight), 0);
    session = null;
    playCompleteSound();
    app.innerHTML = `<main class="app-shell"><section class="screen finish-screen"><div class="success-mark">${icon("check")}</div><h1>Workout complete</h1><p>${workout.name}</p>
        <div class="summary-grid"><div><strong>${completedExercises.length}</strong><span>exercises</span></div><div><strong>${allSets.length}</strong><span>working sets</span></div><div><strong>${totalReps}</strong><span>total reps</span></div><div><strong>${duration}</strong><span>minutes</span></div></div>
        ${volume ? `<p class="volume-note">${Math.round(volume).toLocaleString()} lb total volume</p>` : ""}
        <div class="summary-callout"><span>NEXT TIME</span>${personalBests.length ? `<p><strong>Personal best:</strong> ${personalBests.join(", ")}.</p>` : ""}${increase.length ? `<p><strong>Small increase:</strong> ${increase.join(", ")}.</p>` : ""}${repeat.length ? `<p><strong>Repeat and add reps:</strong> ${repeat.join(", ")}.</p>` : ""}</div>
        <button class="button soft full summary-backup" onclick="backupData()">Back up data</button>
        <button class="button primary full" onclick="navigate('home')">Back to today</button></section></main>`;
}

function isPersonalBest(item) {
    const currentScore = Math.max(...item.sets.map(set => Number(set.weight || 0) > 0 ? Number(set.weight) * Number(set.reps) : Number(set.reps)));
    const priorScores = state.workouts.flatMap(workout => workout.exercises || [])
        .filter(exercise => exercise.exerciseId === item.exerciseId && exercise.name === item.name)
        .flatMap(exercise => exercise.sets || [])
        .map(set => Number(set.weight || 0) > 0 ? Number(set.weight) * Number(set.reps) : Number(set.reps));
    return priorScores.length > 0 && currentScore > Math.max(...priorScores);
}

function shouldIncrease(item) {
    if (programWeek() < 3) return false;
    const exercise = EXERCISES[item.exerciseId];
    const top = exerciseReps(item.exerciseId)[1];
    return item.sets.length === prescribedSets(session?.workoutId || activeWorkoutId || "upperA", item.exerciseId) && item.sets.every(set => Number(set.reps) >= top && (set.rir === "" || Number(set.rir) >= 1));
}

function exerciseRestSeconds(exerciseId) {
    return EXERCISES[exerciseId].rest === "long" ? 150 : 90;
}

function showRestTimer({ seconds, timerType, nextSet, exerciseName, completedName, nextName }) {
    clearInterval(restTimer);
    let remaining = seconds;
    const isExerciseTransition = timerType === "exercise";
    const label = isExerciseTransition ? "EXERCISE DONE" : "REST";
    const title = isExerciseTransition ? completedName : `Set ${nextSet} next`;
    const description = isExerciseTransition
        ? `Next: ${nextName}`
        : `${exerciseName} · set ${nextSet}`;
    const continueLabel = isExerciseTransition ? "Next exercise" : `Start set ${nextSet}`;
    const overlay = document.createElement("div");
    overlay.className = `rest-overlay ${isExerciseTransition ? "exercise-rest" : "set-rest"}`;
    overlay.innerHTML = `<div class="rest-sheet"><div class="timer-kind"><span>${label}</span><small>${isExerciseTransition ? "Between exercises" : "Between sets"}</small></div><h2 id="rest-title">${escapeHtml(title)}</h2><div class="rest-clock" id="rest-clock">${formatTime(remaining)}</div><p>${escapeHtml(description)}</p><button class="button primary full rest-continue" id="rest-continue" onclick="closeRestTimer()">${escapeHtml(continueLabel)}</button></div>`;
    document.body.appendChild(overlay);
    window.closeRestTimer = () => { clearInterval(restTimer); overlay.remove(); };
    function updateRestDisplay() {
        const display = document.getElementById("rest-clock");
        if (display) display.textContent = formatTime(remaining);
    }
    function startCountdown() {
        clearInterval(restTimer);
        restTimer = setInterval(() => {
            remaining = Math.max(0, remaining - 1);
            updateRestDisplay();
            if (remaining === 0) {
                clearInterval(restTimer);
                overlay.classList.add("timer-finished");
                const restTitle = document.getElementById("rest-title");
                if (restTitle) restTitle.textContent = "Rest complete";
                playTimerSound();
                navigator.vibrate?.([150, 100, 150]);
            }
        }, 1000);
    }
    startCountdown();
}

function formatTime(seconds) {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function beep(frequencies) {
    try {
        audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
        frequencies.forEach((frequency, index) => {
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();
            oscillator.connect(gain).connect(audioContext.destination);
            oscillator.frequency.value = frequency;
            gain.gain.setValueAtTime(0.08, audioContext.currentTime + index * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + index * 0.12 + 0.3);
            oscillator.start(audioContext.currentTime + index * 0.12);
            oscillator.stop(audioContext.currentTime + index * 0.12 + 0.3);
        });
    } catch (error) { /* Sound is an enhancement only. */ }
}

function playTimerSound() { beep([523, 659, 784]); }
function playCompleteSound() { beep([392, 523, 659, 784]); }

function renderNutrition() {
    activeView = "nutrition";
    const today = todaySchedule();
    const activity = today.type === "workout" ? WORKOUTS[today.workout].name : today.type === "climb" ? "Rock climbing" : "Rest day";
    const timing = today.type === "workout"
        ? "Have the snack 1–2 hours before training or after it."
        : today.type === "climb"
            ? "Have the snack before or after climbing. Keep the full carb serving."
            : "Keep the same protein and meal portions.";
    app.innerHTML = layout(`
        <section class="screen food-screen">
            <header class="page-header"><div><h1>Dining hall meals</h1><p>${activity}</p></div></header>

            <section class="goal-panel">
                <p class="eyebrow">GOALS</p>
                <div class="goal-grid">
                    <div><strong>80–100g</strong><span>protein</span></div>
                    <div><strong>+300</strong><span>calories, roughly</span></div>
                    <div><strong>0.25–0.5</strong><span>lb gained / week</span></div>
                </div>
            </section>

            <div class="today-food-note"><span>TIMING</span><p>${timing}</p></div>

            <div class="section-heading meal-heading"><h2>Meals</h2><span>About 80–100g protein total</span></div>
            <div class="meal-plan">
                ${mealCard("01", "Breakfast", "≈ 25g protein", ["2 eggs", "¾–1 cup Greek yogurt", "1 bagel or 2 slices toast", "1 piece of fruit"])}
                ${mealCard("02", "Lunch", "≈ 22–30g protein", ["3–4 oz chicken, turkey, or beef — about 1 small palm", "1½ cups rice or pasta, or 1 large potato", "1 cup vegetables", "1 oz cheese or 1 tbsp olive oil for extra energy"])}
                ${mealCard("03", "Snack", "≈ 10–15g protein", ["12–16 oz milk", "or ¾ cup Greek yogurt with ½ cup granola", "Add a banana if training or climbing is soon"])}
                ${mealCard("04", "Dinner", "≈ 22–30g protein", ["3–4 oz chicken, turkey, or beef — about 1 small palm", "1½ cups rice, pasta, or potatoes", "1 cup vegetables", "1 roll or 2 slices bread if still hungry"])}
            </div>

            <section class="dining-swaps">
                <h2>Food swaps</h2>
                <div><span>Protein</span><p>3 eggs + ¾ cup Greek yogurt, a 3–4 oz burger patty, sliced turkey, cottage cheese, or beans with cheese.</p></div>
                <div><span>Carbs</span><p>1½ cups cereal with milk, 1 bagel, 2 cups potatoes, 1½ cups rice or pasta, or 2–3 slices bread.</p></div>
                <div><span>Extra calories</span><p>Choose one: 12 oz milk, 1 bagel with 1 oz cheese, 1 cup rice, or 1 tbsp olive oil plus a dinner roll.</p></div>
            </section>

            <div class="adjustment-note"><strong>If your nutrition app shows no gain after about 2 weeks</strong><p>Add one extra item each day—such as 1 cup whole milk or ¾ cup cooked rice—providing roughly another 150–200 calories.</p></div>
            <p class="medical-note">Keep drinking regularly, especially around workouts and climbing. If you are losing weight unintentionally or cannot gain despite consistently trying, consider talking with a doctor or registered dietitian.</p>
        </section>
    `, "nutrition");
}

function mealCard(number, title, protein, items) {
    return `<article class="meal-card"><div class="meal-title"><span>${number}</span><div><h3>${title}</h3><small>${protein}</small></div></div><ul>${items.map(item => `<li>${item}</li>`).join("")}</ul></article>`;
}

function formatBackupDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "recently";
    return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

window.backupData = async function() {
    const exportedAt = new Date().toISOString();
    const snapshot = { ...state, lastBackupAt: exportedAt };
    const payload = JSON.stringify({ app: "Rep Count", version: 1, exportedAt, data: snapshot }, null, 2);
    const filename = `rep-count-backup-${dateKey()}.json`;
    const blob = new Blob([payload], { type: "application/json" });

    try {
        if (typeof File !== "undefined" && navigator.share) {
            const file = new File([blob], filename, { type: "application/json" });
            if (!navigator.canShare || navigator.canShare({ files: [file] })) {
                await navigator.share({ title: "Rep Count backup", files: [file] });
                markBackupComplete(exportedAt);
                return;
            }
        }
        downloadBackup(blob, filename);
        markBackupComplete(exportedAt);
    } catch (error) {
        if (error?.name === "AbortError") return;
        downloadBackup(blob, filename);
        markBackupComplete(exportedAt);
    }
};

function downloadBackup(blob, filename) {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function markBackupComplete(exportedAt) {
    state.lastBackupAt = exportedAt;
    saveState();
    const status = document.querySelector(".backup-section p");
    if (status) status.textContent = `Last saved ${formatBackupDate(exportedAt)}`;
    toast("Backup saved");
}

window.chooseRestoreFile = function() {
    document.getElementById("restore-file")?.click();
};

window.restoreData = async function(event) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast("Backup file is too large");
    try {
        const parsed = JSON.parse(await file.text());
        const rawState = parsed?.app === "Rep Count" ? parsed.data : parsed;
        pendingRestoreState = normalizeBackupState(rawState);
        showModal(`<h2>Restore backup?</h2><p>This replaces the data stored on this device.</p><div class="restore-summary"><strong>${pendingRestoreState.workouts.length}</strong><span>saved activities</span></div><div class="modal-actions"><button class="button soft" onclick="cancelRestore()">Cancel</button><button class="button primary" onclick="confirmRestore()">Restore</button></div>`);
    } catch (error) {
        pendingRestoreState = null;
        toast("Invalid backup file");
    }
};

window.cancelRestore = function() {
    pendingRestoreState = null;
    closeModal();
};

window.confirmRestore = function() {
    if (!pendingRestoreState) return;
    state = pendingRestoreState;
    pendingRestoreState = null;
    session = null;
    saveState();
    closeModal();
    renderPlan();
    toast("Backup restored");
};

function normalizeBackupState(raw) {
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.workouts)) throw new Error("Invalid backup");
    const clean = defaultState();
    clean.programStart = validDate(raw.programStart) ? raw.programStart : dateKey();
    clean.weekendSwapped = Boolean(raw.weekendSwapped);
    clean.lastBackupAt = typeof raw.lastBackupAt === "string" && !Number.isNaN(Date.parse(raw.lastBackupAt)) ? raw.lastBackupAt : null;
    clean.substitutions = {};
    Object.keys(EXERCISES).forEach(id => {
        if (raw.substitutions?.[id] === true) clean.substitutions[id] = true;
    });
    clean.workouts = raw.workouts.slice(-1000).map(sanitizeWorkout).filter(Boolean);
    clean.weighIns = Array.isArray(raw.weighIns) ? raw.weighIns.slice(-1000).map(entry => ({ date: validDate(entry?.date) ? entry.date : dateKey(), weight: safeNumber(entry?.weight, 0, 1500) })).filter(entry => entry.weight > 0) : [];
    clean.nutrition = raw.nutrition && typeof raw.nutrition === "object" ? Object.fromEntries(Object.entries(raw.nutrition).filter(([day]) => validDate(day)).slice(-1000)) : {};
    clean.measurements = Array.isArray(raw.measurements) ? raw.measurements.slice(-500) : [];
    return clean;
}

function sanitizeWorkout(record, index) {
    if (!record || typeof record !== "object") return null;
    const isClimb = record.type === "climb";
    const workoutId = Object.hasOwn(WORKOUTS, record.workoutId) ? record.workoutId : null;
    if (!isClimb && !workoutId) return null;
    const exercises = isClimb || !Array.isArray(record.exercises) ? [] : record.exercises.map(log => sanitizeExerciseLog(log, workoutId)).filter(Boolean);
    return {
        id: typeof record.id === "string" ? record.id.slice(0, 100) : `restored-${index}-${Date.now()}`,
        date: validDate(record.date) ? record.date : dateKey(),
        type: isClimb ? "climb" : "workout",
        name: isClimb ? "Rock climbing" : WORKOUTS[workoutId].name,
        workoutId: isClimb ? undefined : workoutId,
        duration: Math.round(safeNumber(record.duration, 0, 1440)),
        exercises
    };
}

function sanitizeExerciseLog(log, workoutId) {
    const exercise = EXERCISES[log?.exerciseId];
    if (!exercise) return null;
    const allowedNames = [exercise.name, exercise.alternate].filter(Boolean);
    const fallbackSets = WORKOUTS[workoutId]?.setOverrides?.[log.exerciseId] || exercise.sets;
    return {
        exerciseId: log.exerciseId,
        name: allowedNames.includes(log.name) ? log.name : exercise.name,
        targetSets: Number.isFinite(Number(log.targetSets)) ? Math.round(safeNumber(log.targetSets, 1, 20)) : fallbackSets,
        sets: Array.isArray(log.sets) ? log.sets.slice(0, 20).map(sanitizeSetLog) : [],
        warmups: Array.isArray(log.warmups) ? log.warmups.slice(0, 20).map(sanitizeSetLog) : []
    };
}

function sanitizeSetLog(set) {
    const rir = ["", "0", "1", "2", "3"].includes(String(set?.rir ?? "")) ? String(set?.rir ?? "") : "";
    return { weight: safeNumber(set?.weight, 0, 10000), reps: Math.round(safeNumber(set?.reps, 0, 1000)), rir };
}

function safeNumber(value, minimum, maximum) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : minimum;
}

function validDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T12:00:00`);
    return !Number.isNaN(parsed.getTime()) && dateKey(parsed) === value;
}

window.showProgramSettings = function() {
    showModal(`<h2>Program week ${programWeek()}</h2><p>Week 1 uses 2 sets per exercise. Week 2 onward uses the full set count.</p><label class="modal-date"><span>Program start date</span><input id="program-start" type="date" value="${state.programStart}"></label><button class="button primary full" onclick="saveProgramStart()">Save</button>`);
};

window.saveProgramStart = function() {
    const value = document.getElementById("program-start").value;
    if (!value) return;
    state.programStart = value;
    saveState();
    closeModal();
    navigate(activeView === "plan" ? "plan" : "home");
};

function showModal(content) {
    closeModal();
    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.id = "modal";
    modal.addEventListener("click", event => {
        if (event.target === modal) closeModal();
    });
    modal.innerHTML = `<div class="modal-sheet"><button class="modal-close" onclick="closeModal()" aria-label="Close">×</button>${content}</div>`;
    document.body.appendChild(modal);
}

window.closeModal = function() { document.getElementById("modal")?.remove(); };

function toast(message) {
    document.querySelector(".toast")?.remove();
    const element = document.createElement("div");
    element.className = "toast";
    element.textContent = message;
    document.body.appendChild(element);
    setTimeout(() => element.remove(), 2400);
}

renderHome();
