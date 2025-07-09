let socket, usernameInput, chatIDInput, messageInput, chatRoom, dingSound;
let messages = [];
let delay = true;
let selectedImageFile = null;
let typingTimeout = null;
let isTyping = false;
const typingUsers = new Set();

function onload() {
    socket = io();
    [usernameInput, chatIDInput, messageInput, chatRoom, dingSound] = 
        ['NameInput', 'IDInput', 'ComposedMessage', 'RoomID', 'Ding']
        .map(id => document.getElementById(id));

    setInitialDisplay();
    setupEventListeners();
}

function setInitialDisplay() {
    ['Chat', 'MessageSection', 'ExitButton'].forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('imageName').textContent = '';
}

function setupEventListeners() {
    chatIDInput.addEventListener('input', e => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });

    messageInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            Send();
        }
    });
    messageInput.addEventListener('input', handleTyping);

    socket.on('updateOnlineUsers', data => {
        const element = document.getElementById('online-count');
        if (element) element.textContent = data.count || 0;
    });

    socket.on('join', room => {
        chatRoom.innerHTML = room ? `Room ID: ${room}` : 'Global Chat';
        chatRoom.style.display = 'block';
        clearErrorMessages();
        ['Chat', 'MessageSection', 'ExitButton'].forEach(id => {
            document.getElementById(id).style.display = 'block';
        });
    });

    socket.on('history', history => {
        messages = history;
        updateMessages();
    });

    socket.on('typing', username => {
        typingUsers.add(username);
        renderTypingIndicator();
    });

    socket.on('stopTyping', username => {
        typingUsers.delete(username);
        renderTypingIndicator();
    });

    socket.on('recieve', message => {
        messages.push(message);
        if (messages.length > 100) messages.shift();
        dingSound.currentTime = 0;
        dingSound.play();
        updateMessages();
    });

    document.getElementById('ImageInput').addEventListener('change', handleImageSelect);
}

function updateMessages() {
    const chat = document.getElementById('Chat');
    chat.innerHTML = '';

    messages.forEach((messageObj, index) => {
        const messageBlock = createMessageBlock(messageObj, index);
        chat.appendChild(messageBlock);
    });
}

function createMessageBlock(messageObj, index) {
    const messageBlock = document.createElement('div');
    const isCurrentUser = messageObj.username === usernameInput.value;

    messageBlock.style.position = 'relative';
    messageBlock.style.width = '65%';
    messageBlock.style.margin = isCurrentUser ? '0 0 4px auto' : '0 auto 4px 0';

    if (index === 0 || messages[index - 1].username !== messageObj.username) {
        const sender = createSenderElement(messageObj.username, isCurrentUser);
        messageBlock.appendChild(sender);
    }

    if (messageObj.image) {
        messageBlock.appendChild(createImageElement(messageObj, isCurrentUser));
    }

    if (messageObj.text) {
        messageBlock.appendChild(createTextElement(messageObj, isCurrentUser));
    }

    messageBlock.appendChild(createTimeElement(messageObj.time));
    return messageBlock;
}

function createSenderElement(username, isCurrentUser) {
    const sender = document.createElement('p');
    sender.textContent = username;
    sender.style.fontWeight = 'bold';
    sender.style.color = isCurrentUser ? "#e0e0e0" : "#fa3a6c";
    sender.style.marginBottom = "2px";
    sender.style.textAlign = isCurrentUser ? 'right' : 'left';
    return sender;
}

function createImageElement(messageObj, isCurrentUser) {
    const link = document.createElement('a');
    const img = document.createElement('img');

    img.src = messageObj.image;
    img.style.maxWidth = '100%';
    img.style.borderRadius = '5px';
    img.style.border = `3px solid ${isCurrentUser ? '#fa3a6c' : '#2a2a2a'}`;

    if (messageObj.text) {
        img.style.borderBottomLeftRadius = '0';
        img.style.borderBottomRightRadius = '0';
    } else {
        img.style.borderBottom = `20px solid ${isCurrentUser ? '#fa3a6c' : '#2a2a2a'}`;
        img.style.marginBottom = '-2px';
    }

    link.href = messageObj.image;
    link.download = 'image.png';
    link.appendChild(img);
    return link;
}

function createTextElement(messageObj, isCurrentUser) {
    const message = document.createElement('p');
    message.textContent = messageObj.text;

    if (messageObj.username === "Server") {
        message.style.backgroundColor = "#007BFF";
        message.style.color = "#ffffff";
    } else {
        message.style.backgroundColor = isCurrentUser ? "#fa3a6c" : "#2a2a2a";
        message.style.color = "#e0e0e0";
    }

    message.style.padding = "2px 10px 20px 10px";
    message.style.wordWrap = "break-word";
    message.style.position = "relative";
    message.style.textAlign = 'left';
    message.style.borderRadius = messageObj.image ? "0 0 5px 5px" : "5px";
    message.style.marginTop = messageObj.image ? '0' : undefined;

    return message;
}

function createTimeElement(time) {
    const timeElement = document.createElement('span');
    timeElement.textContent = time;
    timeElement.style.fontSize = "0.8rem";
    timeElement.style.color = "#cfcfcf";
    timeElement.style.position = "absolute";
    timeElement.style.bottom = "4px";
    timeElement.style.right = "10px";
    return timeElement;
}

function Connect() {
    clearErrorMessages();
    const username = usernameInput.value.trim();
    const chatID = chatIDInput.value.trim();

    if (!validateInput(username, chatID)) return;

    socket.emit("checkUsername", chatID, username, (isTaken) => {
        if (isTaken) {
            displayErrorMessages('username', "This username is already taken");
            return;
        }

        socket.emit("join", chatID, username);
        document.getElementById("AccessPort").style.display = 'none';
        document.getElementById("ExitButton").style.display = 'block';
    });
}

function validateInput(username, chatID) {
    let isValid = true;

    if (!username) {
        displayErrorMessages('username', "Username is required");
        isValid = false;
    }

    if (!chatID) {
        displayErrorMessages('roomID', "Room ID is required");
        isValid = false;
    } else if (!/^\d{6}$/.test(chatID)) {
        displayErrorMessages('roomID', "Room ID must be exactly 6 digits.");
        isValid = false;
    }

    return isValid;
}

function joinGlobalChat() {
    clearErrorMessages();
    const username = usernameInput.value.trim();

    if (!username) {
        displayErrorMessages('username', "Username is required.");
        return;
    }

    socket.emit("checkUsername", '', username, (isTaken) => {
        if (isTaken) {
            displayErrorMessages('username', "This username is already taken");
            return;
        }

        chatIDInput.value = '';
        socket.emit("join", '', username);

        document.getElementById("AccessPort").style.display = 'none';
        ['Chat', 'MessageSection', 'ExitButton'].forEach(id => {
            document.getElementById(id).style.display = 'block';
        });
    });
}

function Send() {
    const messageText = messageInput.value.trim();
    const hasText = messageText.length > 0;
    const hasImage = selectedImageFile !== null;

    if ((!hasText && !hasImage) || !delay) return;

    delay = false;
    setTimeout(() => delay = true, 1000);

    const message = {
        username: usernameInput.value.trim(),
        image: hasImage ? null : undefined,
        text: hasText ? messageText : undefined,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: hasImage && hasText ? 'image+text' : hasImage ? 'image' : 'text'
    };

    if (hasImage) {
        resizeImage(selectedImageFile, 800, 800, resizedImage => {
            message.image = resizedImage;
            socket.emit(hasText ? 'sendImageText' : 'sendImage', message);
            resetMessageInput();
        });
    } else {
        socket.emit('send', message);
        resetMessageInput();
    }

    if (isTyping) {
        socket.emit('stopTyping');
        isTyping = false;
    }
}

function resetMessageInput() {
    messageInput.value = '';
    clearSelectedImage();
    updateMessages();
}

function resizeImage(file, maxWidth, maxHeight, callback) {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = e => img.src = e.target.result;
    reader.readAsDataURL(file);

    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        let [width, height] = [img.width, img.height];

        if (width > height && width > maxWidth) {
            height = height * maxWidth / width;
            width = maxWidth;
        } else if (height > maxHeight) {
            width = width * maxHeight / height;
            height = maxHeight;
        }

        [canvas.width, canvas.height] = [width, height];
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/jpeg'));
    };
}

function handleImageSelect(event) {
    selectedImageFile = event.target.files[0];
    if (!selectedImageFile) return;

    const reader = new FileReader();
    reader.onload = e => {
        const preview = document.getElementById('imagePreview');
        preview.src = e.target.result;
        preview.style.display = 'block';
        document.getElementById('imageName').textContent = selectedImageFile.name;
    };
    reader.readAsDataURL(selectedImageFile);
}

function clearSelectedImage() {
    selectedImageFile = null;
    document.getElementById('ImageInput').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('imageName').textContent = '';
}

function openImageMenu() {
    document.getElementById('ImageInput').click();
}

function handleTyping() {
    if (!isTyping && messageInput.value.trim()) {
        socket.emit('typing');
        isTyping = true;
    }

    clearTimeout(typingTimeout);
    if (messageInput.value.trim()) {
        typingTimeout = setTimeout(() => {
            socket.emit('stopTyping');
            isTyping = false;
        }, 1000);
    } else if (isTyping) {
        socket.emit('stopTyping');
        isTyping = false;
    }
}

function renderTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (typingUsers.size === 0) {
        indicator.style.display = 'none';
        indicator.textContent = '';
        return;
    }

    indicator.style.display = 'block';
    indicator.textContent = `${Array.from(typingUsers).join(', ')} is typing...`;
}

function displayErrorMessages(field, message) {
    document.getElementById(field === 'username' ? 'usernameError' : 'roomIDError').textContent = message;
}

function clearErrorMessages() {
    ['usernameError', 'roomIDError', 'sameNameError'].forEach(id => {
        document.getElementById(id).textContent = '';
    });
}

function exitChat() {
    const username = usernameInput.value.trim();
    const currentRoomID = chatRoom.innerHTML === "Global Chat" ? '' : chatIDInput.value;

    messages = [];
    clearSelectedImage();
    messageInput.value = '';
    chatIDInput.value = '';

    ['Chat', 'MessageSection'].forEach(id => {
        const element = document.getElementById(id);
        element.style.display = 'none';
        if (id === 'Chat') element.innerHTML = '';
    });

    chatRoom.style.display = 'none';
    document.getElementById("AccessPort").style.display = 'block';
    document.getElementById("ExitButton").style.display = 'none';

    if (isTyping) {
        socket.emit('stopTyping');
        isTyping = false;
    }
    socket.emit("leave", currentRoomID, username);
}
