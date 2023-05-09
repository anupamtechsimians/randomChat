const express = require("express");
const app = express();
const redis= require("redis")
const server = require("http").Server(app);
const { v4: uuidv4 } = require("uuid");
app.set("view engine", "ejs");

const startServer = async () => {
  const client = redis.createClient();
  await client.connect();

  client.on('error', (err) => {
    console.error('Redis connection error:', err);
    process.exit(1); // exit Node.js process with non-zero exit code
  });

  await client.del('waitingQueue', (err, reply) => {
    if (err) throw err;
    console.log(`Deleted ${reply} keys`);
  });

const io = require("socket.io")(server, {
  cors: {
    origin: '*'
  }
});
const { ExpressPeerServer } = require("peer");
const opinions = {
  debug: true,
}

app.use("/peerjs", ExpressPeerServer(server, opinions));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render('index')
  // res.redirect(`/${uuidv4()}`);
});

app.get("/:room", (req, res) => {
  // res.render("room", { roomId: req.params.room });
  res.render("room", { roomId: uuidv4() });
});

io.on("connection", async (socket) => {
  console.log(socket.id +"  connnected")
     await client.rPush('waitingQueue',`${socket.id}`, function(err, reply) {
        // console.log(reply); 
      });
      const data=await client.lRange('waitingQueue',0,-1);
    //  console.log(data)
     socket.on("join-room", async (roomId, userId, userName) => {
      if(data.length>=2){
        // assign user to a randon Room..
        // console.log("====current user",socket.id)
        const userData=await client.lRange('waitingQueue',0,0);
        // console.log("==",roomId)
        var commonRoom = socket.id + userData[0];
        await client.lRem('waitingQueue',1,`${socket.id}`)
        await client.lRem('waitingQueue',1,`${userData[0]}`)
        // roomId=commonRoom
        // console.log("=================", io.sockets.connected[`${socket.id}`])
        io.sockets.connected[`${socket.id}`].join(roomId)
        io.sockets.connected[`${userData[0]}`].join(roomId)
        // io.in(userData[0]).join(roomId)
  
      }
    // socket.join(roomId);
    setTimeout(()=>{
      socket.to(roomId).broadcast.emit("user-connected", userId);
    }, 1000)
    // socket.on('leave', (room) => {
    //   console.log(`Socket ${socket.id} left room ${room}`);
    //   // Do something when the socket leaves the room
    // });
    socket.on("message", (message) => {
        // console.log("======rooms=====",Object.keys(socket.rooms))
        rooms = Object.keys(socket.rooms)
        let roomIdd=rooms?rooms[1]:""
      io.to(roomIdd).emit("createMessage", message,socket.id);
    });
  });
  socket.on("disconnect",async () => {
    
    console.log(` ${socket.id} disconnected`);
    await client.lRem('waitingQueue',1,`${socket.id}`)
    const data=await client.lRange('waitingQueue',0,-1);
    // console.log(data)
  });
});

server.listen(process.env.PORT || 3030);

}

startServer();