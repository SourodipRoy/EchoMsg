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
        messages.push(message); // Allow unlimited messages
        dingSound.currentTime = 0;
        dingSound.play();
        updateMessages(); // Update the display with all messages
    });
}

function updateMessages() {
    let chat = document.getElementById("Chat");
    chat.innerHTML = ''; // Clear chat area before adding new messages
    messages.forEach(function (messageObj) {
        let messageBlock = document.createElement('div');
        messageBlock.style.position = 'relative'; // Set relative position for timestamp positioning
        messageBlock.style.width = '65%'; // Set width to 65% of the chat area
        messageBlock.style.margin = (messageObj.username === usernameInput.value) ? '0 0 10px auto' : '0 auto 10px 0'; // Margin for sender vs receiver

        let sender = document.createElement('p');
        let time = document.createElement('span');

        // Sender info
        sender.textContent = messageObj.username;
        sender.style.fontWeight = 'bold';
        sender.style.color = (messageObj.username === usernameInput.value) ? "#e0e0e0" : "#fa3a6c"; // Sender name is white for self, pink for others
        sender.style.marginBottom = "2px"; // Space between sender name and message

        // Set alignment for sender vs receiver
        if (messageObj.username === usernameInput.value) {
            sender.style.textAlign = 'right'; // Align sender username to the right
            messageBlock.style.textAlign = 'right'; // Align the message block to the right for sender
        } else {
            sender.style.textAlign = 'left'; // Align other usernames to the left
            messageBlock.style.textAlign = 'left'; // Align the message block to the left for others
        }

        // Append sender name above the message block
        messageBlock.insertBefore(sender, messageBlock.firstChild); // Insert sender before any other elements

        let hasImage = messageObj.image ? true : false;
        let hasText = messageObj.text ? true : false;

        // Display image if present
        if (hasImage) {
            let img = document.createElement('img');
            img.src = messageObj.image;
            img.style.maxWidth = '100%'; // Set max width for the image
            img.style.border = '3px solid #fa3a6c'; // Thick border around image
            img.style.borderRadius = '5px'; // Apply corner radius to the image in all conditions

            // Create a link for downloading the image
            let link = document.createElement('a');
            link.href = messageObj.image; // Set the link's href to the Base64 image source
            link.download = 'image.png'; // Set a default filename for the download

            // Apply specific styles for image+text condition
            if (hasText) {
                img.style.borderBottom = '4px solid #fa3a6c'; // Keep bottom border visible
                img.style.display = 'block'; // Ensure the image takes up its own block with no margins
                img.style.borderTopLeftRadius = '5px'; // Rounded top left corner
                img.style.borderTopRightRadius = '5px'; // Rounded top right corner
                img.style.borderBottomLeftRadius = '0'; // No bottom left corner radius (to align with text block)
                img.style.borderBottomRightRadius = '0'; // No bottom right corner radius (to align with text block)
            } else {
                // For image-only styling
                img.style.borderBottom = '18px solid #fa3a6c'; // Extra thick bottom border for timestamp
                img.style.borderRadius = '5px'; // Fully rounded for image-only messages
            }

            // Append the image to the link and then the link to the message block
            link.appendChild(img);
            messageBlock.appendChild(link);
        }

        // Display message text below the image if present
        if (hasText) {
            let message = document.createElement('p');
            message.textContent = messageObj.text;

            // Check if this is a server message
            if (messageObj.username === "Server") {
                message.style.backgroundColor = "#007BFF"; // Blue background for server messages
                message.style.color = "#ffffff"; // White text for server messages
            } else {
                message.style.backgroundColor = (messageObj.username === usernameInput.value) ? "#fa3a6c" : "#2a2a2a"; // Different color for sender/receiver
                message.style.color = "#e0e0e0";
            }

            message.style.padding = "10px 10px 20px 10px"; // Top, right, bottom, left padding
            message.style.wordWrap = "break-word";
            message.style.position = "relative"; // Needed for positioning the timestamp
            message.style.textAlign = 'left'; // Left align all message texts

            // Apply specific styles for image+text condition
            if (hasImage) {
                message.style.borderRadius = "0 0 5px 5px"; // Remove top corners radius, round bottom corners only
                message.style.marginTop = '0'; // No gap between image and text
            } else {
                // Normal text-only styling
                message.style.borderRadius = "5px"; // Fully rounded for text-only messages
                message.style.marginTop = '5px'; // Default margin for text-only
            }

            messageBlock.appendChild(message);
        }

        // Timestamp
        time.textContent = messageObj.time;
        time.style.fontSize = "0.8rem";
        time.style.color = "#cfcfcf";
        time.style.position = "absolute"; // Positioning it absolutely
        time.style.bottom = "5px"; // 5px from the bottom
        time.style.right = "10px"; // 10px from the right

        // Append timestamp
        messageBlock.appendChild(time);

        // Append the message block to chat
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

    // Emit the join event
    socket.emit("join", chatID, username);

    // Hide the access port section after connecting
    document.getElementById("AccessPort").style.display = 'none'; // Hide the access port

    // Show the exit button
    document.getElementById("ExitButton").style.display = 'block'; // Show the exit button
}

function Send() {
    let hasText = messageInput.value.trim() !== ""; // Check if there is text in the input
    let hasImage = selectedImageFile !== null; // Check if an image is selected

    if (!hasText && !hasImage) {
        return; // Do not send if both text and image are empty
    }

    if (delay) {
        delay = false;
        setTimeout(delayReset, 1000);

        const message = {
            username: usernameInput.value,
            image: hasImage ? null : undefined, // Initialize with null if no image
            text: hasText ? messageInput.value : undefined, // Initialize with null if no text
            time: getCurrentTime(),
            type: hasImage && hasText ? 'image+text' : hasImage ? 'image' : 'text' // Indicate the type as appropriate
        };

        if (hasImage) {
            // Resize image before sending
            resizeImage(selectedImageFile, 800, 800, function (resizedImage) {
                message.image = resizedImage; // Set resized image
                if (hasText) {
                    // Emit both image and text together
                    socket.emit("sendImageText", message); // Emit the combined message
                } else {
                    socket.emit("sendImage", message); // Emit image only if no text
                }
                clearSelectedImage(); // Clear selected image after sending
                messageInput.value = ""; // Clear the message input
                updateMessages(); // Update the messages display
            });
        } else if (hasText) {
            // Send only text if no image
            socket.emit("send", message); // Emit the text message
            messageInput.value = ""; // Clear the message input
            updateMessages(); // Update the messages display
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

        // Resize the image proportionally
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

        // Convert canvas to Base64 (JPEG format to reduce size)
        callback(canvas.toDataURL('image/jpeg'));  // Send image in jpeg format to reduce size
    };
}

function clearSelectedImage() {
    selectedImageFile = null; // Reset the selected image file
    document.getElementById('ImageInput').value = ''; // Clear the input value
    document.getElementById('imagePreview').style.display = 'none'; // Hide image preview box
    document.getElementById('imageName').textContent = ''; // Clear the image name display
}

function openImageMenu() {
    document.getElementById('ImageInput').click(); // Trigger the file input click
}

document.getElementById('ImageInput').addEventListener('change', function (event) {
    selectedImageFile = event.target.files[0]; // Capture the selected file
    if (selectedImageFile) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('imagePreview').src = e.target.result; // Set image source for preview
            document.getElementById('imagePreview').style.display = 'block'; // Show image preview
        };
        reader.readAsDataURL(selectedImageFile); // Read the file as Data URL

        // Display the file name
        document.getElementById('imageName').textContent = selectedImageFile.name; // Display the file name
    }
});

function delayReset() {
    delay = true; // Reset the delay
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

function exitChat() {
    // Hide the chat and message sections
    document.getElementById("Chat").style.display = 'none';
    document.getElementById("MessageSection").style.display = 'none';

    // Clear the chat area
    document.getElementById("Chat").innerHTML = '';

    // Reset the room ID display
    chatRoom.style.display = 'none';

    // Show the access port section again
    document.getElementById("AccessPort").style.display = 'block';

    // Hide the exit button
    document.getElementById("ExitButton").style.display = 'none';

    // Optionally, disconnect the socket from the room
    socket.emit("leave", chatIDInput.value); // Emit a leave event to the server
}


function getCurrentTime() {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    let ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return hours + ':' + minutes + ' ' + ampm;
}