const fetch = require('node-fetch'), FormData = require('form-data'), log = true;

update = user => new Promise((resolve, reject) => {
    let formData = new FormData();
    formData.append('psnid', user);     formData.append('validate', 'psnt1');

    fetch('http://psntrophyleaders.com/user/update', {
        method: 'POST',
        body: formData
    })
    .then(result => result.json()).then(data =>
        data.success ? resolve({message: `${user}'s profile updated!`}) : reject({
            name: 'Failed to update profile',
            message:
                data.message.indexOf('does not exist!') != -1 ? 'User doesn\'t exist!' :
                data.message.indexOf('is not valid!') != -1 ? 'Invalid username!' :
                data.message.indexOf('does not meet') != -1 ? 'User doesn\'t meet the requirements!' :
                data.message.indexOf('reached the limit') != -1 ? 'API is unable to add any more users today. Visit http://psntrophyleaders.com to add your profile manually.' :
                'Something went wrong...'
        })
    )
    .catch(err => reject(err));
})

getPage = (user, page = 1) => new Promise((resolve, reject) => {
    if (page && (page < 1 || isNaN(page))) return reject({name: 'Number error', message: 'Invalid page number!'});
    const start = Date.now();
    let list = [], formData, summary, type;

    if (log) console.log('Checking page #', page);

    formData = new FormData();
    formData.append('psnid', user);    formData.append('page', page);
    formData.append('rare', 127);      formData.append('type', 15);
    formData.append('earned', 1);      formData.append('platform', 7);

    fetch('http://psntrophyleaders.com/user/get_rare_trophies', {
        method: 'POST',
        body: formData
    })
        .then(result => result.json().catch(err => reject(
            {
                name: 'JSON error',
                message: 'Profile could not be read! Maybe try updating it first?'
            })
        ))
        .then(data => {
            summary = {
                username: user,
                count: {
                    total:          Number(data.data.count),
                    byType: {
                        bronze:     Number(data.data.type_counts.bronze_sum),
                        silver:     Number(data.data.type_counts.silver_sum),
                        gold:       Number(data.data.type_counts.gold_sum),
                        platinum:   Number(data.data.type_counts.gold_sum)
                    },
                    byPlatform: {
                        vita:       Number(data.data.platform_counts.psvita_sum),
                        ps3:        Number(data.data.platform_counts.ps3_sum),
                        ps4:        Number(data.data.platform_counts.ps4_sum)
                    }
                }
            };

            for (trophy of data.data.trophies) {
                list.push({
                    index: Number(trophy.trophyIndex),
                    trophy: {
                        title: trophy.title,
                        description: trophy.description,
                        type: trophy.trophy_type,
                        id: Number(trophy.trophy_id),
                        earned: new Date(trophy.date_earned.replace(' ', 'T') + 'Z').getTime(),
                        hidden: trophy.hidden == 1,
                        dlc: trophy.dlc == 0,
                        img: trophy.image
                    },
                    game: {
                        title: trophy.game_title,
                        img: trophy.game_image
                    }
                });

                type = list[list.length - 1].trophy.type;
                switch (type) {
                    case '0': type = 'bronze';   break;
                    case '1': type = 'silver';   break;
                    case '2': type = 'gold';     break;
                    case '3': type = 'platinum'; break;
                }
            }
            resolve({summary: summary, list: list});
        })
        .catch(err => reject(err));
});

getSummary = user => new Promise((resolve, reject) =>
    getPage(user)
        .then(result => resolve(result.summary))
        .catch(err => reject(err))
);

getAll = user => new Promise((resolve, reject) => {
    const start = Date.now();

    loop();

    function loop(page = 1, list = []) {
        getPage(user, page)
            .then(result => {
                // console.log(result.list);
                if (result.list.length > 0) loop(page + 1, list.concat(result.list));
                else {
                    if (log) console.log(
                        'DONE!\n',
                        'Completed in', Date.now() - start, 'ms\n',
                        'Trophies: ', list.length
                    );
                    resolve(Object.assign(result.summary, {trophyList: list}));
                }
                // } else if (fullSearch) loop(page);
            })
            .catch(err => reject(err));
    }
})

getTrophies = (user, page) => new Promise(function(resolve, reject) {
    if (page && (page < 1 || isNaN(page))) return reject({name: 'Number error', message: 'Invalid page number!'});
    const fullSearch = page ? false : true, start = Date.now();
    let run = true, list = [], newList, formData, summary, type;

    if (log) console.log('Trying to update user...');
    updateProfile(user).then(() => (loop = (page = 1) => {
        if (log) console.log('Checking page #', page);
        if (run) new Promise((resolve, reject) => {
            formData = new FormData();
            formData.append('psnid', user);    formData.append('page', page);
            formData.append('rare', 127);      formData.append('type', 15);
            formData.append('earned', 1);      formData.append('platform', 7);

            fetch('http://psntrophyleaders.com/user/get_rare_trophies', {
                method: 'POST',
                body: formData
            }).then(result => result.json())
            .then(data => {
                if (data.data.trophies.length === 0 || !fullSearch) {
                    if (log) console.log('End of trophies, adding the cherry...');
                    summary = {
                        username: user,
                        count: {
                            total:          Number(data.data.count),
                            byType: {
                                bronze:     Number(data.data.type_counts.bronze_sum),
                                silver:     Number(data.data.type_counts.silver_sum),
                                gold:       Number(data.data.type_counts.gold_sum),
                                platinum:   Number(data.data.type_counts.gold_sum)
                            },
                            byPlatform: {
                                vita:       Number(data.data.platform_counts.psvita_sum),
                                ps3:        Number(data.data.platform_counts.ps3_sum),
                                ps4:        Number(data.data.platform_counts.ps4_sum)
                            }
                        }
                    };
                }

                newList = [];
                for (trophy of data.data.trophies) {
                    newList.push({
                        index: Number(trophy.trophyIndex),
                        trophy: {
                            title: trophy.title,
                            description: trophy.description,
                            type: trophy.trophy_type,
                            id: Number(trophy.trophy_id),
                            earned: new Date(trophy.date_earned.replace(' ', 'T') + 'Z').getTime(),
                            hidden: trophy.hidden == 1,
                            dlc: trophy.dlc == 0,
                            img: trophy.image
                        },
                        game: {
                            title: trophy.game_title,
                            img: trophy.game_image
                        }
                    });

                    type = newList[newList.length - 1].trophy.type;
                    switch (type) {
                        case '0': type = 'bronze';   break;
                        case '1': type = 'silver';   break;
                        case '2': type = 'gold';     break;
                        case '3': type = 'platinum'; break;
                    }
                }
                return [list, summary];
            })
            .then(result => {
                list = list.concat(result[0]);
                if (log) console.log('Trophies: ', list.length);
                resolve(result[1]);

            })
            .catch(err => reject(err));
        })
        .then(result => {
            page ++;
            if (typeof result == 'object' || !fullSearch) {
                result.trophies = list;
                if (log) console.log(
                    'DONE!\n',
                    'Completed in', Date.now() - start, 'ms\n',
                    'Trophies: ', list.length
                );
                resolve(result);
            } else if (fullSearch) loop(page);
        })
        .catch(err => reject(err));
    }) (page))
    .catch(err => reject(err));
})

groupByGame = trophies => {
    let lastGame = '', list = [];
    for (trophyData of trophies) {
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

module.exports = {update, getPage, getSummary, getAll, groupByGame};
