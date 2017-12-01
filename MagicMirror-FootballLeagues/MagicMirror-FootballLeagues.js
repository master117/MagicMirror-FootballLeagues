Module.register("MagicMirror-FootballLeagues",
    {
        // Default module config.
        defaults:
        {
            leagues: [444],
            showTables: true,
            showNames: true,
            showLogos: false,
            displayTime: 20 * 1000,            
            url: 'http://api.football-data.org/v1/'
        },

        // Get automatically called when the module starts
        loaded: function (callback) {
            this.finishLoading();
            console.log(this.name + ' is loaded!');
            callback();
        },

        // Get automatically called when the module starts
        getScripts: function ()
        {
            return ["moment.js"];
        },

        // Get automatically called when the module starts
        getStyles: function() {
            return ["MagicMirror-FootballLeagues.css"];
        },

        // Get automatically called when the module starts
        start: function ()
        {
            this.loadet = false;
            this.logos = {};
            this.fixtures = {};
            this.leagueNames = {};
            this.tables = {};
            this.tableActive = false;
            this.crawledIdsList = [];
            this.activeId = -1;      

            //Send our current config to node_helper, starting its polling
            this.sendSocketNotification('CONFIG', {
                leagues: this.config.leagues, showLogos: this.config.showLogos,
                showTables: this.config.showTables, apiKey: this.config.apiKey });

            //Set the league that should be displayed, starting with the arrays first entry
            this.changeLeague(this, 0);
        },

        //Changes league to the one specified by index
        changeLeague: function (self, leagueIndex) 
        {
            //If we have not crawled an ID yet, repeat in 1 second
            if (self.crawledIdsList.length == 0) 
            {
                setTimeout(function ()
                {
                    self.changeLeague(self, 0);
                }, 1000);
                return;
            }

            self.activeId = self.crawledIdsList[leagueIndex];
            this.updateDom(1000);
            setTimeout(function() {
                self.changeLeague(self, (leagueIndex + 1) % self.crawledIdsList.length);
                }, self.config.displayTime);
        },

        // Returns the View, gets called every updateTime by itself through setTimeout
        getDom: function ()
        {
            //Create the base element
            var self = this;
            var wrapper = document.createElement("div");

            //return nothing if no data exists
            if (this.activeId == -1 || this.fixtures.length == 0)
            {
                wrapper.innerHTML = '';

                setTimeout(function ()
                {
                    self.updateDom(1000);
                }, this.config.displayTime / 4);

                return wrapper;
            }

            //Check if table data exists and tables should be shown, if so, return a tableDom, tableViewActive switches between tables and fixtures
            if (this.tableViewActive && this.tables[this.activeId] !== undefined && this.config.showTables)
            {
                var places = document.createElement('table');
                places.className = 'xsmall';
                var title = document.createElement('header');
                title.innerHTML = this.leagueNames[this.activeId];
                wrapper.appendChild(title);

                var labelRow = document.createElement("tr");

                var position = document.createElement("th");
                labelRow.appendChild(position);

                var logo = document.createElement("th");
                labelRow.appendChild(logo);

                var name = document.createElement("th");
                name.innerHTML = 'TEAM';
                name.setAttribute('align', 'left');
                labelRow.appendChild(name);

                var gamesLabel = document.createElement("th");
                var gamesLogo = document.createElement("i");
                gamesLogo.classList.add("fa", "fa-hashtag");
                gamesLabel.setAttribute('width', '30px');
                gamesLabel.appendChild(gamesLogo);
                labelRow.appendChild(gamesLabel);

                var goalsLabel = document.createElement("th");
                var goalslogo = document.createElement("i");
                goalslogo.classList.add("fa", "fa-soccer-ball-o");
                goalsLabel.appendChild(goalslogo);
                goalsLabel.setAttribute('width', '30px');
                labelRow.appendChild(goalsLabel);

                var pointsLabel = document.createElement("th");
                var pointslogo = document.createElement("i");
                pointslogo.classList.add("fa", "fa-line-chart");
                pointsLabel.setAttribute('width', '30px');
                pointsLabel.appendChild(pointslogo);
                labelRow.appendChild(pointsLabel);

                places.appendChild(labelRow);

                var table = this.tables[this.activeId];

                for (var i = 0; i < table.length; i++) {
                    var place = document.createElement('tr');

                    var number = document.createElement('td');
                    number.innerHTML = i + 1;
                    place.appendChild(number);

                    if (this.config.showLogos) {
                        var team_logo_cell = document.createElement('td');
                        var team_logo_image = document.createElement('img');
                        team_logo_image.className = 'MMM-SoccerLiveScore-team_logo';
                        team_logo_image.src = 'data:image/png;base64, ' + this.logos[table[i].team_id];
                        team_logo_image.width = 20;
                        team_logo_image.height = 20;
                        team_logo_cell.appendChild(team_logo_image);
                        place.appendChild(team_logo_cell);
                    }

                    if (this.config.showNames) {
                        var team_name = document.createElement('td');
                        team_name.setAttribute('align', 'left');
                        team_name.innerHTML = table[i].team;
                        place.appendChild(team_name);
                    }

                    var games = document.createElement('td');
                    games.innerHTML = table[i].playedGames;
                    place.appendChild(games);

                    var goals = document.createElement('td');
                    goals.innerHTML = table[i].goalDifference;
                    place.appendChild(goals);

                    var points = document.createElement('td');
                    points.innerHTML = table[i].points;
                    place.appendChild(points);

                    places.appendChild(place);

                }

                wrapper.appendChild(places);

                this.tableActive = false;
                setTimeout(function() {
                        self.updateDom(1000);
                    },
                    this.config.displayTime / 4);
                return wrapper;
            }
            else
            {
                var matches = document.createElement('table');
                matches.className = 'xsmall';
                var title = document.createElement('header');
                title.innerHTML = this.crawledIdsList[this.activeId];
                wrapper.appendChild(title);

                console.log("Fixtures:");
                console.log(this.fixtures);         
                console.log(this.activeId); 
                var activeLeagueFixtures = this.fixtures[this.activeId];
                console.log(activeLeagueFixtures[0]);
                console.log(activeLeagueFixtures[0].date);
                console.log(moment(activeLeagueFixtures[0].date).format('DD.MM - HH:mm'));
                for (var i = 0; i < activeLeagueFixtures.length; i++) 
                {
                    if (activeLeagueFixtures[i].matches !== undefined) 
                    {
                        var time_row = document.createElement('tr');
                        var time = document.createElement('td');
                        time.innerHTML = moment(activeLeagueFixtures[i].date).format('DD.MM - HH:mm');
                        time.className = 'MMM-SoccerLiveScore-time';
                        time.setAttribute('colspan', '7');
                        time_row.appendChild(time);
                        matches.appendChild(time_row);

                        for (var j = 0; j < activeLeagueFixtures[i].matches.length; j++) 
                        {
                            var match = document.createElement('tr');

                            if (this.config.showNames) {
                                var team1_name = document.createElement('td');
                                team1_name.setAttribute('align', 'left');
                                team1_name.innerHTML = activeLeagueFixtures[i].homeTeamName;
                                match.appendChild(team1_name);
                            }

                            /*
                            if (this.config.showLogos) {
                                var team1_logo_cell = document.createElement('td');
                                var team1_logo_image = document.createElement('img');
                                team1_logo_image.className = 'MMM-SoccerLiveScore-team1_logo';
                                team1_logo_image.src = 'data:image/png;base64, ' +
                                    this.logos[activeLeagueFixtures[i].matches[j].team1_id];
                                team1_logo_image.width = 20;
                                team1_logo_image.height = 20;
                                team1_logo_cell.appendChild(team1_logo_image);
                                match.appendChild(team1_logo_cell);
                            }
                            */

                            var team1_score = document.createElement('td');
                            team1_score.setAttribute('width', '15px');
                            team1_score.setAttribute('align', 'center');
                            team1_score.innerHTML = activeLeagueFixtures[i].result.goalsHomeTeam;
                            var collon = document.createElement('td');
                            collon.innerHTML = ':';
                            var team2_score = document.createElement('td');
                            team2_score.setAttribute('width', '15px');
                            team2_score.setAttribute('align', 'center');
                            team2_score.innerHTML = activeLeagueFixtures[i].result.goalsAwayTeam;
                            match.appendChild(team1_score);
                            match.appendChild(collon);
                            match.appendChild(team2_score);

                            if (activeLeagueFixtures[i].matches[j].status != 0 &&
                                activeLeagueFixtures[i].matches[j].status != 100) {
                                team1_score.classList.add('MMM-SoccerLiveScore-red');
                                collon.classList.add('MMM-SoccerLiveScore-red');
                                team2_score.classList.add('MMM-SoccerLiveScore-red');
                            }

                            /*
                            if (this.config.showLogos) {
                                var team2_logo_cell = document.createElement('td');
                                var team2_logo_image = document.createElement('img');
                                team2_logo_image.className = 'MMM-SoccerLiveScore-team2_logo';
                                team2_logo_image.src = 'data:image/png;base64, ' +
                                    this.logos[activeLeagueFixtures[i].matches[j].team2_id];
                                team2_logo_image.width = 20;
                                team2_logo_image.height = 20;
                                team2_logo_cell.appendChild(team2_logo_image);
                                match.appendChild(team2_logo_cell);
                            }
                            */

                            if (this.config.showNames) {
                                var team2_name = document.createElement('td');
                                team2_name.setAttribute('align', 'right');
                                team2_name.innerHTML = activeLeagueFixtures[i].awayTeamName;
                                match.appendChild(team2_name);
                            }
                            matches.appendChild(match);
                        }
                    }
                }

                if (this.tables[this.activeId] != undefined && this.config.showTables)
                {
                    this.tableActive = true;
                    setTimeout(function() {
                            self.updateDom(1000);
                        },
                        this.config.displayTime / 4);
                }

                wrapper.appendChild(matches);
                return wrapper;
            }
        },

        socketNotificationReceived: function (notification, payload) 
        {
            switch (notification) 
            {
                case 'LOGO':
                    this.logos[payload.teamId] = payload.image;
                    break;
                case 'FIXTURES' :
                    this.fixtures[payload.leagueId] = payload.fixtures;
                    break;
                case 'LEAGUES' :
                    this.crawledIdsList.push(payload.id);
                    this.leagueNames[payload.id] = payload.name;
                    break;
                case 'TABLE' :
                    this.tables[payload.leagueId] = payload.table;
                    break;
            }
        }
    });
