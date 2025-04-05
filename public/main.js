// Global variables
let currentEmotion = 'neutral';
let faceMeshModel;
let camera;
let emotionHistory = [];
let userName = 'User' + Math.floor(Math.random() * 1000); // Simple random username
// Add debug mode for testing
let debugMode = false;
// Add emotion stability variables
let lastEmotion = 'neutral';
let emotionStabilityCounter = 0;
const EMOTION_STABILITY_THRESHOLD = 8; // Increased stability threshold for better detection

// OpenAI API settings
const useOpenAI = true; // Set to false to use only local detection
let openAILastCallTime = 0;
const OPENAI_CALL_INTERVAL = 4000; // Increased time between OpenAI API calls to 4 seconds
let processingOpenAIRequest = false;
let openAIPendingConfirmation = false;
let openAILastEmotion = null;
let openAIConfirmationCount = 0;
const OPENAI_CONFIRMATION_THRESHOLD = 3; // Increased - OpenAI needs to detect same emotion multiple times
let openAIEnabled = true; // Can be toggled on/off during runtime
let openAIErrorCount = 0; // Track consecutive errors
const MAX_OPENAI_ERRORS = 5; // Disable after this many consecutive errors

// AI Assistant variables
let assistantProcessing = false;
let assistantMessages = [];

// Bloom journal variables
let journalEntries = [];
let dailyEmotions = {}; // Track emotions for the current day
let todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
let streakData = {
    lastEntryDate: null,
    currentStreak: 0,
    bloomedDays: []
};

// Add conversation state tracking for journal
let inJournalingMode = false;
let journalQuestions = [];
let journalAnswers = {};
let currentQuestionIndex = 0;
let journalEntryInProgress = null;

// Emotion threshold variables - fine-tuned for better accuracy
let thresholds = {
    eyeOpenness: 0.012,     // Below this is considered sleepy
    mouthOpenness: 0.13,    // Above this is considered surprised
    smileRatio: -0.018,     // Below this (with appropriate mouth width) is considered happy
    eyebrowRatio: -0.03,    // Below this is considered angry
    sadSmileRatio: 0.01     // Above this (with narrow mouth) is considered sad
};

// Video capture and processing variables
let captureCanvas;
let captureContext;
let lastProcessedFrame = 0;
const FRAME_PROCESS_INTERVAL = 1000; // Increased processing interval

// DOM elements
const videoElement = document.getElementById('video-input');
const canvasElement = document.getElementById('ar-canvas');
const canvasCtx = canvasElement.getContext('2d');
const emotionText = document.querySelector('.emotion-text');
const alignmentGuide = document.querySelector('.alignment-guide');
const emotionTimeline = document.getElementById('emotion-timeline');
const assistantMessagesElement = document.getElementById('assistant-messages');
const assistantInput = document.getElementById('assistant-input');
const assistantSendButton = document.getElementById('assistant-send-button');
const getAdviceButton = document.getElementById('get-advice-button');
const assistantTyping = document.getElementById('assistant-typing');
const guidanceText = document.getElementById('guidance-text');
const reactionButtons = document.querySelectorAll('.reaction-btn');

// Debug DOM elements
const debugToggle = document.getElementById('debug-toggle');
const debugPanel = document.getElementById('debug-panel');
const debugEyeOpenness = document.getElementById('debug-eye-openness');
const debugMouthWidth = document.getElementById('debug-mouth-width');
const debugMouthOpenness = document.getElementById('debug-mouth-openness');
const debugSmileRatio = document.getElementById('debug-smile-ratio');
const debugEyebrowRatio = document.getElementById('debug-eyebrow-ratio');

// Threshold sliders
const thresholdEye = document.getElementById('threshold-eye');
const thresholdEyeValue = document.getElementById('threshold-eye-value');
const thresholdMouthOpen = document.getElementById('threshold-mouth-open');
const thresholdMouthOpenValue = document.getElementById('threshold-mouth-open-value');
const thresholdSmile = document.getElementById('threshold-smile');
const thresholdSmileValue = document.getElementById('threshold-smile-value');

// Add new debug DOM elements
const debugCurrentEmotion = document.getElementById('debug-current-emotion');
const debugTentativeEmotion = document.getElementById('debug-tentative-emotion');
const debugStabilityCounter = document.getElementById('debug-stability-counter');
const thresholdEyebrow = document.getElementById('threshold-eyebrow');
const thresholdEyebrowValue = document.getElementById('threshold-eyebrow-value');
const thresholdSad = document.getElementById('threshold-sad');
const thresholdSadValue = document.getElementById('threshold-sad-value');
const thresholdStability = document.getElementById('threshold-stability');
const thresholdStabilityValue = document.getElementById('threshold-stability-value');

// Add new DOM elements for OpenAI integration
const openaiStatusElement = document.createElement('div');
openaiStatusElement.className = 'openai-status';
openaiStatusElement.textContent = 'OpenAI: Ready';

// Add new debug DOM elements for OpenAI
const debugOpenAIStatus = document.getElementById('debug-openai-status');
const debugOpenAIConfirmation = document.getElementById('debug-openai-confirmation');
const debugOpenAIEmotion = document.getElementById('debug-openai-emotion');
const thresholdOpenAIConfirm = document.getElementById('threshold-openai-confirm');
const thresholdOpenAIConfirmValue = document.getElementById('threshold-openai-confirm-value');
const thresholdOpenAIInterval = document.getElementById('threshold-openai-interval');
const thresholdOpenAIIntervalValue = document.getElementById('threshold-openai-interval-value');

// Socket.IO connection
const socket = io();

// Initialize the application
function init() {
    console.log('Initializing BloomAI application...');
    
    // Setup camera and face mesh
    setupCamera();
    setupFaceMesh();
    
    // Setup capture canvas for OpenAI
    setupCaptureCanvas();
    console.log('Capture canvas setup complete');
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup Socket.IO event handlers
    setupSocketEvents();
    
    // Setup debug controls
    setupDebugControls();
    
    // Ensure OpenAI is enabled by default
    openAIEnabled = true;
    openAIErrorCount = 0;
    console.log('OpenAI emotion detection enabled:', openAIEnabled);
    
    // Set up chat container 
    if (assistantMessagesElement) {
        assistantMessagesElement.style.display = 'flex';
        assistantMessagesElement.style.flexDirection = 'column';
    }
    
    // Add OpenAI status indicator to the UI
    const container = document.querySelector('.emotion-indicator');
    container.appendChild(openaiStatusElement);
    openaiStatusElement.textContent = 'OpenAI: Ready';
    openaiStatusElement.style.color = '#4caf50';
    
    // Load journal entries and streak data from local storage
    loadJournalData();
    
    // Update the streak UI
    updateStreakUI();
    
    // Show welcome guidance as an error message (still using notification for initial welcome)
    showGuidance('Welcome to Bloom! Position your face in the center to start tracking your emotions.', 'error');
    
    // Auto-hide alignment guide after 5 seconds
    setTimeout(() => {
        alignmentGuide.classList.add('hidden');
    }, 5000);
    
    // Add welcome messages from Bloom assistant
    setTimeout(() => {
        // Initial welcome
        addAssistantMessage({
            sender: 'ai',
            message: "Hello! I'm your Bloom assistant. I can help you journal your emotions and track your emotional well-being over time.",
            emotion: currentEmotion,
            timestamp: new Date().toISOString()
        });
        
        // Explanation about the features
        setTimeout(() => {
            addAssistantMessage({
                sender: 'ai',
                message: "Share your feelings with me each day to create journal entries and watch your garden grow. You'll see a flower bloom for each day you check in!",
                emotion: currentEmotion,
                timestamp: new Date().toISOString(),
                isGuidance: true
            });
        }, 2000);
    }, 2000);
    
    // Resize canvas to match video dimensions
    window.addEventListener('resize', resizeCanvas);
    
    console.log('Initialization complete');
}

// Setup WebRTC camera
function setupCamera() {
    // Set canvas size
    resizeCanvas();
    
    // Setup camera
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showGuidance('Camera access not supported in your browser', 'error');
        return;
    }
    
    // Request camera access
    navigator.mediaDevices.getUserMedia({
        video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
        },
        audio: false
    })
    .then(stream => {
        videoElement.srcObject = stream;
        videoElement.onloadedmetadata = () => {
            videoElement.play();
            resizeCanvas();
        };
    })
    .catch(err => {
        console.error('Error accessing camera:', err);
        showGuidance('Camera access denied. Please enable camera permissions.', 'error');
    });
}

// Set up MediaPipe Face Mesh
function setupFaceMesh() {
    faceMeshModel = new FaceMesh({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
    });
    
    faceMeshModel.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    
    faceMeshModel.onResults(onFaceMeshResults);
    
    // Start camera once FaceMesh is loaded
    camera = new Camera(videoElement, {
        onFrame: async () => {
            await faceMeshModel.send({ image: videoElement });
        },
        width: 1280,
        height: 720
    });
    
    camera.start();
}

// Handle Face Mesh detection results
function onFaceMeshResults(results) {
    // Clear the canvas first
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Add debug logging to track function calls
    console.log('onFaceMeshResults called with results:', !!results);
    
    // If no face is detected, show guidance
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        emotionText.textContent = 'No face detected';
        if (debugMode) {
            debugOpenAIStatus.textContent = 'No face';
        }
        return;
    }
    
    console.log('Face detected, landmarks count:', results.multiFaceLandmarks[0].length);
    
    // Get facial landmarks
    const landmarks = results.multiFaceLandmarks[0];
    
    // Calculate facial metrics for debug panel
    const metrics = calculateFacialMetrics(landmarks);
    console.log('Facial metrics calculated:', metrics);
    
    // Update debug panel if in debug mode
    if (debugMode) {
        updateDebugPanel(metrics);
        debugOpenAIStatus.textContent = processingOpenAIRequest ? 'Processing' : 'Ready';
        debugOpenAIConfirmation.textContent = `${openAIConfirmationCount}/${OPENAI_CONFIRMATION_THRESHOLD}`;
        debugOpenAIEmotion.textContent = openAILastEmotion || 'none';
    }
    
    // Detect emotion based on facial features using local model
    const localEmotion = detectEmotion(landmarks, metrics);
    console.log('Local emotion detected:', localEmotion, 'Current emotion:', currentEmotion);
    
    // Always update text display with the current detected emotion
    emotionText.textContent = capitalize(currentEmotion);
    
    // If OpenAI integration is enabled and it's time to make a new API call
    const currentTime = Date.now();
    if (openAIEnabled && 
        !processingOpenAIRequest && 
        currentTime - openAILastCallTime > OPENAI_CALL_INTERVAL &&
        currentTime - lastProcessedFrame > FRAME_PROCESS_INTERVAL) {
        
        console.log('Conditions met to capture frame for OpenAI');
        lastProcessedFrame = currentTime;
        captureFrameForOpenAI(results);
    }
    
    // Draw AR effects based on emotion
    drawEmotionalEffects(landmarks, currentEmotion);
    
    canvasCtx.restore();
}

// Capture a frame to send to OpenAI for emotion analysis
async function captureFrameForOpenAI(results) {
    // Don't proceed if OpenAI is disabled
    if (!openAIEnabled) {
        if (debugMode) {
            const debugOpenAI = document.getElementById('debug-openai-status');
            if (debugOpenAI) {
                debugOpenAI.textContent = 'Disabled';
            }
        }
        openaiStatusElement.textContent = 'OpenAI: Disabled';
        openaiStatusElement.style.color = '#9e9e9e';
        return;
    }
    
    // Add debug logs to help identify issues
    console.log('Capturing frame for OpenAI emotion analysis...');
    console.log('captureCanvas exists:', !!captureCanvas);
    console.log('captureContext exists:', !!captureContext);
    
    try {
        // Set flag to avoid multiple simultaneous requests
        processingOpenAIRequest = true;
        openaiStatusElement.textContent = 'OpenAI: Processing...';
        openaiStatusElement.style.color = '#ff9800';
        
        // Draw current frame to capture canvas
        captureContext.drawImage(
            videoElement, 
            0, 0, videoElement.videoWidth, videoElement.videoHeight, 
            0, 0, captureCanvas.width, captureCanvas.height
        );
        
        console.log('Frame captured and drawn to canvas');
        
        // Convert canvas to base64 data URL
        const imageData = captureCanvas.toDataURL('image/jpeg', 0.7);
        console.log('Image data URL created, length:', imageData.length);
        
        // Prepare facial data for hybrid approach
        const faceData = {
            landmarks: results.multiFaceLandmarks[0],
            metrics: calculateFacialMetrics(results.multiFaceLandmarks[0])
        };
        
        console.log('Sending API request to /api/analyze-emotion');
        
        // Make API request to our server endpoint
        const response = await fetch('/api/analyze-emotion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imageData,
                faceData
            })
        });
        
        console.log('API response received:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            openAILastCallTime = Date.now();
            
            console.log('OpenAI emotion analysis:', data);
            
            // Check if this was a fallback response from server due to OpenAI error
            if (data.fallback) {
                console.log('Received fallback response, error:', data.error);
                openAIErrorCount++;
                
                // Show error code if available
                let errorMessage = 'Error';
                if (data.error && data.error.code) {
                    errorMessage = `Error (${data.error.code})`;
                    
                    // Show specific error message for common issues
                    if (data.error.code === 'model_not_found') {
                        errorMessage = 'Model error';
                        if (debugMode) {
                            showGuidance('OpenAI model error - the model being used may be deprecated', 'error');
                        }
                    } else if (data.error.code === 'insufficient_quota') {
                        errorMessage = 'API quota';
                        if (debugMode) {
                            showGuidance('OpenAI API quota exceeded. Check your billing settings', 'error');
                        }
                    }
                }
                
                openaiStatusElement.textContent = `OpenAI: ${errorMessage}`;
                openaiStatusElement.style.color = '#f44336';
                
                // Auto-disable OpenAI after too many consecutive errors
                if (openAIErrorCount >= MAX_OPENAI_ERRORS) {
                    openAIEnabled = false;
                    openaiStatusElement.textContent = 'OpenAI: Disabled (too many errors)';
                    openaiStatusElement.style.color = '#9e9e9e';
                    console.warn(`OpenAI disabled after ${MAX_OPENAI_ERRORS} consecutive errors`);
                    
                    if (debugMode) {
                        // Show auto-disable message
                        showGuidance(`OpenAI disabled after ${MAX_OPENAI_ERRORS} consecutive errors. You can re-enable in debug panel.`, 'error');
                        // Add re-enable button to debug panel if it doesn't exist
                        addOpenAIReEnableButton();
                    }
                }
                
                // Just continue using local detection
                processingOpenAIRequest = false;
                return;
            }
            
            // Success! Reset error count
            openAIErrorCount = 0;
            
            // Update UI with OpenAI status
            openaiStatusElement.textContent = `OpenAI: ${data.emotion}`;
            openaiStatusElement.style.color = '#4caf50';
            
            // Enhanced confirmation mechanism for OpenAI detections
            if (data.emotion) {
                // Filter out invalid emotions
                if (!['happy', 'sad', 'angry', 'surprised', 'neutral', 'sleepy', 'fearful', 'disgusted'].includes(data.emotion)) {
                    console.warn('Received invalid emotion from OpenAI:', data.emotion);
                    return;
                }
                
                // Check if this is the same emotion as last time
                if (openAILastEmotion === data.emotion) {
                    openAIConfirmationCount++;
                    
                    // If OpenAI has confirmed the same emotion multiple times, update the emotion
                    if (openAIConfirmationCount >= OPENAI_CONFIRMATION_THRESHOLD) {
                        // Only update if different from current emotion or if it's a major emotion change
                        const isMajorChange = 
                            (data.emotion === 'happy' && currentEmotion === 'sad') ||
                            (data.emotion === 'sad' && currentEmotion === 'happy') ||
                            (data.emotion === 'angry' && 
                             (currentEmotion === 'happy' || currentEmotion === 'neutral')) ||
                            (data.emotion === 'surprised' && 
                             (currentEmotion === 'sleepy' || currentEmotion === 'neutral'));
                            
                        if (data.emotion !== currentEmotion || isMajorChange) {
                            updateEmotionState(data.emotion);
                            // Reset confirmation state after successful update
                            openAIConfirmationCount = 0;
                        }
                    }
                } else {
                    // Reset confirmation counter for new emotion
                    openAIConfirmationCount = 1;
                    openAILastEmotion = data.emotion;
                }
                
                if (debugMode) {
                    // Show confirmation count in debug mode
                    const debugOpenAI = document.getElementById('debug-openai-confirmation');
                    if (debugOpenAI) {
                        debugOpenAI.textContent = `${openAIConfirmationCount}/${OPENAI_CONFIRMATION_THRESHOLD}`;
                    }
                }
            }
        } else {
            // Handle HTTP error responses
            const errorText = await response.text();
            console.error('Error from server:', errorText);
            openaiStatusElement.textContent = 'OpenAI: Error';
            openaiStatusElement.style.color = '#f44336';
            
            // Increment error counter
            openAIErrorCount++;
            
            // Show retry countdown if in debug mode
            if (debugMode) {
                const debugOpenAI = document.getElementById('debug-openai-status');
                if (debugOpenAI) {
                    debugOpenAI.textContent = 'Error (retry in ' + Math.ceil((OPENAI_CALL_INTERVAL)/1000) + 's)';
                }
            }
            
            // Auto-disable after too many errors
            if (openAIErrorCount >= MAX_OPENAI_ERRORS) {
                openAIEnabled = false;
                openaiStatusElement.textContent = 'OpenAI: Disabled (too many errors)';
                openaiStatusElement.style.color = '#9e9e9e';
                console.warn(`OpenAI disabled after ${MAX_OPENAI_ERRORS} consecutive errors`);
                
                if (debugMode) {
                    showGuidance(`OpenAI disabled after ${MAX_OPENAI_ERRORS} consecutive errors. You can re-enable in debug panel.`, 'error');
                    addOpenAIReEnableButton();
                }
            }
        }
    } catch (error) {
        console.error('Error capturing frame for OpenAI:', error);
        console.error('Error details:', error.stack);
        openaiStatusElement.textContent = 'OpenAI: Error';
        openaiStatusElement.style.color = '#f44336';
        
        // Increment error counter
        openAIErrorCount++;
    } finally {
        processingOpenAIRequest = false;
    }
}

// Add a button to re-enable OpenAI in the debug panel
function addOpenAIReEnableButton() {
    // Check if button already exists
    if (document.getElementById('openai-reenable-btn')) {
        return;
    }
    
    const openAIControls = document.querySelector('.openai-controls');
    if (openAIControls) {
        const reenableBtn = document.createElement('button');
        reenableBtn.id = 'openai-reenable-btn';
        reenableBtn.className = 'debug-button';
        reenableBtn.textContent = 'Re-enable OpenAI';
        reenableBtn.addEventListener('click', () => {
            openAIEnabled = true;
            openAIErrorCount = 0;
            openaiStatusElement.textContent = 'OpenAI: Ready';
            openaiStatusElement.style.color = '#4caf50';
            
            // Remove the button
            reenableBtn.remove();
            
            // Show guidance
            showGuidance('OpenAI has been re-enabled', 'info');
        });
        
        openAIControls.appendChild(reenableBtn);
    }
}

// Update emotion state when a new emotion is detected
function updateEmotionState(emotion) {
    // Only update if the emotion has changed
    if (emotion !== currentEmotion) {
        // Track the previous emotion for transitions
        const previousEmotion = currentEmotion;
        
        // Validate the emotion is a recognized type
        if (!['happy', 'sad', 'angry', 'surprised', 'neutral', 'sleepy', 'fearful', 'disgusted'].includes(emotion)) {
            console.warn('Attempt to set invalid emotion:', emotion);
            return;
        }
        
        // Implement smoother transitions between opposite emotions
        // Don't allow direct transitions between certain emotion pairs
        const incompatibleTransitions = {
            'happy': ['angry', 'sad'],
            'angry': ['happy', 'sleepy'],
            'sad': ['happy', 'surprised'],
            'surprised': ['sleepy', 'sad'],
            'sleepy': ['surprised', 'angry']
        };
        
        // Check if this is an incompatible transition
        if (incompatibleTransitions[previousEmotion] && 
            incompatibleTransitions[previousEmotion].includes(emotion)) {
            // For incompatible transitions, go through neutral first
            if (previousEmotion !== 'neutral') {
                console.log(`Smoothing transition from ${previousEmotion} to ${emotion} via neutral`);
                // Update to neutral first
                updateEmotionColors('neutral');
                // Short delay before setting the target emotion
                setTimeout(() => {
                    completeEmotionUpdate(emotion, previousEmotion);
                }, 250);
                return;
            }
        }
        
        // Proceed with normal emotion update
        completeEmotionUpdate(emotion, previousEmotion);
    }
}

// Helper function to complete the emotion update
function completeEmotionUpdate(emotion, previousEmotion) {
    // Update current emotion
    currentEmotion = emotion;
    
    // Update UI
    emotionText.textContent = capitalize(emotion);
    
    // Add emotion to history
    updateEmotionHistory(emotion);
    
    // Track emotion for daily journal
    trackDailyEmotion(emotion);
    
    // Update socket status
    try {
        socket.emit('newEmotion', {
            userName: userName,
            emotion: emotion,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error emitting emotion change:', error);
    }
    
    // Change page colors based on emotion
    updateEmotionColors(emotion);
    
    // Show guidance based on major emotion changes
    if (['angry', 'sad', 'fearful'].includes(emotion)) {
        showGuidance(`I notice you're feeling ${emotion}. Would you like to tell me more about how you're feeling?`, 'info');
    } else if (emotion === 'happy' && ['sad', 'angry', 'fearful'].includes(previousEmotion)) {
        showGuidance(`It's great to see you're feeling happy! Would you like to journal about what's making you happy today?`, 'info');
    } else if (emotion === 'neutral' && ['angry', 'sad', 'fearful'].includes(previousEmotion)) {
        showGuidance(`I see your emotional state is now more balanced. How are you feeling?`, 'info');
    }
    
    // For debug mode
    if (debugMode) {
        debugCurrentEmotion.textContent = emotion;
    }
}

// Track emotions for the current day
function trackDailyEmotion(emotion) {
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Make sure we're tracking for today
    if (currentDate !== todayDate) {
        todayDate = currentDate;
        dailyEmotions = {};
    }
    
    // Count emotion occurrences
    if (dailyEmotions[emotion]) {
        dailyEmotions[emotion]++;
    } else {
        dailyEmotions[emotion] = 1;
    }
}

// Get dominant emotions for the day
function getDominantEmotions() {
    return Object.entries(dailyEmotions)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(entry => entry[0]);
}

// Update streak UI based on current streak data
function updateStreakUI() {
    // Update streak counter
    document.getElementById('current-streak').textContent = streakData.currentStreak;
    
    // Get current day of week (0 = Sunday, 6 = Saturday)
    const today = new Date().getDay();
    
    // Update flower icons based on bloomed days
    const flowerDays = document.querySelectorAll('.flower-day');
    flowerDays.forEach(dayElement => {
        const dayIndex = parseInt(dayElement.getAttribute('data-day'));
        const flowerIcon = dayElement.querySelector('.flower-icon');
        
        // Mark current day
        if (dayIndex === today) {
            dayElement.classList.add('current-day');
        } else {
            dayElement.classList.remove('current-day');
        }
        
        // Check if this day is in bloomedDays
        const isBloomedDay = streakData.bloomedDays.includes(dayIndex);
        const hasBloomedClass = flowerIcon.classList.contains('bloomed');
        
        // If day should be bloomed but isn't yet, add animation
        if (isBloomedDay && !hasBloomedClass) {
            flowerIcon.classList.remove('unbloomed');
            flowerIcon.classList.add('blooming');
            
            // After animation finishes, switch to bloomed state
            setTimeout(() => {
                flowerIcon.classList.remove('blooming');
                flowerIcon.classList.add('bloomed');
            }, 1500); // Match animation duration
        } 
        // If day should be bloomed and already has class, ensure it's correct
        else if (isBloomedDay && hasBloomedClass) {
            flowerIcon.classList.remove('unbloomed');
            flowerIcon.classList.add('bloomed');
        }
        // If day shouldn't be bloomed, ensure it's unbloomed
        else if (!isBloomedDay) {
            flowerIcon.classList.remove('bloomed', 'blooming');
            flowerIcon.classList.add('unbloomed');
        }
    });
}

// Create a new journal entry
function createJournalEntry(content) {
    const now = new Date();
    const entryDate = now.toISOString();
    const dominantEmotions = getDominantEmotions();
    
    const entry = {
        id: Date.now(), // Unique ID based on timestamp
        date: entryDate,
        emotions: dominantEmotions,
        content: content,
        createdAt: now.toISOString()
    };
    
    // Add to journal entries
    journalEntries.unshift(entry); // Add to beginning of array
    
    // Update streak data
    updateStreak();
    
    // Save to local storage
    saveJournalData();
    
    // Update UI
    updateJournalUI();
    
    return entry;
}

// Update streak when a new journal entry is created
function updateStreak() {
    const today = new Date();
    const currentDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    
    // First time creating an entry
    if (!streakData.lastEntryDate) {
        streakData.currentStreak = 1;
        streakData.lastEntryDate = currentDate;
        streakData.bloomedDays = [dayOfWeek];
        
        // Show a celebration message for first entry
        showGuidance('Congratulations on your first journal entry! Your garden has started to bloom.', 'success');
    } else {
        // Check if this day is already bloomed
        if (streakData.bloomedDays.includes(dayOfWeek)) {
            // Already bloomed this day of week, no need to change anything
            console.log('This day is already bloomed');
        } else {
            // Add this day to bloomed days
            streakData.bloomedDays.push(dayOfWeek);
            
            // Show celebration if this completes the week
            if (streakData.bloomedDays.length === 7) {
                showGuidance('Amazing! You\'ve completed entries for every day of the week! Your garden is in full bloom!', 'success');
            } else {
                showGuidance('Your garden is growing! New flower has bloomed.', 'success');
            }
        }
        
        // Check if entry is on a new day
        if (currentDate !== streakData.lastEntryDate) {
            // Get date from last entry
            const lastDate = new Date(streakData.lastEntryDate + 'T00:00:00');
            const diffTime = Math.abs(today - lastDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // If it's consecutive (1 day difference)
            if (diffDays === 1) {
                streakData.currentStreak++;
                
                // Celebration for streak milestones
                if (streakData.currentStreak === 3) {
                    showGuidance('3 day streak! You\'re building a great habit!', 'success');
                } else if (streakData.currentStreak === 7) {
                    showGuidance('A full week streak! Your emotional awareness is growing!', 'success');
                } else if (streakData.currentStreak === 30) {
                    showGuidance('Incredible! A 30 day streak! You\'re a master of emotional awareness!', 'success');
                }
            } else {
                // Streak broken, but don't make user feel bad
                if (streakData.currentStreak > 1) {
                    showGuidance('Welcome back! Starting a new streak today.', 'info');
                }
                streakData.currentStreak = 1;
            }
            
            // Update the last entry date
            streakData.lastEntryDate = currentDate;
        }
    }
    
    // Update UI
    updateStreakUI();
    
    // Save streak data
    saveJournalData();
}

// Save journal entries and streak data to local storage
function saveJournalData() {
    try {
        localStorage.setItem('bloomJournalEntries', JSON.stringify(journalEntries));
        localStorage.setItem('bloomStreakData', JSON.stringify(streakData));
    } catch (error) {
        console.error('Error saving journal data:', error);
    }
}

// Load journal entries and streak data from local storage
function loadJournalData() {
    try {
        const savedEntries = localStorage.getItem('bloomJournalEntries');
        const savedStreak = localStorage.getItem('bloomStreakData');
        
        if (savedEntries) {
            journalEntries = JSON.parse(savedEntries);
        }
        
        if (savedStreak) {
            streakData = JSON.parse(savedStreak);
        }
        
        // Update UI
        updateJournalUI();
    } catch (error) {
        console.error('Error loading journal data:', error);
    }
}

// Update the journal entries UI
function updateJournalUI() {
    const journalEntriesContainer = document.getElementById('journal-entries');
    journalEntriesContainer.innerHTML = '';
    
    if (journalEntries.length === 0) {
        journalEntriesContainer.innerHTML = `
            <div class="no-entries">No journal entries yet. Start sharing your emotions to create your first entry.</div>
        `;
        return;
    }
    
    // Display the most recent 5 entries
    const recentEntries = journalEntries.slice(0, 5);
    
    recentEntries.forEach(entry => {
        const entryElement = createJournalEntryElement(entry);
        journalEntriesContainer.appendChild(entryElement);
    });
}

// Create a journal entry element
function createJournalEntryElement(entry) {
    const entryElement = document.createElement('div');
    entryElement.className = 'journal-entry';
    entryElement.setAttribute('data-id', entry.id);
    
    // Format date
    const date = new Date(entry.date);
    const formattedDate = date.toLocaleDateString(undefined, { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
    });
    
    // Create emotions tags
    const emotionTags = entry.emotions.map(emotion => 
        `<span class="emotion-tag">${capitalize(emotion)}</span>`
    ).join('');
    
    // Create preview text (limited to 100 characters)
    const previewText = entry.content.length > 100 
        ? entry.content.substring(0, 100) + '...' 
        : entry.content;
    
    entryElement.innerHTML = `
        <div class="entry-header">
            <span class="entry-date">${formattedDate}</span>
        </div>
        <div class="entry-emotions">${emotionTags}</div>
        <div class="entry-preview">${previewText}</div>
    `;
    
    // Add click event to open the full entry
    entryElement.addEventListener('click', () => {
        showJournalEntry(entry);
    });
    
    return entryElement;
}

// Show a full journal entry in a modal
function showJournalEntry(entry) {
    const modal = document.getElementById('journal-modal');
    const dateElement = document.getElementById('entry-date');
    const emotionsElement = document.getElementById('entry-emotions');
    const contentElement = document.getElementById('entry-content');
    
    // Format date
    const date = new Date(entry.date);
    const formattedDate = date.toLocaleDateString(undefined, { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    });
    
    // Set content
    dateElement.textContent = formattedDate;
    
    // Create emotions tags
    emotionsElement.innerHTML = entry.emotions.map(emotion => 
        `<span class="emotion-tag">${capitalize(emotion)}</span>`
    ).join('');
    
    // Set content with paragraphs
    contentElement.innerHTML = entry.content.split('\n').map(para => 
        `<p>${para}</p>`
    ).join('');
    
    // Show modal
    modal.classList.add('show');
}

// Show all journal entries
function showAllEntries() {
    const modal = document.getElementById('all-entries-modal');
    const entriesContainer = document.getElementById('all-entries-container');
    
    entriesContainer.innerHTML = '';
    
    if (journalEntries.length === 0) {
        entriesContainer.innerHTML = `
            <div class="no-entries">No journal entries yet. Start sharing your emotions to create your first entry.</div>
        `;
    } else {
        // Display all entries
        journalEntries.forEach(entry => {
            const entryElement = createJournalEntryElement(entry);
            entriesContainer.appendChild(entryElement);
        });
    }
    
    // Show modal
    modal.classList.add('show');
}

// Set up event listeners
function setupEventListeners() {
    // Send message when button is clicked
    assistantSendButton.addEventListener('click', sendAssistantMessage);
    
    // Send message when Enter key is pressed
    assistantInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            sendAssistantMessage();
        }
    });
    
    // Get advice when button is clicked
    getAdviceButton.addEventListener('click', createJournalFromEmotions);
    
    // View all entries button
    document.getElementById('view-all-entries').addEventListener('click', showAllEntries);
    
    // Close journal entry modal
    document.querySelector('.close-modal').addEventListener('click', () => {
        document.getElementById('journal-modal').classList.remove('show');
    });
    
    // Close all entries modal
    document.querySelector('.close-all-entries').addEventListener('click', () => {
        document.getElementById('all-entries-modal').classList.remove('show');
    });
    
    // Save entry button
    document.getElementById('save-entry').addEventListener('click', () => {
        document.getElementById('journal-modal').classList.remove('show');
    });
}

// Set up Socket.IO event handlers
function setupSocketEvents() {
    // Listen for emotion updates from server
    socket.on('emotionUpdate', (data) => {
        console.log('Received emotion update:', data);
        
        // Don't update our own UI, just add to the emotion history
        updateEmotionHistory(data.emotion);
    });
    
    // Listen for assistant response confirmation
    socket.on('assistantResponse', (data) => {
        console.log('Assistant response confirmation:', data);
    });
    
    // Handle incoming chat messages
    socket.on('chatMessage', (message) => {
        addChatMessage(message);
    });
    
    // Handle incoming reactions
    socket.on('reaction', (reaction) => {
        showFloatingReaction(reaction);
    });
}

// Send message to AI assistant
async function sendAssistantMessage() {
    // Get message from input
    const message = assistantInput.value.trim();
    
    // Don't send empty messages
    if (!message || assistantProcessing) {
        return;
    }
    
    // Clear input
    assistantInput.value = '';
    
    // Show user message
    addAssistantMessage({
        sender: 'user',
        message: message,
        emotion: currentEmotion,
        timestamp: new Date().toISOString()
    });
    
    // Check if we're in journaling mode and process accordingly
    if (inJournalingMode) {
        // First check if this is a response to journal preview
        if (journalEntryInProgress && processJournalPreviewResponse(message)) {
            return;
        }
        
        // Otherwise, process as an answer to a journal question
        if (processJournalAnswer(message)) {
            return;
        }
    }
    
    // If not in journaling mode or not a valid journal command, process as a regular message
    
    // Track message for later context
    assistantMessages.push({
        role: 'user',
        message: message,
        emotion: currentEmotion,
        timestamp: new Date().toISOString()
    });
    
    // Show typing indicator
    assistantProcessing = true;
    assistantTyping.classList.remove('hidden');
    
    try {
        // Get recent emotion history for context
        const recentHistory = emotionHistory.slice(-5);
        
        // Call API for assistant response
        const response = await fetch('/api/assistant', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                currentEmotion: currentEmotion,
                emotionHistory: recentHistory
            })
        });
        
        // Handle response
        if (response.ok) {
            const data = await response.json();
            
            // Add assistant message
            addAssistantMessage({
                sender: 'ai',
                message: data.response,
                emotion: currentEmotion,
                timestamp: new Date().toISOString()
            });
            
            // Track message for later context
            assistantMessages.push({
                role: 'ai',
                message: data.response,
                emotion: currentEmotion,
                timestamp: new Date().toISOString()
            });
            
            // Trim message history if too long
            if (assistantMessages.length > 10) {
                assistantMessages = assistantMessages.slice(-10);
            }
            
            // Log via Socket.IO for tracking
            socket.emit('assistantMessage', {
                userName: userName,
                userMessage: message,
                aiResponse: data.response,
                emotion: currentEmotion,
                timestamp: new Date().toISOString()
            });
        } else {
            console.error('Error getting assistant response:', await response.text());
            showGuidance('Sorry, I had trouble processing your message', 'error');
        }
    } catch (error) {
        console.error('Error sending message to assistant:', error);
        showGuidance('Connection error. Please try again.', 'error');
    } finally {
        // Hide typing indicator
        assistantProcessing = false;
        assistantTyping.classList.add('hidden');
    }
}

// Create a journal entry from today's emotions
async function createJournalFromEmotions() {
    // Don't request if already processing
    if (assistantProcessing || inJournalingMode) {
        return;
    }
    
    // Enter journaling mode
    inJournalingMode = true;
    
    // Show typing indicator
    assistantProcessing = true;
    assistantTyping.classList.remove('hidden');
    getAdviceButton.disabled = true;
    getAdviceButton.textContent = "Journaling in progress...";
    
    try {
        // Get recent emotion history for context
        const recentHistory = emotionHistory.slice(-10);
        const dominantEmotions = getDominantEmotions();
        
        // First, get journal questions from the API
        const questionsResponse = await fetch('/api/journal-questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentEmotion: currentEmotion,
                emotionHistory: recentHistory,
                dominantEmotions: dominantEmotions
            })
        });
        
        if (!questionsResponse.ok) {
            throw new Error('Failed to get journal questions');
        }
        
        const questionsData = await questionsResponse.json();
        journalQuestions = questionsData.questions;
        journalAnswers = {};
        currentQuestionIndex = 0;
        
        // Add an introduction message from the assistant
        addAssistantMessage({
            sender: 'ai',
            message: "I'd like to help you create a journal entry about your emotional journey today. I'll ask you a few questions, and your answers will help me craft a personalized entry. You can type 'skip' to skip a question or 'done' when you're ready to finish.",
            emotion: currentEmotion,
            timestamp: new Date().toISOString(),
            isJournalPrompt: true
        });
        
        // Wait a moment before asking the first question
        setTimeout(() => {
            // Ask the first question
            askNextJournalQuestion();
        }, 1000);
        
    } catch (error) {
        console.error('Error creating journal questions:', error);
        showGuidance('Sorry, I had trouble creating your journal questions. Let\'s try a different approach.', 'error');
        
        // Fallback to traditional journal entry
        inJournalingMode = false;
        createTraditionalJournalEntry();
    } finally {
        // Hide typing indicator
        assistantProcessing = false;
        assistantTyping.classList.add('hidden');
    }
}

// Ask the next journal question in the chat
function askNextJournalQuestion() {
    if (currentQuestionIndex < journalQuestions.length) {
        // Get the current question
        const question = journalQuestions[currentQuestionIndex];
        
        // Add the question as an assistant message
        addAssistantMessage({
            sender: 'ai',
            message: question,
            emotion: currentEmotion,
            timestamp: new Date().toISOString(),
            isJournalPrompt: true
        });
        
        // Focus the input field
        assistantInput.focus();
    } else {
        // All questions have been asked
        finishJournalQuestioning();
    }
}

// Process a user's answer to a journal question
function processJournalAnswer(answer) {
    // If the user wants to skip this question
    if (answer.toLowerCase() === 'skip') {
        // Move to the next question without recording an answer
        currentQuestionIndex++;
        askNextJournalQuestion();
        return true;
    }
    
    // If the user wants to finish early
    if (answer.toLowerCase() === 'done') {
        finishJournalQuestioning();
        return true;
    }
    
    // Store the answer
    if (currentQuestionIndex < journalQuestions.length) {
        journalAnswers[journalQuestions[currentQuestionIndex]] = answer;
        
        // Move to the next question
        currentQuestionIndex++;
        askNextJournalQuestion();
        return true;
    }
    
    return false;
}

// Finish the journal questioning process and create the entry
async function finishJournalQuestioning() {
    // Check if we have any answers
    if (Object.keys(journalAnswers).length === 0) {
        // No answers provided
        addAssistantMessage({
            sender: 'ai',
            message: "It seems like you didn't provide any answers to the questions. Would you like to try again later?",
            emotion: currentEmotion,
            timestamp: new Date().toISOString()
        });
        
        // Exit journaling mode
        inJournalingMode = false;
        getAdviceButton.disabled = false;
        getAdviceButton.textContent = "Create Journal Entry";
        return;
    }
    
    // Show typing indicator
    assistantProcessing = true;
    assistantTyping.classList.remove('hidden');
    
    addAssistantMessage({
        sender: 'ai',
        message: "Thank you for sharing your thoughts! I'm creating your personalized journal entry now...",
        emotion: currentEmotion,
        timestamp: new Date().toISOString()
    });
    
    try {
        // Get recent emotion history for context
        const recentHistory = emotionHistory.slice(-10);
        const dominantEmotions = getDominantEmotions();
        
        // Call API for creating a journal entry with answers
        const response = await fetch('/api/guidance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentEmotion: currentEmotion,
                emotionHistory: recentHistory,
                dominantEmotions: dominantEmotions,
                isJournalEntry: true,
                userAnswers: journalAnswers
            })
        });
        
        // Handle response
        if (response.ok) {
            const data = await response.json();
            
            // Create journal entry
            const entry = createJournalEntry(data.guidance);
            journalEntryInProgress = entry;
            
            // Show preview in the chat
            addAssistantMessage({
                sender: 'ai',
                message: "I've created a journal entry based on our conversation. Here's a preview:\n\n" + 
                         entry.content.substring(0, 200) + "...\n\n" +
                         "Would you like to edit it before saving? Respond with 'edit' to modify or 'save' to keep it as is.",
                emotion: currentEmotion,
                timestamp: new Date().toISOString(),
                isJournalPreview: true
            });
            
        } else {
            console.error('Error creating journal entry:', await response.text());
            addAssistantMessage({
                sender: 'ai',
                message: "I'm sorry, I had trouble creating your journal entry. Would you like to try again?",
                emotion: currentEmotion,
                timestamp: new Date().toISOString()
            });
            
            // Exit journaling mode
            inJournalingMode = false;
            getAdviceButton.disabled = false;
            getAdviceButton.textContent = "Create Journal Entry";
        }
    } catch (error) {
        console.error('Error creating journal entry:', error);
        addAssistantMessage({
            sender: 'ai',
            message: "I encountered an error while creating your journal entry. Let's try again later.",
            emotion: currentEmotion,
            timestamp: new Date().toISOString()
        });
        
        // Exit journaling mode
        inJournalingMode = false;
        getAdviceButton.disabled = false;
        getAdviceButton.textContent = "Create Journal Entry";
    } finally {
        // Hide typing indicator
        assistantProcessing = false;
        assistantTyping.classList.add('hidden');
    }
}

// Process journal preview responses
function processJournalPreviewResponse(message) {
    if (!journalEntryInProgress) {
        return false;
    }
    
    const response = message.toLowerCase().trim();
    
    if (response === 'save') {
        // Save the journal entry as is
        journalEntries.push(journalEntryInProgress);
        
        // Update streak data
        updateStreak();
        
        // Save to localStorage
        saveJournalData();
        
        // Update UI
        updateJournalDisplay();
        
        // Confirmation message
        addAssistantMessage({
            sender: 'ai',
            message: "Your journal entry has been saved! You can view it in your journal history. Your garden is growing with each entry you make.",
            emotion: currentEmotion,
            timestamp: new Date().toISOString()
        });
        
        // Reset journaling mode
        inJournalingMode = false;
        journalEntryInProgress = null;
        getAdviceButton.disabled = false;
        getAdviceButton.textContent = "Create Journal Entry";
        
        return true;
    } else if (response === 'edit') {
        // Show the journal entry in editable mode
        showEditableJournalEntry(journalEntryInProgress);
        
        // Reset journaling mode after showing editor
        inJournalingMode = false;
        journalEntryInProgress = null;
        getAdviceButton.disabled = false;
        getAdviceButton.textContent = "Create Journal Entry";
        
        return true;
    }
    
    return false;
}

// Update emotion history
function updateEmotionHistory(emotion) {
    const timestamp = new Date();
    
    // Add to emotion history
    emotionHistory.push({
        emotion: emotion,
        timestamp: timestamp.toISOString()
    });
    
    // Limit history size
    if (emotionHistory.length > 20) {
        emotionHistory = emotionHistory.slice(-20);
    }
    
    // Update timeline UI
    renderEmotionTimeline();
}

// Render emotion timeline
function renderEmotionTimeline() {
    emotionTimeline.innerHTML = '';
    
    emotionHistory.forEach(entry => {
        const timeString = entry.timestamp.toLocaleTimeString();
        const entryElement = document.createElement('div');
        entryElement.classList.add('timeline-entry');
        entryElement.innerHTML = `
            <span class="time">${timeString}</span>
            <span class="emotion">${entry.emotion}</span>
        `;
        emotionTimeline.appendChild(entryElement);
    });
    
    // Scroll to bottom
    emotionTimeline.scrollTop = emotionTimeline.scrollHeight;
}

// Show user guidance
function showGuidance(message, type = 'info') {
    // For critical error messages that must be shown as notifications, keep the notification
    if (type === 'error') {
        const guidanceElement = document.getElementById('guidance-text');
        guidanceElement.textContent = message;
        
        const userGuidance = document.querySelector('.user-guidance');
        userGuidance.classList.add('show');
        
        // Hide after 5 seconds
        setTimeout(() => {
            userGuidance.classList.remove('show');
        }, 5000);
    } else {
        // For helpful guidance, send to AI assistant instead
        addAssistantMessage({
            sender: 'ai',
            message: message,
            emotion: currentEmotion,
            timestamp: new Date().toISOString(),
            isGuidance: true
        });
    }
}

// Send reaction
function sendReaction(reaction) {
    const reactionData = {
        userName: userName,
        reaction: reaction,
        timestamp: new Date().toISOString()
    };
    
    // Send to server
    socket.emit('peerReaction', reactionData);
    
    // Show locally
    showFloatingReaction(reactionData, true);
}

// Show floating reaction
function showFloatingReaction(reactionData, isSelf = false) {
    const reactionElement = document.createElement('div');
    reactionElement.classList.add('floating-reaction');
    reactionElement.textContent = reactionData.reaction;
    
    // Position randomly within the camera container
    const container = document.querySelector('.camera-container');
    const posX = 40 + Math.random() * (container.offsetWidth - 80);
    const posY = container.offsetHeight - 60;
    
    reactionElement.style.left = `${posX}px`;
    reactionElement.style.bottom = `${posY}px`;
    
    // Add to container
    container.appendChild(reactionElement);
    
    // Remove after animation completes
    setTimeout(() => {
        reactionElement.remove();
    }, 2000);
}

// Resize canvas to match video dimensions
function resizeCanvas() {
    const container = document.querySelector('.camera-container');
    canvasElement.width = container.offsetWidth;
    canvasElement.height = container.offsetHeight;
}

// Helper function to calculate distance between two points
function calculateDistance(point1, point2) {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// Draw AR effects based on emotion
function drawEmotionalEffects(landmarks, emotion) {
    // Get face center point (nose tip)
    const noseTip = landmarks[1];
    const centerX = noseTip.x * canvasElement.width;
    const centerY = noseTip.y * canvasElement.height;
    
    // Calculate face width for scaling effects
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];
    const faceWidth = Math.abs(
        leftCheek.x * canvasElement.width - rightCheek.x * canvasElement.width
    );
    
    // Set colors and properties based on emotion
    let colors, particleCount, swirlingSpeed, particleSize;
    
    switch (emotion) {
        case 'happy':
            colors = ['#FFD700', '#FFA500', '#FF4500', '#FF6347']; // Gold, orange, red-orange
            particleCount = 50;
            swirlingSpeed = 2;
            particleSize = 4;
            break;
        case 'sad':
            colors = ['#4682B4', '#5F9EA0', '#6495ED', '#87CEEB']; // Blues
            particleCount = 30;
            swirlingSpeed = 0.5;
            particleSize = 3;
            break;
        case 'angry':
            colors = ['#8B0000', '#B22222', '#CD5C5C', '#FF0000']; // Reds
            particleCount = 60;
            swirlingSpeed = 3;
            particleSize = 5;
            break;
        case 'surprised':
            colors = ['#9400D3', '#9932CC', '#BA55D3', '#DA70D6']; // Purples
            particleCount = 40;
            swirlingSpeed = 2.5;
            particleSize = 4;
            break;
        case 'sleepy':
            colors = ['#2E8B57', '#3CB371', '#66CDAA', '#8FBC8F']; // Greens
            particleCount = 20;
            swirlingSpeed = 0.3;
            particleSize = 3;
            break;
        default: // neutral
            colors = ['#A9A9A9', '#C0C0C0', '#D3D3D3', '#DCDCDC']; // Grays
            particleCount = 30;
            swirlingSpeed = 1;
            particleSize = 3;
    }
    
    // Draw swirling particles around the face
    const time = performance.now() / 1000;
    const radius = faceWidth * 0.7;
    
    for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2 + time * swirlingSpeed;
        const x = centerX + Math.cos(angle) * radius * (0.8 + Math.sin(time + i) * 0.2);
        const y = centerY + Math.sin(angle) * radius * (0.8 + Math.sin(time + i) * 0.2);
        
        const colorIndex = i % colors.length;
        
        canvasCtx.fillStyle = colors[colorIndex];
        canvasCtx.beginPath();
        canvasCtx.arc(x, y, particleSize * (0.7 + Math.sin(time + i) * 0.3), 0, Math.PI * 2);
        canvasCtx.fill();
    }
    
    // Add inner glow based on emotion
    const innerGlowRadius = faceWidth * 0.5;
    const gradient = canvasCtx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, innerGlowRadius
    );
    
    gradient.addColorStop(0, colors[0] + '80'); // Add 50% transparency
    gradient.addColorStop(1, 'transparent');
    
    canvasCtx.fillStyle = gradient;
    canvasCtx.beginPath();
    canvasCtx.arc(centerX, centerY, innerGlowRadius, 0, Math.PI * 2);
    canvasCtx.fill();
}

// Start the application when page is loaded
window.addEventListener('load', init);

// Add a message to the assistant chat UI
function addAssistantMessage(messageData) {
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `assistant-message ${messageData.sender}`;
    
    // Add special classes for journal messages
    if (messageData.isJournalPrompt) {
        messageEl.classList.add('journal-prompt');
    }
    if (messageData.isJournalPreview) {
        messageEl.classList.add('journal-preview');
    }
    
    // Format time
    const timestamp = new Date(messageData.timestamp);
    const formattedTime = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Add emotion tag if it's an AI message (gives context about emotional state)
    let emotionTag = '';
    if (messageData.sender === 'ai' && messageData.emotion) {
        emotionTag = `<span class="emotion-tag">${capitalize(messageData.emotion)}</span><br>`;
    }
    
    // Set message content
    messageEl.innerHTML = `
        ${emotionTag}
        <div class="message-content">${messageData.message}</div>
        <div class="time">${formattedTime}</div>
    `;
    
    // Add to chat container
    assistantMessagesElement.appendChild(messageEl);
    
    // Scroll to bottom
    assistantMessagesElement.scrollTop = assistantMessagesElement.scrollHeight;
    
    // Apply special styling for journal messages
    styleJournalMessages();
}

// Show a chat message from another user
function addChatMessage(messageData) {
    // Create message element with different styling for chat messages from other users
    const messageEl = document.createElement('div');
    messageEl.className = 'assistant-message other-user';
    
    // Format time
    const timestamp = new Date(messageData.timestamp);
    const formattedTime = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Set message content with username
    messageEl.innerHTML = `
        <div class="username">${messageData.userName || 'User'}</div>
        <div class="message-content">${messageData.message}</div>
        <div class="time">${formattedTime}</div>
    `;
    
    // Add to chat container
    assistantMessagesElement.appendChild(messageEl);
    
    // Scroll to bottom
    assistantMessagesElement.scrollTop = assistantMessagesElement.scrollHeight;
}

// Fallback to traditional journal entry without questions
async function createTraditionalJournalEntry() {
    try {
        // Get recent emotion history for context
        const recentHistory = emotionHistory.slice(-10);
        const dominantEmotions = getDominantEmotions();
        
        // Call API for creating a journal entry
        const response = await fetch('/api/guidance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentEmotion: currentEmotion,
                emotionHistory: recentHistory,
                dominantEmotions: dominantEmotions,
                isJournalEntry: true
            })
        });
        
        // Handle response
        if (response.ok) {
            const data = await response.json();
            
            // Create journal entry
            const entry = createJournalEntry(data.guidance);
            
            // Show the journal entry in editable mode
            showEditableJournalEntry(entry);
            
            // Add AI message about the journal entry
            addAssistantMessage({
                sender: 'ai',
                message: "I've created a journal entry based on your emotions today. You can view and edit it before saving.",
                emotion: currentEmotion,
                timestamp: new Date().toISOString(),
                isGuidance: true
            });
            
            // Show brief guidance message
            showGuidance('Journal entry created! You can edit it before saving.', 'info');
        } else {
            console.error('Error creating journal entry:', await response.text());
            showGuidance('Sorry, I had trouble creating your journal entry', 'error');
        }
    } catch (error) {
        console.error('Error creating journal entry:', error);
        showGuidance('Connection error. Please try again.', 'error');
    }
}

// Show journal entry in editable mode
function showEditableJournalEntry(entry) {
    const modal = document.getElementById('journal-modal');
    const dateElement = document.getElementById('entry-date');
    const emotionsElement = document.getElementById('entry-emotions');
    const contentElement = document.getElementById('entry-content');
    const saveButton = document.getElementById('save-entry');
    
    // Format date
    const date = new Date(entry.date);
    const formattedDate = date.toLocaleDateString(undefined, { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    });
    
    // Set content
    dateElement.textContent = formattedDate;
    
    // Create emotions tags
    emotionsElement.innerHTML = entry.emotions.map(emotion => 
        `<span class="emotion-tag">${capitalize(emotion)}</span>`
    ).join('');
    
    // Create editable content area
    contentElement.innerHTML = '';
    const editableTextarea = document.createElement('textarea');
    editableTextarea.className = 'editable-journal';
    editableTextarea.value = entry.content;
    editableTextarea.rows = 15;
    contentElement.appendChild(editableTextarea);
    
    // Update save button to save edited content
    saveButton.textContent = 'Save Journal Entry';
    saveButton.onclick = () => saveEditedJournalEntry(entry, editableTextarea.value);
    
    // Show modal
    modal.classList.add('show');
}

// Save edited journal entry
function saveEditedJournalEntry(originalEntry, editedContent) {
    // Create new entry with edited content
    const editedEntry = {
        ...originalEntry,
        content: editedContent,
        isEdited: true
    };
    
    // Replace the entry if it already exists, otherwise add it
    const existingIndex = journalEntries.findIndex(e => e.date === editedEntry.date);
    if (existingIndex >= 0) {
        journalEntries[existingIndex] = editedEntry;
    } else {
        journalEntries.push(editedEntry);
        // Update streak data
        updateStreak();
        
        // Animate today's flower if it just bloomed
        const today = new Date().getDay();
        animateFlowerBloom(today);
    }
    
    // Sort entries by date (newest first)
    journalEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Save to localStorage
    saveJournalData();
    
    // Update UI
    updateJournalDisplay();
    
    // Close modal
    document.getElementById('journal-modal').classList.remove('show');
    
    // Show confirmation
    showGuidance(existingIndex >= 0 ? 'Journal entry updated!' : 'New journal entry saved!', 'success');
    
    // If we were in journaling mode, add a confirmation message to the chat
    addAssistantMessage({
        sender: 'ai',
        message: "I've saved your edited journal entry to your history. Your emotional insights help your garden grow!",
        emotion: currentEmotion,
        timestamp: new Date().toISOString()
    });
}

// Animate a specific day's flower blooming with a special effect
function animateFlowerBloom(dayIndex) {
    const dayElement = document.querySelector(`.flower-day[data-day="${dayIndex}"]`);
    if (!dayElement) return;
    
    const flowerIcon = dayElement.querySelector('.flower-icon');
    if (!flowerIcon) return;
    
    // Add highlight effect to the day element
    dayElement.classList.add('bloom-highlight');
    
    // First remove any existing classes
    flowerIcon.classList.remove('unbloomed', 'bloomed', 'blooming');
    
    // Add blooming animation
    flowerIcon.classList.add('blooming');
    
    // Play a gentle sound effect if available
    try {
        const bloomSound = new Audio('assets/bloom-sound.mp3');
        bloomSound.volume = 0.5;
        bloomSound.play().catch(err => console.log('Sound could not play: ', err));
    } catch (e) {
        console.log('Sound not available');
    }
    
    // After animation completes, switch to bloomed state
    setTimeout(() => {
        flowerIcon.classList.remove('blooming');
        flowerIcon.classList.add('bloomed');
        
        // Remove highlight effect
        setTimeout(() => {
            dayElement.classList.remove('bloom-highlight');
        }, 500);
    }, 1500);
}

// Update journal display with recent entries
function updateJournalDisplay() {
    const journalEntriesElement = document.getElementById('journal-entries');
    journalEntriesElement.innerHTML = '';
    
    if (journalEntries.length === 0) {
        journalEntriesElement.innerHTML = `
            <div class="no-entries">No journal entries yet. Start sharing your emotions to create your first entry.</div>
        `;
    } else {
        // Display recent entries (up to 3)
        const recentEntries = journalEntries.slice(0, 3);
        recentEntries.forEach(entry => {
            const entryElement = createJournalEntryElement(entry);
            journalEntriesElement.appendChild(entryElement);
        });
    }
}

// Add special styling to journal messages in the chat
function styleJournalMessages() {
    // Add styling to the journal prompts in chat
    const journalPrompts = document.querySelectorAll('.journal-prompt');
    journalPrompts.forEach(prompt => {
        prompt.style.backgroundColor = 'var(--emotion-bg)';
        prompt.style.borderLeft = '3px solid var(--emotion-color)';
        prompt.style.padding = '0.5rem 1rem';
        prompt.style.marginBottom = '0.5rem';
    });
    
    // Add styling to the journal preview in chat
    const journalPreviews = document.querySelectorAll('.journal-preview');
    journalPreviews.forEach(preview => {
        preview.style.backgroundColor = 'rgba(0, 161, 154, 0.05)';
        preview.style.borderRadius = '8px';
        preview.style.padding = '1rem';
        preview.style.marginBottom = '0.5rem';
        preview.style.fontStyle = 'italic';
    });
}

// Setup canvas for capturing frames to send to OpenAI
function setupCaptureCanvas() {
    captureCanvas = document.createElement('canvas');
    captureCanvas.width = 320; // Smaller size for API efficiency
    captureCanvas.height = 240;
    captureContext = captureCanvas.getContext('2d');
}

// Apply color theme based on emotion
function updateEmotionColors(emotion) {
    // Remove any existing emotion classes
    document.body.classList.remove('emotion-neutral', 'emotion-happy', 'emotion-sad', 
                                 'emotion-angry', 'emotion-surprised', 'emotion-sleepy');
    
    // Add the new emotion class
    document.body.classList.add(`emotion-${emotion}`);
    
    // Set specific colors based on emotion
    switch (emotion) {
        case 'happy':
            document.documentElement.style.setProperty('--emotion-color', '#FFD700');
            document.documentElement.style.setProperty('--emotion-bg', 'rgba(255, 215, 0, 0.1)');
            break;
        case 'sad':
            document.documentElement.style.setProperty('--emotion-color', '#4682B4');
            document.documentElement.style.setProperty('--emotion-bg', 'rgba(70, 130, 180, 0.1)');
            break;
        case 'angry':
            document.documentElement.style.setProperty('--emotion-color', '#FF4500');
            document.documentElement.style.setProperty('--emotion-bg', 'rgba(255, 69, 0, 0.1)');
            break;
        case 'surprised':
            document.documentElement.style.setProperty('--emotion-color', '#9370DB');
            document.documentElement.style.setProperty('--emotion-bg', 'rgba(147, 112, 219, 0.1)');
            break;
        case 'sleepy':
            document.documentElement.style.setProperty('--emotion-color', '#9E9E9E');
            document.documentElement.style.setProperty('--emotion-bg', 'rgba(158, 158, 158, 0.1)');
            break;
        default: // neutral
            document.documentElement.style.setProperty('--emotion-color', '#6E8EFB');
            document.documentElement.style.setProperty('--emotion-bg', 'rgba(110, 142, 251, 0.1)');
    }
}

// Helper function to capitalize first letter
function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Calculate facial metrics for emotion detection and debugging
function calculateFacialMetrics(landmarks) {
    // Get key facial points
    const leftEyeTop = landmarks[159]; // Top of left eye
    const leftEyeBottom = landmarks[145]; // Bottom of left eye
    const rightEyeTop = landmarks[386]; // Top of right eye
    const rightEyeBottom = landmarks[374]; // Bottom of right eye
    
    const leftMouthCorner = landmarks[61]; // Left corner of mouth
    const rightMouthCorner = landmarks[291]; // Right corner of mouth
    const topMouthOuter = landmarks[13]; // Top of mouth
    const bottomMouthOuter = landmarks[14]; // Bottom of mouth
    const topMouthInner = landmarks[0]; // Top inner lip
    const bottomMouthInner = landmarks[17]; // Bottom inner lip
    
    // Better eyebrow landmarks
    const leftEyebrowOuter = landmarks[282]; // Outer left eyebrow
    const leftEyebrowInner = landmarks[293]; // Inner left eyebrow
    const rightEyebrowOuter = landmarks[52]; // Outer right eyebrow
    const rightEyebrowInner = landmarks[65]; // Inner right eyebrow
    
    // Add cheek landmarks
    const leftCheek = landmarks[117];
    const rightCheek = landmarks[346];
    
    // Nose landmarks
    const noseTip = landmarks[1];
    const noseBottom = landmarks[94];
    
    // Chin landmark
    const chin = landmarks[199];
    
    // Calculate normalized values for more stable detection
    // Eye openness - average of both eyes for stability
    const leftEyeOpenness = calculateDistance(leftEyeTop, leftEyeBottom);
    const rightEyeOpenness = calculateDistance(rightEyeTop, rightEyeBottom);
    const avgEyeOpenness = (leftEyeOpenness + rightEyeOpenness) / 2;
    
    // Mouth metrics
    const mouthWidth = calculateDistance(leftMouthCorner, rightMouthCorner);
    const mouthOuterOpenness = calculateDistance(topMouthOuter, bottomMouthOuter);
    const mouthInnerOpenness = calculateDistance(topMouthInner, bottomMouthInner);
    
    // Calculate smile ratio - higher for smile, lower for frown
    const mouthCornerHeight = (leftMouthCorner.y + rightMouthCorner.y) / 2;
    const mouthMiddleHeight = (topMouthOuter.y + bottomMouthOuter.y) / 2;
    const smileRatio = mouthMiddleHeight - mouthCornerHeight;
    
    // Calculate eyebrow position relative to eye for frown detection
    const leftEyebrowHeight = (leftEyebrowOuter.y + leftEyebrowInner.y) / 2;
    const rightEyebrowHeight = (rightEyebrowOuter.y + rightEyebrowInner.y) / 2;
    const eyebrowToEyeRatio = ((leftEyebrowHeight + rightEyebrowHeight) / 2) - ((leftEyeTop.y + rightEyeTop.y) / 2);
    
    // Normalize values based on face dimensions for more consistent detection
    const faceHeight = calculateDistance(noseBottom, chin);
    const normalizedEyeOpenness = avgEyeOpenness / faceHeight;
    const normalizedMouthWidth = mouthWidth / calculateDistance(leftCheek, rightCheek);
    const normalizedMouthOpenness = mouthOuterOpenness / faceHeight;
    
    return {
        normalizedEyeOpenness,
        normalizedMouthWidth,
        normalizedMouthOpenness,
        smileRatio,
        eyebrowToEyeRatio
    };
}

// Detect emotion based on facial landmarks and metrics
function detectEmotion(landmarks, metrics) {
    // More robust emotion detection with improved thresholds and rules
    let detectedEmotion;
    
    // First check - wide open mouth has highest priority (surprised)
    if (metrics.normalizedMouthOpenness > thresholds.mouthOpenness && 
        metrics.normalizedMouthWidth > 0.3) {
        detectedEmotion = 'surprised';
    }
    // Second check - closed eyes means sleepy, with additional validation
    else if (metrics.normalizedEyeOpenness < thresholds.eyeOpenness && 
             metrics.eyebrowToEyeRatio > -0.01 &&
             metrics.normalizedMouthOpenness < 0.1) {
        detectedEmotion = 'sleepy';
    }
    // Third check - happy with clear smile configuration
    else if (metrics.smileRatio < thresholds.smileRatio && 
             metrics.normalizedMouthWidth > 0.42 &&
             metrics.normalizedMouthOpenness < 0.08) {
        detectedEmotion = 'happy';
    }
    // Fourth check - angry with specific eyebrow and mouth configuration
    else if (metrics.eyebrowToEyeRatio < thresholds.eyebrowRatio && 
             metrics.normalizedMouthWidth < 0.33 && 
             metrics.normalizedEyeOpenness > 0.015 && 
             metrics.normalizedEyeOpenness < 0.045) {
        detectedEmotion = 'angry';
    }
    // Fifth check - sad with specific mouth and eyebrow configuration
    else if (metrics.smileRatio > thresholds.sadSmileRatio && 
             metrics.normalizedMouthWidth < 0.34 && 
             metrics.eyebrowToEyeRatio > 0 &&
             metrics.normalizedMouthOpenness < 0.05) {
        detectedEmotion = 'sad';
    }
    // Default to neutral if no specific emotion patterns match
    else {
        detectedEmotion = 'neutral';
    }
    
    // Update debug panel with tentative emotion if in debug mode
    if (debugMode) {
        debugTentativeEmotion.textContent = detectedEmotion;
        debugStabilityCounter.textContent = emotionStabilityCounter;
    }
    
    // Apply stability check to prevent rapid fluctuations
    if (detectedEmotion === lastEmotion) {
        emotionStabilityCounter++;
    } else {
        emotionStabilityCounter = 0;
        lastEmotion = detectedEmotion;
    }
    
    // Only change emotion after several consistent detections
    // Use a higher threshold for major emotion changes
    const requiredStability = 
        (detectedEmotion === 'angry' || detectedEmotion === 'sad') && 
        (currentEmotion === 'neutral' || currentEmotion === 'happy') 
            ? EMOTION_STABILITY_THRESHOLD + 2 // Higher threshold for negative emotions
            : EMOTION_STABILITY_THRESHOLD;
    
    if (emotionStabilityCounter < requiredStability) {
        return currentEmotion; // Return the current emotion until we're sure
    }
    
    // If OpenAI is currently processing, and we're not confident in a major emotion change,
    // wait for OpenAI to confirm rather than changing based on geometric detection
    if (processingOpenAIRequest && 
        (detectedEmotion === 'angry' || detectedEmotion === 'sad' || detectedEmotion === 'surprised') &&
        (currentEmotion === 'neutral' || currentEmotion === 'sleepy' || currentEmotion === 'happy')) {
        return currentEmotion; // Defer to OpenAI for major emotion changes
    }
    
    return detectedEmotion;
}

// Update debug panel with current facial metrics
function updateDebugPanel(metrics) {
    // Update debug values
    debugEyeOpenness.textContent = metrics.normalizedEyeOpenness.toFixed(4);
    debugMouthWidth.textContent = metrics.normalizedMouthWidth.toFixed(4);
    debugMouthOpenness.textContent = metrics.normalizedMouthOpenness.toFixed(4);
    debugSmileRatio.textContent = metrics.smileRatio.toFixed(4);
    debugEyebrowRatio.textContent = metrics.eyebrowToEyeRatio.toFixed(4);
    
    // Update current emotion
    debugCurrentEmotion.textContent = currentEmotion;
    
    // Highlight values based on current emotion
    highlightRelevantMetrics(currentEmotion);
}

// Highlight metrics relevant to current emotion
function highlightRelevantMetrics(emotion) {
    // Reset all highlights
    debugEyeOpenness.classList.remove('highlight');
    debugMouthWidth.classList.remove('highlight');
    debugMouthOpenness.classList.remove('highlight');
    debugSmileRatio.classList.remove('highlight');
    debugEyebrowRatio.classList.remove('highlight');
    
    // Add appropriate highlights
    switch(emotion) {
        case 'sleepy':
            debugEyeOpenness.classList.add('highlight');
            break;
        case 'surprised':
            debugMouthOpenness.classList.add('highlight');
            break;
        case 'happy':
            debugSmileRatio.classList.add('highlight');
            debugMouthWidth.classList.add('highlight');
            break;
        case 'angry':
            debugEyebrowRatio.classList.add('highlight');
            debugMouthWidth.classList.add('highlight');
            break;
        case 'sad':
            debugSmileRatio.classList.add('highlight');
            debugMouthWidth.classList.add('highlight');
            break;
    }
}

// Set up debug controls
function setupDebugControls() {
    // Toggle debug mode
    debugToggle.addEventListener('click', () => {
        debugMode = !debugMode;
        debugPanel.classList.toggle('hidden');
        debugToggle.textContent = debugMode ? 'Hide Debug Panel' : 'Show Debug Panel';
    });
    
    // Add OpenAI toggle to debug panel
    const openAIToggle = document.createElement('div');
    openAIToggle.className = 'openai-toggle';
    openAIToggle.innerHTML = `
        <label>
            <input type="checkbox" id="openai-toggle" ${openAIEnabled ? 'checked' : ''}>
            Use OpenAI for emotion detection
        </label>
    `;
    debugPanel.appendChild(openAIToggle);
    
    // Add event listener for OpenAI toggle
    const openAIToggleCheckbox = document.getElementById('openai-toggle');
    openAIToggleCheckbox.addEventListener('change', () => {
        openAIEnabled = openAIToggleCheckbox.checked;
        openaiStatusElement.textContent = openAIEnabled ? 'OpenAI: Ready' : 'OpenAI: Disabled';
        openaiStatusElement.style.color = openAIEnabled ? '#4caf50' : '#9e9e9e';
        
        // Reset error count when manually enabled
        if (openAIEnabled) {
            openAIErrorCount = 0;
        }
    });
    
    // Set up threshold sliders
    thresholdEye.addEventListener('input', () => {
        thresholds.eyeOpenness = parseFloat(thresholdEye.value);
        thresholdEyeValue.textContent = thresholds.eyeOpenness.toFixed(3);
    });
    
    thresholdMouthOpen.addEventListener('input', () => {
        thresholds.mouthOpenness = parseFloat(thresholdMouthOpen.value);
        thresholdMouthOpenValue.textContent = thresholds.mouthOpenness.toFixed(2);
    });
    
    thresholdSmile.addEventListener('input', () => {
        thresholds.smileRatio = parseFloat(thresholdSmile.value);
        thresholdSmileValue.textContent = thresholds.smileRatio.toFixed(3);
    });
    
    thresholdEyebrow.addEventListener('input', () => {
        thresholds.eyebrowRatio = parseFloat(thresholdEyebrow.value);
        thresholdEyebrowValue.textContent = thresholds.eyebrowRatio.toFixed(3);
    });
    
    thresholdSad.addEventListener('input', () => {
        thresholds.sadSmileRatio = parseFloat(thresholdSad.value);
        thresholdSadValue.textContent = thresholds.sadSmileRatio.toFixed(3);
    });
    
    thresholdStability.addEventListener('input', () => {
        EMOTION_STABILITY_THRESHOLD = parseInt(thresholdStability.value, 10);
        thresholdStabilityValue.textContent = EMOTION_STABILITY_THRESHOLD.toString();
    });
    
    // Set up OpenAI threshold sliders
    if (thresholdOpenAIConfirm) {
        thresholdOpenAIConfirm.addEventListener('input', () => {
            OPENAI_CONFIRMATION_THRESHOLD = parseInt(thresholdOpenAIConfirm.value, 10);
            thresholdOpenAIConfirmValue.textContent = OPENAI_CONFIRMATION_THRESHOLD.toString();
            debugOpenAIConfirmation.textContent = `${openAIConfirmationCount}/${OPENAI_CONFIRMATION_THRESHOLD}`;
        });
    }
    
    if (thresholdOpenAIInterval) {
        thresholdOpenAIInterval.addEventListener('input', () => {
            OPENAI_CALL_INTERVAL = parseInt(thresholdOpenAIInterval.value);
            thresholdOpenAIIntervalValue.textContent = OPENAI_CALL_INTERVAL.toString();
        });
    }
} 