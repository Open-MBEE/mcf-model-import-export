'use strict';

// Require express module
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
// Instantiate an express application
const app = express();
// Require the authentication module
const { authenticate } = M.require('lib.auth');
const organizationController = M.require('controllers.organization-controller');
const projectController = M.require('controllers.project-controller');
const branchController = M.require('controllers.branch-controller');
const elementController = M.require('controllers.element-controller');
const utils = M.require('lib.utils');

let orgs;
let projects;
let branches;

app.use(expressLayouts);
app.set('views', __dirname + '/views')
app.set('view engine', 'ejs');

// Defining the main route
app.get('/', authenticate, (req, res) => {
    getInitialData(req.user).then(data => {
        // Globally setting orgs, projects, and branches
        orgs = data.organizations;
        projects = data.projects;
        branches = data.branches;
        res.render('index', {
            orgs
        });
    });
});

// POST route for projects
app.post('/projects', authenticate, (req, res) => {
    let body = JSON.parse(req.body);
    res.send(projects[body.organization]);
});

// POST route for branches
app.post('/branches', authenticate, (req, res) => {
    let body = JSON.parse(req.body);
    res.send(branches[body.organization+':'+body.project]);
});

// POST route for export
app.post('/export', authenticate, async (req, res) => {
    let body = JSON.parse(req.body);
    let model = await elementController.find(req.user, body.organization, body.project, body.branch);
    let updatedModel = removeReferences(model);
    res.send(updatedModel);
});

/**
 * Gets organizations, projects, and branches of a given user
 * @param {Object} user request user object
 * @returns {Promise}
 */
async function getInitialData(user) {
    let results = {
        organizations: await organizationController.find(user),
        projects: {},
        branches: {}
    };
    for (let i = 0; i < results.organizations.length; i++) {
        // Getting all projects
        let projects = await projectController.find(user, results.organizations[i]._id);
        results.projects[results.organizations[i]._id] = projects;

        // Getting all branches
        for (let n = 0; n < projects.length; n++) {
            let parsedProjectId = utils.parseID(projects[n]._id);
            let branches = await branchController.find(user, parsedProjectId[0], parsedProjectId[1]);
            branches.forEach(branch => {
                let parsedBranchId = utils.parseID(branch._id);
                if(!results.branches[parsedBranchId[0]+':'+parsedBranchId[1]]) {
                    results.branches[parsedBranchId[0]+':'+parsedBranchId[1]] = [];
                }
                results.branches[parsedBranchId[0]+':'+parsedBranchId[1]].push(branch);
            });
        }
    }
    return results;
}

/**
 * Removes all references of organizations, projects, branches, etc.
 * @param {Array} model array of elements for a given model
 */
function removeReferences(model) {
    // Looping through each element in the model
    for (let i = 0; i < model.length; i++) {
        model[i]._id = model[i]._id.split(':')[model[i]._id.split(':').length - 1]; // Removing the org, project, branch
        // parent property
        if (model[i].parent) {
            model[i].parent = model[i].parent.split(':')[model[i].parent.split(':').length - 1];
        }
        // source property
        if (model[i].source) {
            model[i].source = model[i].source.split(':')[model[i].source.split(':').length - 1];
        }
        // target property
        if (model[i].target) {
            model[i].target = model[i].target.split(':')[model[i].target.split(':').length - 1];
        }
        delete model[i].project;
        delete model[i].branch;
        delete model[i].createdBy;
        delete model[i].lastModifiedBy;
        delete model[i].updatedOn;
        delete model[i].archivedOn;
        delete model[i].archived;
    }
    return model;
}

// Export/expose the app
module.exports = app;
