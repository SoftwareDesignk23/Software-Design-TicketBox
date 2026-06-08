import amqp from 'amqplib';

async function checkQueues() {
    const url = 'amqps://jvchtlve:oDz6BiyFRMEuwP36bdO-EW9Tac1t5Rux@fuji.lmq.cloudamqp.com/jvchtlve';
    try {
        const conn = await amqp.connect(url);
        const ch = await conn.createChannel();
        
        console.log('Connected to CloudAMQP');
        
        const q1 = await ch.checkQueue('payment.success.queue');
        console.log('payment.success.queue:', q1);
        
        const q2 = await ch.checkQueue('ticketbox.dlq');
        console.log('ticketbox.dlq:', q2);
        
        if (q1.messageCount > 0) {
            const msg = await ch.get('payment.success.queue', { noAck: false });
            console.log('Message in payment.success.queue:', msg?.content.toString());
        }
        
        if (q2.messageCount > 0) {
            const msg = await ch.get('ticketbox.dlq', { noAck: false });
            console.log('Message in ticketbox.dlq:', msg?.content.toString());
        }
        
        await ch.close();
        await conn.close();
    } catch (e) {
        console.error('Error:', e);
    }
}

checkQueues();
