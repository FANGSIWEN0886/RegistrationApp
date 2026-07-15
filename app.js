const express = require('express');
const mysql = require('mysql2');
const app = express();

//******** TODO: Insert code to import 'express-session' *********//
const session = require("express-session");
const flash = require('connect-flash');

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'RP738964$',
    database: 'C237_usersdb'
});

db.connect((err) => {
    if (err) {
        throw err;
    };
    console.log('Connected to database');
});

app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

//******** TODO: Insert code for Session Middleware below ********//
app.use( session ({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
    // Cookie: Session expires after 1 week of inactivity
    cookie: {maxAge: 1000 * 60 * 60 * 24 * 7}
}));

// express-Flash enabler:
app.use(flash());

// Setting up EJS
app.set('view engine', 'ejs');

// Create a Middleware to check if user is logged in:
const checkAuthenticated = (req, res, next) => {
    if (req.session.user.role) {
        return next();
    } else {
        req.flash('error', 'Please log in to view this resource');
        res.redirect('/login')
    };
};
// Create a Middleware to check if user is admin. ********//
const checkadmin = (req, res, next) => {
    if (req.session.user.role === 'admin') {
        return next();
    } else {
        req.flash('error', 'Access Denied.')
    };
};

// Router for homepage:
app.get('/', (req, res) => {
    res.render('index', { user: req.session.user, messages: req.flash('success')});
});

// Router for Registration page:
app.get('/register', (req, res) => {
    // req.flash('formdata')[0] enables temporary memory for previously filled data in form:
    res.render('register', { messages: req.flash('error'), formData: req.flash('formData')[0] });
});


// Create a middleware function "validateRegistration":
const validateRegistration = (req, res, next) => {
    const {username, email, password, address, contact} = req.body;
    // Check if all fields have been filled:
    if (!username || !email || !password || !address || !contact) {
        return res.send("All fields are required!")
    };
    // Check if password meets the requirements:
    if (password.length < 6) {
        req.flash('error', 'Password should be at least 6 characters long');
        req.flash('formData', req.body);
        return res.redirect('/register');
    };
    //If all validations pass, the next function is called, allowing the request to proceed to the next router's parameter.
    //next middleware function or route handler.
    next();
};

// Integrating "validateRegistration" Middleware function into the Registration router:
app.post('/register', validateRegistration, (req, res) => {
    // Extract all fields inside form submitted:
    const { username, email, password, address, contact, role} = req.body;

    const sql = 'INSERT INTO users (username, email, password, address, contact, role) VALUES (?, ?, SHA1(?), ?, ?, ?)';
    db.query(sql, [username, email, password, address, contact, role], (err, result) => {
        if (err) {
            // "throw" will directly end the process, same as return
            throw err;
        };
        console.log(result);
        // "success" parameter indicate the color of the dialog box
        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
    });
});

// login routes to render login page:
app.get('/login', (req, res) => {
    res.render('login', {
        // Retrieve success and error message from the flash middleware and
        // Pass them to the login view for display
        // Right hand side is source and left hand side is the corresponding variable name in the ejs file. 
        messages: req.flash('success'),
        errors: req.flash('error')
    });
});

// login routes for form submission:
app.post('/login', (req, res) => {
    const {email, password} = req.body;
    
    // First layer validation: Validate email and password
    if (!email || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }; 

    // Second layer validation: Check the existance of the email and password entered.
    // To verify the entered password, use SHA1() method to hash it since password stored in db is in hashed format.
    const sql = "SELECT * FROM users WHERE email = ? AND password = SHA1(?)";
    db.query(sql, [email, password], (err, results) => {
        if (err) {
            throw err;
        }
        if (results.length > 0) {
            // Successful Login:
            // Store user in session
            req.session.user = results[0];
            // First parameter indicate the status of Login
            req.flash('success', 'Login successfully!');
            res.redirect('/dashboard');
        } else {
            // Invalid credentials, no record in db for the entered email and pasword:
            req.flash('error', 'Invalid email or password');
            res.redirect('/login');
        };
    });
});

// dashboard route to render dashboard page for users:
app.get('/dashboard', checkAuthenticated, (req, res) => {
    res.render('dashboard', { user: req.session.user });
});

// admin route to render Admin dashboard page for admin:
app.get('/admin', checkadmin, (req, res) => {
    res.render('admin', { user: req.session.user});
});

// logout route:
app.get('/logout', (req, res) => {
    // Using "req.session.destroy()" to disable the session been used and clear the data stored inside.
    req.session.destroy();
    res.redirect('/');
});

// Starting the server
app.listen(3000, () => {
    console.log('Server started on port 3000');
});
