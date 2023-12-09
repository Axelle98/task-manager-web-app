const express = require('express');
const flash = require('express-flash');
const session = require('express-session');
const passport = require('passport');
const { connect, getDatabase } = require('./db');
const app = express();
const port = 8080;
const path = require('path');
const bodyParser = require('body-parser');
const LocalStrategy = require('passport-local').Strategy;
const { getUserByUsername, getUserById, comparePassword } = require('./db');
const mongoose = require('mongoose');

// Connect to MongoDB
connect();

// Serve static files from the 'task-manager-app' directory
app.use(express.static(path.join(__dirname, 'task-manager-app')));

// Passport config
require('./passport-config')(passport);

// Express session
app.use(session({ secret: 'secret', resave: true, saveUninitialized: true }));

// Express flash
app.use(flash());

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// MongoDB connection
mongoose.connect('mongodb+srv://root:michou23@axelle.oyjh0mp.mongodb.net/?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

// Handle MongoDB connection errors
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Passport configuration moved to passport-config.js

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

// Login route
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/login',
  (req, res, next) => {
    console.log('Before passport.authenticate');
    next();
  },
  passport.authenticate('local', {
    successRedirect: '/form-task',
    failureRedirect: '/login',
    failureFlash: true
  })
);

// Signup route
app.get('/signup.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'signup.html'));
});

app.post('/signup', async (req, res) => {
  const db = getDatabase();
  const usersCollection = db.collection('users');

  // Extract user details from the request body
  const { name, address, telephone, email, username, password } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
      return res.send('User already exists');
    }

    // Create a new user
    const newUser = { name, address, telephone, email, username, password };
    await usersCollection.insertOne(newUser);

    // Send success response and redirect
    res.send('Signup successful! Please login...').redirect('/login');
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Form-task route
app.get('/form-task', isAuthenticated, (req, res) => {
  res.send(`Welcome, ${req.users.username}! This is your dashboard.`);
});

// Task routes (POST, GET, PUT, DELETE)

// View route
app.route('/view')
  .get(isAuthenticated, async (req, res) => {
    try {
      const db = getDatabase();
      const tasksCollection = db.collection('tasks');

      // Get tasks associated with the logged-in user
      const userTasks = await tasksCollection.find({ userId: req.user._id }).toArray();

      // Send the tasks as JSON
      res.json(userTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).send('Internal Server Error');
    }
  })
  .post(isAuthenticated, (req, res) => {
    // Handle POST logic here
    res.json({ message: 'Success' });
  });

// Update task route
app.put('/update-task/:taskId', isAuthenticated, async (req, res) => {
  const db = getDatabase();
  const tasksCollection = db.collection('tasks');

  // Extract updated task details from the request body
  const { taskName, status, priority, startDate, deadline, teamMembers, completionPercentage, notes } = req.body;

  try {
    // Update the task with the specified taskId
    await tasksCollection.updateOne(
      { _id: req.params.taskId, userId: req.user._id },
      {
        $set: {
          taskName, status, priority, startDate, deadline, teamMembers, completionPercentage, notes
        }
      }
    );

    res.send('Task updated successfully');
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Delete task route
app.delete('/delete-task/:taskId', isAuthenticated, async (req, res) => {
  const db = getDatabase();
  const tasksCollection = db.collection('tasks');

  try {
    // Delete the task with the specified taskId
    await tasksCollection.deleteOne({ _id: req.params.taskId, userId: req.user._id });

    res.send('Task deleted successfully');
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Logout route
app.post('/logout', (req, res) => {
  // Call req.logout with a callback function
  req.logout((err) => {
    if (err) {
      console.error('Error during logout:', err);
      return res.status(500).send('Internal Server Error');
    }

    // Redirect the user to the login page after successful logout
    res.redirect('/login');
  });
});

// Server listening on port 8080
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
