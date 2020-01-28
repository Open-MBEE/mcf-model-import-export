'use strict';

// Require express module
const express = require('express');
// Instantiate an express application
const app = express();
// Require the authentication module
const {authenticate} = M.require('lib.auth');

// Defining the main route
app.get('/', authenticate, (req, res) => {
    res.send('Export Plugin Route Successful');
});

// Export/expose the app
module.exports = app;
