"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGetServerInfo = handleGetServerInfo;
exports.handleListCustomCollections = handleListCustomCollections;
exports.handleListUsers = handleListUsers;
exports.handleListWorkflows = handleListWorkflows;
const query_1 = require("../query");
async function handleGetServerInfo(baseUrl, token) {
    const apiOptions = {
        node: this,
        baseUrl,
        token,
        resource: 'collection',
        collectionOperation: 'getServerInfo',
    };
    return (0, query_1.executeNocoBaseApi)(apiOptions);
}
async function handleListCustomCollections(baseUrl, token) {
    const apiOptions = {
        node: this,
        baseUrl,
        token,
        resource: 'collection',
        collectionOperation: 'listCustom',
    };
    return (0, query_1.executeNocoBaseApi)(apiOptions);
}
async function handleListUsers(baseUrl, token) {
    const apiOptions = {
        node: this,
        baseUrl,
        token,
        resource: 'collection',
        collectionOperation: 'listUsers',
    };
    return (0, query_1.executeNocoBaseApi)(apiOptions);
}
async function handleListWorkflows(baseUrl, token) {
    const apiOptions = {
        node: this,
        baseUrl,
        token,
        resource: 'collection',
        collectionOperation: 'listWorkflows',
    };
    return (0, query_1.executeNocoBaseApi)(apiOptions);
}
