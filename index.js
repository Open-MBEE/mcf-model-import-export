'use strict';

// Require express module
const express = require('express');
// Instantiate an express application
const app = express();
// Require the authentication module
const {authenticate} = M.require('lib.auth');
const organizationController = M.require('controllers.organization-controller');
const projectController = M.require('controllers.project-controller'); 

// Use the public folder as our static folder from which we can serve static files
app.use(express.static(__dirname+'/public'));
// Defining the main route
app.get('/', authenticate, (req, res, next) => {
    res.sendFile('index.html');
});

// Defining the getAllData route for initial page loads
app.get('/getAllData', authenticate, async (req, res) => {
    // Getting organizations and projects of the user
    let results = { organizations: await organizationController.find(req.user), projects: {}};
    for (let i =0; i < results.organizations.length; i++) {
        let projects = await projectController.find(req.user, results.organizations[i]._id);
        results.projects[results.organizations[i]._id] = projects;
    }
    // Sending results to the client
    res.send(results);
});

// Export/expose the app
module.exports = app;
