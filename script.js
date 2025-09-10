document.addEventListener('DOMContentLoaded', function() {
    // Глобальные переменные
    let questions = [];
    let currentQuestionIndex = 0;
    let correctAnswers = 0;
    let passingScore = 1;
    let saveOption = 'successful';
    let mediaRecorder;
    let recordedChunks = [];
    let stream;
    let recognition;

    // Элементы DOM
    const sections = {
        welcome: document.getElementById('welcome'),
        constructor: document.getElementById('constructor'),
        testIntro: document.getElementById('test-intro'),
        testQuestion: document.getElementById('test-question'),
        results: document.getElementById('results'),
        history: document.getElementById('history')
    };

    // Кнопки
    const startButton = document.getElementById('start-button');
    const addQuestionButton = document.getElementById('add-question');
    const createTestButton = document.getElementById('create-test');
    const checkDevicesButton = document.getElementById('check-devices');
    const startTestButton = document.getElementById('start-test');
    const startAnswerButton = document.getElementById('start-answer');
    const stopAnswerButton = document.getElementById('stop-answer');
    const saveRecordingButton = document.getElementById('save-recording');
    const newTestButton = document.getElementById('new-test');

    // Инпуты
    const questionTextInput = document.getElementById('question-text');
    const expectedAnswerInput = document.getElementById('expected-answer');
    const passingScoreInput = document.getElementById('passing-score');
    const saveSuccessfulRadio = document.getElementById('save-successful');
    const saveAlwaysRadio = document.getElementById('save-always');

    // Контейнеры
    const questionsContainer = document.getElementById('questions-container');
    const currentQuestionContainer = document.getElementById('current-question');
    const testResultsContainer = document.getElementById('test-results');
    const recognizedTextContainer = document.getElementById('recognized-text');
    const historyDataContainer = document.getElementById('history-data');
    const videoPreview = document.getElementById('video-preview');

    // Функция для переключения между разделами
    function showSection(sectionId) {
        Object.values(sections).forEach(section => {
            section.classList.remove('active');
        });
        sections[sectionId].classList.add('active');
    }

    // Обработчики событий для кнопок
    startButton.addEventListener('click', function() {
        showSection('constructor');
    });

    addQuestionButton.addEventListener('click', function() {
        const questionText = questionTextInput.value.trim();
        const expectedAnswer = expectedAnswerInput.value.trim();
        
        if (questionText && expectedAnswer) {
            questions.push({
                text: questionText,
                expected: expectedAnswer
            });
            
            updateQuestionsList();
            questionTextInput.value = '';
            expectedAnswerInput.value = '';
        } else {
            alert('Пожалуйста, заполните текст вопроса и ожидаемый ответ');
        }
    });

    createTestButton.addEventListener('click', function() {
        if (questions.length === 0) {
            alert('Добавьте хотя бы один вопрос');
            return;
        }
        
        passingScore = parseInt(passingScoreInput.value) || 1;
        if (passingScore > questions.length) {
            passingScore = questions.length;
            passingScoreInput.value = passingScore;
        }
        
        saveOption = saveSuccessfulRadio.checked ? 'successful' : 'always';
        
        showSection('testIntro');
    });

    checkDevicesButton.addEventListener('click', function() {
        checkDeviceAccess();
    });

    startTestButton.addEventListener('click', function() {
        startTest();
    });

    startAnswerButton.addEventListener('click', function() {
        startRecording();
    });

    stopAnswerButton.addEventListener('click', function() {
        stopRecording();
    });

    saveRecordingButton.addEventListener('click', function() {
        saveRecording();
    });

    newTestButton.addEventListener('click', function() {
        resetTest();
        showSection('constructor');
    });

    // Функция для обновления списка вопросов
    function updateQuestionsList() {
        questionsContainer.innerHTML = '';
        questions.forEach((question, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${question.text}`;
            questionsContainer.appendChild(li);
        });
    }

    // Функция для проверки доступа к устройствам
    async function checkDeviceAccess() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            videoPreview.srcObject = stream;
            videoPreview.play();
            alert('Доступ к камере и микрофону получен успешно');
        } catch (error) {
            console.error('Ошибка доступа к устройствам:', error);
            alert('Ошибка доступа к камере или микрофону. Пожалуйста, проверьте разрешения браузера.');
        }
    }

    // Функция для начала теста
    function startTest() {
        currentQuestionIndex = 0;
        correctAnswers = 0;
        showCurrentQuestion();
        showSection('testQuestion');
    }

    // Функция для отображения текущего вопроса
    function showCurrentQuestion() {
        if (currentQuestionIndex < questions.length) {
            const question = questions[currentQuestionIndex];
            currentQuestionContainer.textContent = question.text;
            startAnswerButton.style.display = 'block';
            stopAnswerButton.style.display = 'none';
        } else {
            finishTest();
        }
    }

    // Функция для начала записи
    function startRecording() {
        if (!stream) {
            checkDeviceAccess().then(() => {
                setupRecording();
            });
        } else {
            setupRecording();
        }
    }

    // Настройка записи
    function setupRecording() {
        startAnswerButton.style.display = 'none';
        stopAnswerButton.style.display = 'block';
        
        recordedChunks = [];
        
        // Настройка распознавания речи
        if ('webkitSpeechRecognition' in window) {
            recognition = new webkitSpeechRecognition();
            recognition.lang = 'ru-RU';
            recognition.continuous = true;
            recognition.interimResults = false;
            
            recognition.onresult = function(event) {
                const result = event.results[event.results.length - 1];
                const transcript = result[0].transcript;
                recognizedTextContainer.textContent = transcript;
            };
            
            recognition.start();
        }
        
        // Настройка записи медиа
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = function(event) {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
        
        mediaRecorder.start();
    }

    // Функция для остановки записи
    function stopRecording() {
        stopAnswerButton.style.display = 'none';
        startAnswerButton.style.display = 'block';
        
        if (recognition) {
            recognition.stop();
        }
        
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            
            // Проверка ответа
            setTimeout(checkAnswer, 500);
        }
    }

    // Функция для проверки ответа
    function checkAnswer() {
        const recognizedText = recognizedTextContainer.textContent.toLowerCase();
        const expectedKeywords = questions[currentQuestionIndex].expected.toLowerCase().split(',');
        
        let isCorrect = false;
        for (const keyword of expectedKeywords) {
            if (recognizedText.includes(keyword.trim())) {
                isCorrect = true;
                break;
            }
        }
        
        if (isCorrect) {
            correctAnswers++;
            alert('Правильно!');
        } else {
            alert('Неправильно. Ожидаемый ответ должен содержать: ' + questions[currentQuestionIndex].expected);
        }
        
        currentQuestionIndex++;
        showCurrentQuestion();
    }

    // Функция для завершения теста
    function finishTest() {
        const isPassed = correctAnswers >= passingScore;
        const shouldSave = saveOption === 'always' || (saveOption === 'successful' && isPassed);
        
        testResultsContainer.innerHTML = `
            <h3>Тест ${isPassed ? 'пройден' : 'не пройден'}</h3>
            <p>Правильных ответов: ${correctAnswers} из ${questions.length}</p>
            <p>Проходной балл: ${passingScore}</p>
        `;
        
        saveRecordingButton.style.display = shouldSave ? 'block' : 'none';
        
        // Добавление в историю
        const historyEntry = {
            date: new Date().toLocaleString(),
            result: isPassed ? 'Пройден' : 'Не пройден',
            score: `${correctAnswers}/${questions.length}`
        };
        
        addHistoryEntry(historyEntry);
        
        showSection('results');
    }

    // Функция для сохранения записи
    function saveRecording() {
        if (recordedChunks.length) {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `video-screening-${new Date().toISOString()}.webm`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        }
    }

    // Функция для сброса теста
    function resetTest() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        
        videoPreview.srcObject = null;
        questions = [];
        updateQuestionsList();
        passingScoreInput.value = 1;
        saveSuccessfulRadio.checked = true;
        recognizedTextContainer.textContent = '';
    }

    // Функция для добавления записи в историю
    function addHistoryEntry(entry) {
        const row = document.createElement('tr');
        
        const dateCell = document.createElement('td');
        dateCell.textContent = entry.date;
        
        const resultCell = document.createElement('td');
        resultCell.textContent = entry.result;
        
        const scoreCell = document.createElement('td');
        scoreCell.textContent = entry.score;
        
        row.appendChild(dateCell);
        row.appendChild(resultCell);
        row.appendChild(scoreCell);
        
        historyDataContainer.appendChild(row);
    }

    // Показать начальный экран
    showSection('welcome');
});
