document.addEventListener('DOMContentLoaded', () => {
    const micBtn = document.getElementById('mic-btn');
    const interactionState = document.getElementById('interaction-state');
    const dashboard = document.getElementById('dashboard');
    const transcriptVal = document.getElementById('transcript-val');
    const intentVal = document.getElementById('intent-val');
    const aiResponseVal = document.getElementById('ai-response-val');
    const audioPlayer = document.getElementById('tts-audio');

    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;

    // Initialize microphone
    async function initAudio() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                audioChunks = [];
                await sendAudioToBackend(audioBlob);
            };

        } catch (error) {
            console.error("Error accessing microphone:", error);
            interactionState.textContent = "Microphone access denied";
        }
    }

    initAudio();

    // Handle UI states
    function setState(state) {
        micBtn.className = "orb-container"; // reset
        if (state === 'recording') {
            micBtn.classList.add('recording');
            interactionState.textContent = "Listening...";
            interactionState.style.color = "var(--status-recording)";
        } else if (state === 'processing') {
            micBtn.classList.add('processing');
            interactionState.textContent = "Processing Identity Action...";
            interactionState.style.color = "var(--status-processing)";
        } else if (state === 'speaking') {
            micBtn.classList.add('speaking');
            interactionState.textContent = "Idina is speaking...";
            interactionState.style.color = "var(--status-online)";
        } else {
            interactionState.textContent = "Tap to speak";
            interactionState.style.color = "var(--text-primary)";
        }
    }

    // Microphone button click handler
    micBtn.addEventListener('click', () => {
        if (!mediaRecorder) return;

        if (!isRecording) {
            // Start recording
            audioChunks = [];
            mediaRecorder.start();
            isRecording = true;
            setState('recording');
            
            // Hide dashboard on new interaction
            dashboard.classList.add('unmounted');
            audioPlayer.pause();
        } else {
            // Stop recording
            mediaRecorder.stop();
            isRecording = false;
            setState('processing');
        }
    });

    // Send audio to the Flask backend
    async function sendAudioToBackend(blob) {
        const formData = new FormData();
        formData.append("audio_file", blob, "recording.webm");

        try {
            const response = await fetch('/api/interact', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error("Network response was not ok");
            }

            const data = await response.json();
            
            // Populate dashboard with results
            transcriptVal.textContent = `"${data.transcription}"`;
            intentVal.textContent = data.action_id;
            aiResponseVal.textContent = data.spoken_response;
            
            // Set speaking state
            setState('speaking');
            
            // Play TTS audio if provided by Polly
            if (data.audio_base64) {
                const audioUrl = `data:audio/mp3;base64,${data.audio_base64}`;
                audioPlayer.src = audioUrl;
                audioPlayer.play();
                
                audioPlayer.onended = () => {
                    setState('idle');
                    dashboard.classList.remove('unmounted');
                };
            } else {
                // If in mock mode or no audio returned
                setState('idle');
                dashboard.classList.remove('unmounted');
            }

        } catch (error) {
            console.error("Error processing request:", error);
            setState('idle');
            interactionState.textContent = "Error processing request. Try again.";
            setTimeout(() => {
                setState('idle');
            }, 3000);
        }
    }
});
