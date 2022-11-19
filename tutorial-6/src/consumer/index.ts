import { Kafka } from 'kafkajs';
const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['kafka:9092'],
});

const consumer = kafka.consumer({ groupId: 'topic-test-1-group' });

await consumer.connect();
await consumer.subscribe({ topic: 'topic-test-1', fromBeginning: true });

consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    console.log({
      value: message.value.toString(),
    });
  },
});
