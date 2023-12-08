// passport-config.js
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { getDatabase } = require('./db');


passport.use(
  new LocalStrategy(async (username, password, done) => {
    const db = getDatabase();
    const usersCollection = db.collection('users');

    try {
      const user = await usersCollection.findOne({ username, password });
      if (user) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Incorrect username or password' });
      }
    } catch (error) {
      return done(error);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  const db = getDatabase();
  const usersCollection = db.collection('users');

  try {
    const user = await usersCollection.findOne({ _id: id });
    done(null, user);
  } catch (error) {
    done(error);
  }
});