var socket;
var usernameInput;
var chatIDInput;
var messageInput;
var chatRoom;
var dingSound;
var messages = [];
var delay = true;
var selectedImageFile = null; // Initialize selectedImageFile as null

function onload() {
    socket = io();
    usernameInput = document.getElementById("NameInput");
    chatIDInput = document.getElementById("IDInput");
    messageInput = document.getElementById("ComposedMessage");
    chatRoom = document.getElementById("RoomID");
    dingSound = document.getElementById("Ding");

    // Hide the chat and message sections initially
    document.getElementById("Chat").style.display = 'none';
    document.getElementById("MessageSection").style.display = 'none';
    document.getElementById("ExitButton").style.display = 'none';

    // Hide image preview initially
    document.getElementById('imagePreview').style.display = 'none'; // Initially hidden
    document.getElementById('imageName').textContent = ''; // No file name initially
    
    document.getElementById('IDInput').addEventListener('input', function(event) {
        // Replace anything that is not a digit
        event.target.value = event.target.value.replace(/[^0-9]/g, '');
    });

    socket.on("join", function (room) {
        chatRoom.innerHTML = "Room ID: " + room;
        chatRoom.style.display = 'block'; // Show room ID
        clearErrorMessages();

        // Show the chat and message section after joining
        document.getElementById("Chat").style.display = 'block';
        document.getElementById("MessageSection").style.display = 'block';
    });

    socket.on("recieve", function (message) {
        console.log(message);
        messages.push(message);
        dingSound.currentTime = 0;
        dingSound.play();
        updateMessages();
    });
}

function updateMessages() {
    let chat = document.getElementById("Chat");
    chat.innerHTML = '';
    let previousUsername = null;

    messages.forEach(function (messageObj, index) {
        let messageBlock = document.createElement('div');
        messageBlock.style.position = 'relative';
        messageBlock.style.width = '65%'; 
        messageBlock.style.margin = (messageObj.username === usernameInput.value) ? '0 0 4px auto' : '0 auto 4px 0'; 

        let isSameUserAsPrevious = (index > 0 && messages[index - 1].username === messageObj.username);

        let time = document.createElement('span');

        if (!isSameUserAsPrevious) {
            let sender = document.createElement('p');
            sender.textContent = messageObj.username;
            sender.style.fontWeight = 'bold';
            sender.style.color = (messageObj.username === usernameInput.value) ? "#e0e0e0" : "#fa3a6c"; 
            sender.style.marginBottom = "2px"; 
            sender.style.textAlign = (messageObj.username === usernameInput.value) ? 'right' : 'left'; 
            messageBlock.appendChild(sender);
        }

        let hasImage = messageObj.image ? true : false;
        let hasText = messageObj.text ? true : false;

        
        if (hasImage) {
            let img = document.createElement('img');
            img.src = messageObj.image;
            img.style.maxWidth = '100%'; 
            img.style.border = messageObj.username === usernameInput.value ? '3px solid #fa3a6c' : '3px solid #2a2a2a';
            img.style.borderRadius = '5px';

            
            let link = document.createElement('a');
            link.href = messageObj.image; 
            link.download = 'image.png';

            if (hasText) {
                img.style.border = messageObj.username === usernameInput.value ? '3px solid #fa3a6c' : '3px solid #2a2a2a';
                img.style.display = 'block'; 
                img.style.borderTopLeftRadius = '5px'; 
                img.style.borderTopRightRadius = '5px'; 
                img.style.borderBottomLeftRadius = '0'; 
                img.style.borderBottomRightRadius = '0'; 
            } else {
                img.style.borderBottom= messageObj.username === usernameInput.value ? '20px solid #fa3a6c' : '20px solid #2a2a2a'
                img.style.marginBottom = '-2px';
            }

            link.appendChild(img);
            messageBlock.appendChild(link);
        }

        if (hasText) {
            let message = document.createElement('p');
            message.textContent = messageObj.text;

            if (messageObj.username === "Server") {
                message.style.backgroundColor = "#007BFF";
                message.style.color = "#ffffff";
            } else {
                message.style.backgroundColor = (messageObj.username === usernameInput.value) ? "#fa3a6c" : "#2a2a2a";
                message.style.color = "#e0e0e0";
            }

            message.style.padding = "2px 10px 20px 10px";
            message.style.wordWrap = "break-word";
            message.style.position = "relative"; 
            message.style.textAlign = 'left';

            if (hasImage) {
                message.style.borderRadius = "0 0 5px 5px";
                message.style.marginTop = '0';
            } else {

                message.style.borderRadius = "5px";
            }

            messageBlock.appendChild(message);
        }

        // Timestamp
        time.textContent = messageObj.time;
        time.style.fontSize = "0.8rem";
        time.style.color = "#cfcfcf";
        time.style.position = "absolute";
        time.style.bottom = "4px";
        time.style.right = "10px";
                     
        messageBlock.appendChild(time);
        
        chat.appendChild(messageBlock);
        
        previousUsername = messageObj.username;
    });
}

function Connect() {
    clearErrorMessages();

    const username = usernameInput.value.trim();
    const chatID = chatIDInput.value.trim();

    let errorMessages = [];

    if (username === "") {
        errorMessages.push("Username is required.");
        displayErrorMessages('username', "Username is required.");
    }

    if (chatID === "") {
        errorMessages.push("Room ID is required.");
        displayErrorMessages('roomID', "Room ID is required.");
    } else if (!/^\d{6}$/.test(chatID)) {
        errorMessages.push("Room ID must be exactly 6 digits.");
        displayErrorMessages('roomID', "Room ID must be exactly 6 digits.");
    }

    if (errorMessages.length > 0) {
        return;
    }

    socket.emit("join", chatID, username);

    document.getElementById("AccessPort").style.display = 'none';

    document.getElementById("ExitButton").style.display = 'block';
}

function joinGlobalChat() {
    const username = usernameInput.value.trim();

    if (username === "") {
        displayErrorMessages('username', "Username is required.");
        return;
    }

    const globalRoomID = 'Global Chat';
    socket.emit("join", globalRoomID, username);

    document.getElementById("AccessPort").style.display = 'none';
    document.getElementById("Chat").style.display = 'block';
    document.getElementById("MessageSection").style.display = 'block';
    document.getElementById("ExitButton").style.display = 'block';

    chatRoom.innerHTML = "Global Chat";
    chatRoom.style.display = 'block';
}

function Send() {
    let hasText = messageInput.value.trim() !== ""; 
    let hasImage = selectedImageFile !== null; 

    if (!hasText && !hasImage) {
        return; 
    }

    if (delay) {
        delay = false;
        setTimeout(delayReset, 1000);

        const message = {
            username: usernameInput.value,
            image: hasImage ? null : undefined, 
            text: hasText ? messageInput.value : undefined,
            time: getCurrentTime(),
            type: hasImage && hasText ? 'image+text' : hasImage ? 'image' : 'text'
        };

        if (hasImage) {
            resizeImage(selectedImageFile, 800, 800, function (resizedImage) {
                message.image = resizedImage;
                if (hasText) {
                    socket.emit("sendImageText", message);
                } else {
                    socket.emit("sendImage", message);
                }
                clearSelectedImage();
                messageInput.value = ""; 
                updateMessages();
            });
        } else if (hasText) {
            socket.emit("send", message);
            messageInput.value = ""; 
            updateMessages();
        }
    }
}

function resizeImage(file, maxWidth, maxHeight, callback) {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = function (e) {
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);

    img.onload = function () {
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        let width = img.width;
        let height = img.height;

        if (width > height) {
            if (width > maxWidth) {
                height = height * maxWidth / width;
                width = maxWidth;
            }
        } else {
            if (height > maxHeight) {
                width = width * maxHeight / height;
                height = maxHeight;
            }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/jpeg'));
    };
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
document.getElementById('ImageInput').addEventListener('change', function (event) {
    selectedImageFile = event.target.files[0]; 
    if (selectedImageFile) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('imagePreview').src = e.target.result;
            document.getElementById('imagePreview').style.display = 'block';
        };
        reader.readAsDataURL(selectedImageFile);
        document.getElementById('imageName').textContent = selectedImageFile.name; 
    }
});

function delayReset() {
    delay = true;
}

function displayErrorMessages(field, message) {
    const errorContainer = field === 'username' ? document.getElementById('usernameError') : document.getElementById('roomIDError');
    errorContainer.textContent = message;
}

function clearErrorMessages() {
    document.getElementById('usernameError').textContent = '';
    document.getElementById('roomIDError').textContent = '';
}

function exitChat() {
    document.getElementById("Chat").style.display = 'none';
    document.getElementById("MessageSection").style.display = 'none';
    document.getElementById("Chat").innerHTML = '';
    chatRoom.style.display = 'none';
    document.getElementById("AccessPort").style.display = 'block';
    document.getElementById("ExitButton").style.display = 'none';
    socket.emit("leave", chatIDInput.value); 
}

function getCurrentTime() {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    let ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return hours + ':' + minutes + ' ' + ampm;
}