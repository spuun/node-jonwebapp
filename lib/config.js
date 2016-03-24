module.exports = {
	httpPort: 1080,
	seaportPort: 25000,
	user: 'www-data',
	group: 'www-data',
	approute: req => { return (req.headers.host || '').toLowerCase().replace(/\.[a-z]+\.[a-z]{2,}(:\d+)?$/, '') }
};
