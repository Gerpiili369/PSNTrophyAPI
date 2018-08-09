const
    fs = require('fs'),
    fetch = require('node-fetch'),
    tpyUrl = 'https://us-tpy.np.community.playstation.net/trophy/v1/trophyTitles';
    log = true;

let headers = new fetch.Headers();
headers.append('Authorization', require('./auth.json').token);

getProfile = user => new Promise((resolve, reject) => {
    if (log) console.log('Fetching profile...');
    fetch(
        'https://us-prof.np.community.playstation.net/userProfile/v1/users/'
        + user +
        '/profile2?fields=onlineId%2CaboutMe%2CconsoleAvailability%2ClanguagesUsed%2CavatarUrls%2CpersonalDetail%2CpersonalDetail(%40default%2CprofilePictureUrls)%2CprimaryOnlineStatus%2CtrophySummary(level%2Cprogress%2CearnedTrophies)%2Cplus%2CisOfficiallyVerified%2CfriendRelation%2CpersonalDetailSharing%2Cpresences(%40default%2Cplatform)%2CnpId%2Cblocking%2Cfollowing%2CmutualFriendsCount%2CfollowerCount&profilePictureSizes=s%2Cm%2Cl&avatarSizes=s%2Cm%2Cl&languagesUsedLanguageSet=set4',
        {headers}
    )
        .then(res => res.json().catch(err => reject({
            name: 'Failed to get profile', message: 'Response is not JSON!'
        })))
        .then(data => data.error ? reject({
            name: 'Failed to get profile', message: data.error.message
        }) : resolve(data))
        .catch(reject);
});

getGames = user => new Promise((resolve, reject) => {
    if (log) console.log('Fetching games...');

    loop();

    function loop(offset = 0, list = []) {
        if (log) console.log('  from: ', offset);
        fetch(
            tpyUrl +
            '?fields=%40default%2CtrophyTitleSmallIconUrl' +
            '&platform=PS3%2CPS4%2CPSVITA' +
            '&limit=128&offset=' + offset +
            '&comparedUser=' + user + '&npLanguage=en',
            {headers}
        )
            .then(res => res.json().catch(err => reject({
                name: 'Failed to get games',
                message: 'Response is not JSON!'
            })))
            .then(data => {
                if (data.error) return reject({
                    name: 'Failed to get games',
                    message: data.error.message
                });

                list = list.concat(data.trophyTitles);

                if (data.totalResults > (offset + data.limit)) loop(offset + 128, list);
                else {
                    resolve(list);
                    if (log) console.log(
                        'DONE!\n',
                        'Games: ', list.length
                    );
                }
            })
            .catch(reject);
    }
});

getTrophies = (user, game, group) => new Promise((resolve, reject) => {
    fetch(
        tpyUrl +
        '/' + game + '/trophyGroups/' + group + '/trophies' +
        '?fields=%40default%2CtrophyRare%2CtrophyEarnedRate%2CtrophySmallIconUrl' +
        '&visibleType=1' +
        '&comparedUser=' + user + '&npLanguage=en',
        {headers}
    )
        .then(res => res.json().catch(err => reject({
            name: 'Failed to get trophies', message: 'Response is not JSON!'
        })))
        .then(data => data.error ? reject({
            name: 'Failed to get trophies', message: data.error.message
        }) : resolve(data))
        .catch(reject);
});

getTrophyGroups = (user, game) => new Promise(function(resolve, reject) {
    fetch(
        tpyUrl +
        '/' + game +'/trophyGroups' +
        '?fields=%40default%2CtrophyTitleSmallIconUrl' +
        '&comparedUser=' + user + '&npLanguage=en',
        {headers}
    )
        .then(res => res.json().catch(err => reject({
            name: 'Failed to get trophies', message: 'Response is not JSON!'
        })))
        .then(data => data.error ? reject({
            name: 'Failed to get trophies', message: data.error.message
        }) : resolve({id: game, data}))
        .catch(reject);
});

getAll = user => new Promise((resolve, reject) => {
    if (log) console.log('Fetching all trophy data of ', user, '...');

    const start = Date.now();
    let gameProms = [], userData = {timestamp: null, profile: undefined, trophyList: {}}, userDataFromFile;
    if (fs.existsSync('profiles/' + user + 'FullTrophies.json')) userDataFromFile = JSON.parse(fs.readFileSync('profiles/' + user + 'FullTrophies.json', 'utf-8', err => {if (err) console.log(err);}));
    getProfile(user)
        .then(data => {
            if (userDataFromFile) {
                let match = true;
                for (const type in userDataFromFile.profile.trophySummary.earnedTrophies) {
                    if (userDataFromFile.profile.trophySummary.earnedTrophies[type] != data.profile.trophySummary.earnedTrophies[type]) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    if (log) console.log('Matching trophy profile found from file!');
                    resolve(userDataFromFile);
                    userDataFromFile = undefined;
                    return;
                }
            }

            userData.profile = data.profile;
            return user;
        })
        .then(getGames)
        .then(gameList => {
            if (log) console.log('Fetching trophy groups...');
            for (game of gameList) gameProms.push(getTrophyGroups(user, game.npCommunicationId));

            return gameProms;
        })
        .then(gameProms => Promise.all(gameProms))
        .then(result => {
            if (log) console.log('Fetching trophies...');
            for (game of result) userData.trophyList[game.id] = game.data;

            gameProms = [];
            for (const game in userData.trophyList) for (const group in userData.trophyList[game].trophyGroups) {
                gameProms.push(new Promise((resolve, reject) => {
                    getTrophies(user, game, userData.trophyList[game].trophyGroups[group].trophyGroupId)
                        .then(trophyData => {
                            userData.trophyList[game].trophyGroups[group].trophies = trophyData.trophies;
                            resolve();
                        })
                        .catch(reject);
                }));
            }

            return gameProms;
        })
        .then(gameProms => Promise.all(gameProms))
        .then(() => {
            userData.timestamp = Date.now();
            fs.writeFile('profiles/' + user + 'FullTrophies.json', JSON.stringify(userData, null, 4), err => {if (err) console.log(err);});
            if (log) console.log(
                'DONE!\n',
                'Completed in', Date.now() - start, 'ms\n',
            );
            resolve(userData);
        })
        .catch(err => {
            if (userDataFromFile) {
                if (log) console.log('Fetch error. Using backup file.');
                console.log(err);
                resolve(userDataFromFile);
            }
            reject(err);
        });
});

newToOld = trophyList => {
    if (log) console.log('Transferring data to old format.');
    let owner = 'fromUser', old = {
        username: null,
        count: {
            total: 0,
            byType: {
                bronze: 0,
                silver: 0,
                gold: 0,
                platinum: 0
            },
            byPlatform: {
                vita: 0,
                ps3: 0,
                ps4: 0
            }
        },
        trophyList: []
    };

    ownerCheck:
    for (const game in trophyList) {
        for (group of trophyList[game].trophyGroups) if (group.comparedUser) {
            owner = 'comparedUser';
            break ownerCheck;
        }
    }
    for (const game in trophyList) {
        const platforms = trophyList[game].trophyTitlePlatfrom.split(',');

        for (group of trophyList[game].trophyGroups) if (group[owner]) {
            if (!old.username) old.username = group[owner].onlineId;

            for (const type in group[owner].earnedTrophies) {
                old.count.byType[type] += group[owner].earnedTrophies[type];

                for (const platform of platforms) switch (platform) {
                    case 'PS3':
                        old.count.byPlatform.ps3 += group[owner].earnedTrophies[type];
                        break;
                    case 'PSVITA':
                        old.count.byPlatform.vita += group[owner].earnedTrophies[type];
                        break;
                    case 'PS4':
                        old.count.byPlatform.ps4 += group[owner].earnedTrophies[type];
                        break;
                }
            }

            for (trophy of group.trophies) if (trophy[owner].earned) {
                old.trophyList.push({
                    index: null,
                    trophy: {
                        title: trophy.trophyName,
                        description: trophy.trophyDetail,
                        type: trophy.trophyType,
                        rarity: trophy.trophyEarnedRate,
                        id: trophy.trophyId,
                        earned: new Date(trophy[owner].earnedDate).getTime(),
                        hidden: trophy.trophyHidden,
                        dlc: group.trophyGroupId !== 'default',
                        img: trophy.trophyIconUrl
                    },
                    game: {
                        title: trophyList[game].trophyTitleName,
                        img: trophyList[game].trophyTitleIconUrl
                    }
                })
            }

        }
    }

    old.count.total = old.trophyList.length;
    old.trophyList.sort((a, b) => {
        if (!a.trophy.earned) return -1;
        if (!b.trophy.earned) return 1;
        return a.trophy.earned > b.trophy.earned ? 1 : -1
    });

    for (const i in old.trophyList) old.trophyList[i].index = Number(i) + 1;
    old.trophyList.reverse();

    if (log) console.log('DONE!');
    return old;
}

objectByGame = trophyList => {
    let object = {};
    for (trophyData of trophyList) {
        if (!object[trophyData.game.title]) object[trophyData.game.title] = {
            img: trophyData.game.img,
            list: []
        };
        object[trophyData.game.title].list.push(trophyData.trophy);
    }
    return object;
}

groupByDate = (trophyList, precision) => {
    let last = new Date(Date.now() * 10), current, match = true, list = [];
    for (trophyData of trophyList) {
        current = new Date(trophyData.trophy.earned);
        switch (precision) {
            case 'hour': last.getHours() === current.getHours() ? '' : match = false;
            case 'day': last.getDate() === current.getDate() ? '' : match = false;
            case 'month': last.getMonth() === current.getMonth() ? '' : match = false;
            case 'year': last.getFullYear() === current.getFullYear() ? '' : match = false;
            break;
            default:
            match = false;
            precision = 'day';
        }

        if (!match) {
            list.push({
                title: new Date(
                    current.getFullYear(),
                    precision != 'year' ? current.getMonth() : 0,
                    precision == 'day' || precision == 'hour' ? current.getDate() : 1,
                    precision == 'hour' ? current.getHours() : 0
                ).getTime(),
                list: []
            });
            last = current;
        }
        list[list.length - 1].list.push(trophyData);
        match = true;
    }
    return list;
}

groupByGame = trophyList => {
    let lastGame = '', list = [];
    for (trophyData of trophyList) {
        if (trophyData.game.title != lastGame) {
            list.push({
                title: trophyData.game.title,
                img: trophyData.game.img,
                list: []
            });
            lastGame = trophyData.game.title;
        }
        list[list.length - 1].list.push({
            index: trophyData.index, trophy: trophyData.trophy
        });
    }
    return list;
}

module.exports = {
    getAll,
    newToOld,
    objectByGame,
    groupByDate,
    groupByGame
};
