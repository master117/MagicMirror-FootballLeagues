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

            //Calculate maximum polling speed
            var refreshTime = 5000 * 2 * leagues.length;
            if (apiKey === "")
            {
                refreshTime = 70000 * 2 * leagues.length;;
            }

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
                                self.getFixtures(competitions[j].id, apiKey, refreshTime);

                                if (showTables) 
                                {
                                    self.getTable(competitions[j].id, apiKey, refreshTime);
                                }

                                if (showLogos) 
                                {
                                    self.getTeamLogos(competitions[j].id, apiKey);
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
        getFixtures: function (leagueId, apiKey, refreshTime)
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
    		} catch(e) {
        		alert(e); // error in the above string (in this case, yes)!
			console.log(body);
    		}              
                
                self.sendSocketNotification('FIXTURES', {
                    leagueId: leagueId,
                    fixtures: data.fixtures
                });
                setTimeout(function () {
                    self.getFixtures(leagueId, apiKey, refreshTime);
                }, refreshTime);
            });
        },

        // Constantly asks for LeagueTables and sends notifications once they arrive
        getTable: function (leagueId, apiKey, refreshTime)
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

                self.sendSocketNotification('TABLE',
                {
                    leagueId: leagueId,
                    table: data.standing
                });
                setTimeout(function() {
                    self.getTable(leagueId, apiKey, refreshTime);
                },
                refreshTime);
            });
        },

        // Aquires TeamLogos
        getTeamLogos: function (leagueId, apiKey)
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
                var teamLogos = {};
                var data = JSON.parse(body);

                for (var i = 0; i < data.teams.length; i++)
                {
                    var logo = data.teams[i].crestUrl;

                    var idString = data.teams[i]._links.self.href;
                    idString = idString.substring(idString.lastIndexOf("/") + 1, idString.length);

                    teamLogos[idString] = logo;
                }

                self.sendSocketNotification('LOGO',
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
            if (notification === 'CONFIG') {
                this.startGatherData(payload.leagues, payload.showLogos, payload.showTables, payload.apiKey);           
            }
        }
});