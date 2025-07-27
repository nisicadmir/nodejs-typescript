import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['kafka:9092'],
});

const consumer = kafka.consumer({ groupId: 'topic-test-1-group' });

consumer.connect();
consumer.subscribe({ topic: 'topic-test-1', fromBeginning: true });

consumer.run({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  eachMessage: async ({ topic, partition, message }) => {
    console.log({
      value: message.value.toString(),
    });
  },
});
