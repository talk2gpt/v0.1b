let mediaRecorder;
let audioChunks = [];
let conversationContext = ''; // To maintain conversation context
const talkButton = document.getElementById('talkButton'); // Reference to the talk button
const encodedKey = "c2stRFVJMDBBZXVZQ3BOVFc0dGRiTXNUM0JsYmtGSmJOZ3FNazRFdG02SWxxblFLMEwx";
const apiKey = atob(encodedKey);
let gistId = '319efc519c6a17699365d23874099a78'; // This will store the ID of the gist we're using
let githubToken = decodeString("gzhapi_r4a2ykdYlrkslZmJwxq2ySf1xHuFsUhunyrcvObungzJwDqUhvoCpDq6cHuVi0wlelefyqjxq");
let recordingInterval;
let endOfEveryPromptText = ''; // This will hold the text to be appended at the end of every prompt
//yrtuinatkih

// Call this function with the appropriate gist ID when the page loads
window.addEventListener('load', () => {
    loadEndOfEveryPromptFromGist(gistId);
});

talkButton.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording();
        talkButton.classList.remove('stop');
        talkButton.textContent = 'Push to Talk';
        processFullConversation();
    } else {
        startRecording();
        talkButton.classList.add('stop');
        talkButton.textContent = 'Stop';
    }
});

function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.start();
            recordingInterval = setInterval(() => {
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                    mediaRecorder.start();
                }
            }, 30000); // Restart recording every 30 seconds

            mediaRecorder.addEventListener("dataavailable", event => {
                audioChunks.push(event.data);
                processAudioChunk(event.data);
            });

            stream.getAudioTracks()[0].addEventListener('ended', stopRecording);
        })
        .catch(error => console.error('Error:', error));
}

function stopRecording() {
    clearInterval(recordingInterval);
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
}

function processAudioChunk(audioBlob) {
    let audioFile = new File([audioBlob], "recording.mp3", {
        type: "audio/mp3",
    });

    let formData = new FormData();
    formData.append("file", audioFile);
    formData.append("model", "whisper-1");

    fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        let transcribedText = data.text;
        conversationContext += 'User: ' + transcribedText + '\n';
        updateConversationWindow(transcribedText);
    })
    .catch(error => console.error('Error:', error));
}

function processFullConversation() {
    queryGPT35Turbo(conversationContext);
}

function queryGPT35Turbo(text) {
    // Add user's input to the conversation context for display
    conversationContext += 'User: ' + text + '\n';
    const conversationWindow = document.getElementById('conversationWindow');
    conversationWindow.innerText = conversationContext;

    // Split the conversation context into messages
    let messages = conversationContext.split('\n').filter(line => line.trim() !== '').map(line => {
        let [role, ...content] = line.split(': ');
        content = content.join(': '); // Keep the content as is (not encoded)
    
        return {
            role: role.trim().toLowerCase() === 'user' ? 'user' : 'system',
            content: content
        };
    });

    // Append the 'End of Every Prompt' content to the last user message before sending to GPT
    if (endOfEveryPromptText && messages.length > 0) {
        let lastMessage = messages[messages.length - 1];
        if (lastMessage.role === 'user') {
            lastMessage.content += '\n' + endOfEveryPromptText; // Append the extra content
        }
    }

    // Fetch request to GPT-4 API
    fetch('https://api.openai.com/v1/chataaaaaaaa/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4-1106-preview',
            messages: messages
        })
    })
    .then(response => response.json())
    .then(data => {
        let aiResponse = data.choices[0].message.content;
        conversationContext += 'AI: ' + aiResponse + '\n';
        updateConversationWindow(aiResponse);
        saveConversationToGist(conversationContext);
        textToSpeech(aiResponse);
    })
    .catch(error => console.error('Error:', error));
}

function textToSpeech(text) {
    fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'tts-1',
            input: text,
            voice: 'shimmer'
        })
    })
    .then(response => response.blob())
    .then(blob => {
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audio.play();
    })
    .catch(error => console.error('TTS Error:', error));
}

function saveConversationToGist(conversationText) {
    const gistData = {
        description: "Chat Conversation History",
        public: false,
        files: {
            "conversation.txt": {
                content: conversationText
            }
        }
    };

    const method = gistId ? 'PATCH' : 'POST';
    const url = gistId ? `https://api.github.com/gists/${gistId}` : 'https://api.github.com/gists';

    fetch(url, {
        method: method,
        headers: {
            'Authorization': `token ${githubToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(gistData)
    })
    .then(response => response.json())
    .then(data => {
        gistId = data.id;
        console.log('Gist saved:', data);
    })
    .catch(error => console.error('Error saving Gist:', error));
}

function updateConversationWindow(text) {
    const conversationWindow = document.getElementById('conversationWindow');
    if (conversationWindow) {
        conversationWindow.innerText += text + '\n'; // Append new text
        conversationWindow.scrollTop = conversationWindow.scrollHeight; // Auto-scroll to the latest message
    } else {
        console.error('Conversation window element not found');
    }
}

function loadConversationFromGist(gistId) {
    fetch(`https://api.github.com/gists/${gistId}`, {
        headers: {
            'Authorization': `token ${githubToken}`
        }
    })
    .then(response => response.json())
    .then(data => {
        conversationContext = data.files['conversation.txt'].content;
        updateConversationWindow(conversationContext);
        console.log('Gist loaded:', data);
    })
    .catch(error => console.error('Error loading Gist:', error));
}

loadConversationFromGist(gistId); // Call this function when the page loads

function decodeString(encodedStr) {
    return encodedStr.split('').filter((_, index) => index % 2 === 0).join('');
}

const sendTextButton = document.getElementById('sendTextButton');

sendTextButton.addEventListener('click', () => {
    const userInput = document.getElementById('textInput').value;
    if (userInput) {
        queryGPT35Turbo(userInput);
        document.getElementById('textInput').value = '';
    }
});

// Function to load and display text from the 'End of Every Prompt' gist
function loadEndOfEveryPromptFromGist(gistId) {
    fetch(`https://api.github.com/gists/${gistId}`)
        .then(response => response.json())
        .then(data => {
            // Assuming the content is stored in a file named 'endOfEveryPrompt.txt' in the gist
            endOfEveryPromptText = data.files['endOfEveryPrompt.txt'].content;

            // Update the text area with the fetched content
            document.getElementById('endOfEveryPromptInput').value = endOfEveryPromptText;
        })
        .catch(error => {
            console.error('Error loading End of Every Prompt content:', error);
            // Handle any errors here, such as displaying an error message to the user
        });
}

function saveEndOfEveryPromptToGist(updatedText) {
    const gistData = {
        description: "End of Every Prompt Content",
        public: false,
        files: {
            "endOfEveryPrompt.txt": {
                content: updatedText
            }
        }
    };

    const method = gistId ? 'PATCH' : 'POST';
    const url = gistId ? `https://api.github.com/gists/${gistId}` : 'https://api.github.com/gists';

    fetch(url, {
        method: method,
        headers: {
            'Authorization': `token ${githubToken}`, // Ensure you have a valid GitHub token
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(gistData)
    })
    .then(response => response.json())
    .then(data => {
        if (data && data.id) {
            gistIdForEndOfEveryPrompt = data.id; // Save the Gist ID for future updates
            endOfEveryPromptText = updatedText; // Update the global variable
            console.log('Gist updated successfully:', data);
        } else {
            throw new Error('Failed to update Gist');
        }
    })
    .catch(error => {
        console.error('Error updating Gist:', error);
    });
}

document.getElementById('submitEndOfEveryPromptEdit').addEventListener('click', () => {
    let userInput = document.getElementById('endOfEveryPromptInput').value;
    processEndOfEveryPromptEdit(userInput);
});

function processEndOfEveryPromptEdit(userInput) {
    // Predefined introduction text explaining the purpose of the text
    let introText = "This is the text of a set of custom instructions for an implementation of GPT-4:\n";

    // Current end of every prompt content
    let currentContent = endOfEveryPromptText;

    // User's proposed changes
    let changeRequest = "\nThe user wants to change these instrctions. This is a prompt provided by the user to change these instructions:\n" + userInput;

    // Specific instruction for GPT-4
    let instructionForGPT = "\nPlease return new custom instructions revised based on this user prompt. Only return the revised instructions exactly, with no additional text before or after.";

    // Complete prompt to send to GPT-4
    let completePrompt = introText + currentContent + changeRequest + instructionForGPT;

    // Send completePrompt to GPT-4, process the response, and update the end of every prompt text and gist
    fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4-1106-preview',
            messages: [{role: "system", content: completePrompt}] // Structure as per Chat API requirements
        })
    })
    .then(response => response.json())
    .then(data => {
        let revisedInstructions = data.choices[0].message.content;
        endOfEveryPromptText = revisedInstructions;
        document.getElementById('endOfEveryPromptInput').value = revisedInstructions;
        saveEndOfEveryPromptToGist(revisedInstructions); // Function to save to gist
    })
    .catch(error => {
        console.error('Error processing end of every prompt edit:', error);
    });
}
