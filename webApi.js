// Simple express aplication for web based functionality
'use strict';

const
    path = require('path'),
    express = require('express'),
    app = express(),
    http = require('http').Server(app),

    port = process.env.PORT || 3004,
    host = '127.0.0.1',

    api = require('./api.js')();

app.use('/api', api);

http.listen(port, host, () => console.log(`Server on ${host}:${port}`));
