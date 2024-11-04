var socket;
var usernameInput;
var chatIDInput;
var messageInput;
var chatRoom;
var dingSound;
var messages = [];
var delay = true;

function onload() {
    socket = io();
    usernameInput = document.getElementById("NameInput");
    chatIDInput = document.getElementById("IDInput");
    messageInput = document.getElementById("ComposedMessage");
    chatRoom = document.getElementById("RoomID");
    dingSound = document.getElementById("Ding");

    socket.on("join", function (room) {
        chatRoom.innerHTML = "Room ID: " + room;
        clearErrorMessages();
    });

    socket.on("recieve", function (message) {
        console.log(message);
        if (messages.length < 9) {
            messages.push(message);
            dingSound.currentTime = 0;
            dingSound.play();
        } else {
            messages.shift();
            messages.push(message);
        }
        updateMessages();
    });
}

function updateMessages() {
    let chat = document.getElementById("Chat");
    chat.innerHTML = ''; // Clear chat area before adding new messages
    messages.forEach(function (messageObj) {
        let messageBlock = document.createElement('div');
        messageBlock.style.position = 'relative'; // Set relative position for timestamp positioning

        let sender = document.createElement('p');
        let message = document.createElement('p');
        let time = document.createElement('span');

        // Sender info
        sender.textContent = messageObj.username;
        sender.style.fontWeight = 'bold';
        sender.style.color = (messageObj.username === usernameInput.value) ? "#e0e0e0" : "#fa3a6c"; // Sender name is white for self, pink for others
        sender.style.marginBottom = "2px"; // Space between sender name and message

        // Check if message is an image
        if (messageObj.type === 'image') {
            message.innerHTML = `<img src="${messageObj.image}" style="max-width: 200px; border: 2px solid #fa3a6c; border-radius: 5px;"/>`; // Display the image
        } else {
            // Message text
            message.textContent = messageObj.text;
            message.style.backgroundColor = (messageObj.username === usernameInput.value) ? "#fa3a6c" : "#2a2a2a"; // Different color for sender/receiver
            message.style.color = "#e0e0e0";
            message.style.padding = "10px";
            message.style.borderRadius = "5px";
            message.style.wordWrap = "break-word";
            message.style.marginBottom = "5px";
        }

        // Timestamp
        time.textContent = messageObj.time;
        time.style.fontSize = "0.8rem";
        time.style.color = "#cfcfcf";
        time.style.position = "absolute"; // Positioning it absolutely
        time.style.bottom = "5px"; // 5px from the bottom
        time.style.right = "10px"; // 10px from the right

        // Append elements
        messageBlock.appendChild(sender);
        messageBlock.appendChild(message);
        messageBlock.appendChild(time);

        chat.appendChild(messageBlock);
    });
}

function Connect() {
    // Clear any previous error messages
    clearErrorMessages();

    const username = usernameInput.value.trim();
    const chatID = chatIDInput.value.trim();

    // Validation for username and chatroom ID
    let errorMessages = [];

    if (username === "") {
        errorMessages.push("Username is required.");
        displayErrorMessages('username', "Username is required.");
    }

    // Check if the Room ID is empty or not 6 digits long
    if (chatID === "") {
        errorMessages.push("Room ID is required.");
        displayErrorMessages('roomID', "Room ID is required.");
    } else if (!/^\d{6}$/.test(chatID)) {
        errorMessages.push("Room ID must be exactly 6 digits.");
        displayErrorMessages('roomID', "Room ID must be exactly 6 digits.");
    }

    // If there are error messages, display them and stop the connection process
    if (errorMessages.length > 0) {
        return; // Stop the connection process if there are errors
    }

    socket.emit("join", chatID, username);
}

function Send() {
    if (delay && messageInput.value.replace(/\s/g, "") != "") {
        delay = false;
        setTimeout(delayReset, 1000);

        let message = {
            username: usernameInput.value, // Add username to the message object
            text: messageInput.value,
            time: getCurrentTime(),
            type: 'text' // Indicating this is a text message
        };

        socket.emit("send", message);
        messageInput.value = "";
    }
}

function SendImage() {
    const imageInput = document.getElementById("ImageInput");
    const file = imageInput.files[0]; // Get the selected file

    if (file) {
        const reader = new FileReader(); // Create a FileReader to read the file
        reader.onloadend = function () {
            let message = {
                username: usernameInput.value, // Add username to the message object
                image: reader.result, // The base64 string of the image
                time: getCurrentTime(),
                type: 'image' // Indicating this is an image message
            };

            socket.emit("sendImage", message); // Send the image to the server
            imageInput.value = ""; // Clear the input
        };

        reader.readAsDataURL(file); // Read the file as a Data URL
    } else {
        alert("Please select an image to send."); // Alert if no file is selected
    }
}

function delayReset() {
    delay = true;
}

function displayErrorMessages(field, message) {
    // Select the appropriate error message container based on the field
    const errorContainer = field === 'username' ? document.getElementById('usernameError') : document.getElementById('roomIDError');
    errorContainer.textContent = message; // Set the error message
}

function clearErrorMessages() {
    // Clear existing error messages for both fields
    document.getElementById('usernameError').textContent = '';
    document.getElementById('roomIDError').textContent = '';
}

function getCurrentTime() {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    let ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12; // Convert to 12-hour format
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes; // Add leading zero if needed

    return hours + ':' + minutes + ' ' + ampm; // Return formatted time
}