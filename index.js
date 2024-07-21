const express = require('express');
const path = require('path');
const dns = require('dns');
const SMTPConnection = require('promises-smtp');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const verifyEmail = async (email) => {
    const domain = email.split('@')[1];

    try {
        const records = await dns.promises.resolveMx(domain);
        if (records.length === 0) {
            return false;
        }

        const mxRecord = records[0].exchange;

        const connection = new SMTPConnection({
            host: mxRecord,
            port: 25,
            secure: false,
            tls: { rejectUnauthorized: false }
        });

        await connection.connect();
        await connection.send({
            from: 'me@domain.com',
            to: email
        });

        const response = await connection.quit();
        return response.accepted.length > 0;
    } catch (error) {
        console.error(`Verification failed for ${email}:`, error);
        return false;
    }
};

app.post('/verify-emails', async (req, res) => {
    const emailList = req.body.emails || [];
    const results = {};

    for (const email of emailList) {
        results[email] = await verifyEmail(email);
    }

    res.json(results);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
