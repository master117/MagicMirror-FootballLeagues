var NodeHelper = require('node_helper');
var request = require('request');

module.exports = NodeHelper.create(
    {
        // Gets automatically called when the module starts
        start: function () {
            console.log("MagicMirror-FootballLeagues Started...");
        },

        // Starts all data gathering background processes
        startGatherData: function (leagues, showLogos, showTables, apiKey, id, showUnavailable) 
        {
            // First, gathers all available league ids, gracefully handles if a league doesn't exist
            var self = this;

            //Calculate maximum polling speed
            var refreshTime = 60000 * leagues.length;
            console.log("Refresh every: " + refreshTime + "ms.")

            //Check whether unavailable leagues should be shown.
            if (showUnavailable)
            {
                for (var j = 0; j < leagues.length; j++) 
                {
                    var league = leagues[j];

                    var options = {
                        method: 'GET',
                        url: 'http://api.football-data.org/v2/competitions/' + league.toString(),
                        headers: {
                            'X-Auth-Token': apiKey
                        }
                    };

                    request(options,
                        function (error, response, body)
                        {
                            var competition = JSON.parse(body);

                            // Second, start gathering background processes for available league 
                            self.getMatches(league, apiKey, refreshTime, id);

                            if (showTables) 
                            {
                                self.getTable(league, apiKey, refreshTime, id);
                            }

                            if (showLogos) 
                            {
                                self.getTeamLogos(league, apiKey, id);
                            }

                            var cap = ""
                            if (competition.hasOwnProperty('name'))
                            {
                                cap = competition.name
                            }

                            // Third, send notification that leagues exist
                            self.sendSocketNotification('LEAGUES' + id,
                                {
                                    name: cap,
                                    id: league
                                });
                        });
                }
            }
            else
            {
                var options = {
                    method: 'GET',
                    url: 'http://api.football-data.org/v2/competitions',
                    headers: {
                        'X-Auth-Token': apiKey
                    }
                };

                // Request all available leagues
                request(options,
                    function (error, response, body)
                    {
                        var competitions = JSON.parse(body).competitions;

                        for (var i = 0; i < leagues.length; i++) 
                        {
                            for (var j = 0; j < competitions.length; j++) 
                            {
                                // Check if current league fits a competition, if it does, the league is available
                                if (competitions[j].id === leagues[i]) 
                                {
                                    // Second, start gathering background processes for available league  
                                    self.getMatches(competitions[j].id, apiKey, refreshTime, id);

                                    if (showTables) 
                                    {
                                        self.getTable(competitions[j].id, apiKey, refreshTime, id);
                                    }

                                    if (showLogos) 
                                    {
                                        self.getTeamLogos(competitions[j].id, apiKey, id);
                                    }

                                    // Third, send notification that leagues exist
                                    self.sendSocketNotification('LEAGUES' + id,
                                        {
                                            name: competitions[j].name,
                                            id: competitions[j].id
                                        });

                                    break;
                                }
                            }
                        }
                    });
            }
        },

        // Constantly asks for Matches and sends notifications once they arrive
        getMatches: function (leagueId, apiKey, refreshTime, id)
        {
            var self = this;
            var options = {
                method: 'GET',
                url: 'http://api.football-data.org/v2/competitions/' + leagueId.toString() + '/matches',
                headers: {
                    'X-Auth-Token': apiKey
                }
            }; 

            request(options, function (error, response, body) {
                try {	
                    var data = JSON.parse(body);
                    var fix = data.matches;
                }
                catch (e)
                {
                    console.log("Error with matches from: " + leagueId);
                }              
                
                self.sendSocketNotification('MATCHES' + id, {
                    leagueId: leagueId,
                    matches: fix
                });
                setTimeout(function () {
                    self.getMatches(leagueId, apiKey, refreshTime);
                }, refreshTime);
            });
        },

        // Constantly asks for LeagueTables and sends notifications once they arrive
        getTable: function (leagueId, apiKey, refreshTime, id)
        {
            var self = this;
            var options = {
                method: 'GET',
                url: 'http://api.football-data.org/v2/competitions/' + leagueId.toString() + '/standings',
                headers: {
                    'X-Auth-Token': apiKey
                }
            };

            request(options, function (error, response, body) 
            {
                try
                {
                    var data = JSON.parse(body);                  

                    if (data.hasOwnProperty('standing'))
                        var tab = data.standing;
                    else
                        var tab = data.standings;
                }
                catch (e)
                {
                    console.log("Error with table: " + leagueId);
                }  

                self.sendSocketNotification('TABLE' + id,
                {
                    leagueId: leagueId,
                    table: tab
                });

                setTimeout(function() {
                    self.getTable(leagueId, apiKey, refreshTime);
                },
                refreshTime);
            });
        },

        // Aquires TeamLogos
        getTeamLogos: function (leagueId, apiKey, id)
        {
            var self = this;
            var options = {
                method: 'GET',
                url: 'http://api.football-data.org/v2/competitions/' + leagueId.toString() + '/teams',
                headers: {
                    'X-Auth-Token': apiKey
                }
            };
          
            request(options, function (error, response, body)
            {
                try
                {
                    var teamLogos = {};

                    var data = JSON.parse(body);
                    for (var i = 0; i < data.teams.length; i++)
                    {
                        try
                        {
                            teamLogos[data.teams[i].id] = data.teams[i].crestUrl;
                        }
                        catch (e)
                        {
                            console.log("Error with logo: " + data.teams[i].id + " - " + data.teams[i].name);
                        } 
                    }
                }
                catch (e)
                {
                    console.log("Error with logos: " + leagueId);
                } 

                self.sendSocketNotification('LOGO' + id,
                    {
                        leagueId: leagueId,
                        table: teamLogos
                    });
                /*
                for (var i = 0; i < data.teams.length; i++)
                {
                    var idString = data.teams[i]._links.self.href;
                    idString = idString.substring(idString.lastIndexOf("/") + 1, idString.length);
                    teamIds.push(idString);
                }*/
            });
        },

        // Receives startup notification, containing config data
        socketNotificationReceived: function (notification, payload) {
            if (notification === 'CONFIG')
            {
                this.startGatherData(payload.leagues, payload.showLogos, payload.showTables, payload.apiKey, payload.id, payload.showUnavailable);           
            }
        }
});