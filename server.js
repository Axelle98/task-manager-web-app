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



connect();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the 'task-manager-app' directory
app.use(express.static(path.join(__dirname, 'task-manager-app')));

// Passport config
require('./passport-config');

// Express session
app.use(session({ secret: 'secret', resave: true, saveUninitialized: true }));


// Express flash
app.use(flash());

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb+srv://root:michou23@axelle.oyjh0mp.mongodb.net/?retryWrites=true&w=majority', {
  useNewUrlParser: true, // This is no longer necessary, but it won't harm to leave it
  useUnifiedTopology: true, // This is no longer necessary, but it won't harm to leave it
});


module.exports = function (passport) {
  passport.use(
    new LocalStrategy((username, password, done) => {
		    console.log('Attempting authentication...');
      getUserByUsername(username, (err, user) => {
        if (err) throw err;
        if (!user) {
          return done(null, false, { message: 'Invalid username' });
        }

        comparePassword(password, user.password, (err, isMatch) => {
          if (err) throw err;
          if (isMatch) {
            return done(null, user);
          } else {
            return done(null, false, { message: 'Invalid password' });
          }
        });
      });
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    getUserById(id, (err, user) => {
      done(err, user);
    });
  });
};


// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    // If the user is authenticated, show the dashboard
    res.send(`Welcome, ${req.user.username}! This is your dashboard.`);
  } else {
    // If the user is not authenticated, redirect to the login page
    res.sendFile(path.join(__dirname, 'login.html'));
  }
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'form-task.html'));

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
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create a new user
    const newUser = { name, address, telephone, email, username, password };
    await usersCollection.insertOne(newUser);

    // Send success response
    res.json({ message: 'Signup successful! Please login...' });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.use((req, res, next) => {
  // Check for middleware affecting the request method
  if (req.method === 'POST' && req.originalMethod === 'GET') {
    req.method = 'GET';
  }
  next();
});

app.get('/form-task', isAuthenticated, (req, res) => {
  res.send(`Welcome, ${req.users.username}! This is your dashboard.`);  
});

// ... to add tasks

app.post('/form-task', isAuthenticated, async (req, res) => {
  const db = getDatabase();
  const tasksCollection = db.collection('tasks');

  // Extract task details from the request body
  const { taskName, status, priority, startDate, deadline, teamMembers, completionPercentage, notes, category } = req.body;

  try {
    // Create a new task
    const newTask = {
      taskName, status, priority, startDate, deadline, teamMembers, completionPercentage, notes,
      userId: req.user._id // Associate the task with the logged-in user
    };

    await tasksCollection.insertOne(newTask);
    res.status(200).json({ message: 'Task added successfully' });
  } catch (error) {
    console.error('Error adding task:', error);
    res.status(500).send('Internal Server Error');
  }
});

// This route will handle both GET and POST requests to /tasks
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
    // Additional logic for handling POST requests, if needed

    // For example, you might want to update a task
    // const taskId = req.body.taskId;
    // const updatedTaskData = req.body.updatedTaskData;
    // await tasksCollection.updateOne({ _id: taskId, userId: req.user._id }, { $set: updatedTaskData });

    // Respond with success message or updated task data
    res.json({ message: 'Success' });
  });


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
app.post('/logout', (req, res) => {
  // Call req.logout with a callback function
  req.logout(err => {
    if (err) {
      console.error('Error during logout:', err);
      return res.status(500).send('Internal Server Error');
    }

    // Redirect the user to the login page after successful logout
    res.redirect('/login');
  });
});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

