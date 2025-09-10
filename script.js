// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И ЭЛЕМЕНТЫ ---
const screens = document.querySelectorAll('.screen');
let testQuestions = [];
let passingThreshold = 1;
let saveCondition = 'successful';
let interviewHistory = [];
let finalVideoBlob = null;

function showScreen(screenId) {
    screens.forEach(screen => screen.classList.toggle('active', screen.id === screenId));
}

// --- ЛОГИКА КОНСТРУКТОРА ---
const agreeAndSetupBtn = document.getElementById('agreeAndSetupBtn');
const questionInput = document.getElementById('questionInput');
const correctAnswerInput = document.getElementById('correctAnswerInput');
const addQuestionBtn = document.getElementById('addQuestionBtn');
const questionListConstructor = document.getElementById('questionListConstructor');
const thresholdInput = document.getElementById('thresholdInput');
const finalizeSetupBtn = document.getElementById('finalizeSetupBtn');

function renderConstructorList() {
    questionListConstructor.innerHTML = '';
    if (testQuestions.length === 0) {
        questionListConstructor.innerHTML = `<li style="text-align: center; color: var(--secondary-text);">Здесь появятся ваши вопросы...</li>`;
        return;
    }
    testQuestions.forEach((q, index) => {
        const li = document.createElement('li');
        li.className = 'constructor-item';
        li.innerHTML = `
            <span>${index + 1}. ${q.text} <em class="correct-answer">(Ключевой ответ: "${q.correctAnswer}")</em></span>
            <button class="remove-question-btn" data-index="${index}" title="Удалить вопрос">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17 6H22V8H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V8H2V6H7V3C7 2.44772 7.44772 2 8 2H16C16.5523 2 17 2.44772 17 3V6ZM18 8H6V20H18V8ZM9 11H11V17H9V11ZM13 11H15V17H13V11ZM9 4V6H15V4H9Z"></path></svg>
            </button>
        `;
        questionListConstructor.appendChild(li);
    });
}
function removeQuestion(index) {
    testQuestions.splice(index, 1);
    renderConstructorList();
}

addQuestionBtn.addEventListener('click', () => {
    const text = questionInput.value.trim();
    const correctAnswer = correctAnswerInput.value.trim();
    if (text && correctAnswer) {
        testQuestions.push({ text, correctAnswer: correctAnswer.toLowerCase() });
        questionInput.value = '';
        correctAnswerInput.value = '';
        renderConstructorList();
    } else {
        alert("Пожалуйста, заполните и текст вопроса, и ожидаемый ответ.");
    }
});

questionListConstructor.addEventListener('click', (e) => {
    const button = e.target.closest('.remove-question-btn');
    if (button) removeQuestion(parseInt(button.dataset.index, 10));
});

agreeAndSetupBtn.addEventListener('click', () => showScreen('constructorScreen'));
finalizeSetupBtn.addEventListener('click', () => {
    const threshold = parseInt(thresholdInput.value, 10);
    if (testQuestions.length === 0) {
        alert('Пожалуйста, добавьте хотя бы один вопрос.');
        return;
    }
    if (isNaN(threshold) || threshold < 1 || threshold > testQuestions.length) {
        alert(`Пожалуйста, введите корректное число для прохождения (от 1 до ${testQuestions.length}).`);
        return;
    }
    passingThreshold = threshold;
    saveCondition = document.querySelector('input[name="saveCondition"]:checked').value;
    document.getElementById('checkDeviceBtn').style.display = 'inline-flex';
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('deviceCheckStatus').innerHTML = '';
    showScreen('startInterviewScreen');
});

// --- ЛОГИКА ИНТЕРВЬЮ ---
const checkDeviceBtn = document.getElementById('checkDeviceBtn');
const deviceCheckStatus = document.getElementById('deviceCheckStatus');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const recordBtn = document.getElementById('recordBtn'); 
const saveBtn = document.getElementById('saveBtn'); 
const questionEl = document.getElementById('question'); 
const statusEl = document.getElementById('status'); 
const resultsList = document.getElementById('resultsList'); 
const videoPreview = document.getElementById('videoPreview'); 
const resultTitleEl = document.getElementById('resultTitle'); 
const resultTextEl = document.getElementById('resultText'); 
const historyTableBody = document.getElementById('historyTableBody');
const recognitionResultEl = document.getElementById('recognitionResult');
let currentQuestionIndex, isListening, mediaRecorder, videoChunks, correctAnswersCount;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.continuous = true;
    recognition.interimResults = true;
}

async function checkDevices() {
    deviceCheckStatus.textContent = "Проверяем...";
    deviceCheckStatus.className = '';
    if (!recognition) {
        deviceCheckStatus.textContent = 'Ошибка: Ваш браузер не поддерживает распознавание речи. Используйте последнюю версию Google Chrome.';
        deviceCheckStatus.classList.add('status-error');
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach(track => track.stop());
        deviceCheckStatus.textContent = '✓ Камера и микрофон готовы!';
        deviceCheckStatus.classList.add('status-success');
        checkDeviceBtn.style.display = 'none';
        startBtn.style.display = 'inline-flex';
    } catch (err) {
        deviceCheckStatus.textContent = 'Ошибка: Не удалось получить доступ к камере или микрофону.';
        deviceCheckStatus.classList.add('status-error');
    }
}

function evaluateAnswer(transcript, question) {
    const spokenText = transcript.toLowerCase();
    const expectedText = question.correctAnswer.toLowerCase();
    if (spokenText.includes(expectedText)) {
        return { text: `Оценка: 'Правильно' (ключевая фраза найдена)`, class: "evaluation-correct" };
    } else {
        return { text: `Оценка: 'Неправильно' (фраза не найдена)`, class: "evaluation-incorrect" };
    }
}

recognition.onresult = (event) => {
    let final_transcript = '';
    let interim_transcript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
            final_transcript += event.results[i][0].transcript;
        } else {
            interim_transcript += event.results[i][0].transcript;
        }
    }
    recognitionResultEl.innerHTML = `<span style="font-weight: bold;">${final_transcript}</span><span style="color: var(--secondary-text);">${interim_transcript}</span>`;
};

recognition.onerror = (event) => {
    console.error('Ошибка распознавания:', event.error);
    statusEl.textContent = 'Ошибка: ' + event.error;
};

recordBtn.addEventListener('click', () => {
    if (isListening) {
        recognition.stop();
    } else {
        recognitionResultEl.innerHTML = '';
        recognition.start();
    }
});

recognition.onstart = () => {
    isListening = true;
    recordBtn.classList.add('recording');
    recordBtn.textContent = 'Закончить ответ';
    statusEl.textContent = 'Говорите...';
};

recognition.onend = () => {
    isListening = false;
    recordBtn.classList.remove('recording');
    recordBtn.textContent = 'Начать ответ';
    statusEl.textContent = 'Ответ записан. Идет оценка...';

    const final_transcript_element = recognitionResultEl.querySelector('span[style*="bold"]');
    const final_transcript = final_transcript_element ? final_transcript_element.textContent.trim() : '';

    if (final_transcript) {
        const evaluation = evaluateAnswer(final_transcript, testQuestions[currentQuestionIndex]);
        if (evaluation.class === 'evaluation-correct') correctAnswersCount++;
        displayResult(final_transcript, evaluation);
        recordBtn.disabled = true;

        setTimeout(() => {
            if (currentQuestionIndex === testQuestions.length - 1) {
                finishInterview();
            } else {
                displayNextQuestion();
            }
        }, 2000);
    } else {
        statusEl.textContent = "Ответ не был распознан. Переход к следующему вопросу...";
        displayResult("(ответ не распознан)", { text: "Оценка: 'Неправильно'", class: "evaluation-incorrect" });
        setTimeout(() => {
            if (currentQuestionIndex === testQuestions.length - 1) {
                finishInterview();
            } else {
                displayNextQuestion();
            }
        }, 2000);
    }
};

function displayNextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < testQuestions.length) {
        questionEl.textContent = testQuestions[currentQuestionIndex].text;
        recordBtn.disabled = false;
        statusEl.textContent = "Нажмите 'Начать ответ'";
        recognitionResultEl.innerHTML = '';
    } else {
        finishInterview();
    }
}

async function finishInterview() {
    const passed = correctAnswersCount >= passingThreshold;
    resultTitleEl.textContent = passed ? "Поздравляем, скрининг пройден!" : "К сожалению, скрининг не пройден.";
    resultTextEl.textContent = `Вы набрали ${correctAnswersCount} из ${testQuestions.length} правильных ответов.`;
    const shouldShowSaveButton = passed || saveCondition === 'all';
    if (shouldShowSaveButton) { saveBtn.style.display = 'inline-flex'; }
    showScreen('resultsScreen');
    const blob = await stopRecordingAndCamera();
    finalVideoBlob = blob;
    if (shouldShowSaveButton && (!finalVideoBlob || finalVideoBlob.size === 0)) {
        saveBtn.textContent = 'Ошибка записи';
        saveBtn.disabled = true;
    }
    saveHistory({
        date: new Date(),
        outcome: passed ? "Пройден" : "Не пройден",
        score: `${correctAnswersCount} / ${testQuestions.length}`
    });
}

function displayResult(transcript, evaluation) {
    const li = document.createElement('li');
    li.classList.add('result-item');
    li.innerHTML = `<p><strong>Вопрос:</strong> ${testQuestions[currentQuestionIndex].text}</p><p><strong>Распознанный ответ:</strong> ${transcript}</p><p><span class="${evaluation.class}">${evaluation.text}</span></p>`;
    resultsList.appendChild(li);
}

function saveHistory(result) {
    interviewHistory.unshift(result);
    document.getElementById('historySection').style.display = 'block';
    renderHistoryTable();
}
function renderHistoryTable() {
    historyTableBody.innerHTML = '';
    if (interviewHistory.length === 0) {
        historyTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center;">История пока пуста.</td></tr>`;
        return;
    }
    interviewHistory.forEach(item => {
        const date = new Date(item.date);
        const formattedDate = date.toLocaleString('ru-RU');
        const row = `<tr><td>${formattedDate}</td><td class="${item.outcome === 'Пройден' ? 'evaluation-correct' : 'evaluation-incorrect'}">${item.outcome}</td><td>${item.score}</td></tr>`;
        historyTableBody.innerHTML += row;
    });
}

checkDeviceBtn.addEventListener('click', checkDevices);

startBtn.addEventListener('click', async () => {
    resetInterviewState();
    const ready = await initializeInterview();
    if (ready) {
        showScreen('interviewScreen');
        mediaRecorder.start();
        displayNextQuestion();
    }
});

function resetApp() {
    testQuestions = [];
    renderConstructorList();
    thresholdInput.value = 1;
    document.querySelector('input[name="saveCondition"][value="successful"]').checked = true;
    correctAnswerInput.value = '';
    showScreen('instructionsScreen');
}

restartBtn.addEventListener('click', resetApp);

saveBtn.addEventListener('click', () => {
    if (!finalVideoBlob) {
        alert('Видеофайл еще не готов или запись не удалась.');
        return;
    }
    const url = URL.createObjectURL(finalVideoBlob);
    const a = document.createElement('a');
    a.style = 'display: none';
    a.href = url;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    a.download = `interview_recording_${timestamp}.webm`;
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();

    saveBtn.disabled = true;
    saveBtn.textContent = 'Сохранено!';

    setTimeout(() => {
        resetApp();
    }, 2000);
});

document.addEventListener('DOMContentLoaded', () => {
    showScreen('instructionsScreen');
});

// Неизмененные функции для полноты
function resetInterviewState() {
    currentQuestionIndex = -1;
    isListening = false;
    mediaRecorder = null;
    videoChunks = [];
    correctAnswersCount = 0;
    finalVideoBlob = null;
    resultsList.innerHTML = '';
    recordBtn.disabled = true;
    saveBtn.style.display = 'none';
}
async function initializeInterview() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        videoPreview.srcObject = stream;
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) videoChunks.push(event.data);
        };
        return true;
    } catch (err) {
        alert('Ошибка: не удалось получить доступ к камере или микрофону.');
        showScreen('startInterviewScreen');
        return false;
    }
}
function stopRecordingAndCamera() {
    return new Promise(resolve => {
        if (!mediaRecorder || mediaRecorder.state !== 'recording') {
            if (videoPreview.srcObject) {
                videoPreview.srcObject.getTracks().forEach(track => track.stop());
                videoPreview.srcObject = null;
            }
            resolve(null);
            return;
        }
        mediaRecorder.onstop = () => {
            const blob = new Blob(videoChunks, { type: 'video/webm' });
            if (videoPreview.srcObject) {
                videoPreview.srcObject.getTracks().forEach(track => track.stop());
                videoPreview.srcObject = null;
            }
            resolve(blob);
        };
        mediaRecorder.stop();
    });
}
