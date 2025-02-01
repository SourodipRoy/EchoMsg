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

const onlineUsers = new Map();
const rooms = new Map(); 
const usernames = new Map();
const GLOBAL_CHAT = 'global';

io.on('connection', function (socket) {
    socket.on("checkUsername", function (room, username, callback) {
        const normalizedRoom = room?.trim() || GLOBAL_CHAT;
        
        if (onlineUsers.has(normalizedRoom) && onlineUsers.get(normalizedRoom).has(username)) {
            callback(true); 
        } else {
            callback(false);
        }
    });

    socket.on("join", function (room, username) {
        if (!username?.trim()) return;

        const previousRoom = rooms.get(socket.id);
        const normalizedRoom = room?.trim() || GLOBAL_CHAT;

        if (previousRoom === normalizedRoom) return;

        if (onlineUsers.has(normalizedRoom) && onlineUsers.get(normalizedRoom).has(username)) {
            return;
        }

        if (previousRoom) {
            handleUserLeaving(socket, previousRoom, username);
        }

        socket.join(normalizedRoom);
        rooms.set(socket.id, normalizedRoom);
        usernames.set(socket.id, username);

        if (!onlineUsers.has(normalizedRoom)) {
            onlineUsers.set(normalizedRoom, new Set());
        }
        onlineUsers.get(normalizedRoom).add(username);

        io.in(normalizedRoom).emit("recieve", {
            text: `${username} has entered the chat.`,
            username: "Server",
            time: getCurrentTime(),
            type: 'text'
        });
        
        io.in(normalizedRoom).emit("updateOnlineUsers", {
            room: normalizedRoom,
            count: onlineUsers.get(normalizedRoom).size
        });

        socket.emit("join", normalizedRoom === GLOBAL_CHAT ? '' : normalizedRoom);
    });


    function handleUserLeaving(socket, room, username) {
        if (!room || !username) return;

        if (onlineUsers.has(room)) {
            onlineUsers.get(room).delete(username);
            
            socket.to(room).emit("recieve", {
                text: `${username} has left the chat.`,
                username: "Server",
                time: getCurrentTime(),
                type: 'text'
            });
            
            socket.to(room).emit("updateOnlineUsers", {
                room: room,
                count: onlineUsers.get(room).size
            });

            // Set count to 0 for the leaving user
            socket.emit("updateOnlineUsers", {
                room: room,
                count: 0
            });

            if (onlineUsers.get(room).size === 0) {
                onlineUsers.delete(room);
            }
        }

        socket.leave(room);
    }

    socket.on("leave", function (room, username) {
        const normalizedRoom = room?.trim() || GLOBAL_CHAT;
        handleUserLeaving(socket, normalizedRoom, username);
        rooms.delete(socket.id);
        usernames.delete(socket.id);
    });

    socket.on("send", function (message) {
        const room = rooms.get(socket.id);
        const username = usernames.get(socket.id);
        if (!room || !username || !message?.text?.trim()) return;
        io.in(room).emit("recieve", {
            text: message.text,
            username: username,
            time: message.time,
            type: 'text'
        });
    });

    socket.on("sendImage", function (message) {
        const room = rooms.get(socket.id);
        const username = usernames.get(socket.id);
        if (!room || !username || !message?.image) return;
        io.in(room).emit("recieve", {
            image: message.image,
            username: username,
            time: message.time,
            type: 'image'
        });
    });

    socket.on("sendImageText", function (message) {
        const room = rooms.get(socket.id);
        const username = usernames.get(socket.id);
        if (!room || !username || (!message?.text && !message?.image)) return;
        io.in(room).emit("recieve", {
            text: message.text,
            image: message.image,
            username: username,
            time: message.time,
            type: 'image+text'
        });
    });

    socket.on('disconnect', function () {
        const room = rooms.get(socket.id);
        const username = usernames.get(socket.id);
        if (!room || !username) return;

        handleUserLeaving(socket, room, username);
        rooms.delete(socket.id);
        usernames.delete(socket.id);
    });
});

function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
