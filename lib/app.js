var express = require('express');
var seaport = require('seaport');

module.exports = (serviceName, config) => {
	config = Object.assign(require('./config'), config);

	var ports = seaport.connect('localhost', config.seaportPort);

	var app = express();
	var port = ports.register(serviceName + '@1.0.0');
	app.listen(port);

	console.log(serviceName + ' listening on port ' + port);
	return app;
};
