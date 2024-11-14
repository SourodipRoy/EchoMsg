const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const path = require("path");

const app = express();
const httpServer = http.Server(app);
const io = socketio(httpServer);

const gameDirectory = path.join(__dirname);
app.use(express.static(gameDirectory));

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

const rooms = {};
const usernames = {};

io.on('connection', function (socket) {

    socket.on("join", function (room, username) {
        if (username !== "") {
            socket.leaveAll();
            socket.join(room);
            rooms[socket.id] = room;
            usernames[socket.id] = username;

            io.in(room).emit("recieve", {
                text: `${username} has entered the chat.`,
                username: "Server",
                time: getCurrentTime(),
                type: 'text'
            });

            socket.emit("join", room);
        }
    });

    socket.on("send", function (message) {
        if (rooms[socket.id] && message.text.trim() !== "") {
            io.in(rooms[socket.id]).emit("recieve", {
                text: message.text,
                username: usernames[socket.id],
                time: message.time,
                type: 'text'
            });
        }
    });

    socket.on("sendImage", function (message) {
        if (rooms[socket.id] && message.image) {
            io.in(rooms[socket.id]).emit("recieve", {
                image: message.image,
                username: usernames[socket.id],
                time: message.time,
                type: 'image'
            });
        }
    });

    socket.on("sendImageText", function (message) {
        if (rooms[socket.id] && (message.text || message.image)) {
            io.in(rooms[socket.id]).emit("recieve", {
                text: message.text,
                image: message.image,
                username: usernames[socket.id],
                time: message.time,
                type: 'image+text'
            });
        }
    });

    socket.on('disconnect', function () {
        const room = rooms[socket.id];
        const username = usernames[socket.id];
        if (room && username) {
            delete usernames[socket.id];
            delete rooms[socket.id];

            socket.to(room).emit("recieve", {
                text: `${username} has left the chat.`,
                username: "Server",
                time: getCurrentTime(),
                type: 'text'
            });
        }
    });
});

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