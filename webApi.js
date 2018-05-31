// Simple express aplication for web based functionality
'use strict';

const
    path = require('path'),
    express = require('express'),
    app = express(),
    http = require('http').Server(app),

    port = process.env.PORT || 3004,
    host = '127.0.0.1',

    trophy = require('./trophy.js');


app.get('/trophies/:username', (req, res) =>
    trophy.getAll(req.params.username)
        .then(trophyData => {
            if (req.query.groupByGame === 'true') trophyData.trophies = trophy.groupByGame(trophyData.trophies);
            return trophyData;
        })
        .then(data => res.end(JSON.stringify(data, null, 4)))
        .catch(err => res.end(JSON.stringify({
            error: {name:err.name, message: err.message}
        }, null, 4)))
);

app.get('/trophies/:username/:page', (req, res) =>
    trophy.getPage(req.params.username, req.params.page)
        .then(data => res.end(JSON.stringify(data, null, 4)))
        .catch(err => res.end(JSON.stringify({
            error: {name:err.name, message: err.message}
        }, null, 4)))
);

app.get('/summary/:username',(req, res) =>
    trophy.getSummary(req.params.username)
        .then(data => res.end(JSON.stringify(data, null, 4)))
        .catch(err => res.end(JSON.stringify({
            error: {name:err.name, message: err.message}
        }, null, 4)))
);

http.listen(port, host, () => console.log(`Server on ${host}:${port}`));
