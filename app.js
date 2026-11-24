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
const dialogueNoteEl = document.getElementById('dialogue-note');
const vocabBodyEl = document.getElementById('vocab-body');
const bookRadios = document.querySelectorAll('input[name="book"]');
const audioPlayerEl = document.getElementById('audio-player');
const audioEl = document.getElementById('audio-el');
const audioToggleBtn = document.getElementById('audio-toggle');
const audioSeekEl = document.getElementById('audio-seek');
const audioTimeEl = document.getElementById('audio-time');
const versionToggles = {
    oral: document.getElementById('show-oral'),
    written: document.getElementById('show-written'),
    fr: document.getElementById('show-fr'),
};

let dialogues = null; // chargé à la première ouverture de l'onglet
let currentBook = 1;
let currentLesson = 1;
const lastLessonByBook = {}; // dernière leçon vue dans chaque livre

function bookLessons() {
    return dialogues.filter(d => d.book === currentBook);
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

// Espaces insécables avant ? ! : ; » et après « (évite un « ? » seul en début de ligne)
function typo(html) {
    return html.replace(/ ([?!:;»])/g, ' $1').replace(/« /g, '« ');
}

// Garde l'onglet, le livre et la leçon dans l'URL (#dialogues/1/5) pour pouvoir y revenir
function updateHash() {
    const onDialogues = !tabSections.dialogues.classList.contains('d-none');
    const url = onDialogues ? `#dialogues/${currentBook}/${currentLesson}` : location.pathname + location.search;
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
        audioEl.pause();
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
    }
    showBook(currentBook, currentLesson);
}

// Affiche un livre : reconstruit les boutons de leçons, puis ouvre la leçon demandée
// (à défaut, la dernière vue dans ce livre, ou la première)
function showBook(book, lessonNum) {
    if (!dialogues.some(d => d.book === book)) book = dialogues[0].book;
    currentBook = book;
    bookRadios.forEach(radio => { radio.checked = Number(radio.value) === book; });

    const lessons = bookLessons();
    lessonPickerEl.innerHTML = lessons.map(d => `
        <button type="button" class="btn btn-sm btn-outline-primary" data-lesson="${d.lesson}"
                title="Kentel ${d.lesson} (${escapeHtml(d.title)})">${d.lesson}</button>`).join('');

    showLesson(lessonNum ?? lastLessonByBook[book] ?? lessons[0].lesson);
}

function showLesson(num) {
    const lessons = bookLessons();
    const lesson = lessons.find(d => d.lesson === num) || lessons[0];
    currentLesson = lesson.lesson;
    lastLessonByBook[currentBook] = currentLesson;

    lessonPickerEl.querySelectorAll('[data-lesson]').forEach(btn => {
        const active = Number(btn.dataset.lesson) === currentLesson;
        btn.classList.toggle('btn-primary', active);
        btn.classList.toggle('btn-outline-primary', !active);
        btn.setAttribute('aria-pressed', String(active));
    });
    lessonPrevBtn.disabled = currentLesson === lessons[0].lesson;
    lessonNextBtn.disabled = currentLesson === lessons[lessons.length - 1].lesson;

    dialogueTitleEl.textContent = `Kentel ${lesson.lesson} (${lesson.title})`;
    loadLessonAudio(lesson);

    // Mise en scène éventuelle (ex. « Yann ha Gloutroñ zo en ur pub. »)
    const intro = lesson.intro ? `
        <div class="scene">
            <p class="mb-0">${typo(escapeHtml(lesson.intro.br))}</p>
            <p class="v-fr mb-0">${typo(escapeHtml(lesson.intro.fr))}</p>
        </div>` : '';

    dialogueLinesEl.innerHTML = intro + lesson.dialogue.map(line => `
        <div class="replik replik-${line.speaker}">
            <span class="speaker" aria-label="Locuteur ${line.speaker.toUpperCase()}">${line.speaker.toUpperCase()}</span>
            <div class="bubble">
                <p class="v-oral"><span class="v-label">Oral</span><span>${typo(escapeHtml(line.oral))}</span></p>
                <p class="v-written"><span class="v-label">Écrit</span><span>${typo(escapeHtml(line.written))}</span></p>
                <p class="v-fr"><span class="v-label">FR</span><span>${typo(escapeHtml(line.fr))}</span></p>
            </div>
        </div>`).join('');

    dialogueNoteEl.innerHTML = lesson.note ? typo(escapeHtml(lesson.note)) : '';
    dialogueNoteEl.classList.toggle('d-none', !lesson.note);

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

// --- Enregistrement du dialogue (seules les leçons avec un champ "audio" en ont un) ---
function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return '0:00';
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

// Icônes en SVG : sur iPhone, ▶ et ⏸ s'afficheraient en emoji
const AUDIO_ICONS = {
    play: '<path d="M4 2.5v11l9-5.5z"/>',
    pause: '<path d="M4 2.5h3v11H4zm5 0h3v11H9z"/>',
    replay: '<path fill-rule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2z"/>'
        + '<path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466"/>',
};

function setAudioButton(icon, label) {
    audioToggleBtn.innerHTML = `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">${AUDIO_ICONS[icon]}</svg>${label}`;
}

function updateAudioUi() {
    const playing = !audioEl.paused && !audioEl.ended;
    if (playing) setAudioButton('pause', 'Pause');
    else if (audioEl.ended) setAudioButton('replay', 'Réécouter');
    else setAudioButton('play', 'Écouter');
    audioToggleBtn.setAttribute('aria-label', playing ? "Mettre l'enregistrement en pause" : 'Écouter le dialogue');

    const duration = Number.isFinite(audioEl.duration) ? audioEl.duration : 0;
    audioSeekEl.max = duration;
    audioSeekEl.value = audioEl.currentTime;
    audioTimeEl.textContent = duration
        ? `${formatTime(audioEl.currentTime)} / ${formatTime(duration)}`
        : formatTime(audioEl.currentTime);
}

// Change de piste en changeant de leçon (la lecture s'arrête) ; cache le lecteur s'il n'y a pas d'audio
function loadLessonAudio(lesson) {
    audioEl.pause();
    audioPlayerEl.classList.toggle('d-none', !lesson.audio);
    if (lesson.audio) {
        if (audioEl.getAttribute('src') !== lesson.audio) audioEl.src = lesson.audio;
    } else if (audioEl.hasAttribute('src')) {
        audioEl.removeAttribute('src');
        audioEl.load();
    }
    updateAudioUi();
}

audioToggleBtn.addEventListener('click', () => {
    if (audioEl.paused || audioEl.ended) {
        audioEl.play().catch(error => {
            if (error.name !== 'AbortError') console.error(error); // AbortError : leçon changée pendant le chargement
        });
    } else {
        audioEl.pause();
    }
});
audioSeekEl.addEventListener('input', () => {
    audioEl.currentTime = Number(audioSeekEl.value);
    updateAudioUi(); // affiche tout de suite la nouvelle position, même en pause
});
['play', 'pause', 'ended', 'timeupdate', 'seeked', 'durationchange', 'emptied'].forEach(type => {
    audioEl.addEventListener(type, updateAudioUi);
});
audioEl.addEventListener('error', () => {
    if (audioEl.hasAttribute('src')) audioTimeEl.textContent = 'Audio indisponible';
});

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
bookRadios.forEach(radio => radio.addEventListener('change', () => {
    if (dialogues) showBook(Number(radio.value));
    else currentBook = Number(radio.value); // données pas encore chargées : appliqué à l'ouverture
}));
Object.values(versionToggles).forEach(input => input.addEventListener('change', onVersionToggle));

// Ouvrir directement l'onglet Dialogues si l'URL le demande :
// #dialogues, #dialogues/1/5 (livre 1, leçon 5), ou l'ancien format #dialogues/5 (livre 2)
const hashMatch = location.hash.match(/^#dialogues(?:\/(\d+)(?:\/(\d+))?)?$/);
if (hashMatch) {
    if (hashMatch[2]) {
        currentBook = Number(hashMatch[1]);
        currentLesson = Number(hashMatch[2]);
    } else if (hashMatch[1]) {
        currentBook = 2;
        currentLesson = Number(hashMatch[1]);
    }
    showTab('dialogues');
}

// Lancer l'app
init();