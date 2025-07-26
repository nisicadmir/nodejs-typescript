[Github repository](https://github.com/nisicadmir/nodejs-typescript)

Socket.IO enables real-time event-based communication in both directions (client and server side). Socket.IO is built on top of WebSockets API and Node.js.

A real-time application (RTA) is an application that functions within a period that the user senses as immediate. Some examples of real-time applications are:
- instant messaging system - Chat apps like WhatsApp, Facebook Messenger etc,
- push notifications,
- applications like Google docs which allows multiple people to update the same document simultaneously.

Writting a real-time application without WebSockets, using HTTP requests, has been traditionally very hard. It involves polling the server for changes and by design it is very slow and requires more resources.

Sockets are an easier and faster solution which most real-time systems are designed on which provides bi-directional communication channel between a client and a server. This means that whenever an event occurs, the server can push messages to clients so the client gets notified immediately and vice versa.

Socket.IO is quite popular and it is used by Microsoft Office, Yammer, Trello...

## Installation and server code

Altough this tutorial is provided in series, this specific tutorial is standalone so no previous code needs to be included. Let's start with server code and let's install all the necesarry libraries.

```bash
npm install --save socket.io express
npm install --save-dev @types/socket.io
```

Initial server code:
```typescript
// ... existing code ...

import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Create a new HTTP server for socket.io
const socketServer = http.createServer();
const io = new SocketIOServer(socketServer, {
  cors: {
    origin: "*", // Adjust this to your needs
    methods: ["GET", "POST"]
  }
});
// Listen for socket.io connections
io.on('connection', (socket) => {
  // Listen for socket.io connections
  io.on('connection', (socket) => {
    console.log('New connection created');

    // Get the auth token provided on handshake.
    const token = socket.handshake.auth.token;
    console.log('Auth token', token);

    try {
      // Verify the token here and get user info from JWT token.
    } catch (error) {
      socket.disconnect(true);
    }

    // A client is disconnected.
    socket.on('disconnect', () => {
      console.log('A user disconnected');
    });

    // Read message recieved from client.
    socket.on('message_from_client', (data) => {
      console.log('message_from_client: ', data);
    });

    // Send a message to the connected client 5 seconds after the connection is created.
    setTimeout(() => {
      socket.emit('message_from_server', `Message: ${Math.random()}`);
    }, 5_000);
  });

  // Add more socket event handlers here
});

// Start the socket.io server on a different port, e.g., 4000
socketServer.listen(4000, () => {
  console.log('Socket.io server started on port 4000');
});

// ... existing code ...

app.listen(3000, () => {
  console.log('Application started on port 3000!');
});
```
In the code snipet above we created an Express server on port 3000 and after that we created a Socket.IO server. `socketIo.on('connection', (socket)` is called when a new connection from the client side is initiated. This is called a handshake and the first step to do after this is to get the auth token from the client and verify it. If the JWT is malicius then we will disconnect the client and the client will not get any events from the server side and if the token is valid we can get the user data from the JWT.

Sending data from client to server and vice versa is pretty simple.
- For reading the data we are using `socket.on` either from client to server or from server to client.
- For sending the data we are using `socket.emit` either from client to server or from server to client.
In the code below we are reading the data from the client side and we are listening to the event `message_from_client`.
```typescript
socket.on('message_from_client', (data) => {
  console.log('message_from_client: ', data);
});
```
Whenever the client is emitting `socketIo.emit('message_from_client', 'Sent an event from the client!');` server will read the data in real time.

In the code below we can see how we can send the data from the server to the client with event name `message_from_server`. Client listening on event `message_from_server` will read the data in real time.
```typescript
setTimeout(() => {
  socket.emit('message_from_server', `Message: ${Math.random()}`);
}, 5_000);
```


## Client code

Let's create a simple html file inside `src` (root) folder with the following code. We will establish client communication with the server by pressing a button.
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Socket tutorial</title>
  </head>
  <body>
    <button onclick="establishConnection()">Join</button>

    <script
      src="https://cdn.socket.io/3.1.3/socket.io.min.js"
      integrity="sha384-cPwlPLvBTa3sKAgddT6krw0cJat7egBga3DJepJyrLl4Q9/5WLra3rrnMcyTyOnh"
      crossorigin="anonymous"
    ></script>
    <script>
      let isConnectionEstablished = false;

      function establishConnection() {
        if (isConnectionEstablished) {
          return;
        }

        isConnectionEstablished = true;

        const socketIo = io('http://localhost:4000', {
          auth: {
            token: 'json-web-token',
          },
        });

        socketIo.on('connect', function () {
          console.log('Made socket connection', socketIo.id);
        });

        socketIo.on('message_from_server', function (data) {
          console.log('message_from_server data: ', data);
        });

        socketIo.on('disconnect', function () {
          console.log('disconnect');
        });

        // Send a message to the server 3 seconds after initial connection.
        setTimeout(function () {
          socketIo.emit('message_from_client', 'Sent an event from the client!');
        }, 3000);

        socketIo.on('connect_error', function (err) {
          console.log('connection errror', err);
        });

      }
    </script>
  </body>
</html>
```

It is important to note that we provided the Socket.IO client library with script from CDN.
```html
<script
  src="https://cdn.socket.io/3.1.3/socket.io.min.js"
  integrity="sha384-cPwlPLvBTa3sKAgddT6krw0cJat7egBga3DJepJyrLl4Q9/5WLra3rrnMcyTyOnh"
  crossorigin="anonymous"
></script>
```

Creating a communication channel by sending a token which is required for validating the user.
```javascript
const socketIo = io('http://localhost:4000', {
  auth: {
    token: 'json-web-token',
  },
});
```

Code for reading messages from from the server on event `message_from_server`:
```javascript
socketIo.on('message_from_server', function (data) {
  console.log('message_from_server data: ', data);
});
```

Code for sending the data from the client to the server:
```javascript
setTimeout(function () {
  socketIo.emit('message_from_client', 'Sent an event from the client!');
}, 3000);
```

## Run the application
On the server side add script for running the server in package.json file:
```json
"scripts": {
  "start": "ts-node src/server.ts"
},
```

Now let's run the Node.js application with:
```bash
npm run start
```

Now we can open the index.html file in any browser. You should be able to see a 'Join' button as shown in image `Image 1 - client`.
![Image 1 - client](https://raw.githubusercontent.com/nisicadmir/nodejs-typescript/master/tutorial-5/image_1.png "Image 1 - client")

Open the console on the browser and after that click the 'Join' button you should be able to see that the server is emitting data to the client as seen in `Image 2 - client console`
![Image 2 - client console](https://raw.githubusercontent.com/nisicadmir/nodejs-typescript/master/tutorial-5/image_2.png "Image 2 - client console")

If you look at the terminal on server code you should be able to see the client is emitting the data to the server as seen in image `Image 3 - server terminal`
![Image 3 - server terminal](https://raw.githubusercontent.com/nisicadmir/nodejs-typescript/master/tutorial-5/image_3.png "Image 3 - server terminal")


## Rooms
From time to time it is necessary to separate certain users so that we can only send events to specific users. One good example of how rooms can be used is a chat room. A chat room can be made for one or more people and only users who are in a particular room can receive the specific events.

Updated server code with rooms.
```typescript
// Listen for socket.io connections
io.on('connection', (socket) => {
  // Listen for socket.io connections
  io.on('connection', (socket) => {
    console.log('New connection created');

    // Get the auth token provided on handshake.
    const token = socket.handshake.auth.token;
    console.log('Auth token', token);

    try {
      // Verify the token here and get user info from JWT token.
    } catch (error) {
      socket.disconnect(true);
    }

    // A client is disconnected.
    socket.on('disconnect', () => {
      console.log('A user disconnected');
    });

    // Read message recieved from client.
    socket.on('message_from_client', (data) => {
      console.log('message_from_client: ', data);
    });

    // Send a message to the connected client 5 seconds after the connection is created.
    setTimeout(() => {
      socket.emit('message_from_server', `Message: ${Math.random()}`);
    }, 5_000);
  });

  /**
   * New code
   */
  // Get the room number from the client.
  const roomNumber: string = socket.handshake.query.roomNumber as string;
  // Join room for specific users.
  const room = `room-userId-${roomNumber}`;
  socket.join(room);

  // Emit to room by room number.
  setTimeout(() => {
    io.to(room).emit('room-userId', `You are in room number: ${roomNumber}`);
  }, 2_000);

  // Add more socket event handlers here
});
```

The idea is to get the room number from the client and join specific users to specific rooms. After a user joins a specific room he will recieve events whenever we emit data to specific rooms.
```typescript
// Get the room number from the client.
const roomNumber: string = socket.handshake.query.roomNumber as string;
// Join room for specific users.
const room = `room-userId-${roomNumber}`;
socket.join(room);

// Emit to room by room number.
setTimeout(() => {
  socketIo.to(room).emit('room-userId', `You are in room number: ${roomNumber}`);
}, 2_000);
```


On the client side, let's add input where users will be able to enter a room number and send the room number to the server side after the user presses the join button.
```html
<!-- Add text input field next to 'Join' button -->
<input type="text" placeholder="Room number" id="roomId" />
<button onclick="establishConnection()">Join</button>
```
```javascript
// Update connection for Socket.
const socketIo = io('http://localhost:4000', {
  auth: {
    token: 'json-web-token',
  },
  query: {
    roomNumber: document.getElementById('roomId').value, // <- new code
  },
});
```

Now let's open two tabs of the client application and let's join the same room. People from the same room will always see when someone joins the room as shown in the image `Image 4 - joining the rooms`
![Image 4 - joining the rooms](https://raw.githubusercontent.com/nisicadmir/nodejs-typescript/master/tutorial-5/image_4.png "Image 4 - joining the rooms")


# Wrapping up
In this tutorial we learned what are websockets and what are the advantages of using websockets instead of HTTP for real time communication and we learned that the Socket.IO is most popular option for using websockets with Node.js. Socket.IO is widely used by most popular companies like Microsoft, Trello etc. We learned how to create an Express server using Socket.IO and how to use it in client side. We learned how to send JWT tokens on Socket.IO handshake and how to send any additional data while initial communication is created. We also saw what the benefits are and why rooms in Socket.IO are used for.
