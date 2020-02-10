'use strict';

const chai = require('chai');
const request = require('request');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
const test = M.config.test;
const branchController = M.require('controllers.branch-controller');
const utils = M.require('lib.utils');
const url = `${test.url}/plugins/model-import-export`;
let testOrg = null;
let adminUser = null;
let testProject = null;
let testBranches = null;
let projID = null;
let exportedData = null;

describe(M.getModuleName(module.filename), () => {
    /**
   * Before: Create admin, organization, and project.
   */
  before(async () => {
    try {
      // Create test admin
      adminUser = await testUtils.createTestAdmin();
      // Create test org
      testOrg = await testUtils.createTestOrg(adminUser);
      // Create test project
      testProject = await testUtils.createTestProject(adminUser, testOrg._id);
      projID = utils.parseID(testProject._id).pop();

      const branchDataObjects = [
        testData.branches[2],
        testData.branches[3],
        testData.branches[4],
        testData.branches[5],
        testData.branches[6]
      ];
    
      // Create branches via controller
      testBranches = await branchController.create(adminUser, testOrg._id, projID, branchDataObjects);
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error.message).to.equal(null);
    }
  });

  /**
   * After: Delete organization and admin user.
   */
  after(async () => {
    try {
      // Delete organization
      await testUtils.removeTestOrg();
      // Delete admin user
      await testUtils.removeTestAdmin();
      
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  }); 

  /* Execute the tests */
  it('should GET ALL ORGANIZATIONS of a user', getOrganizations);
  it('should GET ALL PROJECTS of a organizations', getProjects);
  it('should GET ALL BRANCHES in a project', getBranches);
  it('should EXPORT a model', exportModel);
  it('should IMPORT a model', importModel);
});

/**
 * @description Verifies GET
 * /organizations
 * @param {Function} done - The mocha callback.
 */
function getOrganizations(done) {
  request({
    // url: `${test.url}/organizations`,
    url: `${url}/organizations`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'GET'
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Parse body
    const foundOrgs = JSON.parse(body);
    // Verify there are orgs
    chai.expect(foundOrgs.length).not.equal(0);
    // Find Test Organization
    const foundTestOrg = foundOrgs.find(organization => organization._id === testOrg._id);
    // Verify org created properly
    chai.expect(foundTestOrg._id).to.equal(testOrg._id);
    chai.expect(foundTestOrg.name).to.equal(testOrg.name);
    chai.expect(foundTestOrg.permissions[adminUser._id]).to.contain('admin');
    chai.expect(foundTestOrg.archived).to.equal(false);
    done();
  });
}

/**
 * @description Verifies POST
 * /projects
 * @param {Function} done - The mocha callback.
 */
function getProjects(done) {
  request({
    url: `${url}/projects/organization/${testOrg._id}`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'POST'
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const foundProjects = JSON.parse(body);
    chai.expect(foundProjects.length).to.not.equal(0);

    // Find Test Project
    const foundTestProj = foundProjects.find(project => project._id === testProject._id);
    // Verify project created properly
    chai.expect(foundTestProj._id).to.equal(testProject._id);
    chai.expect(foundTestProj.name).to.equal(testProject.name);
    chai.expect(foundTestProj.permissions[adminUser._id]).to.contain('admin');
    chai.expect(foundTestProj.archived).to.equal(false);
    chai.expect(foundTestProj.visibility).to.equal('private');
    done();
  });
}

/**
 * @description Verifies POST
 * /branches
 * @param {Function} done - The mocha callback.
 */
function getBranches(done) {
  let parsedProjectId = utils.parseID(testProject._id);
  request({
    url: `${url}/branches/organization/${testOrg._id}/project/${parsedProjectId[parsedProjectId.length - 1]}`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'POST'
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    testBranches.forEach((branchObj) => {
      // Find Branch
      const foundBranch = testBranches.find(branch => branch._id === branchObj._id);
      // Verify branches created properly
      chai.expect(foundBranch._id).to.equal(branchObj._id);
      chai.expect(foundBranch.name).to.equal(branchObj.name);
      chai.expect(foundBranch.custom || {}).to.deep.equal(branchObj.custom);
      chai.expect(foundBranch.project).to.equal(testProject._id);

      // Verify additional properties
      chai.expect(foundBranch.createdBy).to.equal(adminUser._id);
      chai.expect(foundBranch.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(foundBranch.archivedBy).to.equal(null);
      chai.expect(foundBranch.createdOn).to.not.equal(null);
      chai.expect(foundBranch.updatedOn).to.not.equal(null);
      chai.expect(foundBranch.archivedOn).to.equal(null);
    });
    done();
  });
}

/**
 * @description Verifies POST
 * /export
 * @param {Function} done - The mocha callback.
 */
function exportModel(done) {
  let parsedBranchId = utils.parseID(testBranches[0]._id);
  let parsedProjectId = utils.parseID(testProject._id);
  let projectId = parsedProjectId[parsedProjectId.length - 1];
  let branchId = parsedBranchId[parsedBranchId.length - 1];
  
  request({
    url: `${url}/export/organization/${testOrg._id}/project/${projectId}/branch/${branchId}`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'POST'
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    exportedData = JSON.parse(body);
    chai.expect(exportedData.length).to.not.equal(0);

    exportedData.forEach(element => {
      chai.expect(element.id).to.exist;
      chai.expect(element.name).to.exist;
      chai.expect(element.custom || {}).to.exist;
      chai.expect(element.project).to.exist;
      chai.expect(element.createdBy).to.equal(adminUser._id);
      chai.expect(element.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(element.createdOn).to.not.equal(null);
      chai.expect(element.updatedOn).to.not.equal(null);

      // Verifying that the org, project, and branches is not referenced in the id
      chai.expect(element.id).to.not.contain(':');
    });
    done();
  });
}

/**
 * @description Verifies POST
 * /import
 * @param {Function} done - The mocha callback.
 */
function importModel(done) {
  let parsedBranchId = utils.parseID(testBranches[0]._id);
  let parsedProjectId = utils.parseID(testProject._id);
  let projectId = parsedProjectId[parsedProjectId.length - 1];
  let branchId = parsedBranchId[parsedBranchId.length - 1];

  // Updating the each elements name
  exportedData.forEach(element => {
    element.name = 'Testing 123!';
  });

  // Creating a new element
  let newElement = {
    id: '9bdc88c9-ecaf-a33a-50df-7c9fd51e0be9404f',
    name:'Testing 123!',
    branch:branchId,
    project:projectId,
    org:testOrg._id,
    parent:null,
    type:'',
    documentation:'',
    custom:{},
    contains:[],
    sourceOf:[],
    targetOf:[]
  };

  // Adding the new element to the arrays of element being updated
  exportedData.push(newElement);

  request({
    url: `${url}/import/organization/${testOrg._id}/project/${projectId}/branch/${branchId}`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'POST',
    body: JSON.stringify({
      type: 'test',
      data: {data: exportedData}
    })
  },
  async (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);
    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const bodyResponse = JSON.parse(body);
    chai.expect(bodyResponse.length).to.not.equal(0);

    bodyResponse.forEach(element => {
      // Verify each element was updated
      chai.expect(element.name).to.equal('Testing 123!');
    });

    // Verifying the new element was created
    const foundElement = exportedData.find(element => element.id === newElement.id);
    chai.expect(foundElement.id).to.equal(newElement.id);
    done();
  });
}
