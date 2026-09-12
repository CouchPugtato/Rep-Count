const EXERCISES = {
    dbBench: { name: "Dumbbell Bench Press", alternate: "Machine Chest Press", sets: 3, reps: [8, 12], rest: "long", muscles: "Chest · triceps", cue: "Keep your feet planted and lower with control.", compound: true },
    inclinePress: { name: "Incline Dumbbell Press", sets: 2, reps: [8, 12], rest: "long", muscles: "Upper chest · triceps", cue: "Use a low incline and keep your shoulders down.", compound: true },
    cableFly: { name: "Cable Fly", alternate: "Pec Deck", sets: 2, reps: [10, 15], rest: "short", muscles: "Chest", cue: "Use a comfortable stretch; squeeze without rushing." },
    latPulldown: { name: "Lat Pulldown", sets: 3, reps: [8, 12], rest: "long", muscles: "Lats · biceps", cue: "Drive your elbows down; do not lean far back.", compound: true },
    lateralRaise: { name: "Cable Lateral Raise", sets: 3, reps: [12, 20], rest: "short", muscles: "Side shoulders", cue: "Lead with your elbows and keep the weight light." },
    ezCurl: { name: "EZ-Bar Curl", alternate: "Cable Curl", sets: 3, reps: [8, 12], rest: "short", muscles: "Biceps", cue: "Keep your upper arms still and avoid swinging." },
    ropePushdown: { name: "Rope Triceps Pushdown", sets: 3, reps: [10, 15], rest: "short", muscles: "Triceps", cue: "Pin your elbows by your sides." },
    legPress: { name: "Leg Press", sets: 3, reps: [8, 12], rest: "long", muscles: "Quads · glutes", cue: "Use a depth you can control without your hips curling.", compound: true },
    dbRdl: { name: "Dumbbell Romanian Deadlift", sets: 3, reps: [8, 12], rest: "long", muscles: "Hamstrings · glutes", cue: "Push your hips back and keep the dumbbells close.", compound: true },
    legCurl: { name: "Leg Curl", sets: 2, reps: [10, 15], rest: "short", muscles: "Hamstrings", cue: "Pause briefly in the curled position." },
    legExtension: { name: "Leg Extension", sets: 2, reps: [10, 15], rest: "short", muscles: "Quads", cue: "Lift smoothly; do not kick the weight." },
    calfRaise: { name: "Calf Raise", sets: 2, reps: [10, 15], rest: "short", muscles: "Calves", cue: "Use a full, controlled range." },
    cableCrunch: { name: "Cable Crunch", sets: 3, reps: [10, 15], rest: "short", muscles: "Abs", cue: "Curl your ribs toward your hips." },
    kneeRaise: { name: "Hanging Knee Raise", sets: 2, reps: [8, 15], rest: "short", muscles: "Abs · hip flexors", cue: "Avoid swinging; raise your knees with control." },
    pullup: { name: "Pull-Ups", alternate: "Lat Pulldown", sets: 3, reps: [6, 10], alternateReps: [8, 12], rest: "long", muscles: "Lats · biceps", cue: "Stop with about 2 clean reps left before climbing.", compound: true, preserveRir: true, bodyweight: true },
    chestRow: { name: "Chest-Supported Row", sets: 3, reps: [8, 12], rest: "long", muscles: "Upper back · biceps", cue: "Keep your chest supported and leave 2 clean reps.", compound: true, preserveRir: true },
    shoulderPress: { name: "Machine Shoulder Press", alternate: "Dumbbell Shoulder Press", sets: 3, reps: [8, 12], rest: "long", muscles: "Shoulders · triceps", cue: "Keep your ribs down and press smoothly.", compound: true },
    reversePec: { name: "Reverse Pec Deck", sets: 2, reps: [12, 20], rest: "short", muscles: "Rear shoulders · upper back", cue: "Move from the shoulders without shrugging." },
    preacherCurl: { name: "Preacher Curl", sets: 3, reps: [8, 12], rest: "short", muscles: "Biceps", cue: "Leave about 2 clean reps before climbing.", preserveRir: true },
    overheadTriceps: { name: "Overhead Cable Triceps Extension", sets: 3, reps: [10, 15], rest: "short", muscles: "Triceps", cue: "Keep your elbows pointed forward." },
    hackSquat: { name: "Hack Squat", alternate: "Leg Press", sets: 3, reps: [8, 12], rest: "long", muscles: "Quads · glutes", cue: "Use a controlled depth and drive through your whole foot.", compound: true },
    hipThrust: { name: "Hip Thrust", sets: 2, reps: [8, 12], rest: "long", muscles: "Glutes", cue: "Pause at the top without over-arching your back.", compound: true },
    machineChest: { name: "Machine Chest Press", sets: 2, reps: [8, 12], rest: "long", muscles: "Chest · triceps", cue: "Set the seat so the handles meet mid-chest.", compound: true },
    pecDeck: { name: "Pec Deck", sets: 2, reps: [10, 15], rest: "short", muscles: "Chest", cue: "Keep a soft elbow and squeeze gently." },
    inclineCurl: { name: "Incline Dumbbell Curl", sets: 2, reps: [10, 15], rest: "short", muscles: "Biceps", cue: "Let your arms hang and avoid moving your shoulders." },
    hammerCurl: { name: "Hammer Curl", sets: 2, reps: [10, 15], rest: "short", muscles: "Biceps · forearms", cue: "Keep your palms facing in and move slowly." }
};

// Conservative first-session trials only. Saved performance replaces these values.
// Machine and cable labels vary, so every trial can be adjusted before logging.
const WEIGHT_GUIDE = {
    dbBench: { start: 10, step: 5 },
    inclinePress: { start: 10, step: 5 },
    cableFly: { start: 5, step: 5 },
    latPulldown: { start: 20, step: 5 },
    lateralRaise: { start: 5, step: 2.5 },
    ezCurl: { start: 10, alternateStart: 10, step: 5 },
    ropePushdown: { start: 10, step: 5 },
    legPress: { start: 20, step: 10 },
    dbRdl: { start: 10, step: 5 },
    legCurl: { start: 10, step: 5 },
    legExtension: { start: 10, step: 5 },
    calfRaise: { start: 0, step: 10 },
    cableCrunch: { start: 10, step: 5 },
    kneeRaise: { start: 0, step: 5 },
    pullup: { start: 0, alternateStart: 20, step: 5 },
    chestRow: { start: 15, step: 5 },
    shoulderPress: { start: 10, alternateStart: 10, step: 5 },
    reversePec: { start: 5, step: 5 },
    preacherCurl: { start: 5, step: 5 },
    overheadTriceps: { start: 10, step: 5 },
    hackSquat: { start: 0, alternateStart: 20, step: 10 },
    hipThrust: { start: 0, step: 10 },
    machineChest: { start: 10, step: 5 },
    pecDeck: { start: 5, step: 5 },
    inclineCurl: { start: 5, step: 2.5 },
    hammerCurl: { start: 10, step: 5 }
};

const WORKOUTS = {
    upperA: { name: "Upper A", focus: "Chest + arms", note: "Keep 2–3 reps in reserve.", exercises: ["dbBench", "inclinePress", "cableFly", "latPulldown", "lateralRaise", "ezCurl", "ropePushdown"] },
    lowerA: { name: "Lower A + Abs", focus: "Legs + core", note: "Use controlled reps. Stop for sharp pain.", exercises: ["legPress", "dbRdl", "legCurl", "legExtension", "calfRaise", "cableCrunch", "kneeRaise"] },
    upperB: { name: "Upper B", focus: "Back + shoulders + arms", note: "Keep 2 reps in reserve on pulls, rows, and curls before climbing.", exercises: ["pullup", "chestRow", "shoulderPress", "inclinePress", "lateralRaise", "reversePec", "preacherCurl", "overheadTriceps"] },
    fullBody: { name: "Full Body", focus: "Chest + arms emphasis", note: "Do not add missed sets or exercises.", exercises: ["hackSquat", "hipThrust", "machineChest", "pecDeck", "inclineCurl", "hammerCurl", "ropePushdown", "cableCrunch"], setOverrides: { ropePushdown: 2 } }
};

const BASE_SCHEDULE = [
    { day: "Mon", long: "Monday", type: "rest", title: "Rest day" },
    { day: "Tue", long: "Tuesday", type: "workout", title: "Upper A", workout: "upperA" },
    { day: "Wed", long: "Wednesday", type: "workout", title: "Lower + Abs", workout: "lowerA" },
    { day: "Thu", long: "Thursday", type: "rest", title: "Rest day" },
    { day: "Fri", long: "Friday", type: "workout", title: "Upper B", workout: "upperB" },
    { day: "Sat", long: "Saturday", type: "climb", title: "Rock climbing" },
    { day: "Sun", long: "Sunday", type: "workout", title: "Full Body", workout: "fullBody" }
];
