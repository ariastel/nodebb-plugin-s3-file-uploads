"use strict";

var AWS = require("aws-sdk"),
	mime = require("mime"),
	uuid = require("uuid").v4,
	fs = require("fs"),
	path = require("path"),
	winston = require.main.require("winston"),
	meta = require.main.require("./src/meta");


/* Constants */
var constants = Object.freeze({
	name: 'S3 File Uploads',
	codename: 's3-file-uploads',
	admin: {
		route: `/plugins/s3-file-uploads`,
		icon: 'fa-envelope-o'
	}
});


// #region Plugin
var Plugin = {
	settings: {
		"accessKeyId": process.env.AWS_ACCESS_KEY_ID || undefined,
		"secretAccessKey": process.env.AWS_SECRET_ACCESS_KEY || undefined,
		"region": process.env.AWS_DEFAULT_REGION || "us-east-1",
		"bucket": process.env.S3_UPLOADS_BUCKET || undefined,
		"host": process.env.S3_UPLOADS_HOST || "s3.amazonaws.com",
		"path": process.env.S3_UPLOADS_PATH || undefined
	},
	s3conn: null
};

Plugin.init = function (data, callback) {

	function render(req, res) {
		console.log(`admin/plugins/${constants.codename}`);
		res.render(`admin/plugins/${constants.codename}`, {});
	}

	data.router.get(`/admin/plugins/${constants.codename}`, data.middleware.applyCSRF, data.middleware.admin.buildHeader, render);
	data.router.get(`/api/admin/plugins/${constants.codename}`, data.middleware.applyCSRF, render);

	loadSettings(callback);
}

Plugin.addAdminNavigation = function (custom_header, callback) {
	custom_header.plugins.push({
		"route": constants.admin.route,
		"icon": constants.admin.icon,
		"name": constants.name
	});

	callback(null, custom_header);
};

Plugin.activate = function (data) {
	if (data.id === `nodebb-plugin-${constants.codename}`) {
		fetchSettings();
	}
};

Plugin.deactivate = function (data) {
	if (data.id === `nodebb-plugin-${constants.codename}`) {
		Plugin.s3conn = null;
	}
};

Plugin.uploadImage = function (data, callback) {

	var image = data.image;
	if (!image) {
		winston.error("Invalid image");
		return callback(new Error("Invalid image"));
	}

	checkMaximumSize(image.size);

	var type = image.url ? "url" : "file";
	var path = type === "file" ? image.path : image.url;
	var allowedMimeTypes = ['image/png', 'image/jpeg', 'image/gif'];

	if (!path) {
		return callback(new Error("Invalid image path"));
	}

	if (allowedMimeTypes.indexOf(mime.getType(path)) === -1) {
		return callback(new Error("Invalid mime type"));
	}

	fs.readFile(path, function (err, buffer) {
		uploadToS3(image.name, err, buffer, callback);
	});
};

Plugin.uploadFile = function (data, callback) {

	var file = data.file;

	if (!file) {
		return callback(new Error("Invalid file"));
	}

	if (!file.path) {
		return callback(new Error("Invalid file path"));
	}

	checkMaximumSize(file.size);

	fs.readFile(file.path, function (err, buffer) {
		uploadToS3(file.name, err, buffer, callback);
	});
};
// #endregion Plugin

// #region Plugin Utils
function checkMaximumSize(size) {
	if (size > parseInt(meta.config.maximumFileSize, 10) * 1024) {
		winston.error("error:file-too-big, " + meta.config.maximumFileSize);
		return callback(new Error("[[error:file-too-big, " + meta.config.maximumFileSize + "]]"));
	}
}

function loadSettings(callback) {
	meta.settings.get(constants.codename, function (err, loadedSettings) {
		if (err) {
			return callback(makeError(err));
		}

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

		console.log(Plugin.settings);

		callback();
	});
}

function S3() {
	if (!Plugin.s3conn) {
		Plugin.s3conn = new AWS.S3();
	}

	return Plugin.s3conn;
}

function makeError(err) {
	if (err instanceof Error) {
		err.message = constants.codename + " :: " + err.message;
	} else {
		err = new Error(constants.codename + " :: " + err);
	}

	winston.error(err.message);
	return err;
}

function uploadToS3(filename, err, buffer, callback) {
	if (err) {
		return callback(makeError(err));
	}

	var settings = Plugin.settings;

	var s3Path;
	if (settings.path && settings.path.length > 0) {
		s3Path = settings.path;

		if (!s3Path.match(/\/$/)) {
			// Add trailing slash
			s3Path = s3Path + "/";
		}
	} else {
		s3Path = "/";
	}

	var s3KeyPath = s3Path.replace(/^\//, ""); // S3 Key Path should not start with slash.

	var params = {
		Bucket: settings.bucket,
		ACL: "public-read",
		Key: s3KeyPath + uuid() + path.extname(filename),
		Body: buffer,
		ContentLength: buffer.length,
		ContentType: mime.getType(filename)
	};

	S3().putObject(params, function (err) {
		if (err) {
			return callback(makeError(err));
		}

		// amazon has https enabled, we use it by default
		var host = "https://" + params.Bucket + ".s3.amazonaws.com";
		if (settings.host && settings.host.length > 0) {
			host = settings.host;
			// host must start with http or https
			if (!host.startsWith("http")) {
				host = "http://" + host;
			}
		}

		callback(null, {
			name: filename,
			url: host + "/" + params.Key
		});
	});
}
// #endregion Plugin Utils

module.exports = Plugin;
