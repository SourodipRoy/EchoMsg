const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const path = require("path");

const app = express();
const httpServer = http.Server(app);
const io = socketio(httpServer);

// Define the directory for serving static files
const gameDirectory = path.join(__dirname);
app.use(express.static(gameDirectory));

// Start the server on port 3000
httpServer.listen(3000, () => {
    console.log("Server is listening on port 3000");
});

// Store room information and usernames
const rooms = {};
const usernames = {};

// Handle socket connections
io.on('connection', function (socket) {

    // Handle user joining a room
    socket.on("join", function (room, username) {
        if (username !== "") {
            socket.leaveAll(); // Leave any existing rooms
            socket.join(room); // Join the specified room
            rooms[socket.id] = room; // Store room info
            usernames[socket.id] = username; // Store username

            // Notify the room of the new user
            io.in(room).emit("recieve", {
                text: `${username} has entered the chat.`,
                username: "Server",
                time: getCurrentTime(),
                type: 'text' // Indicating this is a text message
            });

            // Confirm to the user they have joined the room
            socket.emit("join", room);
        }
    });

    // Handle sending messages
    socket.on("send", function (message) {
        if (rooms[socket.id] && message.text.trim() !== "") { // Ensure non-empty message
            io.in(rooms[socket.id]).emit("recieve", {
                text: message.text,
                username: usernames[socket.id],
                time: message.time,
                type: 'text' // Indicating this is a text message
            });
        }
    });

    // Handle sending images
    socket.on("sendImage", function (message) {
        if (rooms[socket.id] && message.image) { // Ensure valid image data
            io.in(rooms[socket.id]).emit("recieve", {
                image: message.image,  // Base64 image data
                username: usernames[socket.id],
                time: message.time,
                type: 'image'  // Indicating this is an image message
            });
        }
    });

    // Handle sending both image and text
    socket.on("sendImageText", function (message) {
        if (rooms[socket.id] && (message.text || message.image)) { // Check for either text or image
            io.in(rooms[socket.id]).emit("recieve", {
                text: message.text,  // The text message, if present
                image: message.image,  // The image, if present
                username: usernames[socket.id],
                time: message.time,
                type: 'image+text' // Indicating this is a combined image and text message
            });
        }
    });

    // Handle user disconnecting
    socket.on('disconnect', function () {
        const room = rooms[socket.id];
        const username = usernames[socket.id];
        if (room && username) {
            delete usernames[socket.id]; // Remove the username
            delete rooms[socket.id]; // Remove the room info

            // Notify others in the room that the user has left
            socket.to(room).emit("recieve", {
                text: `${username} has left the chat.`,
                username: "Server",
                time: getCurrentTime(),
                type: 'text' // Indicating this is a text message
            });
        }
    });
});

// Function to get the current time in AM/PM format
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