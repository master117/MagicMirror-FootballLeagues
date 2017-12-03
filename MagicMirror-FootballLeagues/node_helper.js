var NodeHelper = require('node_helper');
var request = require('request');

module.exports = NodeHelper.create(
    {
        // Gets automatically called when the module starts
        start: function () {
            console.log("MagicMirror-FootballLeagues Started...");
        },

        // Starts all data gathering background processes
        startGatherData: function (leagues, showLogos, showTables, apiKey) 
        {
            // First, gathers all available league ids, gracefully handles if a league doesn't exist
            var self = this;

            var options = {
                method: 'GET',
                url: 'http://api.football-data.org/v1/competitions',
                headers: {
                    'X-Auth-Token': apiKey
                }
            };

            // Request all available leagues
            request(options,
                function(error, response, body) {
                    var competitions = JSON.parse(body);
                    
                    for (var i = 0; i < leagues.length; i++) 
                    {
                        for (var j = 0; j < competitions.length; j++) 
                        {                          
                            // Check if current league fits a competition, if it does, the league is available
                            if (competitions[j].id === leagues[i]) 
                            {
                                // Second, start gathering background processes for available league  
                                self.getFixtures(competitions[j].id, apiKey);

                                if (showTables) 
                                {
                                    self.getTeams(competitions[j].id, apiKey);
                                    self.getTable(competitions[j].id, apiKey);
                                }

                                if (showLogos) 
                                {
                                    //self.getTeamLogo(competitions[j].id);
                                }

                                // Third, send notification that leagues exist
                                self.sendSocketNotification('LEAGUES',
                                    {
                                        name: competitions[j].caption,
                                        id: competitions[j].id
                                    });
                            }
                        }
                    }
                });
        },

        // Constantly asks for Fixtures and sends notifications once they arrive
        getFixtures: function (leagueId, apiKey)
        {
            var self = this;
            var options = {
                method: 'GET',
                url: 'http://api.football-data.org/v1/competitions/' + leagueId.toString() + '/fixtures',
                headers: {
                    'X-Auth-Token': apiKey
                }
            };

            request(options, function (error, response, body) {
                var data = JSON.parse(body);
                var refreshTime = 5000;
                if (apiKey === "") {
                    refreshTime = 60000;
                }

                self.sendSocketNotification('FIXTURES', {
                    leagueId: leagueId,
                    fixtures: data.fixtures
                });
                setTimeout(function () {
                    self.getFixtures(leagueId, apiKey);
                }, refreshTime);
            });
        },

        // Constantly asks for LeagueTables and sends notifications once they arrive
        getTable: function (leagueId, apiKey)
        {
            var self = this;
            var options = {
                method: 'GET',
                url: 'http://api.football-data.org/v1/competitions/' + leagueId.toString() + '/leagueTable',
                headers: {
                    'X-Auth-Token': apiKey
                }
            };
            request(options, function (error, response, body) 
            {
                var data = JSON.parse(body);
                var refreshTime = 5000;
                if (apiKey === "")
                {
                    refreshTime = 60000;
                }

                self.sendSocketNotification('TABLE',
                {
                    leagueId: leagueId,
                    table: data.standing
                });
                setTimeout(function() {
                    self.getTable(leagueId, apiKey);
                },
                refreshTime);
            });
        },

        // Aquires TeamIDs
        getTeams: function (leagueId, apiKey)
        {
            var self = this;
            var options = {
                method: 'GET',
                url: 'http://api.football-data.org/v1/competitions/' + leagueId.toString() + '/teams',
                headers: {
                    'X-Auth-Token': apiKey
                }
            };
            request(options, function (error, response, body)
            {
                var teamIds = [];
                var data = JSON.parse(body);
                for (var i = 0; i < data.teams.length; i++)
                {
                    var idString = data.teams[i]._links.self.href;
                    idString = idString.substring(idString.lastIndexOf("/") + 1, idString.length);
                    teamIds.push(idString);
                }

                //self.getLogos(teamIds);
            });
        },

        getTeamLogo: function (teamId) {
            var self = this;
            var options = {
                method: 'GET',
                url: 'https://www.ta4-images.de/ta/images/teams/' + teamId + '/64',
                headers: {
                    'Host': 'www.ta4-images.de',
                    'Accept': '*/*',
                    'Accept-Language': 'de-de',
                    'Connection': 'keep-alive',
                    'Accept-Encoding': 'gzip, deflate',
                    'User-Agent': 'TorAlarm/20161206 CFNetwork/808.1.4 Darwin/16.1.0'
                },
                encoding: null
            };


            request(options, function (error, response, body) {
                if (error) throw new Error(error);
                var image = new Buffer(body).toString('base64');
                self.sendSocketNotification('LOGO', {
                    teamId: teamId,
                    image: image
                });

            });


        },

        getLogos: function (teamIds) {
            var self = this;
            var logos = [];
            for (var i = 0; i < teamIds.length; i++) {
                self.getTeamLogo(teamIds[i]);
            }
        },

        getLogosFromScores: function (leagueId) {
            var self = this;
            var options = {
                method: 'POST',
                url: 'https://www.ta4-data.de/ta/data/competitions/' + leagueId.toString() + '/matches/round/0',
                headers: {
                    'Host': 'ta4-data.de',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Connection': 'keep-alive',
                    'Accept': '*/*',
                    'User-Agent': 'TorAlarm/20161202 CFNetwork/808.1.4 Darwin/16.1.0',
                    'Accept-Language': 'de-de',
                    'Accept-Encoding': 'gzip',
                    'Content-Length': '49'
                },
                body: '{"lng":"de-DE","device_type":0,"decode":"decode"}',
                form: false
            };

            request(options, function (error, response, body) {
                var data = JSON.parse(body);
                var standings = data.data;
                for (var i = 0; i < standings.length; i++) {
                    if (standings[i].matches !== undefined) {
                        for (var j = 0; j < standings[i].matches.length; j++) {
                            self.getTeamLogo(standings[i].matches[j].team1_id);
                            self.getTeamLogo(standings[i].matches[j].team2_id);
                        }
                    }
                }
            });
        },


        // Receives startup notification, containing config data
        socketNotificationReceived: function (notification, payload) {
            if (notification === 'CONFIG') {
                this.startGatherData(payload.leagues, payload.showLogos, payload.showTables, payload.apiKey);           
            }
        }
});