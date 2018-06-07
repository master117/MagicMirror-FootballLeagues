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
            var refreshTime = 5000 * 2 * leagues.length;
            if (apiKey === "")
            {
                refreshTime = 70000 * 2 * leagues.length;;
            }

            console.log("Refresh every: " + refreshTime + "ms.")

            if (showUnavailable)
            {
                for (var j = 0; j < leagues.length; j++) 
                {
                    // Second, start gathering background processes for available league  
                    self.getFixtures(leagues[j], apiKey, refreshTime, id);

                    if (showTables) 
                    {
                        self.getTable(leagues[j], apiKey, refreshTime, id);
                    }

                    if (showLogos) 
                    {
                        self.getTeamLogos(leagues[j], apiKey, id);
                    }

                    // Third, send notification that leagues exist
                    self.sendSocketNotification('LEAGUES' + id,
                        {
                            name: "Competition has not started yet",
                            id: leagues[j]
                        });
                }
            }
            else
            {
                var options = {
                    method: 'GET',
                    url: 'http://api.football-data.org/v1/competitions',
                    headers: {
                        'X-Auth-Token': apiKey
                    }
                };

                // Request all available leagues
                request(options,
                    function (error, response, body)
                    {
                        var competitions = JSON.parse(body);

                        for (var i = 0; i < leagues.length; i++) 
                        {
                            for (var j = 0; j < competitions.length; j++) 
                            {
                                // Check if current league fits a competition, if it does, the league is available
                                if (competitions[j].id === leagues[i]) 
                                {
                                    // Second, start gathering background processes for available league  
                                    self.getFixtures(competitions[j].id, apiKey, refreshTime, id);

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
                                            name: competitions[j].caption,
                                            id: competitions[j].id
                                        });
                                }
                            }
                        }
                    });
            }
        },

        // Constantly asks for Fixtures and sends notifications once they arrive
        getFixtures: function (leagueId, apiKey, refreshTime, id)
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
                try {	
                    var data = JSON.parse(body);
                    var fix = data.fixtures;
                }
                catch (e)
                {
                    console.log("Error with fixture: " + leagueId);
    		    }              
                
                self.sendSocketNotification('FIXTURES' + id, {
                    leagueId: leagueId,
                    fixtures: fix
                });
                setTimeout(function () {
                    self.getFixtures(leagueId, apiKey, refreshTime);
                }, refreshTime);
            });
        },

        // Constantly asks for LeagueTables and sends notifications once they arrive
        getTable: function (leagueId, apiKey, refreshTime, id)
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
                url: 'http://api.football-data.org/v1/competitions/' + leagueId.toString() + '/teams',
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
                        var logo = data.teams[i].crestUrl;

                        var idString = data.teams[i]._links.self.href;
                        idString = idString.substring(idString.lastIndexOf("/") + 1, idString.length);

                        teamLogos[idString] = logo;
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