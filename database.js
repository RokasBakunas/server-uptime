require('dotenv').config()

const mongoose = require('mongoose');



exports.connectToDB = () => {
    return mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
};
