import amqp from 'amqplib/callback_api';

const rabbitMQUrl =  'amqp://user:password@localhost';

async function processJob(job: any) {
    // Simulating job processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Return the processed result
    return `Processed job: ${JSON.stringify(job)}`;
}

async function startWorker() {
    try {
        // Connect to RabbitMQ
        const connection = await new Promise<amqp.Connection>((resolve, reject) => {
            amqp.connect(rabbitMQUrl, (err, conn) => {
                if (err) reject(err);
                resolve(conn);
            });
        });

        // Create a channel
        const channel = await new Promise<amqp.Channel>((resolve, reject) => {
            connection.createChannel((err, ch) => {
                if (err) reject(err);
                resolve(ch);
            });
        });

        // Declare a queue
        const queue = 'task_queue';
        await new Promise<void>((resolve, reject) => {
            channel.assertQueue(queue, { durable: true }, (err) => {
                if (err) reject(err);
                resolve();
            });
        });

        // Consume jobs from the queue
        channel.consume(queue, async (msg) => {
            if (msg) {
                const job = JSON.parse(msg.content.toString());

                console.log(`Received job: ${msg.content.toString()}`);
                console.log(msg.properties);

                // Process the job
                const result = await processJob(job);

                // Send the processed result back to RabbitMQ
                channel.sendToQueue(msg.properties.replyTo,Buffer.from(result), {
                    correlationId: msg.properties.correlationId,
                });

                // Acknowledge the job
                channel.ack(msg);
            }
        });

        console.log('M2 microservice started');
    } catch (error) {
        console.error('Error:', error);
    }
}

startWorker();