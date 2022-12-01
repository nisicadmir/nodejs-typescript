import express from 'express';
import { Request, Response } from 'express';
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['kafka:9092'], // url 'kafka' is the host and port is 9092
});

const producer = kafka.producer();
producer.connect();

const app = express();

app.get('/', (req: Request, res: Response) => {
  res.send('Application works!');
});

app.get('/send', async (req: Request, res: Response) => {
  await producer.send({
    topic: 'topic-test-1', // topic name
    messages: [{ value: 'Hello KafkaJS user!' + Math.random().toString() }],
  });

  res.send('Application works!');
});

app.listen(3000, () => {
  console.log('Application started on port 3000!');
});
