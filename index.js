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
const getPublicData = M.require('lib.get-public-data');
const log = M.require('lib.logger');

// Creating a logger
const logger = log.makeLogger('start');

// Initializing Globals
let orgs;
let projects;
let branches;

app.use(expressLayouts);
app.set('views', __dirname + '/views')
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));

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
    let elements = await elementController.find(req.user, body.organization, body.project, body.branch);
    let updatedModel = removeReferences(elements);
    res.send(updatedModel);
});

// POST route for import
app.post('/import', authenticate, async (req, res) => {
    let body = JSON.parse(req.body);
    importData(req.user, body.data, body.organization, body.project, body.branch);
    res.send({'status': 'complete'});
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
 * Imports the data into the database
 * @param {Array} data array of element objects
 * @param {String} organization name of the organization
 * @param {String} project name of the project
 * @param {String} branch name of the branch
 */
async function importData(user, data, organization, project, branch) {
    // Looping through each element in the imported data array
    for (let i = 0; i < data.length; i++) {

        // Delete all imported properties that cannot be changed
        delete data[i].branch;
        delete data[i].org;
        delete data[i].project;
        delete data[i].createdOn;
        delete data[i].createdBy;
        delete data[i].updatedOn;
        delete data[i].lastModifiedBy;
        delete data[i].contains;
        delete data[i].sourceOf;
        delete data[i].targetOf;

        if (data[i].id === 'model' || data[i].id === '__mbee__' || data[i].id === 'undefined' || data[i].id === 'holding_bin') {
            let nameSpacedElementID = `${organization}:${project}:${branch}:${data[i].id}`;
            let element = await elementController.search(user, organization, project, branch, nameSpacedElementID);

            if (data[i].id === 'holding_bin') {
                element = await elementController.search(user, organization, project, branch, 'holding bin');
            }

            let changed = isEquivalent(data[i], element[0]);

            if (data[i].id === 'model') {
                // Cannot change parent
                delete data[i].parent;
            }
            
            if (changed.hasChanged) {
                logger.info('Updating '+nameSpacedElementID);
                elementController.update(user, organization, project, branch, data[i]);
            }
        }
        else {
            // Checking to see if the element exists
            // If not, create a new element
            let found = await elementController.find(user, organization, project, branch, data[i].id);
            if (found.length !== 0) {
                let nameSpacedElementID = `${organization}:${project}:${branch}:${data[i].id}`;
                logger.info('Updating '+nameSpacedElementID);
                elementController.update(user, organization, project, branch, data[i]);
            }
            else {
                // Creating new element
                logger.info('Creating new element');
                elementController.create(user, organization, project, branch, data[i]);
            }
        }
    }

    logger.info('Import Complete');
    return true;
}

/**
 * Removes all references of organizations, projects, branches, etc.
 * by getting public data of the element
 * @param {Array} elements array of elements
 */
function removeReferences(elements) {
    let parsedElements = [];

    // Looping through each element and getting the public data
    for (let i = 0; i < elements.length; i++) {
        let parsedElement = getPublicData.getPublicData(elements[i], 'element');
        parsedElements.push(parsedElement);
    }

    logger.info('organization, project, and branch references REMOVED!');
    return parsedElements;
}

/**
 * Checks to see if object is equivalent
 * @param {Object} a 
 * @param {Object} b
 * @returns {Object} 
 * object.hasChanged is of type Boolean.
 * object.propNames is of type Array. The name of the properties that have changed
 */
function isEquivalent(a, b) {
    // Create arrays of property names
    var aProps = Object.getOwnPropertyNames(a);
    let changedProperties = [];
    let hasChanged = false;

    for (var i = 0; i < aProps.length; i++) {
        var propName = aProps[i];

        // If values of same property are not equal, objects are not equivalent
        if (a[propName] !== b[propName]) {
            changedProperties.push(propName);
            hasChanged = true;
        }
    }

    return {hasChanged, 'properties': changedProperties};
}

// Export/expose the app
module.exports = app;
