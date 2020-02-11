/**
 * @classification UNCLASSIFIED
 *
 * @module import-export
 *
 * @copyright Copyright (C) 2020, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Donte McDaniel
 *
 * @author Donte McDaniel
 *
 * @description Contains the logic to import and export an elements
 */

'use strict';

const elementController = M.require('controllers.element-controller');
const getPublicData = M.require('lib.get-public-data');
const errors = M.require('lib.errors');
const utils = M.require('lib.utils');

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
        // Getting all Ids for each element in the data array
        let elementsToCreate = [];
        let elementsToUpdate = [];
        let elementsToIndividuallyUpdate = [];
        let elementIDs = data.map(e => e.id);
        let foundElements = await elementController.find(user, organization, project, branch, elementIDs);

        data.forEach(element => {
            // Delete all imported properties that cannot be changed
            delete element.branch;
            delete element.org;
            delete element.project;
            delete element.createdOn;
            delete element.createdBy;
            delete element.updatedOn;
            delete element.lastModifiedBy;
            delete element.contains;
            delete element.sourceOf;
            delete element.targetOf;

            let nameSpacedElementID = utils.createID(`${organization}:${project}:${branch}:${element.id}`);
            let foundElem = foundElements.find(e => e._id === nameSpacedElementID);
            if (foundElem) {
                let changed = isEquivalent(element, foundElem);
                if (changed.hasChanged) {
                    M.log.info('Updating '+nameSpacedElementID);
                    if (changed.properties.includes('parent')) {
                        // Update one at a time
                        elementsToIndividuallyUpdate.push(elementController.update(user, organization, project, branch, element));
                    }
                    else {
                        delete element.parent;
                        elementsToUpdate.push(element);
                    }
                }
            }
            else {
                M.log.info('Creating new element');
                elementsToCreate.push(element);
            }
        });

        if (elementsToIndividuallyUpdate.length > 0) {
            await Promise.all(elementsToIndividuallyUpdate);
        }
        if (elementsToUpdate.length > 0) {
            await elementController.update(user, organization, project, branch, elementsToUpdate);
        }
        if (elementsToCreate.length > 0) {
            await elementController.create(user, organization, project, branch, elementsToCreate);
        }

        M.log.info('Import Complete');
        // Ecporting the data and returning it
        return await exportModel(user, organization, project, branch).catch((err) => M.log.error(err));
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
        let elements = await elementController.find(user, organization, project, branch).catch((err) => M.log.error(err));
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

    M.log.info('organization, project, and branch references REMOVED!');
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
