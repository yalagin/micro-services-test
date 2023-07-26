import express, {Request, Response} from 'express';
import amqp from 'amqplib/callback_api';

const app = express();
const rabbitMQUrl = 'amqp://user:password@localhost';

app.use(express.json());

app.post('/process', async (req: Request, res: Response) => {
    try {
        const task = req.body;

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

        // Declare a queue for receiving the result
        const resultQueue = await new Promise<string>((resolve, reject) => {
            channel.assertQueue('', {exclusive: true}, (err, q) => {
                if (err) reject(err);
                resolve(q.queue);
            });
        });

        // Create a correlationId
        const correlationId = generateCorrelationId();

        // Set up a consumer to wait for the result
        const resultPromise = new Promise<string>((resolve, reject) => {
            channel.consume(resultQueue, (msg) => {
                if (msg?.properties.correlationId === correlationId) {
                    resolve(msg.content.toString());
                    // console.log(msg)
                }
            }, {noAck: true});
        });

        // Publish the task to RabbitMQ with correlationId
        channel.sendToQueue('task_queue', Buffer.from(JSON.stringify(task)), {
            correlationId,
            replyTo: resultQueue,
        });

        // Wait for the result
        const result = await resultPromise;

        // Close the channel and connection
        channel.close((err) => {
            if (err) throw err;
            connection.close();
        });

        res.status(200).send(result);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred');
    }
});

function generateCorrelationId() {
    // Generate a unique correlationId
    return Math.random().toString(36).substring(2);
}

app.listen(3000, () => {
    console.log('M1 microservice listening on port 3000');
});