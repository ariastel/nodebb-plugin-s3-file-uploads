"use strict";

const AWS = require("aws-sdk");
const mime = require("mime");
const uuid = require("uuid").v4;
const fs = require("fs");
const path = require("path");
const winston = require.main.require("winston");
const meta = require.main.require("./src/meta");


/* Constants */
const constants = Object.freeze({
	name: 'S3 File Uploads',
	codename: 's3-file-uploads',
	admin: {
		route: `/plugins/s3-file-uploads`,
		icon: 'fa-envelope-o'
	}
});


// #region Plugin
const Plugin = {
	settings: {
		"accessKeyId": process.env.AWS_ACCESS_KEY_ID || undefined,
		"secretAccessKey": process.env.AWS_SECRET_ACCESS_KEY || undefined,
		"region": process.env.AWS_DEFAULT_REGION || "us-east-1",
		"bucket": process.env.S3_UPLOADS_BUCKET || undefined,
		"host": process.env.S3_UPLOADS_HOST || "s3.amazonaws.com",
		"path": process.env.S3_UPLOADS_PATH || "/"
	},
	s3conn: null
};

Plugin.init = async function (data) {

	function render(req, res) {
		res.render(`admin/plugins/${constants.codename}`, {});
	}

	data.router.get(`/admin/plugins/${constants.codename}`, data.middleware.applyCSRF, data.middleware.admin.buildHeader, render);
	data.router.get(`/api/admin/plugins/${constants.codename}`, data.middleware.applyCSRF, render);

	await loadSettings();
	return;
};

Plugin.addAdminNavigation = async function (custom_header) {
	custom_header.plugins.push({
		"route": constants.admin.route,
		"icon": constants.admin.icon,
		"name": constants.name
	});
	return custom_header;
};

Plugin.activate = function (data) {
	if (data.id === `nodebb-plugin-${constants.codename}`) {
		loadSettings();
	}
};

Plugin.deactivate = function (data) {
	if (data.id === `nodebb-plugin-${constants.codename}`) {
		Plugin.s3conn = null;
	}
};

Plugin.uploadImage = async function (data) {

	try {
		const image = data.image;
		if (!image) {
			throw new Error("[[error:invalid-image]]");
		}

		checkMaximumSize(image.size);
		const path = getImagePath(image);
		checkImageMimeType(path);

		const buffer = await fs.promises.readFile(path);
		return await uploadToS3(image.name, buffer, data.uid);
	} catch (e) {
		throw makeError(e);
	}
};

Plugin.uploadFile = async function (data) {

	try {
		const file = data.file;
		if (!file) {
			throw new Error("[[error:invalid-file]]");
		}

		checkMaximumSize(file.size);
		const path = getFilePath(file);

		const buffer = await fs.promises.readFile(path);
		return await uploadToS3(file.name, buffer, data.uid);
	} catch (e) {
		throw makeError(e);
	}
};
// #endregion Plugin

// #region Plugin Utils
function checkMaximumSize(size) {
	if (size > parseInt(meta.config.maximumFileSize, 10) * 1024) {
		throw new Error(`[[error:file-too-big, "${meta.config.maximumFileSize}"]]`);
	}
}
function getImagePath(image) {
	const path = image.url ? image.url : image.path;
	if (!path) {
		throw new Error("[[error:invalid-image]]");
	}
	return path;
}
function getFilePath(file) {
	if (!file.path) {
		throw new Error("[[error:invalid-file]]");
	}
	return file.path;
}
function checkImageMimeType(path) {
	const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/pjpeg', 'image/jpg', 'image/gif', 'image/svg+xml'];
	if (allowedMimeTypes.indexOf(mime.getType(path)) === -1) {
		throw new Error("[[error:invalid-image-extension]]");
	}
}

async function loadSettings() {

	try {
		const loadedSettings = await meta.settings.get(constants.codename);

		if (loadedSettings.accessKeyId) {
			Plugin.settings.accessKeyId = loadedSettings.accessKeyId;
		}
		if (loadedSettings.secretAccessKey) {
			Plugin.settings.secretAccessKey = loadedSettings.secretAccessKey;
		}

		Plugin.settings.bucket = loadedSettings.bucket || process.env.S3_UPLOADS_BUCKET || "";
		Plugin.settings.host = loadedSettings.host || process.env.S3_UPLOADS_HOST || "";
		Plugin.settings.path = loadedSettings.path || process.env.S3_UPLOADS_PATH || "";
		Plugin.settings.region = loadedSettings.region || process.env.AWS_DEFAULT_REGION || "";

		if (Plugin.settings.accessKeyId && Plugin.settings.secretAccessKey) {
			AWS.config.update({
				accessKeyId: Plugin.settings.accessKeyId,
				secretAccessKey: Plugin.settings.secretAccessKey
			});
		}

		if (Plugin.settings.region) {
			AWS.config.update({
				region: Plugin.settings.region
			});
		}
	} catch (e) {
		throw makeError(e);
	}
}

/**
 * @returns {AWS.S3}
 */
function S3() {
	if (!Plugin.s3conn) {
		Plugin.s3conn = new AWS.S3();
	}
	return Plugin.s3conn;
}

/**
 * @param {Error | string} err
 * @returns {Error}
 */
function makeError(err) {
	if (err instanceof Error) {
		err.message = `[[s3-uploads:upload-error, ${err.message}]]`;
	} else {
		err = new Error(`[[s3-uploads:upload-error, ${err.message}]]`);
	}
	winston.error(`[nodebb-plugin-s3-uploads] ${err.message}`);
	return err;
}

/**
 * @param {string} path
 * @returns {string}
 */
function getS3KeyPath(path) {

	let s3Path;
	if (path && path.length > 0) {
		s3Path = path;

		if (!s3Path.match(/\/$/)) {
			// Add trailing slash
			s3Path = s3Path + "/";
		}
	} else {
		s3Path = "/";
	}

	return s3Path.replace(/^\//, ""); // S3 Key Path should not start with slash.
}

async function uploadToS3(filename, buffer, uid) {

	const settings = Plugin.settings;
	const s3KeyPath = getS3KeyPath(settings.path)

	/** @type {AWS.S3.PutObjectRequest} */
	const params = {
		Metadata: {
			'nodebb-uid': String(uid)
		},
		Bucket: settings.bucket,
		ACL: "public-read",
		Key: s3KeyPath + uuid() + path.extname(filename),
		Body: buffer,
		ContentLength: buffer.length,
		ContentType: `${mime.getType(filename)}; charset=utf-8`
	};

	try {
		await S3().putObject(params).promise();

		// amazon has https enabled, we use it by default
		let host = "https://" + params.Bucket + ".s3.amazonaws.com";
		if (settings.host && settings.host.length > 0) {
			host = settings.host;
			// host must start with http or https
			if (!host.startsWith("http")) {
				host = "http://" + host;
			}
		}

		return {
			name: filename,
			url: host + "/" + params.Key
		};
	} catch (e) {
		throw makeError(e);
	}
}
// #endregion Plugin Utils

module.exports = Plugin;
