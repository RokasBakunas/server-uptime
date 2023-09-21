const express = require('express');
const bodyParser = require('body-parser');
const { connectToDB } = require('./database');
const { checkAndRecordAllServers, checkServerStatus } = require('./serverChecker');
const { addServer } = require('./serverController');
const Server = require('./models/Server');

const app = express();
const PORT = 10000;

// Cache variables
let cachedHtml = null;
let lastUpdated = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Middleware
app.use(bodyParser.json());

// Helper function to fetch server statuses
async function fetchServerStatuses() {
    const servers = await Server.find();
    return await Promise.all(servers.map(async server => {
        const totalRecords = server.checks.length;
        const onlineRecords = server.checks.filter(check => check.status === 'on').length;
        const percentageOnline = (onlineRecords / totalRecords) * 100;

        return {
            ip: server.ip,
            port: server.port,
            status: await checkServerStatus(server.ip, server.port),
            percentageOnline: percentageOnline.toFixed(2)
        };
    }));
}

// Routes
app.post('/add-server', async (req, res) => {
    const { ip, port } = req.body;
    if (!ip || !port) {
        return res.status(400).send('IP and Port are required.');
    }

    try {
        await addServer(ip, port);
        res.status(200).send('Server added successfully.');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error adding server.');
    }
});

app.get('/', (req, res) => {
    const now = Date.now();
    if (cachedHtml && lastUpdated && now - lastUpdated < CACHE_DURATION) {
        return res.send(cachedHtml);
    }

    res.send(cachedHtml || "Loading...");
});

app.get('/servers-status', async (req, res) => {
    try {
        const serverStatuses = await fetchServerStatuses();
        res.json(serverStatuses);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching server statuses.');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

const updateHtmlCache = async () => {
    const serverStatuses = await fetchServerStatuses();
    
    const tableRows = serverStatuses.map(server => `
        <tr>
            <td>${server.ip}</td>
            <td>${server.port}</td>
            <td class="${server.status === 'on' ? 'online' : 'offline'}">${server.status}</td>
            <td>${server.percentageOnline}%</td>
        </tr>
    `).join('');

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Server Status</title>
        <style>
    .online {
        color: green;
    }
    .offline {
        color: red;
    }
</style>

    </head>
    <body>
    <div id="loadingMessage">Kraunasi...</div>
    <table border="1" style="display: none;">
        <thead>
            <tr>
                <th>IP</th>
                <th>Port</th>
                <th>Status</th>
                <th>Percentage Online</th>
            </tr>
        </thead>
        <tbody id="serverStatusTable">
            ${tableRows}
        </tbody>
    </table>
    <script>
        const table = document.querySelector('table');
        const loadingMessage = document.getElementById('loadingMessage');
                
        loadingMessage.style.display = 'none';
        table.style.display = 'block';
    </script>
    </body>
    <script>
    setTimeout(() => {
        location.reload();
    }, 5 * 60 * 1000); // 5 minutes in milliseconds
</script>

    </html>
    `;

    cachedHtml = html;
    lastUpdated = Date.now();
};

connectToDB()
    .then(() => {
        console.log('Connected to MongoDB');
        
        checkAndRecordAllServers();
        updateHtmlCache();

        setInterval(() => {
            checkAndRecordAllServers();
            updateHtmlCache();
        }, CACHE_DURATION);
    })
    .catch(error => {
        console.error('Error connecting to MongoDB:', error);
    });
