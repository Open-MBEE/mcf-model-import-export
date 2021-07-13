/**
 * @classification UNCLASSIFIED
 *
 * @copyright Copyright (C) 2020, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Donte McDaniel
 *
 * @author Donte McDaniel
 *
 * @description Initializes GET and POST routes for retrieving
 * organization, propject, and branch data. Also sets up routes'
 * for importing and exporting elements.
 */

'use strict';

// Require express module
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
// Instantiate an express application
const app = express();
// Require the authentication module
const { authenticate } = M.require('lib.auth');
// Require the import-export module
const importExport = require('./server/import-export');
const organizationController = M.require('controllers.organization-controller');
const projectController = M.require('controllers.project-controller');
const branchController = M.require('controllers.branch-controller');
const errors = M.require('lib.errors');

app.use(expressLayouts);
app.set('views', __dirname + '/views')
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));

// Defining the main route
app.get('/', authenticate, async (req, res) => {
    let orgs = await getOrganizations(req.user);
    res.render('index', {
        orgs  
    });
});

// GET route for organizations. Gets all organizations for a given user.
app.get('/organizations', authenticate, async (req, res) => {
    res.send(await getOrganizations(req.user));
});

// POST route for projects. Gets all projects in a specific organization.
app.post('/projects/organization/:orgid', authenticate, async (req, res) => {
    let organization = req.params.orgid;
    res.send(await getProjects(req.user, organization));
});

// POST route for branches. Gets all branches in a specific project.
app.post('/branches/organization/:orgid/project/:projectid', authenticate, async (req, res) => {
    let organization = req.params.orgid;
    let project = req.params.projectid;
    res.send(await getBranches(req.user, organization, project));
});

// POST route for export. Returns an exported model to the client.
app.post('/export/organization/:orgid/project/:projectid/branch/:branchid', authenticate, async (req, res) => {
    let organization = req.params.orgid;
    let project = req.params.projectid;
    let branch = req.params.branchid;
    let model = await importExport.exportModel(req.user, organization, project, branch);
    res.send(model);
});

// POST route for import
app.post('/import/organization/:orgid/project/:projectid/branch/:branchid', authenticate, async (req, res) => {
    let organization = req.params.orgid;
    let project = req.params.projectid;
    let branch = req.params.branchid;
    let body;
    
    // Check to see if a test is being ran.
    // The test does not stringify the req.body
    if (req.body.type) {
        body = req.body.data;
    }
    else {
        body = JSON.parse(req.body);
    }
    let newImportedData = await importExport.importModel(req.user, body.data, organization, project, branch);
    res.send(newImportedData);
});

/**
 * Gets all organizations for a given user
 * @param {Object} user request user object
 * @returns {Promise<Array>}
 */
async function getOrganizations(user) {
    try {
        let organizations = await organizationController.find(user);
        return organizations;
    }
    catch (error) {
        throw errors.captureError(error);
    }
}

/**
 * Gets all Projects for a given organization
 * @param {Object} user request user object
 * @param {String} organization name of the organization
 * @returns {Promise<Array>}
 */
async function getProjects(user, organization) {
    try {
        let projects = await projectController.find(user, organization);
        return projects;
    }
    catch (error) {
        throw errors.captureError(error);
    }
}

/**
 * Gets all branches for a given project
 * @param {Object} user request user object
 * @param {String} organization name of the organization
 * @param {String} project name of the project
 * @returns {Promise<Array>}
 */
async function getBranches(user, organization, project) {
    try {
        let branches = await branchController.find(user, organization, project);
        return branches;
    }
    catch (error) {
        throw errors.captureError(error);
    }
}

// Export/expose the app
module.exports = app;
