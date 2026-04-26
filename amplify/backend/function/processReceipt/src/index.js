/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	STORAGE_DATA_BUCKETNAME
Amplify Params - DO NOT EDIT */

// Re-export the handler directly from app.js
// (app.js is now a standalone Lambda handler, not an Express app)
exports.handler = require('./app').handler;
