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
 * @description Sets up eventlisteners for importing and exporting models
 * It also sends GET and POST requests to get and send data
 */

 'use strict';

// Name of the plugin
let pluginName = 'model-import-export';

// Declaring ui elements
let organizationsExportElement = document.getElementById('organizations-export');
let projectsExportElement = document.getElementById('projects-export');
let branchesExportElement = document.getElementById('branches-export');
let organizationsImportElement = document.getElementById('organizations-import');
let projectsImportElement = document.getElementById('projects-import');
let branchesImportElement = document.getElementById('branches-import');
let exportBtn = document.getElementById('exportBtn');
let importBtn = document.getElementById('importBtn');
let fileUploadElement = document.getElementById('selectFiles');

// Event listener for organizations-import select element
organizationsImportElement.addEventListener('change', (e) => {
    if (e.target.value !== 'Select Organization') {
        getProjects(e.target.value).then(projects => {
            // Cache of the template
            let template = document.getElementById('template-project-select-import');
            // Get the contents of the template
            let templateHtml = template.innerHTML;
            // Final HTML variable as empty string
            let listHtml = "";
            listHtml += '<option>Select Project</option>';
            // Loop through projects, replace placeholder tags with actual data, and generate final HTML
            for (var key in projects) {
                let parsedId = projects[key]["_id"].split(':');
                listHtml += templateHtml.replace(/{{project}}/g, parsedId[1]);
            }
            // Replace the HTML of #projects-export with final HTML and enable it
            document.getElementById("projects-import").innerHTML = listHtml;
            document.getElementById("projects-import").disabled = false;
        });
    }
});

// Event listener for organizations-export select element
organizationsExportElement.addEventListener('change', (e) => {
    if (e.target.value !== 'Select Organization') {
        getProjects(e.target.value).then(projects => {
            // Cache of the template
            let template = document.getElementById("template-project-select-export");
            // Get the contents of the template
            let templateHtml = template.innerHTML;
            // Final HTML variable as empty string
            let listHtml = "";
            listHtml += '<option>Select Project</option>';
            // Loop through projects, replace placeholder tags with actual data, and generate final HTML
            for (var key in projects) {
                let parsedId = projects[key]["_id"].split(':');
                listHtml += templateHtml.replace(/{{project}}/g, parsedId[1]);
            }
            // Replace the HTML of #projects-export with final HTML and enable it
            document.getElementById("projects-export").innerHTML = listHtml;
            document.getElementById("projects-export").disabled = false;
        });
    }
});

// Event listener for projects-import select element
projectsImportElement.addEventListener('change', (e) => {
    if (e.target.value !== 'Select Project') {
        getBranches(document.getElementById('organizations-import').value, e.target.value).then(branches => {
            // Cache of the template
            let template = document.getElementById("template-branch-select-import");
            // Get the contents of the template
            let templateHtml = template.innerHTML;
            // Final HTML variable as empty string
            let listHtml = "";
            listHtml += '<option>Select Branch</option>';
            // Loop through branches, replace placeholder tags with actual data, and generate final HTML
            for (var key in branches) {
                let parsedId = branches[key]["_id"].split(':');
                listHtml += templateHtml.replace(/{{branch}}/g, parsedId[2]);
            }
            // Replace the HTML of #branches-export with final HTML and enable it
            document.getElementById("branches-import").innerHTML = listHtml;
            document.getElementById("branches-import").disabled = false;
        });
    }
});

// Event listener for projects-export select element
projectsExportElement.addEventListener('change', (e) => {
    if (e.target.value !== 'Select Project') {
        getBranches(document.getElementById('organizations-export').value, e.target.value).then(branches => {
            // Cache of the template
            let template = document.getElementById("template-branch-select-export");
            // Get the contents of the template
            let templateHtml = template.innerHTML;
            // Final HTML variable as empty string
            let listHtml = "";
            listHtml += '<option>Select Branch</option>';
            // Loop through branches, replace placeholder tags with actual data, and generate final HTML
            for (var key in branches) {
                let parsedId = branches[key]["_id"].split(':');
                listHtml += templateHtml.replace(/{{branch}}/g, parsedId[2]);
            }
            // Replace the HTML of #branches-export with final HTML and enable it
            document.getElementById("branches-export").innerHTML = listHtml;
            document.getElementById("branches-export").disabled = false;
        });
    }
});

// Event listener for file upload element
fileUploadElement.addEventListener('change', (e) => {
    if (e.target.value) {
        organizationsImportElement.disabled = false;
    }
    else {
        organizationsImportElement.disabled = true;
    }
});

// Event listener for import button
branchesImportElement.addEventListener('change', (e) => {
    if (e.target.value !== 'Select Branch') {
        importBtn.disabled = false;
    }
});

// Event listener for import button
branchesExportElement.addEventListener('change', (e) => {
    if (e.target.value !== 'Select Branch') {
        exportBtn.disabled = false;
    }
});

// Event listener for export button
exportBtn.addEventListener('click', () => {
    let organization = document.getElementById('organizations-export').value;
    let project = document.getElementById('projects-export').value;
    let branch = document.getElementById('branches-export').value;

    if (organization !== 'Select Organization' && project !== 'Select Project' && branch !== 'Select Branch') {
        exportModel(organization, project, branch).then(exportedData => {
            // Start file download.
            download("model.json", JSON.stringify(exportedData));
        });
    }
    else {
        console.error('All inputs should be valid. Double check organization, project, and branch inputs are populated');
    }
});

// Event listener for import button
// Handles reading the file
importBtn.addEventListener('click', () => {
    let organization = document.getElementById('organizations-import').value;
    let project = document.getElementById('projects-import').value;
    let branch = document.getElementById('branches-import').value;
    let files = document.getElementById('selectFiles').files;

    if (organization !== 'Select Organization' && project !== 'Select Project' && branch !== 'Select Branch' && files) {
        if (files.length <= 0) {
            return false;
        }
        
        let fr = new FileReader();
        fr.onload = function(e) {
            let result = JSON.parse(e.target.result);
            importModel(result, organization, project, branch).then(response => {
                console.log(response);
            });
        }
        
        fr.readAsText(files.item(0));
    }
    else {
        console.error('All inputs should be valid. Double check organization, project, branch, and file inputs are populated');
    }
});

/**
 * Gets all the projects for a given organization
 * 
 * @param {String} organization name of the organization
 */
async function getProjects(organization) {
    const response = await fetch(`/plugins/${pluginName}/projects/organization/${organization}`, {method: 'POST'});
    return await response.json();
}

/**
 * Gets all the branches for a given organization and project
 * 
 * @param {String} organization name of the organization
 * @param {String} project name of the project
 */
async function getBranches(organization, project) {
    const response = await fetch(`/plugins/${pluginName}/branches/organization/${organization}/project/${project}`, {method: 'POST'});
    return await response.json();
}

 /**
 * Gets exported data for a project
 * 
 * @param {String} organization name of the organization
 * @param {String} project name of the project
 * * @param {String} branch name of the branch
 */
async function exportModel(organization, project, branch) {
    const response = await fetch(`/plugins/${pluginName}/export/organization/${organization}/project/${project}/branch/${branch}`, {method: 'POST'});
    return await response.json();
}


/**
 * Imports data into a project
 * 
 * @param {Object} data the data model the user wishes to update and or add.
 * @param {String} organization name of the organization
 * @param {String} project name of the project
 * @param {String} branch name of the branch
 * 
 */
async function importModel(data, organization, project, branch) {
    const response = await fetch(`/plugins/${pluginName}/import/organization/${organization}/project/${project}/branch/${branch}`, {method: 'POST', body: JSON.stringify({data})});
    return await response.json();
}

/**
 * Downloads the exported data to a json file on the clients machine
 * 
 * @param {Object} data the data model the user wishes to update and or add.
 * @param {String} organization name of the organization
 * @param {String} project name of the project
 * @param {String} branch name of the branch
 * 
 */
function download(filename, text) {
    let element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}
