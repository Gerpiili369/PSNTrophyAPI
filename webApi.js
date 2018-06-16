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

app.get('/games/:username', (req, res) =>
    trophy.getAll(req.params.username)
        .then(trophyData => trophy.objectByGame(trophyData.trophyList))
        .then(data => res.end(JSON.stringify(data, null, 4)))
        .catch(err => res.end(JSON.stringify({
            error: {name: err.name, message: err.message}
        }, null, 4)))
);

app.get('/trophies/:username', (req, res) =>
    trophy.getAll(req.params.username)
        .then(trophyData => {
            if (req.query.groupByDate) trophyData.trophyList = trophy.groupByDate( trophyData.trophyList, req.query.groupByDate);
            return trophyData;
        })
        .then(trophyData => {
            if (req.query.groupByGame == 'true') {
                if (req.query.groupByDate) for (const date in trophyData.trophyList) trophyData.trophyList[date].list = trophy.groupByGame(trophyData.trophyList[date].list);
                else trophyData.trophyList = trophy.groupByGame(trophyData.trophyList);
            }
            return trophyData;
        })
        .then(data => res.end(JSON.stringify(data, null, 4)))
        .catch(err => res.end(JSON.stringify({
            error: {name: err.name, message: err.message}
        }, null, 4)))
);

app.get('/trophies/:username/:page', (req, res) =>
    trophy.getPage(req.params.username, {page: req.params.page})
        .then(list =>
            req.query.groupByDate ? trophy.groupByDate(list, req.query.groupByDate) : list
        )
        .then(list => {
            if (req.query.groupByGame == 'true') {
                if (req.query.groupByDate) for (const date in list) list[date].list = trophy.groupByGame(list[date].list);
                else return trophy.groupByGame(list);
            }
            return list;
        })
        .then(data => res.end(JSON.stringify(data, null, 4)))
        .catch(err => res.end(JSON.stringify({
            error: {name: err.name, message: err.message}
        }, null, 4)))
);

app.get('/summary/:username',(req, res) =>
    trophy.getSummary(req.params.username)
        .then(data => res.end(JSON.stringify(data, null, 4)))
        .catch(err => res.end(JSON.stringify({
            error: {name: err.name, message: err.message}
        }, null, 4)))
);

app.get('/update/:username',(req, res) =>
    trophy.update(req.params.username)
        .then(data => res.end(JSON.stringify(data, null, 4)))
        .catch(err => res.end(JSON.stringify({
            error: {name: err.name, message: err.message}
        }, null, 4)))
);

http.listen(port, host, () => console.log(`Server on ${host}:${port}`));
