const http = require('http')
const express = require('express')
const path = require('path')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMsg, generateLocationMsg } = require('./utils/messages')
const { addUser, getUser, getUsersInRoom, removeUser } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDir = path.join(__dirname, '../public')

app.use(express.static(publicDir))

io.on('connection', (socket) => {
    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room })

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMsg('Admin', 'Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMsg('Admin', `${user.username} has joined!`))
        io.to(user.room).emit('roomDate', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (msg, callback) => {
        const user = getUser(socket.id)

        if (!user) {
            return callback('No user exists')
        }

        const filter = new Filter()

        if (filter.isProfane(msg)) {
            return callback(`Profanity isn't allowed`)
        }

        io.to(user.room).emit('message', generateMsg(user.username, msg))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMsg('Admin', `${user.username} has left`))
            io.to(user.room).emit('roomDate', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })

    socket.on('sendLocation', (data, callback) => {
        const user = getUser(socket.id)

        if (!user) {
            return callback('No user exists')
        }

        io.to(user.room).emit('locationMessage', generateLocationMsg(user.username, `https://google.com/maps?q=${data.long},${data.lat}`))
        callback()
    })
})

server.listen(port, () => console.log('Server is up'))

