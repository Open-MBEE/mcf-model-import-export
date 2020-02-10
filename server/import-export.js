'use strict';

const elementController = M.require('controllers.element-controller');
const getPublicData = M.require('lib.get-public-data');
const log = M.require('lib.logger');
const logger = log.makeLogger('start'); // Creating a logger
const errors = M.require('lib.errors');

// Export/Exposing functions
module.exports = {
    importModel,
    exportModel
};

/**
 * Imports the data into the database
 * @param {Object} user request user object
 * @param {Array} data array of element objects
 * @param {String} organization name of the organization
 * @param {String} project name of the project
 * @param {String} branch name of the branch
 * @returns {Boolean}
 */
async function importModel(user, data, organization, project, branch) {
    try {
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
                let element = await elementController.search(user, organization, project, branch, nameSpacedElementID).catch((err) => logger.error(err));

                if (data[i].id === 'holding_bin') {
                    element = await elementController.search(user, organization, project, branch, 'holding bin').catch((err) => logger.error(err));
                }

                let changed = isEquivalent(data[i], element[0]);

                if (data[i].id === 'model') {
                    // Cannot change parent
                    delete data[i].parent;
                }
                
                if (changed.hasChanged) {
                    logger.info('Updating '+nameSpacedElementID);
                    await elementController.update(user, organization, project, branch, data[i]).catch((err) => logger.error(err));
                }
            }
            else {
                // Checking to see if the element exists
                // If not, create a new element
                let found = await elementController.find(user, organization, project, branch, data[i].id).catch((err) => logger.error(err));
                if (found.length !== 0) {
                    let nameSpacedElementID = `${organization}:${project}:${branch}:${data[i].id}`;
                    logger.info('Updating '+nameSpacedElementID);
                    await elementController.update(user, organization, project, branch, data[i]).catch((err) => logger.error(err));;
                }
                else {
                    // Creating new element
                    logger.info('Creating new element');
                    await elementController.create(user, organization, project, branch, data[i]).catch((err) => logger.error(err));
                }
            }
        }

        logger.info('Import Complete');
        return await exportModel(user, organization, project, branch).catch((err) => logger.error(err));
    }
    catch (error) {
        throw errors.captureError(error);
    }
}

/**
 * Gets all elements for a given organization, project, and branch
 * @param {Object} user request user object
 * @param {String} organization name of the organization
 * @param {String} project name of the project
 * @param {String} branch name of the branch
 * @returns {Promise<Array>} Array of objects
 */
async function exportModel(user, organization, project, branch) {
    try {
        let elements = await elementController.find(user, organization, project, branch).catch((err) => logger.error(err));
        let updatedModel = removeReferences(elements);
        return updatedModel;
    }
    catch (error) {
        throw errors.captureError(error);
    }
}

/**
 * Removes all references of organizations, projects, and branches
 * by getting public data of the element
 * @param {Array} elements array of elements
 * @returns {Promise<Array>} Array of objects
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
 * Checks to see if both objects are equivalent
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
