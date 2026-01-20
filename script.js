// State
let currentExerciseIndex = 0;
let currentSet = 1;
let isWorkoutActive = false;
let totalSetsInRoutine = 0;
let completedSetsInRoutine = 0;
let currentVideoIndex = 0;

// DOM Elements
const app = document.getElementById('app');

// Initialize
function init() {
    calculateTotalSets();
    renderList();
}

function calculateTotalSets() {
    totalSetsInRoutine = workoutRoutine.reduce((total, exercise) => total + exercise.sets, 0);
}

// Render the List View
function renderList() {
    isWorkoutActive = false;
    currentExerciseIndex = 0;
    currentSet = 1;
    completedSetsInRoutine = 0;
    currentVideoIndex = 0;

    // Progression notes HTML
    const notesHtml = (typeof progressionNotes !== 'undefined' && progressionNotes.length) ? `
        <div class="progression-notes" style="margin-top: 20px; padding: 15px; background: var(--card-bg); border-radius: 0;">
            <h3 style="font-size: 1.1rem; margin-bottom: 10px;">Notes</h3>
            <ul style="padding-left: 20px; color: var(--text-muted); font-size: 0.9rem;">
                ${progressionNotes.map(note => `<li style="margin-bottom: 5px;">${note}</li>`).join('')}
            </ul>
        </div>
    ` : '';

    let listHtml = `
        <div class="view" style="padding-top: 40px;">
            <ul class="workout-list">
                ${workoutRoutine.map((exercise, index) => `
                    <li class="workout-item" onclick="startWorkout(${index})">
                        <div class="workout-index">${index + 1}</div>
                        <div class="workout-info">
                            <h3>${exercise.name}</h3>
                            <span>${exercise.sets} Sets • ${exercise.reps} Reps</span>
                        </div>
                    </li>
                `).join('')}
            </ul>
            ${notesHtml}
            <div style="height: 80px;"></div>
            <button class="start-btn" onclick="startWorkout(0)">Start Workout</button>
        </div>
    `;
    app.innerHTML = listHtml;
}

// Start specific exercise or beginning
window.startWorkout = function(index) {
    currentExerciseIndex = index;
    currentSet = 1;
    currentVideoIndex = 0;
    
    // Recalculate completed sets based on starting index
    completedSetsInRoutine = 0;
    for(let i=0; i<index; i++) {
        completedSetsInRoutine += workoutRoutine[i].sets;
    }

    isWorkoutActive = true;
    renderActiveExercise();
}

// Render the Active Exercise View
function renderActiveExercise() {
    const exercise = workoutRoutine[currentExerciseIndex];
    const isLastExercise = currentExerciseIndex === workoutRoutine.length - 1;
    
    // Calculate progress based on total sets completed so far (including current partial progress)
    // Actually, we want progress to update *after* a set is done.
    // So current progress is completedSetsInRoutine / totalSetsInRoutine
    const progress = (completedSetsInRoutine / totalSetsInRoutine) * 100;

    let videoHtml = '';
    const videoUrls = exercise.videoUrls || [];
    const currentVideoUrl = videoUrls.length > 0 ? videoUrls[currentVideoIndex] : null;

    if (currentVideoUrl) {
        // pointer-events: none prevents clicking/pausing/UI menu
        videoHtml = `
            <video src="${currentVideoUrl}" autoplay loop muted playsinline 
                style="width:100%; height:100%; object-fit: cover; pointer-events: none;">
            </video>
        `;
        
        // Add switch button if multiple videos
        if (videoUrls.length > 1) {
            videoHtml += `
                <button class="btn-switch-video" onclick="switchVideo()">
                    Switch View (${currentVideoIndex + 1}/${videoUrls.length})
                </button>
            `;
        }
    } else if (exercise.videoUrl) {
         // Fallback for old data structure if any
         if (exercise.videoUrl.endsWith('.mp4')) {
             videoHtml = `<video src="${exercise.videoUrl}" autoplay loop muted playsinline style="width:100%; height:100%; object-fit: cover; pointer-events: none;"></video>`;
        } else {
             videoHtml = `<iframe src="${exercise.videoUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        }
    } else {
        videoHtml = `<div style="display:flex;justify-content:center;align-items:center;height:100%;color:var(--text-muted);flex-direction:column;text-align:center;padding:20px;">
            <div style="font-size:2rem;margin-bottom:10px;">:(</div>
            <div>No video for this exercise</div>
        </div>`;
    }

    let html = `
        <div class="view active-workout-container">
            <button class="back-btn" onclick="renderList()">← Back to List</button>
            
            <div class="progress-bar">
                <div class="progress-fill" id="progress-fill" style="width: ${progress}%"></div>
            </div>

            <header style="margin-top: 10px;">
                <h2>${exercise.name}</h2>
                <p>${exercise.description}</p>
            </header>

            <div class="video-container">
                ${videoHtml}
            </div>

            <div class="stats-container">
                <div class="stat-box">
                    <span class="stat-label">Set</span>
                    <span class="stat-value" id="set-display">${currentSet} / ${exercise.sets}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Reps</span>
                    <span class="stat-value">${exercise.reps}</span>
                </div>
            </div>

            <div class="controls">
                 <button class="btn btn-secondary" onclick="nextExercise()">
                    ${isLastExercise ? 'Finish Workout' : 'Next Exercise'}
                </button>
                <button class="btn btn-highlight" onclick="logSet()">
                    ${currentSet < exercise.sets ? 'Complete Set' : 'Finish Exercise'}
                </button>
            </div>
        </div>
    `;
    app.innerHTML = html;
}

// Logic for completing a set
let audioCtx; // Global audio context

window.logSet = function() {
    // Initialize/Resume Audio Context on user interaction
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } else if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const exercise = workoutRoutine[currentExerciseIndex];
    
    // Update global progress
    completedSetsInRoutine++;
    updateProgressBar();

    // Trigger Rest Timer if rest > 0
    // Use fallback to 0 if property is missing
    const restTime = exercise.restSeconds || 0;
    
    // Check if this is the very last set of the entire workout
    const isLastExercise = currentExerciseIndex === workoutRoutine.length - 1;
    const isLastSet = currentSet === exercise.sets;
    const isWorkoutComplete = isLastExercise && isLastSet;

    if (restTime > 0 && !isWorkoutComplete) {
        startRestTimer(restTime, () => {
             // Callback after rest or skip
             advanceSetOrExercise(exercise);
        });
    } else {
        advanceSetOrExercise(exercise);
    }
}

function advanceSetOrExercise(exercise) {
    if (currentSet < exercise.sets) {
        currentSet++;
        updateSetDisplay();
    } else {
        nextExercise();
    }
}

// Rest Timer Logic
let restTimerInterval;
let remainingTime;
let totalRestTime; // Store original total time for progress calculation

function startRestTimer(seconds, callback) {
    remainingTime = seconds;
    totalRestTime = seconds;
    
    // Calculate SVG parameters
    const radius = 90;
    const circumference = 2 * Math.PI * radius;

    const overlay = document.createElement('div');
    overlay.className = 'rest-overlay';
    overlay.innerHTML = `
        <div class="rest-label">Resting...</div>
        <div class="rest-timer-container">
            <svg class="timer-svg" viewBox="0 0 200 200">
                <circle class="timer-circle-bg" cx="100" cy="100" r="${radius}"></circle>
                <circle class="timer-circle-progress" cx="100" cy="100" r="${radius}" 
                    stroke-dasharray="${circumference}" 
                    stroke-dashoffset="0"></circle>
            </svg>
            <div class="rest-time-display" id="rest-display">${formatTime(remainingTime)}</div>
        </div>
        <div class="rest-controls">
            <button class="btn-add-time" onclick="addRestTime(30)">+30s</button>
            <button class="btn-skip" onclick="skipRest()">Skip</button>
        </div>
    `;
    document.body.appendChild(overlay);

    // Function to update progress bar
    const updateCircle = () => {
        const circle = document.querySelector('.timer-circle-progress');
        if (circle) {
            const progress = remainingTime / totalRestTime;
            const offset = circumference - (progress * circumference);
            circle.style.strokeDashoffset = offset;
        }
    };

    restTimerInterval = setInterval(() => {
        remainingTime--;
        const display = document.getElementById('rest-display');
        if (display) display.innerText = formatTime(remainingTime);
        updateCircle();

        if (remainingTime <= 0) {
            clearInterval(restTimerInterval);
            playTimerCompleteSound();
            closeRestOverlay(callback);
        }
    }, 1000);

    // Expose skip function globally for the button
    window.skipRest = function() {
        clearInterval(restTimerInterval);
        closeRestOverlay(callback);
    };

    window.addRestTime = function(amount) {
        remainingTime += amount;
        totalRestTime += amount; // Update total time to keep progress bar smooth
        const display = document.getElementById('rest-display');
        if (display) display.innerText = formatTime(remainingTime);
        updateCircle();
    }
}

function closeRestOverlay(callback) {
    const overlay = document.querySelector('.rest-overlay');
    if (overlay) {
        overlay.remove();
    }
    if (callback) callback();
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function playTimerCompleteSound() {
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    
    // "Success" Triad (Rising C Major)
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    
    notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        
        gain.gain.setValueAtTime(0, now + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.15, now + i * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
        
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.4);
    });
}

function playVictorySound() {
    if (!audioCtx) return;
    
    const now = audioCtx.currentTime;
    // "Level Up" Fanfare (8-bit style)
    const notes = [
        261.63, // C4
        329.63, // E4
        392.00, // G4
        523.25, // C5
        392.00, // G4
        523.25, // C5
        659.25, // E5
        783.99, // G5
        1046.50 // C6
    ]; 
    
    notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'square'; // Retro game sound
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        
        // Lower volume for square wave
        const volume = 0.05; 
        const duration = (i === notes.length - 1) ? 1.5 : 0.1;

        gain.gain.setValueAtTime(0, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(volume, now + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + duration);
        
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + duration);
    });
}

function updateProgressBar() {
    const progress = (completedSetsInRoutine / totalSetsInRoutine) * 100;
    const fill = document.getElementById('progress-fill');
    if (fill) {
        fill.style.width = `${progress}%`;
    }
}

function updateSetDisplay() {
    const exercise = workoutRoutine[currentExerciseIndex];
    const setDisplay = document.getElementById('set-display');
    const btn = document.querySelector('.btn-highlight');
    
    if(setDisplay) {
        setDisplay.innerText = `${currentSet} / ${exercise.sets}`;
        // Animate change
        setDisplay.style.transform = 'scale(1.2)';
        setTimeout(() => setDisplay.style.transform = 'scale(1)', 200);
    }

    if(btn) {
         btn.innerText = currentSet < exercise.sets ? 'Complete Set' : 'Finish Exercise';
    }
}

// Logic for next exercise
window.nextExercise = function() {
    if (currentExerciseIndex < workoutRoutine.length - 1) {
        currentExerciseIndex++;
        currentSet = 1;
        currentVideoIndex = 0;
        renderActiveExercise();
    } else {
        // Workout Finished
        renderFinishScreen();
    }
}

// Switch between video angles
window.switchVideo = function() {
    const exercise = workoutRoutine[currentExerciseIndex];
    if (exercise.videoUrls && exercise.videoUrls.length > 1) {
        currentVideoIndex = (currentVideoIndex + 1) % exercise.videoUrls.length;
        renderActiveExercise();
    }
}

function renderFinishScreen() {
    let html = `
        <div class="view" style="justify-content: center; text-align: center;">
            <h1 style="color: var(--secondary)">Workout Complete!</h1>
            <p>Great job today.</p>
            <br>
            <button class="start-btn" onclick="renderList()" style="position: static; transform: none;">Back to Home</button>
        </div>
    `;
    app.innerHTML = html;
    
    // Trigger confetti
    triggerConfetti();
    playVictorySound();
}

function triggerConfetti() {
    if (typeof confetti === 'function') {
        // Fire a few bursts
        var duration = 3 * 1000;
        var animationEnd = Date.now() + duration;
        var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 2000 };

        var random = function(min, max) {
            return Math.random() * (max - min) + min;
        };

        var interval = setInterval(function() {
            var timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            var particleCount = 50 * (timeLeft / duration);
            // since particles fall down, start a bit higher than random
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: random(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: random(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);
    }
}

// Start app
init();
