const EXERCISES = {
    dbBench: { name: "Dumbbell Bench Press", alternate: "Machine Chest Press", alternateId: "machineChest", sets: 3, reps: [8, 12], rest: "long", muscles: "Chest · triceps", cue: "Use a flat bench and controlled reps.", compound: true, instructions: ["Plant both feet firmly and keep your shoulder blades slightly back and down.", "Start above the chest with neutral wrists.", "Lower the dumbbells toward the sides of the mid-chest with your elbows at a comfortable angle.", "Press upward under control without bouncing, excessively arching your lower back, or grinding reps.", "Stop with about 2–3 clean reps left while learning the movement."] },
    inclinePress: { name: "Incline Dumbbell Press", sets: 2, reps: [8, 12], rest: "long", muscles: "Upper chest · triceps", cue: "Use a low incline and keep your shoulders down.", compound: true },
    cableFly: { name: "Cable Fly", alternate: "Pec Deck", sets: 2, reps: [10, 15], rest: "short", muscles: "Chest", cue: "Use a comfortable stretch; squeeze without rushing." },
    latPulldown: { name: "Lat Pulldown", alternate: "Pull-Ups", alternateId: "pullup", sets: 3, reps: [8, 12], rest: "long", muscles: "Lats · biceps", cue: "Drive your elbows down without swinging.", compound: true, instructions: ["Secure your legs under the thigh pad and grip slightly wider than shoulder width.", "Keep your chest up with only a slight lean back.", "Pull your shoulders down, then drive your elbows toward your sides.", "Bring the bar toward your upper chest.", "Return slowly until your arms are extended without using momentum."] },
    lateralRaise: { name: "Cable Lateral Raise", sets: 3, reps: [12, 20], rest: "short", muscles: "Side shoulders", cue: "Lead with your elbows and keep the weight light." },
    ezCurl: { name: "EZ-Bar Curl", alternate: "Cable Curl", sets: 3, reps: [8, 12], rest: "short", muscles: "Biceps", cue: "Keep your upper arms still and avoid swinging." },
    ropePushdown: { name: "Rope Triceps Pushdown", sets: 3, reps: [10, 15], rest: "short", muscles: "Triceps", cue: "Pin your elbows by your sides." },
    legPress: { name: "Leg Press", alternate: "Hack Squat", alternateId: "hackSquat", sets: 3, reps: [8, 12], rest: "long", muscles: "Quads · glutes", cue: "Use a depth you can control without your hips curling.", compound: true },
    dbRdl: { name: "Dumbbell Romanian Deadlift", sets: 3, reps: [8, 12], rest: "long", muscles: "Hamstrings · glutes", cue: "Push your hips back and keep the dumbbells close.", compound: true },
    legCurl: { name: "Leg Curl", sets: 2, reps: [10, 15], rest: "short", muscles: "Hamstrings", cue: "Pause briefly in the curled position." },
    legExtension: { name: "Leg Extension", sets: 2, reps: [10, 15], rest: "short", muscles: "Quads", cue: "Lift smoothly; do not kick the weight." },
    calfRaise: { name: "Calf Raise", sets: 2, reps: [10, 15], rest: "short", muscles: "Calves", cue: "Use a full, controlled range." },
    cableCrunch: { name: "Cable Crunch", sets: 3, reps: [10, 15], rest: "short", muscles: "Abs", cue: "Curl your ribs toward your hips." },
    kneeRaise: { name: "Hanging Knee Raise", sets: 2, reps: [8, 15], rest: "short", muscles: "Abs · hip flexors", cue: "Avoid swinging; raise your knees with control." },
    pullup: { name: "Pull-Ups", alternate: "Lat Pulldown", alternateId: "latPulldown", sets: 3, reps: [6, 10], alternateReps: [8, 12], rest: "long", muscles: "Lats · biceps", cue: "Use controlled reps and stop with 1–2 clean reps left.", compound: true, preserveRir: true, bodyweight: true },
    chestRow: { name: "Chest-Supported Row", sets: 3, reps: [8, 12], rest: "long", muscles: "Upper back · biceps", cue: "Keep your chest supported and stop with 1–2 clean reps left.", compound: true, preserveRir: true },
    shoulderPress: { name: "Machine Shoulder Press", alternate: "Dumbbell Shoulder Press", sets: 3, reps: [8, 12], rest: "long", muscles: "Shoulders · triceps", cue: "Keep your ribs down and press smoothly.", compound: true },
    reversePec: { name: "Reverse Pec Deck", sets: 2, reps: [12, 20], rest: "short", muscles: "Rear shoulders · upper back", cue: "Move from the shoulders without shrugging." },
    preacherCurl: { name: "Preacher Curl", sets: 3, reps: [8, 12], rest: "short", muscles: "Biceps", cue: "Keep your upper arms planted and stop with 1–2 clean reps left.", preserveRir: true },
    overheadTriceps: { name: "Overhead Cable Triceps Extension", sets: 3, reps: [10, 15], rest: "short", muscles: "Triceps", cue: "Keep your elbows pointed forward." },
    hackSquat: { name: "Hack Squat", alternate: "Leg Press", alternateId: "legPress", sets: 3, reps: [8, 12], rest: "long", muscles: "Quads · glutes", cue: "Use a controlled depth and drive through your whole foot.", compound: true },
    hipThrust: { name: "Hip Thrust", sets: 2, reps: [8, 12], rest: "long", muscles: "Glutes", cue: "Pause at the top without over-arching your back.", compound: true },
    machineChest: { name: "Machine Chest Press", sets: 2, reps: [8, 12], rest: "long", muscles: "Chest · triceps", cue: "Set the seat so the handles meet mid-chest.", compound: true },
    pecDeck: { name: "Pec Deck", sets: 2, reps: [10, 15], rest: "short", muscles: "Chest", cue: "Keep a soft elbow and squeeze gently." },
    inclineCurl: { name: "Incline Dumbbell Curl", sets: 2, reps: [10, 15], rest: "short", muscles: "Biceps", cue: "Let your arms hang and avoid moving your shoulders." },
    hammerCurl: { name: "Hammer Curl", alternate: "Preacher Curl", sets: 2, reps: [10, 15], rest: "short", muscles: "Biceps · forearms", cue: "Keep your upper arms still and move slowly." },
    seatedCableRow: { name: "Seated Cable Row", alternate: "One-Arm Dumbbell Row", alternateId: "oneArmDbRow", sets: 3, reps: [8, 12], rest: "long", muscles: "Upper back · lats · biceps", cue: "Pull toward your lower ribs without swinging.", compound: true, instructions: ["Set your feet securely with your knees slightly bent.", "Keep your torso upright and spine neutral as your arms extend.", "Drive your elbows back and pull the handle toward your lower ribs or upper stomach.", "Briefly squeeze your shoulder blades together.", "Return slowly without rounding far forward or swinging your torso."] },
    oneArmDbRow: { name: "One-Arm Dumbbell Row", sets: 3, reps: [8, 12], rest: "long", muscles: "Upper back · lats · biceps", cue: "Keep your back neutral and pull toward your hip.", compound: true, instructions: ["Support one hand and knee or leg on a bench.", "Keep your back neutral.", "Pull the dumbbell toward your hip or lower ribs.", "Lower the dumbbell under control."] },
    reverseCrunch: { name: "Reverse Crunch", sets: 3, reps: [10, 15], rest: "short", muscles: "Abs", cue: "Curl your pelvis toward your ribs without swinging.", bodyweight: true, instructions: ["Lie on your back with your knees bent and bring them above your hips.", "Brace your abs.", "Curl your pelvis toward your rib cage and lift your hips slightly from the floor.", "Lower your hips slowly under control.", "Avoid swinging your legs; the motion should come from curling your pelvis."] }
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
    hammerCurl: { start: 10, alternateStart: 5, step: 5 },
    seatedCableRow: { start: 15, step: 5 },
    oneArmDbRow: { start: 10, step: 5 },
    reverseCrunch: { start: 0, step: 5 }
};

const WORKOUTS = {
    lowerA: { name: "Lower Body + Abs", focus: "Legs + abs", note: "Keep 1–2 reps in reserve and use controlled reps.", exercises: ["legPress", "dbRdl", "legCurl", "legExtension", "calfRaise", "cableCrunch", "kneeRaise"] },
    upperPush: { name: "Upper Push", focus: "Chest + shoulders + triceps", note: "Keep 1–2 reps in reserve. This session stays push-focused after Thursday climbing.", exercises: ["dbBench", "inclinePress", "shoulderPress", "cableFly", "lateralRaise", "ropePushdown", "overheadTriceps"], setOverrides: { overheadTriceps: 2 } },
    fullBodyPull: { name: "Full Body + Pull", focus: "Full body + back + biceps", note: "Keep 1–2 reps in reserve on each working set.", exercises: ["legPress", "hipThrust", "dbBench", "latPulldown", "seatedCableRow", "reversePec", "inclineCurl", "hammerCurl", "reverseCrunch"], setOverrides: { dbBench: 2 } },

    // Retained only so old local and restored workout records remain readable.
    upperA: { name: "Upper A", focus: "Legacy workout", note: "Saved workout history.", exercises: ["dbBench", "inclinePress", "cableFly", "latPulldown", "lateralRaise", "ezCurl", "ropePushdown"], archived: true },
    upperB: { name: "Upper B", focus: "Legacy workout", note: "Saved workout history.", exercises: ["pullup", "chestRow", "shoulderPress", "inclinePress", "lateralRaise", "reversePec", "preacherCurl", "overheadTriceps"], archived: true },
    fullBody: { name: "Full Body", focus: "Legacy workout", note: "Saved workout history.", exercises: ["hackSquat", "hipThrust", "machineChest", "pecDeck", "inclineCurl", "hammerCurl", "ropePushdown", "cableCrunch"], setOverrides: { ropePushdown: 2 }, archived: true }
};

const ACTIVE_WORKOUT_IDS = ["lowerA", "upperPush", "fullBodyPull"];

const BASE_SCHEDULE = [
    { day: "Mon", long: "Monday", type: "rest", title: "Rest day" },
    { day: "Tue", long: "Tuesday", type: "rest", title: "Rest day" },
    { day: "Wed", long: "Wednesday", type: "workout", title: "Lower Body + Abs", workout: "lowerA" },
    { day: "Thu", long: "Thursday", type: "rest", title: "Rest day" },
    { day: "Fri", long: "Friday", type: "workout", title: "Upper Push", workout: "upperPush" },
    { day: "Sat", long: "Saturday", type: "rest", title: "Rest day" },
    { day: "Sun", long: "Sunday", type: "workout", title: "Full Body + Pull", workout: "fullBodyPull" }
];
