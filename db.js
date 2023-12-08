// db.js
const { MongoClient } = require('mongodb');

const mongoURI = 'mongodb+srv://root:michou23@axelle.oyjh0mp.mongodb.net/?retryWrites=true&w=majority';

let _db;

async function connect() {
  if (!_db) {
    const client = new MongoClient(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

    try {
      await client.connect();
      _db = client.db('Axelle');
    } catch (error) {
      throw new Error('Unable to connect to the database');
    }
  }
}

function getDatabase() {
  if (!_db) {
    throw new Error('Database not connected');
  }
  return _db;
}

module.exports = {
  connect,
  getDatabase,
};

