const mongoose = require('mongoose');

const ServerSchema = new mongoose.Schema({
    ip: String,
    port: Number,
    checks: [{
        timestamp: Date,
        status: String
    }]
});

module.exports = mongoose.model('Server', ServerSchema);
