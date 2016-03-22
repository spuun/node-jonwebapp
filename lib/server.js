var EventEmitter = require('events');
var seaport = require('seaport');
var bouncy = require('bouncy');
var util = require('util');

var errorcodes = {
	ROOT_REQUIRED: 1,
  LISTEN_FAILED: 2,
	DROP_PRIVILEGES_FAILED: 3
};
var errormessages = {
	1: 'Must be run as root to listen to port < 1024',
	2: 'Failed to listen to port %s',
	3: 'Failed to drop privileges'
};

var createServer= function(config) {
	config = Object.assign(require('./config'), config);

	var server = new EventEmitter();	
	var ilog = (msg) => setImmediate(log, msg);
	var log = (msg) => server.emit('log', msg);	
	var error = (code, params) => {
		if (typeof params == 'undefined') { params = []; }
		if (params.constructor != Array) { params = [params]; }
		params.unshift(errormessages[code]);
		console.error(util.format.apply({}, params));
		process.exit(code);
	};
	if (config.httpPort < 1024 && process.geteuid() != 0) {
		error(errorcodes.ROOT_REQUIRED);
	}

	var seaportServer = seaport.createServer();
	seaportServer.listen(config.seaportPort);

	seaportServer.on('register', (service) => {
		log(`Service ${service.role} registered`);
		server.emit('register',service.role);
	});

	var bouncyServer = bouncy(function(req, res, bounce) {
		var reqService = (req.headers.host || '').toLowerCase().replace(/\.[a-z]+\.[a-z]{2,}(:\d+)?$/, '');
		server.emit('request', reqService);
		var services = seaportServer.query(reqService);
		if (services.length == 0) {
			log(`Request for unknown service: ${reqService}`);
			res.statusCode = 404;
			res.end('Requested service not found\n');
		} else {
			log(`Request to service ${reqService}`);
			var service = services[Math.floor(Math.random()*services.length)];
			bounce(service, { 
					headers: {
						'X-Remote-Address': req.socket.remoteAddress
					}
				});
		}
	}).listen(config.httpPort);
	if (bouncyServer.listening) {
		ilog(`Listening for connections on port ${config.httpPort}`);
		if (config.httpPort < 1024) {
			try {
				process.setgid(config.group);
				process.setuid(config.user);
				ilog(`Running as ${config.user}`);
			}	catch (err) {
				error(errocodes.DROP_PRIVILEGES_FAILED);
			}
		}
	} else {
		error(errorcodes.LISTEN_FAILED, config.httpPort);
	}
	return server;
};

module.exports = createServer;
