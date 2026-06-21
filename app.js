// Variables globales
let exercises = [];
let currentExercise = null;

// Éléments du DOM
const sourceTextEl = document.getElementById('source-text');
const userInputEl = document.getElementById('user-input');
const btnCheck = document.getElementById('btn-check');
const btnNext = document.getElementById('btn-next');
const resultArea = document.getElementById('result-area');
const resultStatusEl = document.getElementById('result-status');
const correctAnswerEl = document.getElementById('correct-answer');
const explanationTextEl = document.getElementById('explanation-text');
const typeBadgeEl = document.getElementById('exercise-type-badge');
const modeRadios = document.querySelectorAll('input[name="mode"]');

// Initialisation
async function init() {
    try {
        const response = await fetch('data.json');
        exercises = await response.json();
        nextQuestion();
    } catch (error) {
        sourceTextEl.textContent = "Erreur de chargement des données. Lancez-vous l'appli via un serveur local ?";
        console.error(error);
    }
}

// Nettoyer la chaîne pour comparer (enlève la casse et la ponctuation)
function normalizeString(str) {
    return str.toLowerCase().replace(/[.,!?;'"]/g, '').trim();
}

// Tirer une question au hasard selon le mode choisi
function nextQuestion() {
    // Cacher le résultat et vider l'input
    resultArea.classList.add('d-none');
    userInputEl.value = '';
    btnCheck.disabled = false;
    userInputEl.disabled = false;

    // Filtrer selon le mode
    const selectedMode = document.querySelector('input[name="mode"]:checked').value;
    let filteredExercises = exercises;
    if (selectedMode !== 'all') {
        filteredExercises = exercises.filter(ex => ex.type === selectedMode);
    }

    if (filteredExercises.length === 0) return;

    // Choisir un exercice au hasard
    const randomIndex = Math.floor(Math.random() * filteredExercises.length);
    currentExercise = filteredExercises[randomIndex];

    // Afficher
    sourceTextEl.textContent = currentExercise.source;
    typeBadgeEl.textContent = currentExercise.type === 'theme' ? 'Thème (FR -> BZH)' : 'Version (BZH -> FR)';
    typeBadgeEl.className = currentExercise.type === 'theme' ? 'badge bg-primary mb-2' : 'badge bg-success mb-2';
    
    // Focus sur l'input
    userInputEl.focus();
}

// Vérifier la réponse
function checkAnswer() {
    if (!userInputEl.value.trim() || !currentExercise) return;

    const userAnswer = normalizeString(userInputEl.value);
    const expectedAnswer = normalizeString(currentExercise.target);

    // Mettre à jour l'UI de résultat
    resultArea.classList.remove('d-none');
    correctAnswerEl.textContent = currentExercise.target;
    explanationTextEl.textContent = currentExercise.explanation;

    if (userAnswer === expectedAnswer) {
        resultStatusEl.innerHTML = '✅ <span class="text-success">Mad ar jeu ! (Correct)</span>';
    } else {
        resultStatusEl.innerHTML = '❌ <span class="text-danger">Fazi ! (Incorrect)</span>';
    }

    // Désactiver l'input
    btnCheck.disabled = true;
    userInputEl.disabled = true;
    btnNext.focus();
}

// Écouteurs d'événements
btnCheck.addEventListener('click', checkAnswer);
btnNext.addEventListener('click', nextQuestion);

// Changement de mode
modeRadios.forEach(radio => {
    radio.addEventListener('change', nextQuestion);
});

// Appuyer sur "Entrée" pour valider
userInputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkAnswer();
});

// Lancer l'app
init();