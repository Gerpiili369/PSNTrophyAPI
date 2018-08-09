'use strict';

const
    path = require('path'),
    express = require('express'),
    routes = express.Router(),

    trophy = require('./trophy.js');

module.exports = () => {
    routes.use((req, res, next) => {
        res.append('Access-Control-Allow-Origin', ['*']);
        next();
    });

    routes.get('/games/:username', (req, res) =>
        trophy.getGames(req.params.username)
            .then(data => res.end(JSON.stringify(data, null, 4)))
            .catch(err => res.end(JSON.stringify({
                error: {name: err.name, message: err.message}
            }, null, 4)))
    );

    routes.get('/trophies/:username', (req, res) =>
        trophy.getAll(req.params.username)
            .then(userData => {
                if (req.query.showNew == 'true') res.end(JSON.stringify(userData, null, 4));
                else return trophy.newToOld(userData.trophyList);
            })
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

    return routes;
}
