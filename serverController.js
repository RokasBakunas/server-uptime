const Server = require('./models/Server');

exports.addServer = async (ip, port) => {
    const server = new Server({
        ip,
        port
    });
    await server.save();
};
exports.addServers = async (req, res) => {
    const servers = req.body.servers;

    try {
        await Server.insertMany(servers);
        res.status(201).json({ message: 'Servers added successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error adding servers', error: error });
    }
};