[Github repository](https://github.com/nisicadmir/nodejs-typescript)

In this tutorial we are going to create a simple Node.js application which uses Kafka as a message broker for sending data between instances which act as microservices.

Before we dive into coding let's talk about monolithic (backend) application and microservice architecture. Monolithic application is an application where data access, business logic, UI (sometimes) and other parts of software are combined into a single program and runs on a single platform and is independent from other computing applications.
On the other hand, microservice architecture is an approach for building applications as a set of small independent services which communicate to each other. There are advantages and use cases why microservices should be used instead of monolithic applications. For example, horizontal scalability is a huge advantage where more intensive services can be scaled in order to improve the performance of the service while on monolithic there is only an option to scale the whole application. Services are independend and can be written by different teams and in different programming languages which improves cross team functionality. The failure of one service is less likely to negatively impact other parts of the application because the microservice runs autonomously from the others which is not the case with monolithic applications.

![Image 1 - monolithic vs microservice architecture](https://raw.githubusercontent.com/nisicadmir/nodejs-typescript/master/tutorial-6/images/image_1.jpg "Image 1 - monolithic vs microservice architecture")

So, considering that the microservice architecture is composed of several independent small services, it is necessary for these services to communicate with each other, and now we are entering into the story with message brokers.

# Message brokers and Kafka
By IBM message brokers are an inter-application communication technology to help build a common integration mechanism to support cloud native, microservices-based, serverless and hybrid cloud architectures.

There are a couple of message brokers available and the most popular are Kafka, Redis pub/sub and RabbitMQ.

Let's briefly talk about communication between one-to-one and one-to-many instances. As I already said in the introduction, the good thing about microservice architecture is that horizontal scalability is possible, which means that we can run one service on several machines in order to have faster data processing. Let's imagine for a moment that we have `service-a` that needs to send data to `service-b`. If service-b is available on 2 machines and we need service-a to send data to only one service-b instance. Kafka and RabbitMQ are offering instance discovery out-of-the-box, while Redis does not offer service discovery but instead Redis we will send data to both instances of service-b.
Some frameworks such as Moleculer have built-in node (service) discovery, which is in charge of knowing at all times which services are available and which are not, so that the framework itself knows to which instances it is possible to send data.

What needs to be emphasized is that Kafka has the ability to store messages that are sent between instances. If `service-a` sent a message to `service-b` but service-b was not available for any reason, the message was already saved and the destination did not recieve the message. When service-b becomes online again, then the service will start receiving messages that were in the queue and that did not arrive at the destination, and this ensures that messages are delivered to the destination. So, Kafka has the ability to save data and the amount of data to be saved can be set via configuration. Redis, on the other hand, when a service sends a message, only those services that are subscribed at that moment will receive the data.

## Kafka
Apache Kafka is a very popular open-source tool and it is a distributed event streaming platform used for high-performance data pipelines, streaming analytics. Advantages of using kafka are:
- Apache Kafka offers low latency value.
- Kafka is able to handle more number of messages of high volume and high velocity.
- Kafka has an essential feature to provide resistant to node/machine failure within the cluster.
- Apache Kafka contains a distributed architecture which makes it scalable.
-

Now let's clarify terms that are often used when working with Kafka and those terms are producer, consumer and topic.
The Producer API allows applications to send streams of data to topics.
The Consumer API allows applications to read streams of data from topics.
Topics are partitioned, meaning a topic is spread over a number of 'buckets' located on different Kafka brokers. When a new event is published to a topic, it is actually appended to one of the topic's partitions. Consumers of a specific topic will always read partition's events in exactly the same order they were written. If there is only one partition per topic then there can only be one consumer. If we want to have two consumers per one topic then the topic has to have at least two partitions.

## Kafka installation with docker.
Follow the instructions on how to setup a Node.js server with TypeScript in the tutorial which is part of this series. [Tutorial 1](https://dev.to/admirnisic/create-new-node-js-application-with-express-typescript-nodemon-and-eslint-f2l)

After we followed all the instructions from the provided tutorial now we should be able to run a Node.js server with command `npm run start` which should start a server on port 3000.

Now let's install Kafka. We can install Kafka in several ways, but for me the easiest way is to install it via Docker. We will install the following Docker images:
- Kafka
- Zookeeper
- Kafka UI

In the root folder (link of github repository is provided at the begining of the article), there is a file `docker-compose.yml`. Let's start the images with command `docker-compose up -d` and make sure that the containers are up and running.

![Image 2 - containers running](https://raw.githubusercontent.com/nisicadmir/nodejs-typescript/master/tutorial-6/images/image_2.png "Image 1 - containers running")

## Installation and server code
Now we have come to the step of dealing with the coding itself. First, we need to install the `kafkajs` npm package in order to connect the Node.js application with Kafka. Let's install npm package with following command:
```
npm install --save kafkajs
```

Now it is necessary to modify the file `src/server.ts`. Let's create a connection for Kafka.
```
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['kafka:9092'], // url 'kafka' is the host and port is 9092
});
```

If you look at the code snippet above, you'll see `brokers: ['kafka:9092']`. With this part of code we will connect to url `kafka` and port `9092`. Since in this case the host is kafka and not localhost, it is necessary to create a proxy that will redirect the network from kafka to localhost. We can achieve this by adding `127.0.0.1 kafka` in the file `etc/hosts`
```
# file /etc/hosts
127.0.0.1 kafka
```

Now let's add a producer. As we said in the introduction, the producer is an API that sends messages to a specific topic. We will create a route `/send` of method `GET` and whenever we call the mentioned endpoint we will send a message to the topic `topic-test-1` which we will create soon.
```typescript
app.get('/send', async (req: Request, res: Response) => {
  await producer.send({
    topic: 'topic-test-1', // topic name
    messages: [{ value: 'Hello KafkaJS user!' + Math.random().toString() }],
  });

  res.send('Application works!');
});
```

The idea is to create two consumers that will listen to topic `topic-test-1`. Let's create a file `src/consumer/index.ts` with the following code:
```typescript
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['kafka:9092'],
});

const consumer = kafka.consumer({ groupId: 'topic-test-1-group' });

consumer.connect();
consumer.subscribe({ topic: 'topic-test-1', fromBeginning: true });

consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    console.log({
      value: message.value.toString(),
    });
  },
});
```

In package.json add script for running the consumer.
```
"start:consumer": "npx ts-node ./src/consumer/index.ts"
```

There is one more step before we start the application. Let's create a topic on Kafka called `topic-test-1` with 2 partitions.
Creating a topic can be done in several ways, and in this tutorial I will show you how to create a topic via the `command line tool` and via the `Kafka UI` container that we launched via Docker.

- With UI
Visit `http://localhost:7000` which should open the application for Kafka UI. Go to topics and create a new topic with name `topic-test-1` and it should have two partitions.
![Image 3 - Kafka UI](https://raw.githubusercontent.com/nisicadmir/nodejs-typescript/master/tutorial-6/images/image_3.png "Image 3 - Kafka UI")

- With command line
Command for creating a topic:
```
docker exec -it kafka kafka-topics --bootstrap-server localhost:9092 --replication-factor 1 --partitions 2 --create --topic topic-test-1
```

Command for deleting a topic:
```
docker exec -it kafka kafka-topics --bootstrap-server localhost:9092 --delete --topic topic-test-1
```


Now let's start the server so that the producer can send messages to the topic.
```
npm run start
```

Now let's start t wo consumers in two different terminals.
```
npm run start:consumer
```

Now it is necessary to send a GET request to the endpoint `http://localhost:3000/send`. Let's do it with the help of curl with the command `curl localhost:3000/send`
![Image 4 - Application](https://raw.githubusercontent.com/nisicadmir/nodejs-typescript/master/tutorial-6/images/image_4.png "Image 4 - Application")

I have sent three requests and in the image above we can see that we have 2 consumers running and the first consumer recieved one message and the second consumer recieved two messages. If we add another instance of consumer then one of three instances will be disconnected from Kafka and will not recieve any message while the other two will still be recieving the messages. If we have only one instance then one instance will start recieveing all the messages that are sent to topic `topic-test-1`.

# Wrapping up
In this tutorial we talked about the differences between monolithic application and microservice architecture and what are the advanteges of using microsevice architecture. We talked briefly about what a message broker is, which are the popular message brokers and what are the differences between them. We also talked briefly about Kafka and what are the benefits of using it. And finally, we demonstrated how to use Kafka in a Node.js application. We showed how to connect to Kafka, how to send data via producer API and how to read data on two instances via consumer API.
