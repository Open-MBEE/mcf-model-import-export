'use strict';

const url = '/plugins/model-export/getAllData';

// Send API call to get initial organization and project data
fetch(url)
.then(data => { return data.json()})
.then(res => { populateData(res) })
.catch(error => handleError(error));

/**
 * Populate entries with data provided
 * @param {Object} data 
 */
function populateData(data) {
    console.log(data);
}

/**
 * Handle all errors
 * Populate error div
 * @param {Error} error 
 */
function handleError(error) {
    console.error(error);
    document.getElementById('error-element').innerHTML = error;
}
