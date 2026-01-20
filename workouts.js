const workoutRoutine = [
    {
        id: 0,
        name: "Warm-up: Cardio & Stretches",
        sets: 1,
        reps: "5-10 min",
        videoUrls: [], 
        restSeconds: 0,
        description: "Light cardio (jumping jacks, jog in place) and dynamic stretches."
    },
    {
        id: 1,
        name: "Bench Press",
        sets: 3,
        reps: "8-10",
        videoUrls: [
            "video_examples/male-barbell-bench-press-front.mp4",
            "video_examples/male-barbell-bench-press-side.mp4"
        ],
        restSeconds: 90,
        description: "Main Lift. Keep feet flat and back arched slightly."
    },
    {
        id: 2,
        name: "Single-Arm Dumbbell Row",
        sets: 3,
        reps: "8-10 / arm",
        videoUrls: [
            "video_examples/male-Dumbbells-dumbbell-single-arm-row-front.mp4",
            "video_examples/male-Dumbbells-dumbbell-single-arm-row-side.mp4"
        ],
        restSeconds: 90,
        description: "Keep back flat. Pull towards your hip."
    },
    {
        id: 3,
        name: "Goblet Squat / Split Squat",
        sets: 3,
        reps: "10 / leg",
        videoUrls: [
            "video_examples/male-dumbbell-goblet-squat-front.mp4",
            "video_examples/male-dumbbell-goblet-squat-side.mp4"
        ],
        restSeconds: 90,
        description: "Keep chest up. Go deep."
    },
    {
        id: 4,
        name: "Shoulder / Arnold Press",
        sets: 3,
        reps: "8-12",
        videoUrls: [
            "video_examples/male-Dumbbells-dumbbell-arnold-press-front.mp4",
            "video_examples/male-Dumbbells-dumbbell-arnold-press-side.mp4"
        ],
        restSeconds: 90,
        description: "Rotate palms as you press up if doing Arnold Press."
    },
    {
        id: 5,
        name: "Dumbbell Biceps Curl",
        sets: 2,
        reps: "10-12",
        videoUrls: [
            "video_examples/male-Dumbbells-dumbbell-curl-front.mp4",
            "video_examples/male-Dumbbells-dumbbell-curl-side.mp4"
        ],
        restSeconds: 60,
        description: "Control the weight. No swinging."
    },
    {
        id: 6,
        name: "Dumbbell Triceps Extension",
        sets: 2,
        reps: "10-12",
        videoUrls: [
            "video_examples/male-Dumbbells-dumbbell-seated-overhead-tricep-extension-front.mp4",
            "video_examples/male-Dumbbells-dumbbell-seated-overhead-tricep-extension-side.mp4"
        ],
        restSeconds: 60,
        description: "Keep elbows close to your head."
    },
    {
        id: 7,
        name: "Dumbbell Flyes",
        sets: 2,
        reps: "10-12",
        videoUrls: [
            "video_examples/male-dumbbell-incline-chest-flys-front.mp4",
            "video_examples/male-dumbbell-incline-chest-flys-side_em1D4Db.mp4"
        ],
        restSeconds: 60,
        description: "Feel the stretch at the bottom. Hug a tree."
    },
    {
        id: 8,
        name: "Plank",
        sets: 2,
        reps: "30 sec",
        videoUrls: [
            "video_examples/male-bodyweight-forearm-plank-front.mp4",
            "video_examples/male-bodyweight-forearm-plank-side.mp4"
        ],
        restSeconds: 60,
        description: "Core tight. Straight line from head to heels."
    },
    {
        id: 9,
        name: "Push-ups (Burnout)",
        sets: 1,
        reps: "Failure",
        videoUrls: [
            "video_examples/male-Bodyweight-push-up-front.mp4",
            "video_examples/male-Bodyweight-push-up-side.mp4"
        ],
        restSeconds: 60,
        description: "Go until you can't do anymore with good form."
    }
];

const progressionNotes = [
    "Pick weight where last 2–3 reps feel tough but doable",
    "Add weight (~5%) when 12 reps feels easy"
];
