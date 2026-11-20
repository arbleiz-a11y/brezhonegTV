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

// ---------------------------------------------------------------------------
// Onglets & dialogues (Diviz + Geriaoueg de chaque Kentel)
// ---------------------------------------------------------------------------
const tabButtons = document.querySelectorAll('[data-tab]');
const tabSections = {
    exercises: document.getElementById('tab-exercises'),
    dialogues: document.getElementById('tab-dialogues'),
};
const lessonPickerEl = document.getElementById('lesson-picker');
const lessonPrevBtn = document.getElementById('lesson-prev');
const lessonNextBtn = document.getElementById('lesson-next');
const dialogueTitleEl = document.getElementById('dialogue-title');
const dialogueLinesEl = document.getElementById('dialogue-lines');
const vocabBodyEl = document.getElementById('vocab-body');
const versionToggles = {
    oral: document.getElementById('show-oral'),
    written: document.getElementById('show-written'),
    fr: document.getElementById('show-fr'),
};

let dialogues = null; // chargé à la première ouverture de l'onglet
let currentLesson = 1;

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

// Espaces insécables avant ? ! : ; » et après « (évite un « ? » seul en début de ligne)
function typo(html) {
    return html.replace(/ ([?!:;»])/g, ' $1').replace(/« /g, '« ');
}

// Garde l'onglet et la leçon dans l'URL (#dialogues/5) pour pouvoir y revenir
function updateHash() {
    const onDialogues = !tabSections.dialogues.classList.contains('d-none');
    const url = onDialogues ? `#dialogues/${currentLesson}` : location.pathname + location.search;
    history.replaceState(null, '', url);
}

function showTab(name) {
    Object.entries(tabSections).forEach(([key, el]) => el.classList.toggle('d-none', key !== name));
    tabButtons.forEach(btn => {
        const active = btn.dataset.tab === name;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', String(active));
    });

    if (name === 'dialogues') {
        openDialogues();
    } else {
        updateHash();
        if (!userInputEl.disabled) userInputEl.focus();
    }
}

async function openDialogues() {
    if (!dialogues) {
        try {
            const response = await fetch('dialogues.json');
            dialogues = await response.json();
        } catch (error) {
            dialogueTitleEl.textContent = "Erreur de chargement des dialogues. Lancez-vous l'appli via un serveur local ?";
            console.error(error);
            return;
        }
        lessonPickerEl.innerHTML = dialogues.map(d => `
            <button type="button" class="btn btn-sm btn-outline-primary" data-lesson="${d.lesson}"
                    title="Kentel ${d.lesson} (${escapeHtml(d.title)})">${d.lesson}</button>`).join('');
    }
    showLesson(currentLesson);
}

function showLesson(num) {
    const lesson = dialogues.find(d => d.lesson === num) || dialogues[0];
    currentLesson = lesson.lesson;

    lessonPickerEl.querySelectorAll('[data-lesson]').forEach(btn => {
        const active = Number(btn.dataset.lesson) === currentLesson;
        btn.classList.toggle('btn-primary', active);
        btn.classList.toggle('btn-outline-primary', !active);
        btn.setAttribute('aria-pressed', String(active));
    });
    lessonPrevBtn.disabled = currentLesson === dialogues[0].lesson;
    lessonNextBtn.disabled = currentLesson === dialogues[dialogues.length - 1].lesson;

    dialogueTitleEl.textContent = `Kentel ${lesson.lesson} (${lesson.title})`;

    dialogueLinesEl.innerHTML = lesson.dialogue.map(line => `
        <div class="replik replik-${line.speaker}">
            <span class="speaker" aria-label="Locuteur ${line.speaker.toUpperCase()}">${line.speaker.toUpperCase()}</span>
            <div class="bubble">
                <p class="v-oral"><span class="v-label">Oral</span><span>${typo(escapeHtml(line.oral))}</span></p>
                <p class="v-written"><span class="v-label">Écrit</span><span>${typo(escapeHtml(line.written))}</span></p>
                <p class="v-fr"><span class="v-label">FR</span><span>${typo(escapeHtml(line.fr))}</span></p>
            </div>
        </div>`).join('');

    vocabBodyEl.innerHTML = lesson.vocabulary.map(v => `
        <tr>
            <td>
                <span class="fw-semibold">${escapeHtml(v.word)}</span>
                <div class="pron small text-muted d-sm-none">${escapeHtml(v.pron)}</div>
            </td>
            <td class="pron d-none d-sm-table-cell">${escapeHtml(v.pron)}</td>
            <td>${typo(escapeHtml(v.meaning))}</td>
        </tr>`).join('');

    updateHash();
}

// Afficher/masquer oral, écrit, français (au moins une version reste visible)
function onVersionToggle(event) {
    const toggles = Object.values(versionToggles);
    if (!toggles.some(input => input.checked)) event.target.checked = true;
    Object.entries(versionToggles).forEach(([key, input]) => {
        dialogueLinesEl.classList.toggle(`hide-${key}`, !input.checked);
    });
}

tabButtons.forEach(btn => btn.addEventListener('click', () => showTab(btn.dataset.tab)));
lessonPickerEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lesson]');
    if (btn) showLesson(Number(btn.dataset.lesson));
});
lessonPrevBtn.addEventListener('click', () => showLesson(currentLesson - 1));
lessonNextBtn.addEventListener('click', () => showLesson(currentLesson + 1));
Object.values(versionToggles).forEach(input => input.addEventListener('change', onVersionToggle));

// Ouvrir directement l'onglet Dialogues si l'URL le demande (#dialogues ou #dialogues/5)
const hashMatch = location.hash.match(/^#dialogues(?:\/(\d+))?$/);
if (hashMatch) {
    if (hashMatch[1]) currentLesson = Number(hashMatch[1]);
    showTab('dialogues');
}

// Lancer l'app
init();