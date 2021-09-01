var NodeHelper = require('node_helper');

var moment = require('moment');
const fetch = require('node-fetch');

module.exports = NodeHelper.create({
    // Gets automatically called when the module starts
    start: function () {
        console.log("MagicMirror-FootballLeagues Started...");
    },

    // Starts all data gathering background processes
    startGatherData: function (leagues, showLogos, showTables, apiKey, id, showUnavailable) {
        // First, gathers all available league ids, gracefully handles if a league doesn't exist
        var self = this;

        //Calculate maximum polling speed
        var refreshTime = 60000 * leagues.length;
        console.log("Refresh every: " + refreshTime + "ms.")

        //Check whether unavailable leagues should be shown.
        if(showUnavailable) {
            for(var j = 0; j < leagues.length; j++) {
                var league = leagues[j];

                var options = {
                    method: 'GET',
                    headers: {
                        'X-Auth-Token': apiKey
                    }
                };

                fetch('http://api.football-data.org/v2/competitions/' + league.toString(), options)
                    .then(res => res.text())
                    .then(function (body) {
                        var competition = JSON.parse(body);

                        // Second, start gathering background processes for available league 
                        self.getMatches(league, apiKey, refreshTime, id);

                        if(showTables) {
                            self.getTable(league, apiKey, refreshTime, id);
                        }

                        if(showLogos) {
                            self.getTeamLogos(league, apiKey, id);
                        }

                        var cap = ""
                        if(competition.hasOwnProperty('name')) {
                            cap = competition.name
                        }

                        // Third, send notification that leagues exist
                        self.sendSocketNotification('LEAGUES' + id, {
                            name: cap,
                            id: league
                        });
                    });
            }
        }
        else {
            var options = {
                method: 'GET',
                headers: {
                    'X-Auth-Token': apiKey
                }
            };

            // Fetch all available leagues
            fetch('http://api.football-data.org/v2/competitions', options)
                .then(res => res.text())
                .then(function (body) {
                    var competitions = JSON.parse(body).competitions;

                    for(var i = 0; i < leagues.length; i++) {
                        for(var j = 0; j < competitions.length; j++) {
                            // Check if current league fits a competition, if it does, the league is available
                            if(competitions[j].id === leagues[i]) {
                                // Second, start gathering background processes for available league  
                                self.getMatches(competitions[j].id, apiKey, refreshTime, id);

                                if(showTables) {
                                    self.getTable(competitions[j].id, apiKey, refreshTime, id);
                                }

                                if(showLogos) {
                                    self.getTeamLogos(competitions[j].id, apiKey, id);
                                }

                                // Third, send notification that leagues exist
                                self.sendSocketNotification('LEAGUES' + id, {
                                    name: competitions[j].name,
                                    id: competitions[j].id
                                });

                                break;
                            }
                        }
                    }
                })
                .catch(function (e) {
                    console.log("Error fetching leagues, is your api key correct?");
                    console.log(e);
                });
        }
    },

    // Constantly asks for Matches and sends notifications once they arrive
    getMatches: function (leagueId, apiKey, refreshTime, id) {
        var self = this;
        var begin = moment().startOf('isoWeek').format('YYYY-MM-DD');
        var end = moment().endOf('isoWeek').format('YYYY-MM-DD');
        var options = {
            method: 'GET',
            headers: {
                'X-Auth-Token': apiKey
            }
        };

        fetch('http://api.football-data.org/v2/competitions/' + leagueId.toString() + '/matches?dateFrom=' + begin + '&dateTo=' + end, options)
            .then(res => res.text())
            .then(function (body) {
                var data = JSON.parse(body);
                var fix = data.matches;

                self.sendSocketNotification('MATCHES' + id, {
                    leagueId: leagueId,
                    matches: fix
                });
                setTimeout(function () {
                    self.getMatches(leagueId, apiKey, refreshTime);
                }, refreshTime);
            })
            .catch(function (e) {
                console.log("Error with matches from: " + leagueId);
            });
    },

    // Constantly asks for LeagueTables and sends notifications once they arrive
    getTable: function (leagueId, apiKey, refreshTime, id) {
        var self = this;
        var options = {
            method: 'GET',
            headers: {
                'X-Auth-Token': apiKey
            }
        };

        fetch('http://api.football-data.org/v2/competitions/' + leagueId.toString() + '/standings', options)
            .then(res => res.text())
            .then(function (body) {
                var data = JSON.parse(body);

                if(data.hasOwnProperty('standing'))
                    var tab = data.standing;
                else
                    var tab = data.standings;

                self.sendSocketNotification('TABLE' + id,
                    {
                        leagueId: leagueId,
                        table: tab
                    });

                setTimeout(function () {
                    self.getTable(leagueId, apiKey, refreshTime);
                },
                    refreshTime);
            })
            .catch(function (e) {
                console.log("Error with table: " + leagueId);
            });
    },

    // Aquires TeamLogos
    getTeamLogos: function (leagueId, apiKey, id) {
        var self = this;
        var options = {
            method: 'GET',
            headers: {
                'X-Auth-Token': apiKey
            }
        };

        fetch('http://api.football-data.org/v2/competitions/' + leagueId.toString() + '/teams', options)
            .then(res => res.text())
            .then(function (body) {
                var teamLogos = {};

                var data = JSON.parse(body);
                if(!data.teams)
                    throw body;
                for(var i = 0; i < data.teams.length; i++) {
                    try {
                        teamLogos[data.teams[i].id] = data.teams[i].crestUrl;
                    }
                    catch(e) {
                        console.log("Error with logo: " + data.teams[i].id + " - " + data.teams[i].name);
                    }
                }

                self.sendSocketNotification('LOGO' + id,
                    {
                        leagueId: leagueId,
                        table: teamLogos
                    })
            })
            .catch(function (e) {
                console.log("Error with logos: " + leagueId);
                console.log("Error loading leaguedata for: " + leagueId.toString());
                console.log(e);
            });
    },

    // Receives startup notification, containing config data
    socketNotificationReceived: function (notification, payload) {
        if(notification === 'CONFIG') {
            this.startGatherData(payload.leagues, payload.showLogos, payload.showTables, payload.apiKey, payload.id, payload.showUnavailable);
        }
    }
});
