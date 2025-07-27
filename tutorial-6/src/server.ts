import express from 'express';
import { Request, Response } from 'express';
import { Kafka, Producer } from 'kafkajs';

const app = express();

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['kafka:9092'],
});

const producer: Producer = kafka.producer();

async function runProducer() {
  await producer.connect();
  console.log('Producer connected');
}

runProducer().catch(console.error);

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
